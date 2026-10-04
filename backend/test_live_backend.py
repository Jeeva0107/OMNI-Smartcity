"""
Backend Verification Script for OMNI SMARTCITY Centralized Live State & WebSocket /ws/live
"""
import sys
import time
import json
import threading
import urllib.request
import urllib.parse
from websockets.sync.client import connect

BASE_URL = "http://localhost:5000"
WS_URL = "ws://localhost:5000/ws/live"

def test_rest_endpoints():
    print("\n[TEST] 1. Testing REST Endpoints...")
    endpoints = [
        "/health",
        "/api/state",
        "/api/junctions",
        "/api/junctions/J1",
        "/api/ambulance",
        "/api/events",
        "/api/routes?origin=J1&destination=J7",
        "/api/traffic",
        "/api/cameras",
    ]

    for ep in endpoints:
        url = BASE_URL + ep
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as resp:
            status = resp.status
            data = json.loads(resp.read().decode('utf-8'))
            assert status == 200, f"Endpoint {ep} failed with status {status}"
            print(f"  [OK] GET {ep} -> 200 OK (Received {len(data) if isinstance(data, list) else len(data.keys())} items/keys)")

    # Test POST endpoint: signal update
    req_body = json.dumps({"junctionId": "J2", "signalState": "GREEN"}).encode('utf-8')
    req = urllib.request.Request(f"{BASE_URL}/api/signal/recommend", data=req_body, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
        res = json.loads(resp.read().decode('utf-8'))
        assert res.get("success") is True
        print("  [OK] POST /api/signal/recommend -> 200 OK (signal J2 updated)")

    # Test POST endpoint: emergency advance
    req = urllib.request.Request(f"{BASE_URL}/api/emergency/advance", data=b'{}', headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
        res = json.loads(resp.read().decode('utf-8'))
        assert res.get("success") is True
        print("  [OK] POST /api/emergency/advance -> 200 OK (ambulance advanced)")


def test_websocket():
    print("\n[TEST] 2. Testing WebSocket /ws/live...")

    received_messages = []

    def client_thread():
        try:
            with connect(WS_URL) as websocket:
                print("  [OK] /ws/live accepted WebSocket connection!")
                # Listen for messages
                while True:
                    message = websocket.recv(timeout=5.0)
                    data = json.loads(message)
                    received_messages.append(data)
                    # Send a ping message back to server
                    if data.get("type") == "INITIAL_STATE":
                        websocket.send(json.dumps({"type": "PING"}))
        except Exception as e:
            # Normal completion if connection closes after test
            pass

    t = threading.Thread(target=client_thread, daemon=True)
    t.start()

    # Give websocket client a moment to connect and receive INITIAL_STATE
    time.sleep(1.0)

    # Trigger a test state change via POST request to test live broadcast over WS
    print("\n[TEST] 3. Triggering test state change for WebSocket broadcast...")
    req_body = json.dumps({"junctionId": "J5"}).encode('utf-8')
    req = urllib.request.Request(f"{BASE_URL}/api/junctions/congestion", data=req_body, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
        print("  [OK] Triggered POST /api/junctions/congestion for J5")

    # Wait for broadcast message to be received
    time.sleep(1.5)

    print(f"\n[TEST] Received {len(received_messages)} WebSocket messages total:")
    for idx, msg in enumerate(received_messages):
        msg_type = msg.get("type")
        ts = msg.get("timestamp")
        print(f"  Message #{idx+1}: type='{msg_type}' at {ts}")
        if msg_type == "INITIAL_STATE":
            state = msg.get("data", {})
            keys = list(state.keys())
            print(f"    Initial State Keys: {keys}")
            for req_key in ["junctions", "cameras", "yolo_metrics", "ambulances", "routes", "eta", "emergency_corridor", "events"]:
                assert req_key in state, f"Missing required key in state: {req_key}"
            print("    [OK] All 8 central live state components present in initial state broadcast!")

    assert len(received_messages) >= 2, "Expected at least INITIAL_STATE and broadcast update messages!"
    print("\n[SUCCESS] ALL BACKEND & WEBSOCKET VERIFICATIONS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_rest_endpoints()
    test_websocket()
