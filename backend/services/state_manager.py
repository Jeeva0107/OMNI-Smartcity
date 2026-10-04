"""
OMNI SMARTCITY — Centralized Live State Manager
---------------------------------------------------------------------------
Responsibility: Maintain a single thread-safe source of truth for all live
city data (junctions, cameras, YOLO metrics, ambulances, routes, ETA,
emergency corridor, and activity events).

Broadcasts real-time state updates to all connected WebSocket clients on /ws/live.
---------------------------------------------------------------------------
"""
import copy
import time
import json
import threading
from typing import Dict, List, Any, Set

from data.mock_data import (
    get_junctions,
    get_cameras,
    get_routes,
    get_ambulance,
    get_events,
    get_vehicle_classification,
)

class StateManager:
    """Singleton Live State Manager holding central backend state."""
    _instance = None
    _init_lock = threading.Lock()

    def __new__(cls):
        with cls._init_lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._initialize()
            return cls._instance

    def _initialize(self):
        self._lock = threading.Lock()
        self._ws_lock = threading.Lock()
        self._ws_clients: Set[Any] = set()
        self._event_counter = 108

        # Initialize Centralized State
        initial_ambulance = get_ambulance()
        initial_junctions = get_junctions()
        initial_cameras = get_cameras()
        initial_routes = get_routes()
        initial_events = get_events()
        initial_yolo = get_vehicle_classification()

        self._state: Dict[str, Any] = {
            "junctions": initial_junctions,
            "cameras": initial_cameras,
            "yolo_metrics": initial_yolo,
            "ambulances": initial_ambulance,
            "routes": initial_routes,
            "eta": {
                "activeCorridorEta": initial_ambulance.get("eta", "06:45"),
                "etaSeconds": initial_ambulance.get("etaSeconds", 405),
                "distRemainingKm": initial_ambulance.get("distRemaining", 12.4),
                "avgCitySpeedKmH": 42.5,
                "lastCalculated": time.strftime("%H:%M:%S"),
            },
            "emergency_corridor": {
                "active": initial_ambulance.get("active", True),
                "ambulanceId": initial_ambulance.get("id", "AMB-102"),
                "corridorApproved": initial_ambulance.get("corridorApproved", True),
                "origin": initial_ambulance.get("origin", "J1"),
                "destination": initial_ambulance.get("destination", "J7"),
                "routeJunctions": initial_ambulance.get("routeJunctions", ["J1", "J2", "J7"]),
                "currentJunctionIndex": initial_ambulance.get("currentJunctionIndex", 0),
                "junctionStatus": initial_ambulance.get("junctionStatus", {}),
                "safetyValidation": initial_ambulance.get("safetyValidation", {}),
            },
            "events": initial_events,
            "tomtom_status": {
                "status": "INITIALIZING",
                "lastUpdated": time.strftime("%H:%M:%S"),
                "statusCode": 200,
                "message": "TomTom Traffic API service initializing",
                "junctionsUpdated": 0,
                "incidentsCount": 0,
                "incidents": [],
            },
            "lastUpdated": time.strftime("%H:%M:%S"),
        }

    # ── WebSocket Client Registration & Broadcasting ─────────────────────────
    def register_ws(self, ws):
        with self._ws_lock:
            self._ws_clients.add(ws)

    def unregister_ws(self, ws):
        with self._ws_lock:
            self._ws_clients.discard(ws)

    def broadcast_state(self, event_type: str = "STATE_UPDATE", payload: Dict[str, Any] = None):
        """Sends serialized JSON state to all connected WebSocket clients."""
        with self._ws_lock:
            clients = list(self._ws_clients)

        if not clients:
            return

        if payload is None:
            payload = self.get_state()

        msg = json.dumps({
            "type": event_type,
            "timestamp": time.strftime("%H:%M:%S"),
            "data": payload,
        })

        dead_clients = []
        for ws in clients:
            try:
                ws.send(msg)
            except Exception:
                dead_clients.append(ws)

        if dead_clients:
            with self._ws_lock:
                for ws in dead_clients:
                    self._ws_clients.discard(ws)

    # ── State Access ─────────────────────────────────────────────────────────
    def get_state(self) -> Dict[str, Any]:
        """Return full snapshot of central live state with snake_case and camelCase aliases."""
        with self._lock:
            state_copy = copy.deepcopy(self._state)
            # Provide aliases for standard frontend/backend schema matching
            state_copy["yoloMetrics"] = state_copy["yolo_metrics"]
            state_copy["emergencyCorridor"] = state_copy["emergency_corridor"]
            state_copy["ambulance"] = state_copy["ambulances"]
            state_copy["tomtomStatus"] = state_copy.get("tomtom_status", {})
            return state_copy

    # ── TomTom Operations ────────────────────────────────────────────────────
    def get_tomtom_status(self) -> Dict[str, Any]:
        with self._lock:
            return copy.deepcopy(self._state.get("tomtom_status", {}))

    def update_tomtom_status(self, status_dict: Dict[str, Any], notify: bool = True):
        with self._lock:
            if "tomtom_status" not in self._state:
                self._state["tomtom_status"] = {}
            self._state["tomtom_status"].update(status_dict)
            self._state["tomtom_status"]["lastUpdated"] = time.strftime("%H:%M:%S")
            self._state["lastUpdated"] = time.strftime("%H:%M:%S")
        if notify:
            self.broadcast_state("TOMTOM_UPDATED")

    # ── Junction Operations ──────────────────────────────────────────────────
    def get_junctions(self) -> List[Dict[str, Any]]:
        with self._lock:
            return copy.deepcopy(self._state["junctions"])

    def get_junction(self, junction_id: str) -> Dict[str, Any] | None:
        with self._lock:
            junc = next((j for j in self._state["junctions"] if j["id"] == junction_id), None)
            return copy.deepcopy(junc) if junc else None

    def update_junction(self, junction_id: str, updates: Dict[str, Any], notify: bool = True) -> Dict[str, Any]:
        with self._lock:
            for j in self._state["junctions"]:
                if j["id"] == junction_id:
                    j.update(updates)
                    j["lastUpdated"] = "Just now"
                    self._state["lastUpdated"] = time.strftime("%H:%M:%S")
                    updated_j = copy.deepcopy(j)
                    break
            else:
                return {}

        if notify:
            self.broadcast_state("JUNCTION_UPDATED")
        return updated_j

    def set_all_junctions(self, junctions: List[Dict[str, Any]], notify: bool = True):
        with self._lock:
            self._state["junctions"] = copy.deepcopy(junctions)
            self._state["lastUpdated"] = time.strftime("%H:%M:%S")
        if notify:
            self.broadcast_state("JUNCTIONS_SET")

    # ── Camera Operations ────────────────────────────────────────────────────
    def get_cameras(self) -> List[Dict[str, Any]]:
        with self._lock:
            return copy.deepcopy(self._state["cameras"])

    def update_cameras(self, cameras: List[Dict[str, Any]], notify: bool = True):
        with self._lock:
            self._state["cameras"] = copy.deepcopy(cameras)
            self._state["lastUpdated"] = time.strftime("%H:%M:%S")
        if notify:
            self.broadcast_state("CAMERAS_UPDATED")

    # ── YOLO Metrics Operations ──────────────────────────────────────────────
    def get_yolo_metrics(self) -> Dict[str, Any]:
        with self._lock:
            return copy.deepcopy(self._state["yolo_metrics"])

    def update_yolo_metrics(self, metrics: Dict[str, Any], notify: bool = True):
        with self._lock:
            self._state["yolo_metrics"].update(metrics)
            self._state["lastUpdated"] = time.strftime("%H:%M:%S")
        if notify:
            self.broadcast_state("YOLO_METRICS_UPDATED")

    # ── Ambulance & Emergency Corridor Operations ────────────────────────────
    def get_ambulance(self) -> Dict[str, Any]:
        with self._lock:
            return copy.deepcopy(self._state["ambulances"])

    def get_emergency_corridor(self) -> Dict[str, Any]:
        with self._lock:
            return copy.deepcopy(self._state["emergency_corridor"])

    def update_ambulance_and_corridor(self, amb_updates: Dict[str, Any], notify: bool = True) -> Dict[str, Any]:
        with self._lock:
            self._state["ambulances"].update(amb_updates)

            # Sync emergency corridor view
            amb = self._state["ambulances"]
            self._state["emergency_corridor"] = {
                "active": amb.get("active", True),
                "ambulanceId": amb.get("id", "AMB-102"),
                "corridorApproved": amb.get("corridorApproved", True),
                "origin": amb.get("origin", "J1"),
                "destination": amb.get("destination", "J7"),
                "routeJunctions": amb.get("routeJunctions", ["J1", "J2", "J7"]),
                "currentJunctionIndex": amb.get("currentJunctionIndex", 0),
                "junctionStatus": amb.get("junctionStatus", {}),
                "safetyValidation": amb.get("safetyValidation", {}),
            }

            # Sync ETA
            self._state["eta"]["activeCorridorEta"] = amb.get("eta", "06:45")
            self._state["eta"]["etaSeconds"] = amb.get("etaSeconds", 405)
            self._state["eta"]["distRemainingKm"] = amb.get("distRemaining", 12.4)
            self._state["eta"]["lastCalculated"] = time.strftime("%H:%M:%S")

            self._state["lastUpdated"] = time.strftime("%H:%M:%S")
            res = copy.deepcopy(amb)

        if notify:
            self.broadcast_state("CORRIDOR_UPDATED")
        return res

    # ── Routes & ETA Operations ──────────────────────────────────────────────
    def get_routes(self) -> List[Dict[str, Any]]:
        with self._lock:
            return copy.deepcopy(self._state["routes"])

    def update_routes(self, routes: List[Dict[str, Any]], notify: bool = True):
        with self._lock:
            self._state["routes"] = copy.deepcopy(routes)
            self._state["lastUpdated"] = time.strftime("%H:%M:%S")
        if notify:
            self.broadcast_state("ROUTES_UPDATED")

    def get_eta(self) -> Dict[str, Any]:
        with self._lock:
            return copy.deepcopy(self._state["eta"])

    def update_eta(self, eta_data: Dict[str, Any], notify: bool = True):
        with self._lock:
            self._state["eta"].update(eta_data)
            self._state["lastUpdated"] = time.strftime("%H:%M:%S")
        if notify:
            self.broadcast_state("ETA_UPDATED")

    # ── Events Operations ────────────────────────────────────────────────────
    def get_events(self) -> List[Dict[str, Any]]:
        with self._lock:
            return copy.deepcopy(self._state["events"])

    def push_event(self, category: str, location: str, title: str,
                   description: str, severity: str, status: str, notify: bool = True) -> Dict[str, Any]:
        with self._lock:
            self._event_counter += 1
            evt = {
                "id": f"EVT-{self._event_counter}",
                "time": time.strftime("%H:%M:%S"),
                "category": category,
                "location": location,
                "title": title,
                "description": description,
                "severity": severity,
                "status": status,
            }
            self._state["events"].insert(0, evt)
            self._state["lastUpdated"] = time.strftime("%H:%M:%S")
            res = copy.deepcopy(evt)

        if notify:
            self.broadcast_state("EVENT_ADDED")
        return res


# Global state manager instance
state_manager = StateManager()
