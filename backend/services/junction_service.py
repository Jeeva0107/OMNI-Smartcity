"""
Junction Data Service
---------------------------------------------------------------------------
Responsibility: Manage junction state, serve live telemetry, apply signal
transitions, and trigger central state updates.
---------------------------------------------------------------------------
"""
import random
import time
import threading
from config import Config
from services.state_manager import state_manager

def _derive_status(vehicles: int) -> str:
    if vehicles > 60: return "CRITICAL"
    if vehicles > 40: return "HIGH"
    if vehicles > 25: return "MODERATE"
    return "SMOOTH"


def _derive_recommendation(j: dict) -> tuple[str, str]:
    """
    Derive dynamic AI signal recommendation and rationale based on junction telemetry.
    Returns (recommendedSignal, recommendedReason).
    """
    sig = j.get("signal", "RED")
    status = j.get("status", "SMOOTH")
    queue = j.get("queue", 0)

    if sig == "YELLOW":
        return "ALL_RED", "Clearance yellow active. AI recommends ALL_RED safety interval before cross-street green."

    if sig == "ALL_RED":
        return "GREEN", "All-red clearance interval complete. AI recommends initiating green phase for highest-queue approach."

    if sig == "RED":
        if status in ["CRITICAL", "HIGH"] or queue >= 10:
            return "GREEN", f"Heavy approach queue detected ({queue} vehicles). AI recommends transitioning signal to GREEN."
        if status == "MODERATE" or queue >= 5:
            return "GREEN", f"Approach wait threshold reached ({queue} vehicles). AI recommends green phase."
        return "RED", f"Opposing cross-street currently on green phase. Maintain red phase (queue: {queue})."

    if sig == "GREEN":
        if status in ["CRITICAL", "HIGH"] or queue >= 15:
            return "GREEN", f"High approach queue on green phase ({queue} vehicles). AI recommends extending green duration."
        if status == "SMOOTH" and queue <= 6:
            return "RED", f"Approach queue cleared ({queue} vehicles). AI recommends transitioning green phase to cross-street for traffic fairness."
        return "GREEN", "Moderate flow on green phase. Maintain green signal."

    return "GREEN", "AI decision support active."


# ── Public API ────────────────────────────────────────────────────────────────
def get_all_junctions() -> list:
    """Return snapshot of all junction telemetry from central state."""
    return state_manager.get_junctions()


def get_junction_by_id(junction_id: str) -> dict | None:
    """Return a single junction by ID from central state, or None."""
    return state_manager.get_junction(junction_id)


def apply_signal(junction_id: str, target_signal: str) -> dict:
    """
    Apply a new signal state to a junction.
    Mirrors the frontend transition: CURRENT → YELLOW → ALL_RED → target.
    Updates central state and broadcasts WebSocket notification.
    """
    def _phase_update(signal_value, delay=0):
        if delay:
            time.sleep(delay)
        
        j = state_manager.get_junction(junction_id)
        if not j:
            return
        
        updates = {"signal": signal_value}
        if signal_value == target_signal:
            updates["recommendedSignal"] = target_signal
            if target_signal == "GREEN":
                updates["queue"] = max(2, j.get("queue", 4) - 8)
                updates["status"] = _derive_status(j.get("vehicles", 30))
        
        state_manager.update_junction(junction_id, updates, notify=True)

    # Phase 1: YELLOW immediately
    _phase_update("YELLOW")

    # Phase 2 and 3 run asynchronously so the HTTP response is fast
    def _async_transition():
        _phase_update("ALL_RED", delay=1.5)
        _phase_update(target_signal, delay=1.5)

    t = threading.Thread(target=_async_transition, daemon=True)
    t.start()

    return state_manager.get_junction(junction_id) or {}


def spike_congestion(junction_id: str = "J5") -> dict:
    """Simulate a sudden congestion spike — updates central live state."""
    updates = {
        "status": "CRITICAL",
        "vehicles": 82,
        "queue": 38,
        "speed": 8,
        "signal": "RED",
        "recommendedSignal": "GREEN",
        "recommendedReason": "Urgent queue dissipation recommended by AI Vision engine.",
    }
    updated = state_manager.update_junction(junction_id, updates, notify=True)
    if updated:
        state_manager.push_event(
            category="TRAFFIC",
            location=junction_id,
            title="Heavy Congestion Spike Triggered",
            description=f"Simulated congestion spike on junction {junction_id}. Speed dropped to 8 km/h.",
            severity="WARNING",
            status="INVESTIGATING"
        )
        return updated
    return {"error": f"Junction {junction_id} not found"}


# ── Background simulation ticker ──────────────────────────────────────────────
def _tick():
    """Runs in a daemon thread. Syncs real YOLO telemetry or simulates interval fluctuations."""
    from services.vehicle_detection import get_vehicle_counts_for_junction
    while True:
        time.sleep(Config.JUNCTION_TICK_INTERVAL)
        junctions = state_manager.get_junctions()
        for j in junctions:
            jid = j["id"]
            if Config.USE_REAL_YOLO and jid == "J1":
                det = get_vehicle_counts_for_junction("J1")
                if det.get("status") == "OK":
                    yolo_veh = det.get("total", 0)
                    state_manager.update_junction(jid, {
                        "vehicles": max(1, yolo_veh),
                        "queue": max(0, int(yolo_veh * 0.4)),
                        "status": _derive_status(max(1, yolo_veh)),
                        "yoloSource": "real_yolo"
                    }, notify=False)
                    continue
            
            delta = random.randint(-2, 3)
            new_veh = max(5, min(95, j.get("vehicles", 20) + delta))
            new_queue = max(1, min(new_veh - 4, round(new_veh * 0.4)))
            new_status = _derive_status(new_veh)
            
            state_manager.update_junction(jid, {
                "vehicles": new_veh,
                "queue": new_queue,
                "status": new_status,
            }, notify=False)
            
        # Broadcast full state update once per ticker loop
        state_manager.broadcast_state("TICK")


_ticker_thread = threading.Thread(target=_tick, daemon=True)
_ticker_thread.start()
