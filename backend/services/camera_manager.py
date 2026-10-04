"""
OMNI SMARTCITY — Camera Manager (Phase 3)
---------------------------------------------------------------------------
Responsibility:
  - Maintain an extensible CameraSource abstraction (real_yolo / simulation /
    future: rtsp / mjpeg / hls / ip_camera / webcam).
  - CAM-01  →  real_yolo    (delegated to vehicle_detection.py / LocalYOLO)
  - CAM-02 → CAM-12  →  simulation  (unique per-camera traffic profiles)
  - Each simulated camera runs its own traffic physics model that produces
    continuously changing vehicle counts consistent with a visual scene.
  - Camera metrics feed into the central StateManager (and thus /ws/live).
  - Generate per-camera MJPEG streams (canvas-drawn animated traffic scene).
  - NO video frames are sent over WebSocket.
---------------------------------------------------------------------------
"""
import cv2
import math
import time
import random
import threading
import numpy as np
import logging
from dataclasses import dataclass, field
from typing import Dict, Any, Optional, Generator
from config import Config

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Traffic profiles for CAM-02 → CAM-12
# Each profile shapes the simulation physics independently.
# ─────────────────────────────────────────────────────────────────────────────
@dataclass
class CameraProfile:
    cam_id: str
    junction_id: str
    name: str
    # Base traffic density (vehicles)
    base_vehicles: int      = 30
    vehicle_variance: int   = 8      # ±random walk cap per tick
    # Vehicle mix weights (sum need not be 1; normalised internally)
    car_ratio: float        = 0.60
    moto_ratio: float       = 0.22
    bus_ratio: float        = 0.08
    truck_ratio: float      = 0.10
    # Congestion oscillation: vehicles drift toward base with this pull
    mean_reversion: float   = 0.08   # 0→no reversion, 1→snap to base
    # Visual: road colour theme BGR
    road_color: tuple       = (30, 35, 40)
    lane_color: tuple       = (50, 60, 70)
    vehicle_color_dominant: tuple = (16, 185, 129)  # emerald (cars)


# Per-camera profiles — each junction gets its own personality
CAMERA_PROFILES: Dict[str, CameraProfile] = {
    "CAM-02": CameraProfile(
        cam_id="CAM-02", junction_id="J2", name="Gemini Circle — Anna Salai Approach",
        base_vehicles=48, vehicle_variance=10,
        car_ratio=0.62, moto_ratio=0.20, bus_ratio=0.08, truck_ratio=0.10,
        mean_reversion=0.07,
        road_color=(28, 32, 38),
    ),
    "CAM-03": CameraProfile(
        cam_id="CAM-03", junction_id="J3", name="Koyambedu Flyover — PH Road West",
        base_vehicles=20, vehicle_variance=6,
        car_ratio=0.55, moto_ratio=0.28, bus_ratio=0.10, truck_ratio=0.07,
        mean_reversion=0.12,
        road_color=(26, 30, 36),
    ),
    "CAM-04": CameraProfile(
        cam_id="CAM-04", junction_id="J4", name="Madhya Kailash — OMR Entry",
        base_vehicles=72, vehicle_variance=12,
        car_ratio=0.58, moto_ratio=0.14, bus_ratio=0.07, truck_ratio=0.21,
        mean_reversion=0.05,
        road_color=(32, 28, 36),
    ),
    "CAM-05": CameraProfile(
        cam_id="CAM-05", junction_id="J5", name="Tidel Park Junction — South Camera",
        base_vehicles=54, vehicle_variance=14,
        car_ratio=0.50, moto_ratio=0.35, bus_ratio=0.07, truck_ratio=0.08,
        mean_reversion=0.06,
        road_color=(28, 34, 38),
    ),
    "CAM-06": CameraProfile(
        cam_id="CAM-06", junction_id="J6", name="Velachery Vijaya Nagar Flyover",
        base_vehicles=38, vehicle_variance=8,
        car_ratio=0.48, moto_ratio=0.18, bus_ratio=0.24, truck_ratio=0.10,
        mean_reversion=0.09,
        road_color=(26, 32, 35),
    ),
    "CAM-07": CameraProfile(
        cam_id="CAM-07", junction_id="J7", name="RGGGH ER Gate — Central Camera",
        base_vehicles=28, vehicle_variance=15,  # intermittent
        car_ratio=0.60, moto_ratio=0.22, bus_ratio=0.09, truck_ratio=0.09,
        mean_reversion=0.04,  # slow reversion → long congestion spikes
        road_color=(30, 30, 40),
    ),
    "CAM-08": CameraProfile(
        cam_id="CAM-08", junction_id="J8", name="Saidapet Signal — South Camera",
        base_vehicles=52, vehicle_variance=9,
        car_ratio=0.63, moto_ratio=0.20, bus_ratio=0.08, truck_ratio=0.09,
        mean_reversion=0.06,
        road_color=(28, 30, 35),
    ),
    "CAM-09": CameraProfile(
        cam_id="CAM-09", junction_id="J9", name="Sholinganallur Junction Camera",
        base_vehicles=14, vehicle_variance=7,
        car_ratio=0.65, moto_ratio=0.18, bus_ratio=0.06, truck_ratio=0.11,
        mean_reversion=0.15,
        road_color=(24, 30, 34),
    ),
    "CAM-10": CameraProfile(
        cam_id="CAM-10", junction_id="J10", name="Porur Flyover — West Camera",
        base_vehicles=22, vehicle_variance=5,
        car_ratio=0.70, moto_ratio=0.16, bus_ratio=0.05, truck_ratio=0.09,
        mean_reversion=0.18,
        road_color=(26, 32, 36),
    ),
    "CAM-11": CameraProfile(
        cam_id="CAM-11", junction_id="J11", name="Vadapalani Signal Camera",
        base_vehicles=62, vehicle_variance=16,
        car_ratio=0.56, moto_ratio=0.24, bus_ratio=0.10, truck_ratio=0.10,
        mean_reversion=0.04,
        road_color=(30, 28, 38),
    ),
    "CAM-12": CameraProfile(
        cam_id="CAM-12", junction_id="J12", name="Chennai Port Gate Camera",
        base_vehicles=17, vehicle_variance=12,  # variable
        car_ratio=0.40, moto_ratio=0.12, bus_ratio=0.08, truck_ratio=0.40,
        mean_reversion=0.06,
        road_color=(28, 34, 42),
    ),
}


# ─────────────────────────────────────────────────────────────────────────────
# Traffic physics helpers
# ─────────────────────────────────────────────────────────────────────────────
def _derive_status(vehicles: int) -> str:
    if vehicles > 60: return "CRITICAL"
    if vehicles > 40: return "HIGH"
    if vehicles > 25: return "MODERATE"
    return "SMOOTH"


def _speed_from_vehicles(vehicles: int) -> int:
    """Inverse relationship: more vehicles → lower speed."""
    if vehicles > 65: return random.randint(6, 14)
    if vehicles > 45: return random.randint(14, 24)
    if vehicles > 28: return random.randint(24, 36)
    return random.randint(36, 58)


def _mix(total: int, profile: CameraProfile):
    """Distribute total vehicles into classes according to profile ratios."""
    total_ratio = profile.car_ratio + profile.moto_ratio + profile.bus_ratio + profile.truck_ratio
    cars  = max(0, round(total * profile.car_ratio / total_ratio))
    motos = max(0, round(total * profile.moto_ratio / total_ratio))
    buses = max(0, round(total * profile.bus_ratio / total_ratio))
    trucks = max(0, total - cars - motos - buses)
    return cars, motos, buses, trucks


# ─────────────────────────────────────────────────────────────────────────────
# Simulated camera state (per-camera independent physics)
# ─────────────────────────────────────────────────────────────────────────────
class SimCameraState:
    """Maintains continuous physics state for one simulated camera."""

    def __init__(self, profile: CameraProfile):
        self.profile = profile
        self.vehicles = float(profile.base_vehicles)
        self._lock = threading.Lock()
        self._last_tick = time.time()

    def tick(self) -> Dict[str, Any]:
        """Advance simulation one step, return new metrics dict."""
        with self._lock:
            p = self.profile
            # Random walk with mean reversion
            delta = random.gauss(0, p.vehicle_variance * 0.5)
            reversion = (p.base_vehicles - self.vehicles) * p.mean_reversion
            self.vehicles = max(5.0, min(92.0, self.vehicles + delta + reversion))

            total = int(round(self.vehicles))
            cars, motos, buses, trucks = _mix(total, p)
            status = _derive_status(total)
            speed = _speed_from_vehicles(total)
            queue = max(0, round(total * 0.38 * (1.0 - speed / 60.0)))
            flow = max(5, round(total * speed / 55.0))

            return {
                "camId":          p.cam_id,
                "junctionId":     p.junction_id,
                "sourceType":     "simulation",
                "status":         "OK",
                "vehicles":       total,
                "cars":           cars,
                "motorcycles":    motos,
                "buses":          buses,
                "trucks":         trucks,
                "emergencyVehicles": 0,
                "queue":          queue,
                "speed":          speed,
                "flow":           flow,
                "congestion":     status,
                "fps":            30,
                "inferenceMs":    0.0,
                "timestamp":      time.strftime("%H:%M:%S"),
            }

    def get_metrics(self) -> Dict[str, Any]:
        return self.tick()


# ─────────────────────────────────────────────────────────────────────────────
# Moving vehicle for the MJPEG canvas animation
# ─────────────────────────────────────────────────────────────────────────────
@dataclass
class AnimVehicle:
    x: float
    y: float
    vx: float         # pixels per frame
    width: int
    height: int
    color: tuple      # BGR
    label: str
    track_id: int
    lane: int         # which visual lane (0-3)
    conf: float = 0.92

    def move(self, frame_w: int):
        self.x += self.vx
        if self.vx > 0 and self.x > frame_w + self.width:
            self.x = -self.width - random.randint(20, 120)
        elif self.vx < 0 and self.x < -self.width - 20:
            self.x = frame_w + random.randint(20, 120)


# ─────────────────────────────────────────────────────────────────────────────
# MJPEG frame generator for simulated cameras
# ─────────────────────────────────────────────────────────────────────────────

_SIM_COLORS = {
    "car":        (16,  185, 129),   # emerald
    "motorcycle": (245, 158,  11),   # amber
    "bus":        (  6, 182, 212),   # cyan
    "truck":      (168,  85, 247),   # purple
}

_NEXT_TRACK_ID = 1000


def _new_track_id() -> int:
    global _NEXT_TRACK_ID
    _NEXT_TRACK_ID += 1
    return _NEXT_TRACK_ID


def _spawn_vehicle(frame_w: int, frame_h: int, lane: int, profile: CameraProfile) -> AnimVehicle:
    """Create one animated vehicle on a given lane."""
    global _NEXT_TRACK_ID
    # Lane positions — perspective: lanes fan from vanishing point
    lane_pct = [0.38, 0.46, 0.56, 0.66]
    base_y = int(frame_h * lane_pct[lane % len(lane_pct)])
    y = base_y + random.randint(-4, 4)

    # Speed is proportional to lane perspective depth
    depth = (y - frame_h * 0.3) / (frame_h * 0.7)  # 0→top, 1→bottom
    base_speed = random.uniform(1.2, 3.8) * (0.4 + 0.6 * depth)

    # Direction: 2 leftbound lanes, 2 rightbound
    if lane < 2:
        vx = base_speed
        x = -random.randint(40, 400)
    else:
        vx = -base_speed
        x = frame_w + random.randint(40, 400)

    # Pick vehicle type
    roll = random.random()
    tot = profile.car_ratio + profile.moto_ratio + profile.bus_ratio + profile.truck_ratio
    car_p = profile.car_ratio / tot
    moto_p = car_p + profile.moto_ratio / tot
    bus_p  = moto_p + profile.bus_ratio / tot

    if roll < car_p:
        vtype, w, h = "car",        int(36 * (0.7 + 0.6*depth)), int(18 * (0.7 + 0.6*depth))
    elif roll < moto_p:
        vtype, w, h = "motorcycle", int(18 * (0.7 + 0.6*depth)), int(12 * (0.7 + 0.6*depth))
    elif roll < bus_p:
        vtype, w, h = "bus",        int(56 * (0.7 + 0.6*depth)), int(22 * (0.7 + 0.6*depth))
    else:
        vtype, w, h = "truck",      int(50 * (0.7 + 0.6*depth)), int(20 * (0.7 + 0.6*depth))

    color = _SIM_COLORS[vtype]
    conf  = round(random.uniform(0.88, 0.99), 2)
    tid   = _new_track_id()

    return AnimVehicle(
        x=x, y=y, vx=vx,
        width=max(w, 8), height=max(h, 6),
        color=color, label=vtype.capitalize(), track_id=tid, lane=lane, conf=conf
    )


def generate_simulated_mjpeg(
    cam_id: str,
    stop_event: Optional[threading.Event] = None
) -> Generator[bytes, None, None]:
    """
    Generates continuous MJPEG frames for a simulated camera.
    Draws animated vehicles over a procedural road scene.
    """
    profile = CAMERA_PROFILES.get(cam_id)
    if profile is None:
        # Fallback: black frame with error text
        err = np.zeros((240, 426, 3), dtype=np.uint8)
        cv2.putText(err, f"SIMULATION OFFLINE ({cam_id})", (10, 120),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 200), 1)
        _, jpg = cv2.imencode('.jpg', err)
        while True:
            if stop_event and stop_event.is_set(): return
            yield b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + jpg.tobytes() + b'\r\n'
            time.sleep(0.5)

    W, H = 426, 240
    LANES = 4

    # Initialise vehicles (start with a natural count)
    vehicles: list[AnimVehicle] = []
    init_count = min(profile.base_vehicles // 3, 18)
    for lane in range(LANES):
        for _ in range(max(1, init_count // LANES)):
            vehicles.append(_spawn_vehicle(W, H, lane, profile))

    # Physics state
    sim_state = SimCameraState(profile)
    current_total = profile.base_vehicles
    frame_idx = 0
    physics_tick = 0

    # Vanishing point
    vp_x, vp_y = W // 2, int(H * 0.32)

    while True:
        if stop_event and stop_event.is_set():
            return

        frame = np.zeros((H, W, 3), dtype=np.uint8)

        # ── Draw sky gradient ─────────────────────────────────────────────
        sky_top = np.array([12, 14, 16], dtype=np.float32)
        sky_bot = np.array([20, 24, 28], dtype=np.float32)
        for row in range(vp_y):
            t = row / max(vp_y, 1)
            c = (sky_top * (1 - t) + sky_bot * t).astype(np.uint8)
            frame[row, :] = c

        # ── Draw road surface ─────────────────────────────────────────────
        road_pts = np.array([
            [0, H], [W, H], [int(W*0.75), vp_y], [int(W*0.25), vp_y]
        ], dtype=np.int32)
        cv2.fillConvexPoly(frame, road_pts, profile.road_color)

        # ── Road lane markings (perspective converging) ───────────────────
        lane_x_bottom = [int(W * f) for f in [0.22, 0.38, 0.50, 0.62, 0.78]]
        lane_x_top    = [int(W * f) for f in [0.32, 0.40, 0.50, 0.60, 0.68]]
        for i in range(len(lane_x_bottom)):
            cv2.line(frame, (lane_x_bottom[i], H), (lane_x_top[i], vp_y),
                     profile.lane_color, 1, cv2.LINE_AA)

        # Centre dashed line
        dash_len = 12
        for seg in range(16):
            t0 = seg / 16.0
            t1 = (seg + 0.5) / 16.0
            x0 = int(vp_x + (W*0.5 - vp_x) * t0)
            y0 = int(vp_y + (H - vp_y) * t0)
            x1 = int(vp_x + (W*0.5 - vp_x) * t1)
            y1 = int(vp_y + (H - vp_y) * t1)
            cv2.line(frame, (x0, y0), (x1, y1), (80, 90, 100), 1, cv2.LINE_AA)

        # ── Physics tick every 15 frames ─────────────────────────────────
        physics_tick += 1
        if physics_tick >= 15:
            physics_tick = 0
            metrics = sim_state.tick()
            current_total = metrics["vehicles"]

        # Adjust vehicle count to match simulation
        target_on_screen = min(current_total // 2, 22)
        if len(vehicles) < target_on_screen:
            lane = random.randint(0, LANES - 1)
            vehicles.append(_spawn_vehicle(W, H, lane, profile))
        elif len(vehicles) > target_on_screen + 4:
            vehicles.pop(random.randrange(len(vehicles)))

        # ── Move + draw vehicles (sorted by Y for depth) ──────────────────
        vehicles.sort(key=lambda v: v.y)
        for v in vehicles:
            v.move(W)
            x1 = int(v.x)
            y1 = int(v.y - v.height // 2)
            x2 = x1 + v.width
            y2 = y1 + v.height
            # Clip
            if x2 < 0 or x1 > W or y2 < vp_y - 4: continue

            # Box
            cv2.rectangle(frame, (x1, max(y1, 0)), (min(x2, W-1), min(y2, H-1)),
                          v.color, 1)
            # Label above box
            label_str = f"{v.label[:3]}#{v.track_id % 100} {v.conf}"
            lx, ly = x1, max(y1 - 4, 10)
            font_scale = max(0.28, min(0.42, 0.28 + 0.14 * (v.y - vp_y) / (H - vp_y)))
            (tw, th), _ = cv2.getTextSize(label_str, cv2.FONT_HERSHEY_SIMPLEX, font_scale, 1)
            cv2.rectangle(frame, (lx, ly - th - 2), (lx + tw + 4, ly + 2), v.color, -1)
            cv2.putText(frame, label_str, (lx + 2, ly),
                        cv2.FONT_HERSHEY_SIMPLEX, font_scale, (0, 0, 0), 1, cv2.LINE_AA)

        # ── HUD overlay ───────────────────────────────────────────────────
        metrics_now = sim_state.get_metrics() if physics_tick == 0 else {}
        veh_display = current_total
        status_display = _derive_status(veh_display)
        fps_display = 30

        cv2.rectangle(frame, (6, 6), (220, 56), (10, 12, 14), -1)
        cv2.rectangle(frame, (6, 6), (220, 56), (6, 182, 212), 1)  # cyan border

        hud1 = f"LIVE \u2022 SIMULATION  |  {cam_id}"
        hud2 = f"Vehicles: {veh_display}  |  Status: {status_display}"
        hud3 = f"FPS: {fps_display}  |  {time.strftime('%H:%M:%S')}"

        cv2.putText(frame, hud1, (10, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.38,
                    (6, 182, 212), 1, cv2.LINE_AA)
        cv2.putText(frame, hud2, (10, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.34,
                    (245, 158, 11), 1, cv2.LINE_AA)
        cv2.putText(frame, hud3, (10, 49), cv2.FONT_HERSHEY_SIMPLEX, 0.30,
                    (160, 170, 175), 1, cv2.LINE_AA)

        # ── Encode + yield ────────────────────────────────────────────────
        _, jpg = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 72])
        yield b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + jpg.tobytes() + b'\r\n'

        frame_idx += 1
        time.sleep(0.033)   # ~30 fps target


# ─────────────────────────────────────────────────────────────────────────────
# Camera Manager — singleton orchestrator
# ─────────────────────────────────────────────────────────────────────────────
class CameraManager:
    """
    Singleton.  Owns all SimCameraState instances (CAM-02 → CAM-12).
    Runs a background ticker that pushes camera metrics → state_manager.
    CAM-01 delegates to vehicle_detection.LocalYOLOVehicleDetector.
    """
    _instance = None
    _init_lock = threading.Lock()

    def __new__(cls):
        with cls._init_lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._setup()
            return cls._instance

    def _setup(self):
        self._sim_states: Dict[str, SimCameraState] = {
            cam_id: SimCameraState(profile)
            for cam_id, profile in CAMERA_PROFILES.items()
        }
        self._ticker = threading.Thread(target=self._tick_loop, daemon=True)
        self._ticker.start()
        logger.info("[CameraManager] Started — CAM-02→CAM-12 simulation active.")

    def get_sim_metrics(self, cam_id: str) -> Optional[Dict[str, Any]]:
        """Return current simulated metrics for a camera."""
        state = self._sim_states.get(cam_id)
        if state:
            return state.get_metrics()
        return None

    def get_all_sim_metrics(self) -> Dict[str, Dict[str, Any]]:
        return {cam_id: s.get_metrics() for cam_id, s in self._sim_states.items()}

    def generate_sim_stream(self, cam_id: str) -> Generator[bytes, None, None]:
        """Returns MJPEG frame generator for a simulated camera."""
        return generate_simulated_mjpeg(cam_id)

    def _tick_loop(self):
        """
        Background ticker: every JUNCTION_TICK_INTERVAL seconds,
        push real YOLO (CAM-01) and simulated (CAM-02→CAM-12) camera metrics
        into the central StateManager so they flow through /ws/live to the React frontend.
        """
        from services.state_manager import state_manager
        from services.vehicle_detection import _yolo_detector, get_all_vehicle_classifications

        TICK_INTERVAL = Config.JUNCTION_TICK_INTERVAL  # reuse existing 4 s interval

        while True:
            time.sleep(TICK_INTERVAL)
            try:
                # 1. Process CAM-01 Real YOLO detection
                cam1_det = None
                try:
                    cam1_det = _yolo_detector.get_detection()
                except Exception as ex:
                    logger.warning(f"[CameraManager] CAM-01 YOLO error: {ex}")

                if cam1_det and cam1_det.get("status") == "OK":
                    veh1 = cam1_det.get("total", 0)
                    speed1 = max(10, 50 - int(veh1 * 0.6))
                    queue1 = max(0, int(veh1 * 0.35))
                    status1 = "CRITICAL" if veh1 > 60 else "HIGH" if veh1 > 40 else "MODERATE" if veh1 > 25 else "SMOOTH"
                    state_manager.update_junction("J1", {
                        "vehicles": veh1,
                        "queue": queue1,
                        "speed": speed1,
                        "flow": max(5, int(veh1 * speed1 / 55.0)),
                        "status": status1,
                        "cameraSource": "real_yolo",
                    }, notify=False)
                    get_all_vehicle_classifications()  # Updates yolo_metrics in state_manager
                elif cam1_det and cam1_det.get("status") == "ERROR":
                    state_manager.update_junction("J1", {
                        "status": "OFFLINE",
                        "cameraSource": "real_yolo",
                    }, notify=False)

                # 2. Process CAM-02 -> CAM-12 simulated traffic
                for cam_id, sim_state in self._sim_states.items():
                    metrics = sim_state.tick()
                    jid = metrics["junctionId"]

                    # Update the corresponding junction in central state
                    state_manager.update_junction(jid, {
                        "vehicles": metrics["vehicles"],
                        "queue":    metrics["queue"],
                        "speed":    metrics["speed"],
                        "flow":     metrics["flow"],
                        "status":   metrics["congestion"],
                        "cameraSource": "simulation",
                    }, notify=False)   # suppress individual notify; batch below

                # 3. Update cameras array in state
                cameras = state_manager.get_cameras()
                for cam in cameras:
                    cid = cam.get("id", "")
                    if cid == "CAM-01":
                        cam["sourceType"] = "real_yolo"
                        if cam1_det and cam1_det.get("status") == "OK":
                            veh = cam1_det.get("total", 0)
                            cam["vehicles"]     = veh
                            cam["status"]       = "OK"
                            cam["congestion"]   = "CRITICAL" if veh > 60 else "HIGH" if veh > 40 else "MODERATE" if veh > 25 else "SMOOTH"
                            cam["fps"]          = cam1_det.get("fps", 30)
                            cam["inferenceMs"]  = cam1_det.get("inferenceMs", 0.0)
                            cam["timestamp"]    = cam1_det.get("timestamp", time.strftime("%H:%M:%S"))
                        else:
                            cam["status"]       = "OFFLINE"
                            cam["error"]        = cam1_det.get("error", "YOLO engine offline") if cam1_det else "YOLO offline"
                        continue
                    metrics = self.get_sim_metrics(cid)
                    if metrics:
                        cam["sourceType"]   = "simulation"
                        cam["vehicles"]     = metrics["vehicles"]
                        cam["status"]       = "OK"
                        cam["congestion"]   = metrics["congestion"]
                        cam["fps"]          = 30
                        cam["timestamp"]    = metrics["timestamp"]

                state_manager.update_cameras(cameras, notify=False)
                # One broadcast for the whole batch
                state_manager.broadcast_state("TICK")

            except Exception as exc:
                logger.warning(f"[CameraManager] tick error: {exc}")


# Global singleton — imported by traffic_routes.py
camera_manager = CameraManager()

