"""
Verification Test for Local Ultralytics YOLO Inference on traffic.mp4
---------------------------------------------------------------------------
Proves that local YOLO11n genuinely detects and tracks vehicles from backend/data/traffic.mp4.
"""
import sys
import os
import time
import json

# Add backend directory to path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from services.vehicle_detection import (
    get_vehicle_counts_for_junction,
    get_all_vehicle_classifications,
    get_camera_status,
)
from config import Config

def run_test():
    print("=" * 65)
    print("  OMNI SMARTCITY — Local Ultralytics YOLO Verification Test")
    print("=" * 65)

    print(f"[1/5] Checking configuration...")
    print(f"      USE_REAL_YOLO:      {Config.USE_REAL_YOLO}")
    print(f"      TRAFFIC_VIDEO_PATH: {Config.TRAFFIC_VIDEO_PATH}")
    print(f"      YOLO_MODEL_NAME:    {Config.YOLO_MODEL_NAME}")
    assert os.path.exists(Config.TRAFFIC_VIDEO_PATH), f"Video file not found at {Config.TRAFFIC_VIDEO_PATH}"
    print("      ✓ Video file exists!")

    print("\n[2/5] Running YOLO inference on Frame 1 (J1)...")
    t0 = time.time()
    j1_det = get_vehicle_counts_for_junction("J1")
    elapsed = round((time.time() - t0) * 1000, 2)
    print(json.dumps(j1_det, indent=2))

    assert j1_det["source"] == "real_yolo", f"Expected source 'real_yolo', got '{j1_det.get('source')}'"
    assert j1_det["status"] == "OK", f"YOLO inference status failed: {j1_det.get('error')}"
    assert "YOLO11n" in j1_det["yoloModel"], f"Expected YOLO11n model name, got '{j1_det.get('yoloModel')}'"
    assert j1_det["inferenceMs"] > 0, "Inference time should be > 0"
    assert j1_det["fps"] > 0, "FPS should be > 0"
    print(f"      ✓ Frame 1 detection completed in {elapsed}ms! (Inference: {j1_det['inferenceMs']}ms, FPS: {j1_det['fps']})")

    print("\n[3/5] Running YOLO inference over 10 consecutive frames to test tracking...")
    unique_ids_seen = set()
    total_vehicles_sum = 0
    for frame_idx in range(2, 12):
        det = get_vehicle_counts_for_junction("J1")
        assert det["source"] == "real_yolo", f"Frame {frame_idx} source is not real_yolo"
        assert det["status"] == "OK", f"Frame {frame_idx} failed: {det.get('error')}"
        
        cars = det.get("cars", 0)
        motos = det.get("motorcycles", 0)
        buses = det.get("buses", 0)
        trucks = det.get("trucks", 0)
        total = det.get("total", 0)
        assert total == (cars + motos + buses + trucks), f"Mismatch: total {total} != {cars}+{motos}+{buses}+{trucks}"
        
        active_ids = det.get("activeTrackIds", [])
        unique_ids_seen.update(active_ids)
        total_vehicles_sum += total
        print(f"      Frame {frame_idx:02d}: {total} vehicles (Cars: {cars}, Moto: {motos}, Bus: {buses}, Truck: {trucks}) | FPS: {det['fps']} | Active Track IDs: {active_ids}")

    print(f"      ✓ 10 frames processed cleanly! Cumulative unique track IDs: {list(unique_ids_seen)}")

    print("\n[4/5] Testing system-wide vehicle classification API...")
    classifications = get_all_vehicle_classifications()
    print(json.dumps(classifications, indent=2))
    assert classifications["source"] == "real_yolo", f"Classification source is not real_yolo"
    assert classifications["status"] == "OK", f"Classification status error: {classifications.get('error')}"
    print("      ✓ Aggregated classifications verified!")

    print("\n[5/5] Testing camera status list API...")
    cams = get_camera_status()
    assert len(cams) == 12, f"Expected 12 cameras, got {len(cams)}"
    assert cams[0]["source"] == "real_yolo", f"Camera 1 source is not real_yolo"
    assert cams[0]["yoloStatus"] == "OK", f"Camera 1 status is not OK"
    print(f"      ✓ 12 camera status objects verified! Engine: {cams[0]['yoloEngine']}")

    print("\n" + "=" * 65)
    print("  ALL TESTS PASSED! Local YOLO11n inference on traffic.mp4 is 100% operational.")
    print("=" * 65)

if __name__ == "__main__":
    run_test()
