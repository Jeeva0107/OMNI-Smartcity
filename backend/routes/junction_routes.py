"""
Junction Routes  —  Blueprint: /api/junctions
"""
from flask import Blueprint, jsonify, request
from services.junction_service import (
    get_all_junctions, get_junction_by_id,
    apply_signal, spike_congestion,
)

junctions_bp = Blueprint("junctions", __name__)


@junctions_bp.get("/junctions")
def list_junctions():
    """
    GET /api/junctions
    Returns live telemetry for all 12 junctions.
    Optional query param: ?status=HIGH,CRITICAL  (comma-separated filter)
    """
    status_filter = request.args.get("status")
    junctions = get_all_junctions()
    if status_filter:
        allowed = {s.strip().upper() for s in status_filter.split(",")}
        junctions = [j for j in junctions if j["status"] in allowed]
    return jsonify(junctions)


@junctions_bp.get("/junctions/<junction_id>")
def get_junction(junction_id: str):
    """GET /api/junctions/{id}  —  single junction detail."""
    junc = get_junction_by_id(junction_id.upper())
    if not junc:
        return jsonify({"error": f"Junction {junction_id} not found"}), 404
    return jsonify(junc)


@junctions_bp.post("/signal/recommend")
def update_signal():
    """
    POST /api/signal/recommend
    Body: { "junctionId": "J5", "signalState": "GREEN" }
    """
    body       = request.get_json(silent=True) or {}
    junction_id   = body.get("junctionId", "").upper()
    target_signal = body.get("signalState", "GREEN").upper()

    if not junction_id:
        return jsonify({"error": "junctionId is required"}), 400
    if target_signal not in ("GREEN", "RED", "YELLOW", "ALL_RED"):
        return jsonify({"error": f"Invalid signalState: {target_signal}"}), 400

    updated = apply_signal(junction_id, target_signal)
    return jsonify({
        "success":   True,
        "junctionId": junction_id,
        "signal":     target_signal,
        "junction":  updated,
    })


@junctions_bp.post("/junctions/congestion")
def trigger_congestion():
    """
    POST /api/junctions/congestion
    Body: { "junctionId": "J5" }   — defaults to J5 if omitted.
    """
    body       = request.get_json(silent=True) or {}
    junction_id = body.get("junctionId", "J5").upper()
    updated    = spike_congestion(junction_id)
    return jsonify({"success": True, "junction": updated})
