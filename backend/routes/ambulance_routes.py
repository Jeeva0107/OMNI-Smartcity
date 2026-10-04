"""
Ambulance & Emergency Corridor Routes  —  Blueprint: /api/ambulance, /api/emergency, /api/corridor
---------------------------------------------------------------------------
Phase 4: Ambulance GPS + Route Intelligence + Dynamic ETA + Safety Recommendations
---------------------------------------------------------------------------
"""
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
)

ambulance_bp = Blueprint("ambulance", __name__)


# ── Read ──────────────────────────────────────────────────────────────────────
@ambulance_bp.get("/ambulance")
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
