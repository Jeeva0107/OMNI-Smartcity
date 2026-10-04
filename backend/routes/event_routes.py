"""
Event / Activity Log Routes  —  Blueprint: /api/events
---------------------------------------------------------------------------
Responsibility: Serve activity log events from central live state manager and
allow creating new events.
---------------------------------------------------------------------------
"""
from flask import Blueprint, jsonify, request
from services.state_manager import state_manager

events_bp = Blueprint("events", __name__)


def push_event(category: str, location: str, title: str,
               description: str, severity: str, status: str) -> dict:
    """Helper called by other services to append a structured event."""
    return state_manager.push_event(category, location, title, description, severity, status)


@events_bp.get("/events")
def list_events():
    """
    GET /api/events
    Optional query params:
      ?category=EMERGENCY,AI   (comma-separated)
      ?severity=CRITICAL,WARNING
      ?limit=50
    """
    category_filter = request.args.get("category")
    severity_filter = request.args.get("severity")
    limit           = int(request.args.get("limit", 100))

    result = state_manager.get_events()

    if category_filter:
        cats   = {c.strip().upper() for c in category_filter.split(",")}
        result = [e for e in result if e["category"] in cats]
    if severity_filter:
        sevs   = {s.strip().upper() for s in severity_filter.split(",")}
        result = [e for e in result if e["severity"] in sevs]

    return jsonify(result[:limit])


@events_bp.post("/events")
def create_event():
    """
    POST /api/events
    Body: { category, location, title, description, severity, status }
    Allows operator or external services to push events to central live state.
    """
    body = request.get_json(silent=True) or {}
    required = ("category", "location", "title", "description", "severity", "status")
    missing  = [f for f in required if f not in body]
    if missing:
        return jsonify({"error": f"Missing fields: {missing}"}), 400

    evt = push_event(**{k: body[k] for k in required})
    return jsonify({"success": True, "event": evt}), 201
