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
        "gpsMode": "SIMULATED",
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
        amb["latitude"] = waypoints[-1]["lat"]
        amb["longitude"] = waypoints[-1]["lng"]
        state_manager.update_ambulance_and_corridor(amb, notify=True)
        end_ambulance_trip(amb.get("id"), amb.get("tripId"))
        return state_manager.get_ambulance()

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



# ── Ambulance App Compatibility Layer (REST + Socket.IO) ─────────────────────
def start_ambulance_trip(data: dict) -> dict:
    """
    Handles POST /api/ambulances/trips/start from Ambulance Expo App.
    Accepts any payload variation safely (dict, list, str, None).
    Updates StateManager and broadcasts to /ws/live.
    """
    if not isinstance(data, dict):
        data = {}

    ambulance_id = str(data.get("ambulanceId") or data.get("id") or "AMB-102")
    trip_id = str(data.get("tripId") or f"TRIP-{int(time.time())}")

    # Extract hospital name cleanly whether hospital is a dict, str, or None
    hosp_input = data.get("hospital") or data.get("hospitalName") or data.get("destinationName") or data.get("destination")
    if isinstance(hosp_input, dict):
        hospital_name = str(hosp_input.get("name") or hosp_input.get("hospital") or hosp_input.get("title") or "Rajiv Gandhi Govt General Hospital")
        hospital_id = str(hosp_input.get("id") or data.get("hospitalId", "HOSP-01"))
    elif isinstance(hosp_input, str):
        hospital_name = hosp_input
        hospital_id = str(data.get("hospitalId", "HOSP-01"))
    else:
        hospital_name = "Rajiv Gandhi Govt General Hospital"
        hospital_id = "HOSP-01"

    # Extract route & polyline safely whether route is a dict, list, or string
    route_input = data.get("route")
    route_id_raw = data.get("routeId")
    if not route_id_raw and isinstance(route_input, dict):
        route_id_raw = route_input.get("id") or route_input.get("routeId")

    route_id = str(route_id_raw or "ROUTE-A").upper()
    norm_route_id = "ROUTE-B" if "B" in route_id else "ROUTE-A"

    waypoints = CHENNAI_WAYPOINTS.get(norm_route_id, CHENNAI_WAYPOINTS["ROUTE-A"])
    wp0 = waypoints[0]

    # Extract polyline safely
    polyline = None
    if isinstance(route_input, dict):
        polyline = route_input.get("polyline") or route_input.get("coordinates") or route_input.get("path")
    elif isinstance(route_input, list):
        polyline = route_input

    if not polyline or not isinstance(polyline, list):
        polyline = [{"latitude": w["lat"], "longitude": w["lng"], "lat": w["lat"], "lng": w["lng"]} for w in waypoints]
    else:
        norm_poly = []
        for pt in polyline:
            if isinstance(pt, dict):
                lat_value = pt.get("latitude", pt.get("lat"))
                lng_value = pt.get("longitude", pt.get("lng"))
            elif isinstance(pt, (list, tuple)) and len(pt) >= 2:
                lat_value, lng_value = pt[0], pt[1]
            else:
                continue
            if lat_value is None or lng_value is None:
                continue
            try:
                lat = float(lat_value)
                lng = float(lng_value)
                if not math.isfinite(lat) or not math.isfinite(lng):
                    continue
            except (TypeError, ValueError):
                continue
            norm_poly.append({"latitude": lat, "longitude": lng, "lat": lat, "lng": lng})
        polyline = norm_poly if norm_poly else [{"latitude": w["lat"], "longitude": w["lng"], "lat": w["lat"], "lng": w["lng"]} for w in waypoints]

    current_location_input = data.get("currentLocation") or data.get("location")
    if isinstance(current_location_input, dict):
        current_lat = current_location_input.get("latitude", current_location_input.get("lat"))
        current_lng = current_location_input.get("longitude", current_location_input.get("lng"))
    elif isinstance(current_location_input, (list, tuple)) and len(current_location_input) >= 2:
        current_lat, current_lng = current_location_input[0], current_location_input[1]
    else:
        current_lat = current_lng = None
    try:
        current_lat = float(current_lat)
        current_lng = float(current_lng)
        if not math.isfinite(current_lat) or not math.isfinite(current_lng):
            raise ValueError("Current location coordinates must be finite")
    except (TypeError, ValueError):
        current_lat = polyline[0]["latitude"]
        current_lng = polyline[0]["longitude"]

    eta_info = calculate_dynamic_eta(norm_route_id, waypoints, 0)
    path = ["J1", "J8", "J2", "J7"] if norm_route_id == "ROUTE-A" else ["J1", "J10", "J11", "J3", "J7"]

    # Check if custom junctions provided
    custom_juncs = data.get("junctions") or (route_input.get("junctions") if isinstance(route_input, dict) else None)
    if custom_juncs and isinstance(custom_juncs, list):
        extracted_juncs = []
        for j in custom_juncs:
            if isinstance(j, str):
                extracted_juncs.append(j)
            elif isinstance(j, dict) and j.get("id"):
                extracted_juncs.append(str(j.get("id")))
        if extracted_juncs:
            path = extracted_juncs

    j_statuses = {}
    signal_changes = []
    normal_signal_states = {}
    for i, jid in enumerate(path):
        sig = "GREEN" if i <= 1 else "RED"
        st = "PASSED" if i == 0 else ("READY" if i == 1 else "SCHEDULED")
        j_statuses[jid] = {
            "status": st,
            "signal": sig,
            "clearanceWindow": "0s (PASSED)" if i == 0 else f"{i*45}s",
            "queueCleared": i == 0,
        }
        # Update junction signals in state for emergency green wave
        try:
            old_j = state_manager.get_junction(jid)
            old_sig = old_j.get("signal", "RED") if old_j else "RED"
            if old_j:
                normal_signal_states[jid] = {
                    key: old_j.get(key)
                    for key in ("signal", "recommendedSignal", "controlMode", "remainingTime", "signalReason")
                }
            state_manager.update_junction(jid, {
                "signal": sig,
                "recommendedSignal": sig,
                "controlMode": "EMERGENCY_OVERRIDE",
                "remainingTime": 60 if sig == "GREEN" else (i * 45),
                "signalReason": f"Green wave corridor priority for {ambulance_id}"
            }, notify=True)
            signal_changes.append({
                "junctionId": jid,
                "oldSignal": old_sig,
                "oldRecommendedSignal": old_j.get("recommendedSignal", old_sig) if old_j else old_sig,
                "newSignal": sig,
                "status": "GREENLIT" if sig == "GREEN" else "HOLD",
                "remainingTime": 60 if sig == "GREEN" else (i * 45),
                "timestamp": time.strftime("%H:%M:%S")
            })
        except Exception as j_err:
            logger.warning(f"[EmergencyService] Signal update failed for {jid}: {j_err}")

    amb_name = str(data.get("ambulanceName") or data.get("name") or f"Ambulance {ambulance_id.replace('AMB-', '')}")
    now_ts = time.strftime("%H:%M:%S")
    hospital_data = hosp_input if isinstance(hosp_input, dict) else {}
    dest_lat = float(hospital_data.get("lat") or hospital_data.get("latitude") or 13.0817)
    dest_lng = float(hospital_data.get("lng") or hospital_data.get("longitude") or 80.2778)

    trip_record = {
        "active": True,
        "emergencyActive": True,
        "gpsMode": "EXTERNAL",
        "id": ambulance_id,
        "ambulanceId": ambulance_id,
        "ambulanceName": amb_name,
        "tripId": trip_id,
        "callsign": f"MEDIC-{ambulance_id.replace('AMB-', '')} ({amb_name})",
        "status": "EMERGENCY ACTIVE",
        "tripStatus": "ACTIVE",
        "corridorStatus": "ACTIVE",
        "source": "LIVE BACKEND + EXTERNAL GPS",
        "latitude": current_lat,
        "longitude": current_lng,
        "currentLocation": {
            "latitude": current_lat,
            "longitude": current_lng
        },
        "destination": hospital_name,
        "destinationLocation": {
            "latitude": dest_lat,
            "longitude": dest_lng,
            "name": hospital_name
        },
        "speed": 60.0,
        "heading": 45.0,
        "origin": waypoints[0]["name"],
        "hospitalId": hospital_id,
        "routeId": norm_route_id,
        "originalRoute": route_input if isinstance(route_input, dict) else {"id": norm_route_id, "polyline": polyline},
        "activeRoute": route_input if isinstance(route_input, dict) else {"id": norm_route_id, "polyline": polyline},
        "route": polyline,
        "routeProgress": 0,
        "currentJunctionId": path[0] if path else "J1",
        "nextJunctionId": path[1] if len(path) > 1 else (path[0] if path else "J1"),
        "signalChanges": signal_changes,
        "normalSignalStates": normal_signal_states,
        "eta": eta_info["eta"],
        "etaSeconds": eta_info["etaSeconds"],
        "distRemaining": eta_info["distRemainingKm"],
        "corridorApproved": True,
        "currentJunctionIndex": 0,
        "waypointIndex": 0,
        "routeJunctions": path,
        "junctionStatus": j_statuses,
        "upcomingJunctions": eta_info["upcomingJunctions"],
        "startTime": str(data.get("startTime") or now_ts),
        "startedAt": now_ts,
        "updatedAt": now_ts,
        "timestamps": {"started": now_ts},
    }

    # ─── CRITICAL: Update StateManager (single source of truth) ───────────────
    updated = state_manager.update_ambulance_and_corridor(trip_record, notify=True)
    logger.info(
        "[EmergencyService] Trip started: ambulanceId=%s tripId=%s route=%s eta=%s",
        ambulance_id, trip_id, norm_route_id, eta_info["eta"]
    )

    state_manager.push_event(
        category="AMBULANCE_TRIP_STARTED",
        location=path[0],
        title=f"EMERGENCY CORRIDOR ACTIVE: {ambulance_id}",
        description=f"Active trip {trip_id} started heading to {hospital_name} via {norm_route_id}. Green-wave activated.",
        severity="CRITICAL",
        status="ACTIVE"
    )

    try:
        from services.socket_service import (
            emit_emergency_trip_started,
            emit_corridor_status_updated,
            emit_junction_signal_updated,
            socketio
        )
        # Broadcast trip started
        trip_payload = {
            "type": "AMBULANCE_TRIP_STARTED",
            "ambulanceId": ambulance_id,
            "ambulanceName": amb_name,
            "tripId": trip_id,
            "gpsMode": "EXTERNAL",
            "source": "LIVE BACKEND + EXTERNAL GPS",
            "active": True,
            "status": "ACTIVE",
            "routeId": norm_route_id,
            "hospital": hospital_name,
            "destinationName": hospital_name,
            "destination": trip_record["destination"],
            "destinationLocation": trip_record["destinationLocation"],
            "location": trip_record["currentLocation"],
            "latitude": trip_record["latitude"],
            "longitude": trip_record["longitude"],
            "etaSeconds": eta_info["etaSeconds"],
            "eta": eta_info["eta"],
            "currentLocation": trip_record["currentLocation"],
            "currentJunctionIndex": trip_record["currentJunctionIndex"],
            "route": polyline,
            "routeJunctions": path,
            "routeProgress": 0,
            "currentJunctionId": trip_record["currentJunctionId"],
            "nextJunctionId": trip_record["nextJunctionId"],
            "speed": trip_record["speed"],
            "distRemaining": trip_record["distRemaining"],
            "lastUpdated": trip_record["updatedAt"],
            "signalChanges": signal_changes,
            "timestamp": now_ts
        }
        emit_emergency_trip_started(trip_id, trip_payload, ambulance_id=ambulance_id)

        # Broadcast corridor status
        emit_corridor_status_updated(trip_id, {
            "type": "CORRIDOR_STATUS_UPDATED",
            "ambulanceId": ambulance_id,
            "tripId": trip_id,
            "status": "ACTIVE",
            "message": f"Emergency corridor activated for {ambulance_id}",
            "signalChanges": signal_changes,
            "timestamp": now_ts
        }, ambulance_id=ambulance_id)

        # Broadcast signal changes for all corridor junctions
        for sc in signal_changes:
            emit_junction_signal_updated(trip_id, {
                "type": "TRAFFIC_SIGNAL_CHANGED",
                "junctionId": sc["junctionId"],
                "signalState": sc["newSignal"],
                "status": sc["status"],
                "remainingTime": sc["remainingTime"],
                "currentPhase": sc["newSignal"],
                "signalChanges": signal_changes,
                "tripId": trip_id,
                "ambulanceId": ambulance_id,
                "timestamp": now_ts
            }, ambulance_id=ambulance_id)
            logger.info(
                "[EmergencyService] Signal changed: junctionId=%s signal=%s tripId=%s",
                sc["junctionId"], sc["newSignal"], trip_id
            )
    except Exception as sock_err:
        logger.warning(f"[EmergencyService] Socket.IO emission warning: {sock_err}")

    return {
        "success": True,
        "trip": updated,
        "activeTrip": updated,
        "routeId": norm_route_id,
        "etaSeconds": eta_info["etaSeconds"],
        "distanceKm": eta_info["distRemainingKm"],
        "junctions": path
    }


def update_ambulance_location(data: dict) -> dict:
    """
    Handles POST /api/ambulances/location from Ambulance Expo App.
    Updates StateManager and broadcasts to /ws/live.
    """
    data = data if isinstance(data, dict) else {}
    amb = state_manager.get_ambulance()
    ambulance_id = data.get("ambulanceId") or amb.get("id", "AMB-102")
    trip_id = data.get("tripId") or amb.get("tripId", "TRIP-102")

    lat = float(data.get("latitude", amb.get("latitude", 13.0067)))
    lng = float(data.get("longitude", amb.get("longitude", 80.2020)))
    speed = float(data.get("speed", amb.get("speed", 60.0)))
    heading = float(data.get("heading", amb.get("heading", 45.0)))
    wp_idx = int(data.get("routeIndex", amb.get("waypointIndex", 0)))
    eta_sec = int(data.get("etaSeconds", amb.get("etaSeconds", 300)))
    next_j = data.get("nextJunctionId")

    mins = eta_sec // 60
    secs = eta_sec % 60
    eta_formatted = f"{mins:02d}:{secs:02d}"

    waypoints = amb.get("route") or CHENNAI_WAYPOINTS.get(amb.get("routeId", "ROUTE-A"), [])
    total_wps = len(waypoints) if isinstance(waypoints, list) else 10
    calc_progress = round(min(100.0, max(0.0, (wp_idx / max(1, total_wps - 1)) * 100)), 1)
    route_progress = float(data.get("routeProgress", calc_progress))
    current_junction = data.get("currentJunctionId") or amb.get("currentJunctionId")
    next_junction = data.get("nextJunctionId") or amb.get("nextJunctionId")
    route_junctions = amb.get("routeJunctions") or []
    current_junction_index = (
        route_junctions.index(current_junction)
        if current_junction in route_junctions
        else amb.get("currentJunctionIndex", 0)
    )

    updates = {
        "gpsMode": "EXTERNAL",
        "latitude": lat,
        "longitude": lng,
        "currentLocation": {
            "latitude": lat,
            "longitude": lng
        },
        "speed": speed,
        "heading": heading,
        "waypointIndex": wp_idx,
        "routeProgress": route_progress,
        "currentJunctionId": current_junction,
        "nextJunctionId": next_junction,
        "currentJunctionIndex": current_junction_index,
        "etaSeconds": eta_sec,
        "eta": eta_formatted,
        "updatedAt": time.strftime("%H:%M:%S"),
        "source": "LIVE BACKEND + EXTERNAL GPS"
    }

    # ─── CRITICAL: Update StateManager (single source of truth) ───────────────
    updated = state_manager.update_ambulance_and_corridor(updates, notify=True)
    
    logger.info(
        "[EmergencyService] Location updated: ambulanceId=%s tripId=%s lat=%.5f lng=%.5f eta=%s progress=%.1f%%",
        ambulance_id, trip_id, lat, lng, eta_formatted, route_progress
    )

    state_manager.push_event(
        category="AMBULANCE_LOCATION_UPDATED",
        location=next_j or "CORRIDOR",
        title=f"LOCATION UPDATE: {ambulance_id}",
        description=f"GPS updated: [{lat:.4f}, {lng:.4f}], Speed: {speed:.1f}km/h, ETA: {eta_formatted}, Progress: {route_progress}%.",
        severity="INFO",
        status="ACTIVE"
    )

    from services.socket_service import emit_corridor_status_updated, emit_ambulance_location_updated
    loc_payload = {
        "type": "LOCATION_UPDATED",
        "ambulanceId": ambulance_id,
        "tripId": trip_id,
        "latitude": lat,
        "longitude": lng,
        "currentLocation": {"latitude": lat, "longitude": lng},
        "location": {"latitude": lat, "longitude": lng},
        "speed": speed,
        "heading": heading,
        "routeProgress": route_progress,
        "etaSeconds": eta_sec,
        "eta": eta_formatted,
        "nextJunctionId": next_junction,
        "currentJunctionId": current_junction,
        "currentJunctionIndex": current_junction_index,
        "route": updated.get("route"),
        "destination": updated.get("destination"),
        "destinationLocation": updated.get("destinationLocation"),
        "active": updated.get("active", True),
        "signalChanges": updated.get("signalChanges", []),
        "lastUpdated": updated.get("updatedAt"),
        "timestamp": time.strftime("%H:%M:%S")
    }
    emit_ambulance_location_updated(trip_id, loc_payload, ambulance_id=ambulance_id)
    emit_corridor_status_updated(trip_id, loc_payload, ambulance_id=ambulance_id)

    return {"success": True, "ambulance": updated}


def change_ambulance_route(data: dict) -> dict:
    """
    Handles POST /api/ambulances/route-change from Ambulance Expo App.
    Updates StateManager and broadcasts to /ws/live.
    """
    data = data if isinstance(data, dict) else {}
    amb = state_manager.get_ambulance()
    ambulance_id = data.get("ambulanceId") or amb.get("id", "AMB-102")
    trip_id = data.get("tripId") or amb.get("tripId", "TRIP-102")
    new_route_id = str(data.get("routeId", "ROUTE-B")).upper()
    new_route = data.get("newRoute") or {}
    reason = data.get("reason", "ROAD_BLOCKED")
    new_eta = int(data.get("newEtaSeconds", 450))

    waypoints = CHENNAI_WAYPOINTS.get(new_route_id, CHENNAI_WAYPOINTS["ROUTE-B"])
    path = ["J1", "J10", "J11", "J3", "J7"] if new_route_id == "ROUTE-B" else ["J1", "J8", "J2", "J7"]
    route = (
        new_route.get("polyline") or new_route.get("coordinates") or new_route.get("path")
        if isinstance(new_route, dict)
        else new_route
    )
    if not isinstance(route, list) or not route:
        route = [
            {"latitude": point["lat"], "longitude": point["lng"], "lat": point["lat"], "lng": point["lng"]}
            for point in waypoints
        ]

    normal_signal_states = dict(amb.get("normalSignalStates") or {})
    previous_path = amb.get("routeJunctions") or []
    from services.socket_service import emit_junction_signal_updated
    for junction_id in previous_path:
        if junction_id in path:
            continue
        normal = normal_signal_states.get(junction_id)
        if not normal:
            continue
        state_manager.update_junction(junction_id, normal, notify=True)
        emit_junction_signal_updated(trip_id, {
            "type": "TRAFFIC_SIGNAL_CHANGED",
            "junctionId": junction_id,
            "signalState": normal.get("signal", "RED"),
            "currentPhase": normal.get("signal", "RED"),
            "status": "NORMAL_RESTORED",
            "remainingTime": normal.get("remainingTime", 35),
            "tripId": trip_id,
            "ambulanceId": ambulance_id,
            "timestamp": time.strftime("%H:%M:%S")
        }, ambulance_id=ambulance_id)

    signal_changes = []
    for index, junction_id in enumerate(path):
        junction = state_manager.get_junction(junction_id)
        if junction and junction_id not in normal_signal_states:
            normal_signal_states[junction_id] = {
                key: junction.get(key)
                for key in ("signal", "recommendedSignal", "controlMode", "remainingTime", "signalReason")
            }
        signal_state = "GREEN" if index <= 1 else "RED"
        state_manager.update_junction(junction_id, {
            "signal": signal_state,
            "recommendedSignal": signal_state,
            "controlMode": "EMERGENCY_OVERRIDE",
            "remainingTime": 60 if signal_state == "GREEN" else index * 45,
            "signalReason": f"Green wave corridor priority for {ambulance_id}",
        }, notify=True)
        signal_changes.append({
            "junctionId": junction_id,
            "oldSignal": junction.get("signal", "RED") if junction else "RED",
            "newSignal": signal_state,
            "status": "GREENLIT" if signal_state == "GREEN" else "HOLD",
            "remainingTime": 60 if signal_state == "GREEN" else index * 45,
            "timestamp": time.strftime("%H:%M:%S"),
        })
        emit_junction_signal_updated(trip_id, {
            "type": "TRAFFIC_SIGNAL_CHANGED",
            "junctionId": junction_id,
            "signalState": signal_state,
            "currentPhase": signal_state,
            "status": signal_changes[-1]["status"],
            "remainingTime": signal_changes[-1]["remainingTime"],
            "signalChanges": signal_changes,
            "tripId": trip_id,
            "ambulanceId": ambulance_id,
            "timestamp": time.strftime("%H:%M:%S")
        }, ambulance_id=ambulance_id)
        logger.info(
            "[EmergencyService] Signal changed: junctionId=%s signal=%s tripId=%s",
            junction_id, signal_state, trip_id
        )

    updates = {
        "routeId": new_route_id,
        "routeStatus": "ALTERNATE_ROUTE_ACTIVE",
        "corridorStatus": "BLOCKED" if reason == "ROAD_BLOCKED" else "REROUTED",
        "previousRouteId": amb.get("routeId", "ROUTE-A"),
        "routeJunctions": path,
        "activeRoute": new_route,
        "route": route,
        "normalSignalStates": normal_signal_states,
        "signalChanges": signal_changes,
        "etaSeconds": new_eta,
        "eta": f"{new_eta // 60:02d}:{new_eta % 60:02d}",
        "updatedAt": time.strftime("%H:%M:%S"),
    }

    updated = state_manager.update_ambulance_and_corridor(updates, notify=True)
    logger.info(
        "[EmergencyService] Route changed: ambulanceId=%s tripId=%s route=%s reason=%s",
        ambulance_id, trip_id, new_route_id, reason
    )

    state_manager.push_event(
        category="ROAD_BLOCKED",
        location=amb.get("nextJunctionId", "J8"),
        title="PRIMARY CORRIDOR BLOCKED",
        description=f"Primary route reported blocked. Triggering automatic alternate route rerouting.",
        severity="WARNING",
        status="ACTIVE"
    )

    state_manager.push_event(
        category="ALTERNATE_ROUTE_ASSIGNED",
        location="SYSTEM",
        title=f"ALTERNATE ROUTE ASSIGNED: {new_route_id}",
        description=f"Emergency route updated to {new_route_id} due to {reason}. New ETA: {updated['eta']}.",
        severity="CRITICAL",
        status="ACTIVE"
    )

    from services.socket_service import emit_ambulance_route_changed
    payload = {
        "type": "ALTERNATE_ROUTE_ASSIGNED",
        "ambulanceId": ambulance_id,
        "tripId": trip_id,
        "reason": reason,
        "newRouteId": new_route_id,
        "newRoute": new_route,
        "route": route,
        "routeProgress": updated.get("routeProgress", 0),
        "eta": updated.get("eta"),
        "destination": updated.get("destination"),
        "destinationLocation": updated.get("destinationLocation"),
        "currentJunctionId": updated.get("currentJunctionId"),
        "nextJunctionId": updated.get("nextJunctionId"),
        "signalChanges": signal_changes,
        "newEtaSeconds": new_eta,
        "junctions": path,
        "message": f"Route rerouted via {new_route_id} due to {reason}",
        "voiceMessage": f"Attention driver, alternate route {new_route_id} assigned.",
        "timestamp": time.strftime("%H:%M:%S")
    }
    emit_ambulance_route_changed(trip_id, payload, ambulance_id=ambulance_id)

    return {"success": True, "activeTrip": updated}


def end_ambulance_trip(ambulance_id: str = "AMB-102", trip_id: str = "TRIP-102") -> dict:
    """
    Handles POST /api/ambulances/trips/end from Ambulance Expo App.
    Updates StateManager and broadcasts to /ws/live.
    """
    amb = state_manager.get_ambulance()
    ambulance_id = ambulance_id or amb.get("id", "AMB-102")
    trip_id = trip_id or amb.get("tripId", "TRIP-102")

    now_ts = time.strftime("%H:%M:%S")
    updates = {
        "active": False,
        "emergencyActive": False,
        "gpsMode": "IDLE",
        "status": "COMPLETED",
        "tripStatus": "COMPLETED",
        "corridorStatus": "COMPLETED",
        "eta": "COMPLETED",
        "etaSeconds": 0,
        "distRemaining": 0.0,
        "routeProgress": 100.0,
        "speed": 0.0,
        "updatedAt": now_ts,
    }

    # Restore the pre-trip signal configuration for every junction touched.
    corridor_path = amb.get("routeJunctions") or ["J1", "J8", "J2", "J7"]
    from services.socket_service import emit_ambulance_trip_ended, emit_junction_signal_updated
    normal_signal_states = amb.get("normalSignalStates") or {}
    for jid in corridor_path:
        try:
            normal_state = normal_signal_states.get(jid) or {
                "controlMode": "AI_CONTROL",
                "signal": "RED" if jid != "J1" else "GREEN",
                "recommendedSignal": "GREEN",
                "remainingTime": 35,
                "signalReason": "AI Adaptive Control active. Resumed normal traffic optimization after emergency corridor."
            }
            state_manager.update_junction(jid, normal_state, notify=True)
            emit_junction_signal_updated(trip_id, {
                "type": "TRAFFIC_SIGNAL_CHANGED",
                "junctionId": jid,
                "signalState": normal_state.get("signal", "RED"),
                "currentPhase": normal_state.get("signal", "RED"),
                "status": "NORMAL_RESTORED",
                "remainingTime": normal_state.get("remainingTime", 35),
                "tripId": trip_id,
                "ambulanceId": ambulance_id,
                "timestamp": now_ts
            }, ambulance_id=ambulance_id)
            logger.info(
                "[EmergencyService] Signal restored: junctionId=%s signal=%s tripId=%s",
                jid, normal_state.get("signal", "RED"), trip_id
            )
        except Exception as r_err:
            logger.warning(f"[EmergencyService] Signal restoration failed for {jid}: {r_err}")

    now_timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    updated = state_manager.update_ambulance_and_corridor(updates, notify=True)
    logger.info("[EmergencyService] Trip ended: ambulanceId=%s tripId=%s", ambulance_id, trip_id)

    state_manager.push_event(
        category="AMBULANCE_TRIP_ENDED",
        location=amb.get("destination", "J7"),
        title=f"AMBULANCE TRIP ENDED: {ambulance_id}",
        description=f"Trip {trip_id} completed successfully. Normal signal states restored.",
        severity="SUCCESS",
        status="COMPLETED"
    )

    emit_ambulance_trip_ended(trip_id, {
        "type": "TRIP_ENDED",
        "ambulanceId": ambulance_id,
        "tripId": trip_id,
        "status": "COMPLETED",
        "routeProgress": 100,
        "active": False,
        "lastUpdated": now_timestamp,
        "message": f"Trip {trip_id} completed successfully.",
        "timestamp": now_ts
    }, ambulance_id=ambulance_id)

    return {"success": True, "status": "TRIP_ENDED", "ambulance": updated}


def get_ambulance_events(ambulance_id: str = "AMB-102") -> list:
    events = state_manager.get_events()
    if not ambulance_id:
        return events
    return [e for e in events if ambulance_id in str(e.get("description")) or ambulance_id in str(e.get("title")) or e.get("category", "").startswith("AMBULANCE")]


def get_ambulance_notifications(ambulance_id: str = "AMB-102") -> list:
    events = state_manager.get_events()
    notifications = []
    for e in events:
        cat = e.get("category", "")
        if cat in ("AMBULANCE_TRIP_STARTED", "EMERGENCY", "ALTERNATE_ROUTE_ASSIGNED", "ROAD_BLOCKED", "JUNCTION_SIGNAL_UPDATED"):
            notifications.append({
                "id": e["id"],
                "ambulanceId": ambulance_id,
                "type": cat,
                "title": e["title"],
                "message": e["description"],
                "severity": e["severity"],
                "timestamp": e["time"]
            })
    return notifications


def notify_junction_signal_change(junction_id: str, signal_state: str, message: str = None):
    """
    Called when a junction signal is manually or AI changed.
    If junction is on active ambulance corridor, emits Socket.IO event and updates StateManager.
    """
    amb = state_manager.get_ambulance()
    if not amb.get("active") and not amb.get("emergencyActive"):
        return

    path = amb.get("routeJunctions", [])
    if junction_id in path:
        trip_id = amb.get("tripId", "TRIP-102")
        ambulance_id = amb.get("id", "AMB-102")

        payload = {
            "type": "JUNCTION_STATUS_UPDATED",
            "ambulanceId": ambulance_id,
            "tripId": trip_id,
            "junctionId": junction_id,
            "signalState": signal_state,
            "corridorStatus": "PRIORITY_ACTIVE" if signal_state == "GREEN" else "PREPARING",
            "message": message or f"Junction {junction_id} signal set to {signal_state} for emergency corridor.",
            "voiceMessage": f"Junction {junction_id} green wave active.",
            "timestamp": time.strftime("%H:%M:%S")
        }

        state_manager.push_event(
            category="JUNCTION_SIGNAL_UPDATED",
            location=junction_id,
            title=f"CORRIDOR SIGNAL UPDATED: {junction_id}",
            description=f"Signal for junction {junction_id} changed to {signal_state} for corridor {trip_id}.",
            severity="INFO",
            status="ACTIVE"
        )

        from services.socket_service import emit_junction_signal_updated
        emit_junction_signal_updated(trip_id, payload, ambulance_id=ambulance_id)


# Background continuous GPS ticker
def _gps_auto_ticker():
    while True:
        time.sleep(5.0)  # advance every 5 seconds if active and not paused
        try:
            with _sim_lock:
                if _sim_paused:
                    continue
            amb = state_manager.get_ambulance()
            if (
                amb.get("active")
                and amb.get("emergencyActive")
                and amb.get("gpsMode") != "EXTERNAL"
            ):
                advance_ambulance()
        except Exception as e:
            logger.warning(f"[EmergencyService] GPS tick error: {e}")


_gps_ticker_thread = threading.Thread(target=_gps_auto_ticker, daemon=True)
_gps_ticker_thread.start()
