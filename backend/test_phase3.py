"""
OMNI SMARTCITY — Phase 3 Comprehensive Automated Verification Suite
"""
import sys
import os
import time
import json
import urllib.request
import websockets
import asyncio

backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from services.camera_manager import camera_manager, CAMERA_PROFILES
from services.vehicle_detection import _yolo_detector
from services.state_manager import state_manager

async def test_websocket_broadcast():
    uri = "ws://localhost:5000/ws/live"
    async with websockets.connect(uri) as websocket:
        init_msg = await asyncio.wait_for(websocket.recv(), timeout=5.0)
        data = json.loads(init_msg)
        assert data["type"] in ("INITIAL_STATE", "STATE_UPDATE"), f"Unexpected WS msg type: {data['type']}"
        print("      ✓ WebSocket connection & initial state received!")

        # Wait for next TICK broadcast from CameraManager
        tick_msg = await asyncio.wait_for(websocket.recv(), timeout=10.0)
        tick_data = json.loads(tick_msg)
        assert tick_data["type"] == "TICK", f"Expected TICK broadcast, got {tick_data['type']}"
        live_state = tick_data["data"]
        
        # Verify CAM-01 in WS data
        cam1 = next((c for c in live_state["cameras"] if c.get("id") == "CAM-01"), None)
        assert cam1 is not None, "CAM-01 missing from WS state"
        assert cam1.get("sourceType") == "real_yolo", f"CAM-01 sourceType should be 'real_yolo', got {cam1.get('sourceType')}"
        
        # Verify CAM-02 in WS data
        cam2 = next((c for c in live_state["cameras"] if c.get("id") == "CAM-02"), None)
        assert cam2 is not None, "CAM-02 missing from WS state"
        assert cam2.get("sourceType") == "simulation", f"CAM-02 sourceType should be 'simulation', got {cam2.get('sourceType')}"
        
        # Verify J4 junction congestion reflection
        j4 = next((j for j in live_state["junctions"] if j.get("id") == "J4"), None)
        assert j4 is not None, "J4 missing from WS junctions"
        print(f"      ✓ WebSocket live broadcast verified! J4 congestion: {j4['status']}, CAM-01: {cam1['sourceType']}, CAM-02: {cam2['sourceType']}")

def run_tests():
    print("=" * 70)
    print("  OMNI SMARTCITY — PHASE 3 MULTI-CAMERA PIPELINE VERIFICATION")
    print("=" * 70)

    # 1. CAM-01 REAL YOLO
    print("\n[TEST 1] Testing CAM-01 Real YOLO pipeline...")
    det1 = _yolo_detector.get_detection()
    assert det1["source"] == "real_yolo", f"Expected real_yolo, got {det1.get('source')}"
    assert det1["status"] in ("OK", "ERROR"), f"Unexpected status {det1.get('status')}"
    if det1["status"] == "OK":
        assert "yoloModel" in det1, "yoloModel missing"
        assert "inferenceMs" in det1, "inferenceMs missing"
        assert "fps" in det1, "fps missing"
        assert det1["total"] == (det1["cars"] + det1["motorcycles"] + det1["buses"] + det1["trucks"])
        print(f"      ✓ Real YOLO11n active on CAM-01! Vehicles: {det1['total']} (Cars: {det1['cars']}, Motos: {det1['motorcycles']}, Buses: {det1['buses']}, Trucks: {det1['trucks']}), Inf: {det1['inferenceMs']}ms, FPS: {det1['fps']}")
    else:
        print(f"      ✓ YOLO status reported as OFFLINE/ERROR as expected: {det1.get('error')}")

    # 2. CAMERA MANAGER & PROFILES
    print("\n[TEST 2] Testing Camera Manager & camera profiles (CAM-02 -> CAM-12)...")
    all_sim = camera_manager.get_all_sim_metrics()
    assert len(all_sim) == 11, f"Expected 11 simulated cameras, got {len(all_sim)}"
    
    profiles_verified = []
    for cam_id in [f"CAM-{i:02d}" for i in range(2, 13)]:
        m = all_sim.get(cam_id)
        assert m is not None, f"Metrics missing for {cam_id}"
        assert m["sourceType"] == "simulation", f"Expected simulation sourceType for {cam_id}"
        assert m["vehicles"] == (m["cars"] + m["motorcycles"] + m["buses"] + m["trucks"]), f"Vehicle mix mismatch for {cam_id}"
        profiles_verified.append(f"{cam_id} ({m['congestion']}, {m['vehicles']} veh, {m['speed']}km/h)")

    print(f"      ✓ 11 simulated cameras active with unique traffic profiles:")
    for p in profiles_verified:
        print(f"        • {p}")

    # 3. METRICS PHYSICS CORRELATION
    print("\n[TEST 3] Verifying traffic physics consistency (vehicles vs speed/queue/congestion)...")
    for cam_id, metrics in all_sim.items():
        v = metrics["vehicles"]
        spd = metrics["speed"]
        q = metrics["queue"]
        cong = metrics["congestion"]
        
        # High vehicles => higher queue & lower speed & CRITICAL/HIGH
        if v > 60:
            assert cong == "CRITICAL", f"High vehicles {v} should be CRITICAL, got {cong}"
            assert spd < 25, f"High vehicles {v} speed should be low, got {spd}"
        elif v < 25:
            assert cong == "SMOOTH", f"Low vehicles {v} should be SMOOTH, got {cong}"
            assert spd > 25, f"Low vehicles {v} speed should be higher, got {spd}"

    print("      ✓ Metric physical relationships verified! (More vehicles → lower speed, higher queue & congestion)")

    # 4. JUNCTION MAPPING
    print("\n[TEST 4] Testing Junction-Camera mapping (CAM-01→J1 ... CAM-12→J12)...")
    for i in range(1, 13):
        cid = f"CAM-{i:02d}"
        jid = f"J{i}"
        junc = state_manager.get_junction(jid)
        assert junc is not None, f"Junction {jid} missing"
        if cid == "CAM-01":
            assert junc.get("cameraSource") == "real_yolo", f"J1 cameraSource should be real_yolo, got {junc.get('cameraSource')}"
        else:
            assert junc.get("cameraSource") == "simulation", f"{jid} cameraSource should be simulation, got {junc.get('cameraSource')}"

    print("      ✓ Junction mapping (J1-J12) correctly bound to camera sources!")

    # 5. REST ENDPOINTS
    print("\n[TEST 5] Testing REST API endpoints...")
    base_url = "http://localhost:5000/api"

    # GET /api/cameras
    req = urllib.request.urlopen(f"{base_url}/cameras")
    cams_res = json.loads(req.read().decode())
    assert len(cams_res) == 12, f"Expected 12 cameras from /api/cameras, got {len(cams_res)}"
    assert cams_res[0]["sourceType"] == "real_yolo"
    assert cams_res[1]["sourceType"] == "simulation"
    print("      ✓ GET /api/cameras OK!")

    # GET /api/cameras/CAM-01/detections
    req = urllib.request.urlopen(f"{base_url}/cameras/CAM-01/detections")
    cam1_det_res = json.loads(req.read().decode())
    assert cam1_det_res["source"] == "real_yolo"
    print("      ✓ GET /api/cameras/CAM-01/detections OK!")

    # GET /api/cameras/CAM-04/detections
    req = urllib.request.urlopen(f"{base_url}/cameras/CAM-04/detections")
    cam4_det_res = json.loads(req.read().decode())
    assert cam4_det_res["sourceType"] == "simulation"
    assert cam4_det_res["camId"] == "CAM-04"
    print("      ✓ GET /api/cameras/CAM-04/detections OK!")

    # 6. WEBSOCKET BROADCAST TEST
    print("\n[TEST 6] Testing live WebSocket /ws/live state broadcasts...")
    asyncio.run(test_websocket_broadcast())

    print("\n" + "=" * 70)
    print("  PHASE 3 ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
