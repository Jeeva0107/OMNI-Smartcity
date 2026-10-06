"""
OMNI SMARTCITY — Ambulance Shared Backend API & Socket.IO Test Suite
======================================================================
Verifies all REST endpoints, state updates, audit events, and Socket.IO events required
by the React Native Ambulance App.
"""
import sys
import os
import json
import unittest

sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from services.state_manager import state_manager
from services.socket_service import socketio


class AmbulanceBackendApiTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.client = self.app.test_client()

    def test_01_start_ambulance_trip(self):
        payload = {
            "ambulanceId": "AMB-999",
            "tripId": "TRIP-999",
            "hospitalId": "HOSP-01",
            "hospital": "Rajiv Gandhi Govt General Hospital",
            "routeId": "ROUTE-A",
            "startTime": "14:30:00",
            "scenario": "CRITICAL_TRANSFER"
        }
        res = self.client.post("/api/ambulances/trips/start", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get("success"))
        self.assertEqual(data.get("routeId"), "ROUTE-A")
        self.assertIn("junctions", data)

        # Verify StateManager state
        amb = state_manager.get_ambulance()
        self.assertEqual(amb.get("id"), "AMB-999")
        self.assertEqual(amb.get("tripId"), "TRIP-999")
        self.assertTrue(amb.get("active"))
        self.assertTrue(amb.get("emergencyActive"))

        corridor = state_manager.get_emergency_corridor()
        self.assertEqual(corridor.get("tripId"), "TRIP-999")
        self.assertEqual(corridor.get("ambulanceId"), "AMB-999")
        self.assertTrue(corridor.get("active"))
        self.assertIn("location", corridor)
        self.assertIn("destination", corridor)
        self.assertIn("route", corridor)
        self.assertIn("routeProgress", corridor)
        self.assertIn("eta", corridor)
        self.assertIn("currentJunction", corridor)
        self.assertIn("nextJunction", corridor)
        self.assertIn("signalChanges", corridor)
        self.assertIn("lastUpdated", corridor)

        # Verify audit event logged
        events = state_manager.get_events()
        start_evt = next((e for e in events if e.get("category") == "AMBULANCE_TRIP_STARTED"), None)
        self.assertIsNotNone(start_evt)

    def test_02_update_ambulance_location(self):
        payload = {
            "type": "LOCATION_UPDATE",
            "ambulanceId": "AMB-999",
            "tripId": "TRIP-999",
            "latitude": 13.0150,
            "longitude": 80.2120,
            "speed": 65.5,
            "heading": 90.0,
            "routeIndex": 1,
            "nextJunctionId": "J8",
            "etaSeconds": 360
        }
        res = self.client.post("/api/ambulances/location", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get("success"))

        amb = state_manager.get_ambulance()
        self.assertEqual(amb.get("latitude"), 13.0150)
        self.assertEqual(amb.get("longitude"), 80.2120)
        self.assertEqual(amb.get("speed"), 65.5)
        corridor = state_manager.get_emergency_corridor()
        self.assertEqual(corridor.get("location"), {"latitude": 13.0150, "longitude": 80.2120})
        self.assertEqual(corridor.get("eta"), "06:00")

    def test_03_change_ambulance_route(self):
        payload = {
            "ambulanceId": "AMB-999",
            "tripId": "TRIP-999",
            "routeChanged": True,
            "reason": "ROAD_BLOCKED",
            "routeId": "ROUTE-B",
            "newEtaSeconds": 480
        }
        res = self.client.post("/api/ambulances/route-change", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get("success"))

        amb = state_manager.get_ambulance()
        self.assertEqual(amb.get("routeId"), "ROUTE-B")
        self.assertEqual(amb.get("corridorStatus"), "BLOCKED")
        self.assertEqual(state_manager.get_emergency_corridor().get("routeId"), "ROUTE-B")

        events = state_manager.get_events()
        reroute_evt = next((e for e in events if e.get("category") == "ALTERNATE_ROUTE_ASSIGNED"), None)
        self.assertIsNotNone(reroute_evt)

    def test_04_get_events_and_notifications(self):
        res_evt = self.client.get("/api/ambulances/events?ambulanceId=AMB-999")
        self.assertEqual(res_evt.status_code, 200)
        events = res_evt.get_json()
        self.assertIsInstance(events, list)

        res_notif = self.client.get("/api/ambulances/notifications?ambulanceId=AMB-999")
        self.assertEqual(res_notif.status_code, 200)
        notifications = res_notif.get_json()
        self.assertIsInstance(notifications, list)

    def test_05_end_ambulance_trip(self):
        normal_signals = state_manager.get_ambulance().get("normalSignalStates", {})
        payload = {
            "ambulanceId": "AMB-999",
            "tripId": "TRIP-999"
        }
        res = self.client.post("/api/ambulances/trips/end", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get("status"), "TRIP_ENDED")

        amb = state_manager.get_ambulance()
        self.assertFalse(amb.get("active"))
        self.assertFalse(amb.get("emergencyActive"))
        self.assertFalse(state_manager.get_emergency_corridor().get("active"))
        for junction_id, normal_state in normal_signals.items():
            if normal_state.get("signal") is not None:
                self.assertEqual(state_manager.get_junction(junction_id).get("signal"), normal_state["signal"])

    def test_06_start_trip_complex_payload(self):
        """Tests start trip with complex/nested object payloads from React Native Expo app."""
        payload = {
            "ambulanceId": "AMB-204",
            "tripId": "trip-1791192064923",
            "hospital": {
                "id": "HOSP-02",
                "name": "Apollo Hospitals Greams Road",
                "lat": 13.0600,
                "lng": 80.2500
            },
            "route": [
                {"latitude": 13.0067, "longitude": 80.2020},
                {"latitude": 13.0150, "longitude": 80.2120},
                {"latitude": 13.0247, "longitude": 80.2227}
            ],
            "currentLocation": {"latitude": 13.0100, "longitude": 80.2070},
            "routeId": "ROUTE-A",
            "junctions": ["J1", "J8", "J2"],
            "startTime": "2026-10-05T14:50:00.000Z"
        }
        res = self.client.post("/api/ambulances/trips/start", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get("success"))
        self.assertIn("trip", data)
        
        amb = state_manager.get_ambulance()
        self.assertEqual(amb.get("id"), "AMB-204")
        self.assertEqual(amb.get("tripId"), "trip-1791192064923")
        self.assertEqual(amb.get("destination"), "Apollo Hospitals Greams Road")
        self.assertTrue(amb.get("active"))
        self.assertEqual(amb.get("gpsMode"), "EXTERNAL")
        self.assertEqual(amb.get("currentLocation"), {"latitude": 13.0100, "longitude": 80.2070})

    def test_07_socketio_receives_complete_trip_lifecycle(self):
        socket_client = socketio.test_client(self.app, flask_test_client=self.client)
        try:
            self.client.post("/api/ambulances/trips/start", json={
                "ambulanceId": "AMB-SOCKET",
                "tripId": "TRIP-SOCKET",
                "hospital": "Test Hospital",
                "routeId": "ROUTE-A"
            })
            snapshot = self.client.get("/api/state").get_json()
            corridor = snapshot.get("emergencyCorridor", {})
            self.assertEqual(corridor.get("tripId"), "TRIP-SOCKET")
            self.assertTrue(corridor.get("active"))
            self.client.post("/api/ambulances/location", json={
                "ambulanceId": "AMB-SOCKET",
                "tripId": "TRIP-SOCKET",
                "latitude": 13.02,
                "longitude": 80.21,
                "routeProgress": 25,
                "etaSeconds": 240
            })
            self.client.post("/api/ambulances/route-change", json={
                "ambulanceId": "AMB-SOCKET",
                "tripId": "TRIP-SOCKET",
                "routeId": "ROUTE-B",
                "reason": "ROAD_BLOCKED"
            })
            self.client.post("/api/ambulances/trips/end", json={
                "ambulanceId": "AMB-SOCKET",
                "tripId": "TRIP-SOCKET"
            })

            received_events = {event["name"] for event in socket_client.get_received()}
            for event_name in (
                "state:update",
                "emergency_trip_started",
                "ambulance:trip-started",
                "ambulance_location_updated",
                "emergency_route_updated",
                "ambulance:route-changed",
                "traffic_signal_changed",
                "junction:signal-updated",
                "emergency_trip_ended",
                "ambulance:trip-ended",
            ):
                self.assertIn(event_name, received_events)
        finally:
            socket_client.disconnect()

    def test_08_external_location_and_array_route_are_kept_in_shared_state(self):
        start = self.client.post("/api/ambulances/trips/start", json={
            "ambulanceId": "AMB-EXT",
            "tripId": "TRIP-EXT",
            "destination": {
                "name": "Test Hospital",
                "latitude": 13.0700,
                "longitude": 80.2600
            },
            "currentLocation": [13.0110, 80.2050],
            "route": [[13.0110, 80.2050], [13.0200, 80.2200]],
            "junctions": ["J1", "J8"]
        })
        self.assertEqual(start.status_code, 200)
        ambulance = state_manager.get_ambulance()
        self.assertEqual(ambulance.get("gpsMode"), "EXTERNAL")
        self.assertEqual(ambulance.get("latitude"), 13.0110)
        self.assertEqual(ambulance.get("longitude"), 80.2050)
        self.assertEqual(ambulance.get("route")[1]["latitude"], 13.0200)

        location = self.client.post("/api/ambulances/location", json={
            "ambulanceId": "AMB-EXT",
            "tripId": "TRIP-EXT",
            "latitude": 13.0140,
            "longitude": 80.2140,
            "routeProgress": 25,
            "etaSeconds": 240
        })
        self.assertEqual(location.status_code, 200)
        ambulance = state_manager.get_ambulance()
        self.assertEqual(ambulance.get("gpsMode"), "EXTERNAL")
        self.assertEqual(ambulance.get("latitude"), 13.0140)
        self.assertEqual(ambulance.get("routeProgress"), 25)

        end = self.client.post("/api/ambulances/trips/end", json={
            "ambulanceId": "AMB-EXT",
            "tripId": "TRIP-EXT"
        })
        self.assertEqual(end.status_code, 200)
        self.assertFalse(state_manager.get_ambulance().get("active"))


if __name__ == "__main__":
    unittest.main()
