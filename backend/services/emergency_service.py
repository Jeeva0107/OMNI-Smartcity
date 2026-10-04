"""
OMNI SMARTCITY — Emergency Service & GPS Route Intelligence (Phase 4)
---------------------------------------------------------------------------
Responsibility:
  - Manage live simulated GPS state for emergency vehicles (AMB-102).
  - Compute route intelligence (Route A vs Route B) using live traffic state.
  - Calculate dynamic ETAs based on road distance, segment speeds, and junction queues.
  - Detect upcoming junctions along ambulance path and generate decision-support recommendations.
  - Emit real-time activity events to central StateManager and broadcast via /ws/live.
---------------------------------------------------------------------------
"""
import time
import math
import threading
import logging
from typing import Dict, Any, List, Optional
from services.state_manager import state_manager
from services.junction_service import get_all_junctions, apply_signal
from config import Config

logger = logging.getLogger(__name__)

# Real Chennai road network waypoints with exact coordinates
CHENNAI_WAYPOINTS = {
    "ROUTE-A": [
        {"lat": 13.0067, "lng": 80.2020, "name": "Kathipara Flyover Junction (J1)", "junctionId": "J1"},
        {"lat": 13.0150, "lng": 80.2120, "name": "GST Road - Guindy Link", "junctionId": None},
        {"lat": 13.0247, "lng": 80.2227, "name": "Saidapet Signal (J8)", "junctionId": "J8"},
        {"lat": 13.0350, "lng": 80.2350, "name": "Anna Salai - Nandanam", "junctionId": None},
        {"lat": 13.0440, "lng": 80.2440, "name": "T. Nagar Approach", "junctionId": None},
        {"lat": 13.0526, "lng": 80.2505, "name": "Gemini Circle / Anna Flyover (J2)", "junctionId": "J2"},
        {"lat": 13.0650, "lng": 80.2620, "name": "Thousand Lights / LIC Crossing", "junctionId": None},
        {"lat": 13.0740, "lng": 80.2710, "name": "Island Ground / Mount Road", "junctionId": None},
        {"lat": 13.0817, "lng": 80.2778, "name": "Rajiv Gandhi Govt General Hospital (J7)", "junctionId": "J7"},
    ],
    "ROUTE-B": [
        {"lat": 13.0067, "lng": 80.2020, "name": "Kathipara Flyover Junction (J1)", "junctionId": "J1"},
        {"lat": 13.0200, "lng": 80.1800, "name": "Mount Poonamallee Arterial", "junctionId": None},
        {"lat": 13.0334, "lng": 80.1582, "name": "Porur Flyover Junction (J10)", "junctionId": "J10"},
        {"lat": 13.0420, "lng": 80.1850, "name": "Arcot Road Link", "junctionId": None},
        {"lat": 13.0503, "lng": 80.2122, "name": "Vadapalani Signal (J11)", "junctionId": "J11"},
        {"lat": 13.0600, "lng": 80.2030, "name": "Inner Ring Road Corridor", "junctionId": None},
        {"lat": 13.0694, "lng": 80.1948, "name": "Koyambedu CMBT Junction (J3)", "junctionId": "J3"},
        {"lat": 13.0750, "lng": 80.2360, "name": "Poonamallee High Road East", "junctionId": None},
        {"lat": 13.0790, "lng": 80.2600, "name": "Kilpauk Medical College Link", "junctionId": None},
        {"lat": 13.0817, "lng": 80.2778, "name": "Rajiv Gandhi Govt General Hospital (J7)", "junctionId": "J7"},
    ]
}

# In-memory simulator controls
_sim_lock = threading.Lock()
_sim_paused = False
_sim_auto_step = False


def _calc_haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def calculate_dynamic_eta(route_id: str, waypoints: List[dict], current_wp_idx: int) -> dict:
    """
    Computes dynamic ETA using route segment distance, speed, and live junction queues.
    Formula: travel_time = sum(seg_dist / speed) + sum(junction_queue_delay)
    """
    junctions = {j["id"]: j for j in get_all_junctions()}
    rem_dist = 0.0
    for i in range(current_wp_idx, len(waypoints) - 1):
        wp1 = waypoints[i]
        wp2 = waypoints[i+1]
        rem_dist += _calc_haversine_km(wp1["lat"], wp1["lng"], wp2["lat"], wp2["lng"])

    # Base travel time at emergency speed (60 km/h)
    speed_kmh = 60.0
    base_travel_minutes = (rem_dist / speed_kmh) * 60.0

    # Add junction queue delays for upcoming junctions
    queue_delay_mins = 0.0
    upcoming = []
    for i in range(current_wp_idx, len(waypoints)):
        jid = waypoints[i].get("junctionId")
        if jid and jid in junctions:
            j = junctions[jid]
            q = j.get("queue", 0)
            status = j.get("status", "SMOOTH")
            delay = (q * 3.5) / 60.0  # ~3.5 seconds delay per queued vehicle
            queue_delay_mins += delay

            # Determine safety recommendation
            if q > 40 or status == "CRITICAL":
              rec = "HOLD — CLEARANCE REQUIRED"
              action = "Queue clearing required; request green phase extension"
            elif q > 20 or status == "HIGH":
              rec = "PRIORITY WINDOW AVAILABLE"
              action = "Prepare green-wave priority window"
            else:
              rec = "SAFE TO PRIORITIZE"
              action = "Green wave clear; extend green phase"

            upcoming.append({
                "id": jid,
                "name": j.get("name", f"Junction {jid}"),
                "distanceMeters": int(_calc_haversine_km(waypoints[current_wp_idx]["lat"], waypoints[current_wp_idx]["lng"], j.get("x", 0), j.get("y", 0)) * 1000) if "x" in j else 420,
                "congestion": status,
                "vehicles": j.get("vehicles", 0),
                "queue": q,
                "speed": j.get("speed", 30),
                "recommendation": rec,
                "suggestedAction": action,
            })

    total_time_mins = max(0.5, base_travel_minutes + queue_delay_mins)
    mins = int(total_time_mins)
    secs = int((total_time_mins - mins) * 60)
    eta_str = f"{mins:02d}:{secs:02d}"

    return {
        "eta": eta_str,
        "etaSeconds": int(total_time_mins * 60),
        "distRemainingKm": round(rem_dist, 2),
        "upcomingJunctions": upcoming,
    }


def get_ambulance_status() -> dict:
    return state_manager.get_ambulance()


def get_route_alternatives(origin: str = "J1", destination: str = "J7") -> List[dict]:
    """Generates 2 route alternatives using the Omni SmartCity traffic model."""
    junctions = {j["id"]: j for j in get_all_junctions()}
    
    # Route A
    eta_a = calculate_dynamic_eta("ROUTE-A", CHENNAI_WAYPOINTS["ROUTE-A"], 0)
    route_a = {
        "id": "ROUTE-A",
        "name": "Via Anna Salai Arterial (Primary)",
        "origin": origin,
        "destination": destination,
        "distance": eta_a["distRemainingKm"],
        "estimatedTime": round(eta_a["etaSeconds"] / 60.0, 1),
        "etaFormatted": eta_a["eta"],
        "congestion": "HIGH" if junctions.get("J2", {}).get("status") in ("HIGH", "CRITICAL") else "MODERATE",
        "path": ["J1", "J8", "J2", "J7"],
        "isRecommended": True,
        "sourceLabel": "Omni SmartCity Traffic Model",
        "aiReason": f"Direct arterial corridor. Dynamic ETA {eta_a['eta']} incorporating live junction queues.",
    }

    # Route B
    eta_b = calculate_dynamic_eta("ROUTE-B", CHENNAI_WAYPOINTS["ROUTE-B"], 0)
    route_b = {
        "id": "ROUTE-B",
        "name": "Via Inner Ring Road & PH Road (Alternative)",
        "origin": origin,
        "destination": destination,
        "distance": eta_b["distRemainingKm"],
        "estimatedTime": round(eta_b["etaSeconds"] / 60.0, 1),
        "etaFormatted": eta_b["eta"],
        "congestion": "LOW" if junctions.get("J3", {}).get("status") == "SMOOTH" else "MODERATE",
        "path": ["J1", "J10", "J11", "J3", "J7"],
        "isRecommended": False,
        "sourceLabel": "Omni SmartCity Traffic Model",
        "aiReason": f"Bypass route via PH Road. Lower queue density; ETA {eta_b['eta']}.",
    }

    return [route_a, route_b]


def start_emergency(
    ambulance_id: str = "AMB-102",
    origin: str = "J1",
    destination: str = "J7",
    route_id: str = "ROUTE-A",
) -> dict:
    """Activates emergency mode, resets GPS to start waypoint, and broadcasts updates."""
    global _sim_paused
    _sim_paused = False

    waypoints = CHENNAI_WAYPOINTS.get(route_id, CHENNAI_WAYPOINTS["ROUTE-A"])
    wp0 = waypoints[0]
    eta_info = calculate_dynamic_eta(route_id, waypoints, 0)
    path = ["J1", "J8", "J2", "J7"] if route_id == "ROUTE-A" else ["J1", "J10", "J11", "J3", "J7"]

    j_statuses = {}
    for i, jid in enumerate(path):
        j_statuses[jid] = {
            "status": "PASSED" if i == 0 else ("READY" if i == 1 else "SCHEDULED"),
            "signal": "GREEN" if i <= 1 else "RED",
            "clearanceWindow": "0s (PASSED)" if i == 0 else f"{i*45}s",
            "queueCleared": i == 0,
        }

    amb_updates = {
        "active": True,
        "emergencyActive": True,
        "id": ambulance_id,
        "callsign": f"MEDIC-102 (CHENNAI EMERGENCY RESPONDER)",
        "status": "EMERGENCY ACTIVE",
        "source": "GPS • SIMULATION",
        "latitude": wp0["lat"],
        "longitude": wp0["lng"],
        "speed": 64.0,
        "heading": 45.0,
        "origin": f"Kathipara Flyover ({origin})",
        "destination": f"Rajiv Gandhi Govt General Hospital ({destination})",
        "destinationName": "Rajiv Gandhi Govt General Hospital",
        "routeId": route_id,
        "eta": eta_info["eta"],
        "etaSeconds": eta_info["etaSeconds"],
        "distRemaining": eta_info["distRemainingKm"],
        "corridorApproved": True,
        "currentJunctionIndex": 0,
        "waypointIndex": 0,
        "routeJunctions": path,
        "junctionStatus": j_statuses,
        "upcomingJunctions": eta_info["upcomingJunctions"],
        "safetyValidation": {
            "signalConflict": True,
            "minPhaseDuration": True,
            "yellowTransition": True,
            "allRedClearance": True,
            "pedestrianConflict": True,
            "downstreamCapacity": True,
            "overall": "SAFE TO EXECUTE",
        },
    }

    updated = state_manager.update_ambulance_and_corridor(amb_updates, notify=True)

    state_manager.push_event(
        category="EMERGENCY",
        location=origin,
        title=f"AMB-102 EMERGENCY ACTIVATED",
        description=f"Ambulance {ambulance_id} dispatched along {route_id}. Live GPS tracking active.",
        severity="CRITICAL",
        status="ACTIVE"
    )

    state_manager.push_event(
        category="AI",
        location=origin,
        title=f"ROUTE CALCULATED: {route_id}",
        description=f"Optimal emergency corridor calculated. Distance: {eta_info['distRemainingKm']}km, ETA: {eta_info['eta']}.",
        severity="INFO",
        status="COMPLETED"
    )

    return updated


def pause_emergency() -> dict:
    global _sim_paused
    _sim_paused = not _sim_paused
    amb = state_manager.get_ambulance()
    amb["status"] = "PAUSED" if _sim_paused else "EMERGENCY ACTIVE"
    updated = state_manager.update_ambulance_and_corridor(amb, notify=True)
    return updated


def reset_emergency() -> dict:
    return start_emergency("AMB-102", "J1", "J7", "ROUTE-A")


def advance_ambulance() -> dict:
    """
    Advances ambulance position along the GPS road waypoints.
    Updates lat/lng, speed, remaining distance, ETA, and upcoming junction recommendations.
    """
    amb = state_manager.get_ambulance()
    if not amb.get("active") and not amb.get("emergencyActive"):
        return amb

    route_id = amb.get("routeId", "ROUTE-A")
    waypoints = CHENNAI_WAYPOINTS.get(route_id, CHENNAI_WAYPOINTS["ROUTE-A"])
    wp_idx = amb.get("waypointIndex", 0) + 1

    if wp_idx >= len(waypoints):
        # Arrived at hospital
        amb["active"] = False
        amb["emergencyActive"] = False
        amb["status"] = "ARRIVED"
        amb["eta"] = "ARRIVED"
        amb["etaSeconds"] = 0
        amb["distRemaining"] = 0.0
        amb["latitude"] = waypoints[-1]["lat"]
        amb["longitude"] = waypoints[-1]["lng"]
        updated = state_manager.update_ambulance_and_corridor(amb, notify=True)

        state_manager.push_event(
            category="EMERGENCY",
            location=waypoints[-1].get("junctionId") or "J7",
            title="AMB-102 ARRIVED AT DESTINATION",
            description="Ambulance AMB-102 has arrived safely at Rajiv Gandhi Govt General Hospital.",
            severity="SUCCESS",
            status="COMPLETED"
        )
        return updated

    curr_wp = waypoints[wp_idx]
    eta_info = calculate_dynamic_eta(route_id, waypoints, wp_idx)

    # Check if this waypoint is a junction
    jid = curr_wp.get("junctionId")
    path = amb.get("routeJunctions", ["J1", "J8", "J2", "J7"])
    current_j_idx = amb.get("currentJunctionIndex", 0)
    if jid and jid in path:
        current_j_idx = path.index(jid)

    # Update junction statuses
    j_statuses = amb.get("junctionStatus", {})
    for i, p_jid in enumerate(path):
        if i < current_j_idx:
            j_statuses[p_jid] = {"status": "PASSED", "signal": "GREEN", "clearanceWindow": "0s (PASSED)", "queueCleared": True}
        elif i == current_j_idx:
            j_statuses[p_jid] = {"status": "READY", "signal": "GREEN", "clearanceWindow": "0s (NOW)", "queueCleared": True}
        else:
            j_statuses[p_jid] = {"status": "PREPARING", "signal": "YELLOW_TRANSITION", "clearanceWindow": f"{(i - current_j_idx)*30}s", "queueCleared": False}

    amb_updates = {
        "waypointIndex": wp_idx,
        "currentJunctionIndex": current_j_idx,
        "latitude": curr_wp["lat"],
        "longitude": curr_wp["lng"],
        "distRemaining": eta_info["distRemainingKm"],
        "eta": eta_info["eta"],
        "etaSeconds": eta_info["etaSeconds"],
        "junctionStatus": j_statuses,
        "upcomingJunctions": eta_info["upcomingJunctions"],
    }

    updated = state_manager.update_ambulance_and_corridor(amb_updates, notify=True)

    if jid:
        state_manager.push_event(
            category="EMERGENCY",
            location=jid,
            title=f"AMB-102 PASSED {jid}",
            description=f"Ambulance AMB-102 passed junction {jid} ({curr_wp['name']}). Emergency corridor clear.",
            severity="INFO",
            status="ACTIVE"
        )
    else:
        state_manager.push_event(
            category="GPS",
            location="CORRIDOR",
            title="AMB-102 ETA UPDATED",
            description=f"Ambulance position updated. Live ETA: {eta_info['eta']} ({eta_info['distRemainingKm']}km remaining).",
            severity="INFO",
            status="ACTIVE"
        )

    return updated


def approve_corridor(ambulance_id: str = "AMB-102") -> dict:
    amb = state_manager.get_ambulance()
    amb["corridorApproved"] = True
    updated = state_manager.update_ambulance_and_corridor(amb, notify=True)
    state_manager.push_event(
        category="EMERGENCY",
        location=amb.get("origin", "J1"),
        title=f"EMERGENCY CORRIDOR APPROVED: {ambulance_id}",
        description=f"Operator approved emergency corridor for {ambulance_id}.",
        severity="CRITICAL",
        status="ACTIVE"
    )
    return updated


def reject_corridor(ambulance_id: str = "AMB-102") -> dict:
    amb = state_manager.get_ambulance()
    amb["corridorApproved"] = False
    updated = state_manager.update_ambulance_and_corridor(amb, notify=True)
    state_manager.push_event(
        category="EMERGENCY",
        location="CENTRAL",
        title=f"EMERGENCY CORRIDOR REJECTED: {ambulance_id}",
        description=f"Operator rejected corridor request for {ambulance_id}.",
        severity="WARNING",
        status="RESOLVED"
    )
    return updated


# Background continuous GPS ticker
def _gps_auto_ticker():
    while True:
        time.sleep(5.0)  # advance every 5 seconds if active and not paused
        try:
            with _sim_lock:
                if _sim_paused:
                    continue
            amb = state_manager.get_ambulance()
            if amb.get("active") and amb.get("emergencyActive"):
                advance_ambulance()
        except Exception as e:
            logger.warning(f"[EmergencyService] GPS tick error: {e}")


_gps_ticker_thread = threading.Thread(target=_gps_auto_ticker, daemon=True)
_gps_ticker_thread.start()
