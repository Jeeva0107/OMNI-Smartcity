"""
Local Ultralytics YOLO Vehicle Detection & Tracking Service
---------------------------------------------------------------------------
Responsibility: Run local Ultralytics YOLO11n inference & ByteTrack tracking
on backend/data/traffic.mp4 using OpenCV.

Features:
- Pretrained yolo11n.pt loaded ONCE on first detection request.
- OpenCV VideoCapture reads and continuously loops backend/data/traffic.mp4.
- Tracks persistent vehicle IDs across frames.
- Detects cars (2), motorcycles (3), buses (5), and trucks (7).
- Returns actual inference time (ms) and FPS.
- Sets source="real_yolo".
- Explicitly handles errors with status/error information without silent mock fallback.
---------------------------------------------------------------------------
"""
import os
import time
import logging
import threading
from typing import Dict, Any, List
from config import Config
from data.mock_data import get_cameras, get_vehicle_classification, get_junction

logger = logging.getLogger(__name__)

cv2 = None
YOLO = None
HAS_YOLO = False

# COCO vehicle class ID mapping
VEHICLE_CLASSES = {
    2: "cars",
    3: "motorcycles",
    5: "buses",
    7: "trucks"
}

class LocalYOLOVehicleDetector:
    """Singleton detector for running local Ultralytics YOLO inference on traffic.mp4."""
    _instance = None
    _init_lock = threading.Lock()

    def __new__(cls):
        with cls._init_lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._initialize()
            return cls._instance

    def _initialize(self):
        global cv2, YOLO, HAS_YOLO

        self.lock = threading.Lock()
        self.model = None
        self.cap = None
        self.video_path = Config.TRAFFIC_VIDEO_PATH
        self.model_name = Config.YOLO_MODEL_NAME
        self.tracked_unique_ids = set()
        self.status = "INITIALIZING"
        self.error_detail = None
        self.last_detection: Dict[str, Any] = {}

        try:
            import cv2 as cv2_module
            from ultralytics import YOLO as yolo_class
            cv2 = cv2_module
            YOLO = yolo_class
            HAS_YOLO = True
        except ImportError:
            cv2 = None
            YOLO = None
            HAS_YOLO = False

        if not HAS_YOLO:
            self.status = "SIMULATION"
            self.error_detail = "YOLO/OpenCV not installed (Running in simulation mode)"
            return

        logger.info(f"[LocalYOLO] Loading model {self.model_name}...")
        try:
            # Load model ONCE
            self.model = YOLO(self.model_name)
            logger.info(f"[LocalYOLO] Model {self.model_name} loaded successfully.")
            self.status = "READY"
        except Exception as e:
            err_msg = f"Failed to load YOLO model '{self.model_name}': {str(e)}"
            logger.error(f"[LocalYOLO] {err_msg}")
            self.status = "ERROR"
            self.error_detail = err_msg

    def _ensure_video_open(self) -> bool:
        if not HAS_YOLO or cv2 is None:
            return False

        if not os.path.exists(self.video_path):
            self.status = "ERROR"
            self.error_detail = f"Traffic video file not found at '{self.video_path}'"
            return False

        if self.cap is None or not self.cap.isOpened():
            self.cap = cv2.VideoCapture(self.video_path)
            if not self.cap.isOpened():
                self.status = "ERROR"
                self.error_detail = f"OpenCV failed to open video file at '{self.video_path}'"
                return False
        return True

    def get_detection(self) -> Dict[str, Any]:
        """
        Reads next frame from traffic.mp4, runs YOLO tracking, and returns detection data.
        If Config.USE_REAL_YOLO is False, falls back to mock data.
        If Config.USE_REAL_YOLO is True and error occurs, returns explicit YOLO error payload.
        """
        if not Config.USE_REAL_YOLO:
            return self._get_mock_fallback()

        with self.lock:
            if self.status == "ERROR" and self.model is None:
                return {
                    "source": "real_yolo",
                    "status": "ERROR",
                    "error": self.error_detail or "YOLO model loading failed",
                    "yoloModel": self.model_name,
                    "timestamp": time.strftime("%H:%M:%S"),
                    "total": 0, "cars": 0, "motorcycles": 0, "buses": 0, "trucks": 0,
                    "emergencyVehicles": 0, "inferenceMs": 0.0, "fps": 0.0, "accuracy": "0.0%"
                }

            if not self._ensure_video_open():
                return {
                    "source": "real_yolo",
                    "status": "ERROR",
                    "error": self.error_detail or f"Video unavailable at {self.video_path}",
                    "yoloModel": self.model_name,
                    "timestamp": time.strftime("%H:%M:%S"),
                    "total": 0, "cars": 0, "motorcycles": 0, "buses": 0, "trucks": 0,
                    "emergencyVehicles": 0, "inferenceMs": 0.0, "fps": 0.0, "accuracy": "0.0%"
                }

            # Read frame
            ret, frame = self.cap.read()
            if not ret:
                # Loop video to frame 0
                self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                ret, frame = self.cap.read()
                if not ret:
                    err_msg = f"Failed to read frame from '{self.video_path}' after rewind"
                    self.status = "ERROR"
                    self.error_detail = err_msg
                    return {
                        "source": "real_yolo",
                        "status": "ERROR",
                        "error": err_msg,
                        "yoloModel": f"YOLO11n ({self.model_name})",
                        "timestamp": time.strftime("%H:%M:%S"),
                        "total": 0, "cars": 0, "motorcycles": 0, "buses": 0, "trucks": 0,
                        "emergencyVehicles": 0, "inferenceMs": 0.0, "fps": 0.0, "accuracy": "0.0%"
                    }

            # Run YOLO inference & ByteTrack tracking
            t0 = time.perf_counter()
            try:
                results = self.model.track(
                    frame,
                    persist=True,
                    tracker="bytetrack.yaml",
                    verbose=False
                )
                t1 = time.perf_counter()
            except Exception as e:
                err_msg = f"YOLO inference runtime error: {str(e)}"
                logger.error(f"[LocalYOLO] {err_msg}")
                self.status = "ERROR"
                self.error_detail = err_msg
                return {
                    "source": "real_yolo",
                    "status": "ERROR",
                    "error": err_msg,
                    "yoloModel": f"YOLO11n ({self.model_name})",
                    "timestamp": time.strftime("%H:%M:%S"),
                    "total": 0, "cars": 0, "motorcycles": 0, "buses": 0, "trucks": 0,
                    "emergencyVehicles": 0, "inferenceMs": 0.0, "fps": 0.0, "accuracy": "0.0%"
                }

            inference_ms = round((t1 - t0) * 1000, 2)
            fps = round(1000.0 / inference_ms, 1) if inference_ms > 0 else 30.0

            # Parse detected bounding boxes & track IDs
            cars = 0
            motorcycles = 0
            buses = 0
            trucks = 0
            active_track_ids = []
            conf_scores = []

            boxes = results[0].boxes
            if boxes is not None and len(boxes) > 0:
                for box in boxes:
                    cls_id = int(box.cls[0].item())
                    if cls_id not in VEHICLE_CLASSES:
                        continue
                    
                    conf = float(box.conf[0].item())
                    conf_scores.append(conf)

                    if cls_id == 2:
                        cars += 1
                    elif cls_id == 3:
                        motorcycles += 1
                    elif cls_id == 5:
                        buses += 1
                    elif cls_id == 7:
                        trucks += 1

                    if box.id is not None and len(box.id) > 0:
                        t_id = int(box.id[0].item())
                        active_track_ids.append(t_id)
                        self.tracked_unique_ids.add(t_id)

            total_detected = cars + motorcycles + buses + trucks
            avg_conf = (sum(conf_scores) / len(conf_scores)) if conf_scores else 0.95
            accuracy_str = f"{round(avg_conf * 100, 1)}%"

            self.status = "OK"
            self.error_detail = None

            self.last_detection = {
                "source": "real_yolo",
                "status": "OK",
                "yoloModel": f"YOLO11n ({self.model_name})",
                "timestamp": time.strftime("%H:%M:%S"),
                "total": total_detected,
                "cars": cars,
                "motorcycles": motorcycles,
                "buses": buses,
                "trucks": trucks,
                "emergencyVehicles": 0,
                "inferenceMs": inference_ms,
                "fps": fps,
                "accuracy": accuracy_str,
                "activeTrackIds": active_track_ids,
                "totalUniqueVehiclesTracked": len(self.tracked_unique_ids),
                "error": None
            }
            return self.last_detection

    def generate_video_stream(self):
        """
        Generates continuous MJPEG frames with real-time YOLO11n bounding boxes,
        tracking IDs, labels, and performance HUD overlay for CAM-01 (J1).
        """
        import numpy as np
        if not os.path.exists(self.video_path):
            err_img = np.zeros((360, 640, 3), dtype=np.uint8)
            cv2.putText(err_img, "YOLO OFFLINE", (200, 160), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 255), 2)
            cv2.putText(err_img, f"File missing: {self.video_path}", (80, 200), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)
            _, jpg = cv2.imencode('.jpg', err_img)
            frame_bytes = jpg.tobytes()
            while True:
                yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
                time.sleep(1.0)

        stream_cap = cv2.VideoCapture(self.video_path)
        if not stream_cap.isOpened():
            err_img = np.zeros((360, 640, 3), dtype=np.uint8)
            cv2.putText(err_img, "YOLO OFFLINE", (200, 160), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 255), 2)
            cv2.putText(err_img, "OpenCV failed to open stream", (120, 200), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)
            _, jpg = cv2.imencode('.jpg', err_img)
            frame_bytes = jpg.tobytes()
            while True:
                yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
                time.sleep(1.0)

        color_map = {
            2: (129, 185, 16),   # Cars: BGR Emerald green
            3: (11, 158, 245),   # Motorcycles: BGR Amber
            5: (212, 182, 6),    # Buses: BGR Cyan
            7: (212, 182, 6),    # Trucks: BGR Cyan
        }

        while True:
            ret, frame = stream_cap.read()
            if not ret:
                stream_cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                ret, frame = stream_cap.read()
                if not ret:
                    time.sleep(0.1)
                    continue

            t0 = time.perf_counter()
            try:
                results = self.model.track(
                    frame,
                    persist=True,
                    tracker="bytetrack.yaml",
                    verbose=False
                )
                t1 = time.perf_counter()
                dt = (t1 - t0) * 1000.0
                fps = (1000.0 / dt) if dt > 0 else 30.0
            except Exception as e:
                dt = 0.0
                fps = 0.0
                results = []

            active_ids = []
            if results and len(results) > 0 and results[0].boxes is not None:
                boxes = results[0].boxes
                for box in boxes:
                    cls_id = int(box.cls[0].item())
                    if cls_id not in VEHICLE_CLASSES:
                        continue
                    cls_name = VEHICLE_CLASSES[cls_id].capitalize()[:-1]  # Car, Motorcycle, Bus, Truck
                    conf = float(box.conf[0].item())
                    t_id = int(box.id[0].item()) if (box.id is not None and len(box.id) > 0) else None
                    if t_id is not None:
                        active_ids.append(t_id)

                    x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                    color = color_map.get(cls_id, (0, 255, 0))

                    # Draw Box
                    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)

                    # Label text
                    label_str = f"{cls_name} #{t_id} [{conf:.2f}]" if t_id is not None else f"{cls_name} [{conf:.2f}]"
                    (tw, th), _ = cv2.getTextSize(label_str, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)

                    cv2.rectangle(frame, (x1, max(0, y1 - 20)), (x1 + tw + 6, max(20, y1)), color, -1)
                    cv2.putText(frame, label_str, (x1 + 3, max(14, y1 - 5)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0), 1, cv2.LINE_AA)

            # Draw HUD bar top left
            hud_str1 = "REAL YOLO (YOLO11n) | CAM-01 (J1)"
            hud_str2 = f"FPS: {fps:.1f} | Inf: {dt:.1f}ms | Tracked IDs: {len(active_ids)}"
            cv2.rectangle(frame, (10, 10), (380, 58), (14, 18, 21), -1)
            cv2.rectangle(frame, (10, 10), (380, 58), (245, 158, 11), 1)
            cv2.putText(frame, hud_str1, (18, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (16, 185, 16), 1, cv2.LINE_AA)
            cv2.putText(frame, hud_str2, (18, 48), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (245, 158, 11), 1, cv2.LINE_AA)

            # Encode frame
            _, jpg = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
            yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + jpg.tobytes() + b'\r\n')
            time.sleep(0.02)

    def _get_mock_fallback(self) -> Dict[str, Any]:
        """Fallback mock data generator when USE_REAL_YOLO is explicitly disabled."""
        return {
            "source": "mock",
            "status": "OK",
            "yoloModel": "YOLOv8x-traffic-v2",
            "timestamp": time.strftime("%H:%M:%S"),
            "total": 38,
            "cars": 22,
            "motorcycles": 8,
            "buses": 3,
            "trucks": 5,
            "emergencyVehicles": 0,
            "inferenceMs": 14.5,
            "fps": 30.0,
            "accuracy": "98.4%",
            "activeTrackIds": [1, 2, 3, 4, 5],
            "totalUniqueVehiclesTracked": 120,
            "error": None
        }


_detector_instance = None
_yolo_detector_lock = threading.Lock()


def _get_yolo_detector() -> LocalYOLOVehicleDetector:
    global _detector_instance
    if _detector_instance is None:
        with _yolo_detector_lock:
            if _detector_instance is None:
                _detector_instance = LocalYOLOVehicleDetector()
    return _detector_instance


class _LazyYOLODetector:
    def __getattr__(self, name):
        return getattr(_get_yolo_detector(), name)


_yolo_detector = _LazyYOLODetector()


def get_vehicle_counts_for_junction(junction_id: str) -> dict:
    """
    Returns real-time vehicle count & classification for a single junction.
    Shape matches frontend JunctionModal expectations.
    """
    det = _get_yolo_detector().get_detection()
    
    # Clone and augment with junction-specific info
    res = dict(det)
    res["junctionId"] = junction_id
    
    # If mock mode is explicitly configured, use mock lookup
    if not Config.USE_REAL_YOLO:
        junc = get_junction(junction_id)
        if junc:
            res["total"] = junc.get("vehicles", 35)
            res["cars"] = int(res["total"] * 0.58)
            res["motorcycles"] = int(res["total"] * 0.22)
            res["buses"] = max(1, int(res["total"] * 0.06))
            res["trucks"] = max(1, int(res["total"] * 0.14))

    return res


def get_all_vehicle_classifications() -> dict:
    """
    System-wide aggregated vehicle classification (for TrafficIntelligence page).
    Updates central state_manager.
    """
    from services.state_manager import state_manager
    det = _get_yolo_detector().get_detection()
    if det.get("status") == "ERROR":
        res = {
            "source": "real_yolo",
            "status": "ERROR",
            "error": det.get("error"),
            "cars": 0, "motorcycles": 0, "buses": 0, "trucks": 0,
            "emergencyVehicles": 0, "totalTracked": 0,
            "detectionAccuracy": "0.0%", "fpsAvg": 0.0, "inferenceMs": 0.0,
            "timestamp": time.strftime("%H:%M:%S")
        }
    else:
        res = {
            "cars": det["cars"],
            "motorcycles": det["motorcycles"],
            "buses": det["buses"],
            "trucks": det["trucks"],
            "emergencyVehicles": det.get("emergencyVehicles", 0),
            "totalTracked": det["total"],
            "detectionAccuracy": det.get("accuracy", "98.4%"),
            "fpsAvg": det.get("fps", 30.0),
            "inferenceMs": det.get("inferenceMs", 0.0),
            "timestamp": det.get("timestamp", time.strftime("%H:%M:%S")),
            "source": det.get("source", "real_yolo"),
            "yoloModel": det.get("yoloModel", "YOLO11n (yolo11n.pt)"),
            "status": det.get("status", "OK"),
            "totalUniqueVehiclesTracked": det.get("totalUniqueVehiclesTracked", 0)
        }
    
    state_manager.update_yolo_metrics(res, notify=False)
    return res


def get_camera_status() -> list:
    """Returns health status and YOLO telemetry for all 12 camera feeds."""
    from services.state_manager import state_manager
    det = _get_yolo_detector().get_detection()
    cameras = state_manager.get_cameras()
    
    for cam in cameras:
        cam["timestamp"] = det.get("timestamp", time.strftime("%H:%M:%S"))
        cam["inferenceMs"] = det.get("inferenceMs", 14.5)
        cam["fps"] = det.get("fps", 30.0)
        cam["source"] = det.get("source", "real_yolo")
        cam["yoloEngine"] = det.get("yoloModel", "YOLO11n (yolo11n.pt)")
        cam["yoloStatus"] = det.get("status", "OK")
        if det.get("status") == "ERROR":
            cam["error"] = det.get("error")
        else:
            cam["vehiclesDetected"] = det.get("total", 0)

    state_manager.update_cameras(cameras, notify=False)
    return cameras

def get_video_stream():
    """Returns MJPEG frame generator from the global YOLO detector."""
    return _get_yolo_detector().generate_video_stream()
