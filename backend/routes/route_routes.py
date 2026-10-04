"""
Route Intelligence Routes  —  Blueprint: /api/routes
"""
from flask import Blueprint, jsonify, request
from services.route_optimizer import calculate_routes
from data.mock_data           import get_routes

routes_bp = Blueprint("routes", __name__)


@routes_bp.get("/routes")
def list_routes():
    """
    GET /api/routes?origin=J1&destination=J9
    Returns pre-computed mock routes if no params given,
    or live-computed routes when origin + destination are provided.
    """
    origin      = request.args.get("origin",      "J1").upper()
    destination = request.args.get("destination", "J9").upper()
    mode        = request.args.get("mode",        "normal").lower()

    # Quick fallback: if origin == destination, return empty
    if origin == destination:
        return jsonify([])

    routes = calculate_routes(origin, destination, mode=mode)
    return jsonify(routes)


@routes_bp.post("/route/calculate")
def calculate_route():
    """
    POST /api/route/calculate
    Body: { "origin": "J1", "destination": "J9", "mode": "normal" }
    Re-evaluates routes with current live traffic state.
    """
    body        = request.get_json(silent=True) or {}
    origin      = body.get("origin",      "J1").upper()
    destination = body.get("destination", "J9").upper()
    mode        = body.get("mode",        "normal").lower()

    if not origin or not destination:
        return jsonify({"error": "origin and destination are required"}), 400

    routes = calculate_routes(origin, destination, mode=mode)
    recommended = next((r for r in routes if r.get("isRecommended")), routes[0] if routes else None)

    return jsonify({
        "success":          True,
        "origin":           origin,
        "destination":      destination,
        "mode":             mode,
        "routes":           routes,
        "recommendedRoute": recommended,
    })


@routes_bp.post("/route/recalculate")
def recalculate_route():
    """
    POST /api/route/recalculate  (alias kept for frontend backward compat)
    """
    return calculate_route()
