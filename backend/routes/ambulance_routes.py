import logging
from flask import Blueprint, jsonify, request
from services.emergency_service import (
    get_ambulance_status,
    get_route_alternatives,
    start_emergency,
    pause_emergency,
    reset_emergency,
    advance_ambulance,
    approve_corridor,
    reject_corridor,
    start_ambulance_trip,
    update_ambulance_location,
    change_ambulance_route,
    end_ambulance_trip,
    get_ambulance_events,
    get_ambulance_notifications,
)

logger = logging.getLogger(__name__)

ambulance_bp = Blueprint("ambulance", __name__)


# ── Read ──────────────────────────────────────────────────────────────────────
@ambulance_bp.get("/ambulance")
@ambulance_bp.get("/ambulances")
def ambulance_status():
    """GET /api/ambulance — Full live ambulance + corridor state."""
    return jsonify(get_ambulance_status())


@ambulance_bp.get("/emergency/routes")
def emergency_routes():
    """GET /api/emergency/routes — Returns Route A & Route B alternatives."""
    origin = request.args.get("origin", "J1")
    destination = request.args.get("destination", "J7")
    routes = get_route_alternatives(origin, destination)
    return jsonify(routes)


# ── Ambulance App Exact Endpoints ───────────────────────────────────────────
@ambulance_bp.post("/ambulances/trips/start")
@ambulance_bp.post("/ambulance/trips/start")
def trip_start_endpoint():
    """POST /api/ambulances/trips/start — Start ambulance trip from driver app."""
    try:
        body = request.get_json(silent=True, force=True) or {}

        # Safe diagnostic request logging (no secrets logged)
        amb_id = body.get("ambulanceId") or body.get("id") or "UNSPECIFIED"
        trip_id = body.get("tripId") or "UNSPECIFIED"
        hosp = body.get("hospital") or body.get("destinationName") or "UNSPECIFIED"
        route_id = body.get("routeId") or "UNSPECIFIED"
        body_keys = list(body.keys())

        logger.info(
            f"[AmbulanceRoute] {request.method} {request.path} | "
            f"ambulanceId={amb_id}, tripId={trip_id}, hospital={hosp}, "
            f"routeId={route_id}, bodyKeys={body_keys}"
        )

        res = start_ambulance_trip(body)
        return jsonify(res), 200
    except Exception as e:
        logger.error(f"[AmbulanceRoute] Error in POST {request.path}: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "error": "Failed to start ambulance trip",
            "details": str(e)
        }), 500


@ambulance_bp.post("/ambulances/location")
@ambulance_bp.post("/ambulance/location")
def location_update_endpoint():
    """POST /api/ambulances/location — GPS location update from driver app."""
    try:
        body = request.get_json(silent=True, force=True) or {}

        amb_id = body.get("ambulanceId") or "UNSPECIFIED"
        trip_id = body.get("tripId") or "UNSPECIFIED"
        lat = body.get("latitude")
        lng = body.get("longitude")

        logger.info(
            f"[AmbulanceRoute] {request.method} {request.path} | "
            f"ambulanceId={amb_id}, tripId={trip_id}, lat={lat}, lng={lng}"
        )

        res = update_ambulance_location(body)
        return jsonify(res), 200
    except Exception as e:
        logger.error(f"[AmbulanceRoute] Error in POST {request.path}: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "error": "Failed to update ambulance location",
            "details": str(e)
        }), 500


@ambulance_bp.post("/ambulances/route-change")
@ambulance_bp.post("/ambulance/route-change")
def route_change_endpoint():
    """POST /api/ambulances/route-change — Alternate route switch from driver app or engine."""
    try:
        body = request.get_json(silent=True, force=True) or {}

        amb_id = body.get("ambulanceId") or "UNSPECIFIED"
        trip_id = body.get("tripId") or "UNSPECIFIED"
        reason = body.get("reason") or "UNSPECIFIED"
        new_route = body.get("routeId") or "UNSPECIFIED"

        logger.info(
            f"[AmbulanceRoute] {request.method} {request.path} | "
            f"ambulanceId={amb_id}, tripId={trip_id}, reason={reason}, newRoute={new_route}"
        )

        res = change_ambulance_route(body)
        return jsonify(res), 200
    except Exception as e:
        logger.error(f"[AmbulanceRoute] Error in POST {request.path}: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "error": "Failed to change ambulance route",
            "details": str(e)
        }), 500


@ambulance_bp.post("/ambulances/trips/end")
@ambulance_bp.post("/ambulance/trips/end")
def trip_end_endpoint():
    """POST /api/ambulances/trips/end — End trip from driver app."""
    try:
        body = request.get_json(silent=True, force=True) or {}
        amb_id = body.get("ambulanceId", "AMB-102")
        trip_id = body.get("tripId", "TRIP-102")

        logger.info(
            f"[AmbulanceRoute] {request.method} {request.path} | "
            f"ambulanceId={amb_id}, tripId={trip_id}"
        )

        res = end_ambulance_trip(amb_id, trip_id)
        return jsonify(res), 200
    except Exception as e:
        logger.error(f"[AmbulanceRoute] Error in POST {request.path}: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "error": "Failed to end ambulance trip",
            "details": str(e)
        }), 500


@ambulance_bp.get("/ambulances/events")
@ambulance_bp.get("/ambulance/events")
def trip_events_endpoint():
    """GET /api/ambulances/events — Returns trip events for ambulance."""
    try:
        amb_id = request.args.get("ambulanceId", "AMB-102")
        events = get_ambulance_events(amb_id)
        return jsonify(events)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@ambulance_bp.get("/ambulances/notifications")
@ambulance_bp.get("/ambulance/notifications")
def trip_notifications_endpoint():
    """GET /api/ambulances/notifications — Returns notifications for ambulance."""
    try:
        amb_id = request.args.get("ambulanceId", "AMB-102")
        notifications = get_ambulance_notifications(amb_id)
        return jsonify(notifications)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500



# ── Emergency Lifecycle & Driver Controls ────────────────────────────────────
@ambulance_bp.post("/emergency/start")
def emergency_start():
    """
    POST /api/emergency/start
    Body: { "ambulanceId": "AMB-102", "origin": "J1", "destination": "J7", "routeId": "ROUTE-A" }
    """
    body = request.get_json(silent=True) or {}
    ambulance_id = body.get("ambulanceId", "AMB-102")
    origin = body.get("origin", "J1").upper()
    destination = body.get("destination", "J7").upper()
    route_id = body.get("routeId", "ROUTE-A")

    state = start_emergency(ambulance_id, origin, destination, route_id)
    return jsonify({"success": True, "ambulance": state}), 201


@ambulance_bp.post("/emergency/pause")
def emergency_pause():
    """POST /api/emergency/pause — Pause/resume simulated GPS movement."""
    state = pause_emergency()
    return jsonify({"success": True, "ambulance": state})


@ambulance_bp.post("/emergency/reset")
def emergency_reset():
    """POST /api/emergency/reset — Reset ambulance back to start waypoint."""
    state = reset_emergency()
    return jsonify({"success": True, "ambulance": state})


@ambulance_bp.post("/emergency/advance")
def emergency_advance():
    """POST /api/emergency/advance — Step forward along simulated GPS road route."""
    state = advance_ambulance()
    return jsonify({"success": True, "ambulance": state})


# ── Operator Corridor Approvals ─────────────────────────────────────────────
@ambulance_bp.post("/corridor/approve")
def corridor_approve():
    """POST /api/corridor/approve — Operator approves emergency corridor."""
    body = request.get_json(silent=True) or {}
    ambulance_id = body.get("ambulanceId", "AMB-102")
    state = approve_corridor(ambulance_id)
    return jsonify({
        "success": True,
        "ambulanceId": ambulance_id,
        "status": "CORRIDOR_APPROVED",
        "ambulance": state,
    })


@ambulance_bp.post("/corridor/reject")
def corridor_reject():
    """POST /api/corridor/reject — Operator rejects emergency corridor."""
    body = request.get_json(silent=True) or {}
    ambulance_id = body.get("ambulanceId", "AMB-102")
    state = reject_corridor(ambulance_id)
    return jsonify({
        "success": True,
        "ambulanceId": ambulance_id,
        "status": "CORRIDOR_REJECTED",
        "ambulance": state,
    })

