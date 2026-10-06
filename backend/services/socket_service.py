"""
OMNI SMARTCITY — Socket.IO Service for Ambulance App & Control Room
---------------------------------------------------------------------------
Responsibility:
  - Provide Socket.IO server endpoints matching Expo React Native ambulance app expectations.
  - Join clients to trip rooms (e.g. ambulance-trip-{tripId}).
  - Broadcast real-time events (junction:signal-updated, corridor:status-updated,
    ambulance:notification, ambulance:route-changed, ambulance:trip-ended).
---------------------------------------------------------------------------
"""
import time
import logging
from typing import Dict, Any, Optional
from flask_socketio import SocketIO, join_room, leave_room, emit

logger = logging.getLogger(__name__)

socketio = SocketIO(cors_allowed_origins="*", async_mode="threading")


def init_socketio(app):
    """Binds SocketIO to the Flask application."""
    socketio.init_app(app)
    logger.info("[SocketService] Flask-SocketIO initialized.")


@socketio.on("connect")
def handle_connect():
    logger.info("[SocketService] Client connected via Socket.IO")
    emit("connected", {"status": "connected", "timestamp": time.strftime("%H:%M:%S")})


@socketio.on("disconnect")
def handle_disconnect():
    logger.info("[SocketService] Client disconnected from Socket.IO")


@socketio.on("ambulance:join-trip")
@socketio.on("emergency_join_trip")
@socketio.on("join-trip")
def handle_join_trip(data: Dict[str, Any]):
    """
    Client emits 'ambulance:join-trip' or 'emergency_join_trip' with { ambulanceId, tripId }
    Joins socket client to room 'ambulance-trip-{tripId}' and 'ambulance-trip-{ambulanceId}'
    """
    data = data or {}
    trip_id = data.get("tripId") or "TRIP-102"
    ambulance_id = data.get("ambulanceId") or "AMB-102"

    room1 = f"ambulance-trip-{trip_id}"
    room2 = f"ambulance-trip-{ambulance_id}"

    join_room(room1)
    join_room(room2)
    logger.info(f"[SocketService] Joined Socket.IO rooms: {room1}, {room2}")

    response = {
        "status": "success",
        "tripId": trip_id,
        "ambulanceId": ambulance_id,
        "room": room1,
        "timestamp": time.strftime("%H:%M:%S")
    }
    emit("joined-trip", response)
    emit("emergency_joined_trip", response)


@socketio.on("ambulance:trip-ended")
@socketio.on("emergency_trip_ended")
def handle_trip_ended_event(data: Dict[str, Any]):
    from services.emergency_service import end_ambulance_trip
    data = data or {}
    ambulance_id = data.get("ambulanceId", "AMB-102")
    trip_id = data.get("tripId", "TRIP-102")
    end_ambulance_trip(ambulance_id, trip_id)


# ── Server → Ambulance App & Website Emission Helpers ─────────────────────────
def emit_junction_signal_updated(trip_id: str, payload: Dict[str, Any], ambulance_id: Optional[str] = None):
    """Emits traffic_signal_changed & junction:signal-updated to trip room and globally."""
    room = f"ambulance-trip-{trip_id}"
    socketio.emit("traffic_signal_changed", payload, to=room)
    socketio.emit("junction:signal-updated", payload, to=room)
    if ambulance_id:
        socketio.emit("traffic_signal_changed", payload, to=f"ambulance-trip-{ambulance_id}")
        socketio.emit("junction:signal-updated", payload, to=f"ambulance-trip-{ambulance_id}")
    socketio.emit("traffic_signal_changed", payload)
    socketio.emit("junction:signal-updated", payload)


def emit_corridor_status_updated(trip_id: str, payload: Dict[str, Any], ambulance_id: Optional[str] = None):
    """Emits emergency_corridor_updated & corridor:status-updated to trip room and globally."""
    room = f"ambulance-trip-{trip_id}"
    socketio.emit("emergency_corridor_updated", payload, to=room)
    socketio.emit("corridor:status-updated", payload, to=room)
    if ambulance_id:
        socketio.emit("emergency_corridor_updated", payload, to=f"ambulance-trip-{ambulance_id}")
        socketio.emit("corridor:status-updated", payload, to=f"ambulance-trip-{ambulance_id}")
    socketio.emit("emergency_corridor_updated", payload)
    socketio.emit("corridor:status-updated", payload)


def emit_ambulance_location_updated(trip_id: str, payload: Dict[str, Any], ambulance_id: Optional[str] = None):
    """Emits ambulance_location_updated to trip room and globally."""
    room = f"ambulance-trip-{trip_id}"
    socketio.emit("ambulance_location_updated", payload, to=room)
    if ambulance_id:
        socketio.emit("ambulance_location_updated", payload, to=f"ambulance-trip-{ambulance_id}")
    socketio.emit("ambulance_location_updated", payload)


def emit_emergency_trip_started(trip_id: str, payload: Dict[str, Any], ambulance_id: Optional[str] = None):
    """Emits emergency_trip_started & ambulance:trip-started to trip room and globally."""
    room = f"ambulance-trip-{trip_id}"
    socketio.emit("emergency_trip_started", payload, to=room)
    socketio.emit("ambulance:trip-started", payload, to=room)
    if ambulance_id:
        socketio.emit("emergency_trip_started", payload, to=f"ambulance-trip-{ambulance_id}")
        socketio.emit("ambulance:trip-started", payload, to=f"ambulance-trip-{ambulance_id}")
    socketio.emit("emergency_trip_started", payload)
    socketio.emit("ambulance:trip-started", payload)


def emit_ambulance_notification(trip_id: str, payload: Dict[str, Any], ambulance_id: Optional[str] = None):
    """Emits ambulance:notification to trip room."""
    room = f"ambulance-trip-{trip_id}"
    socketio.emit("ambulance:notification", payload, to=room)
    if ambulance_id:
        socketio.emit("ambulance:notification", payload, to=f"ambulance-trip-{ambulance_id}")
    socketio.emit("ambulance:notification", payload)


def emit_ambulance_route_changed(trip_id: str, payload: Dict[str, Any], ambulance_id: Optional[str] = None):
    """Emits emergency_route_updated & ambulance:route-changed to trip room."""
    room = f"ambulance-trip-{trip_id}"
    socketio.emit("emergency_route_updated", payload, to=room)
    socketio.emit("ambulance:route-changed", payload, to=room)
    if ambulance_id:
        socketio.emit("emergency_route_updated", payload, to=f"ambulance-trip-{ambulance_id}")
        socketio.emit("ambulance:route-changed", payload, to=f"ambulance-trip-{ambulance_id}")
    socketio.emit("emergency_route_updated", payload)
    socketio.emit("ambulance:route-changed", payload)


def emit_ambulance_trip_ended(trip_id: str, payload: Dict[str, Any], ambulance_id: Optional[str] = None):
    """Emits emergency_trip_ended & ambulance:trip-ended to trip room."""
    room = f"ambulance-trip-{trip_id}"
    socketio.emit("emergency_trip_ended", payload, to=room)
    socketio.emit("ambulance:trip-ended", payload, to=room)
    if ambulance_id:
        socketio.emit("emergency_trip_ended", payload, to=f"ambulance-trip-{ambulance_id}")
        socketio.emit("ambulance:trip-ended", payload, to=f"ambulance-trip-{ambulance_id}")
    socketio.emit("emergency_trip_ended", payload)
    socketio.emit("ambulance:trip-ended", payload)
