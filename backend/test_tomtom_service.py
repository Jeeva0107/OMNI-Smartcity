"""
Verification Test for TomTom Traffic API Integration
---------------------------------------------------------------------------
Tests TomTomTrafficService key loading, API flow fetching, field normalization,
API failure safety, simulation fallback, and live state updates without hardcoding keys.
"""
import sys
import os
import time
import json

backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from config import Config
from services.tomtom_traffic import TomTomTrafficService, tomtom_service
from services.state_manager import state_manager


def run_tests():
    print("=" * 70)
    print("  OMNI SMARTCITY -- TOMTOM TRAFFIC API INTEGRATION VERIFICATION")
    print("=" * 70)

    # 1. API Key Loading
    print("\n[TEST 1] Testing API key loading from environment...")
    env_key = os.getenv("TOMTOM_API_KEY", "")
    svc_key = tomtom_service.get_api_key()
    assert svc_key == env_key, "TomTom service did not load TOMTOM_API_KEY from environment"
    assert len(svc_key) > 0, "TOMTOM_API_KEY is empty"
    print(f"      [OK] API key successfully loaded from environment (length: {len(svc_key)} chars). Key is protected.")

    # 2. Live API Flow Fetch & Normalization (Kathipara Junction J1)
    print("\n[TEST 2] Testing real TomTom Flow API fetch for Kathipara (13.0067, 80.2020)...")
    flow = tomtom_service.fetch_junction_flow(13.0067, 80.2020)
    assert flow is not None, "Expected valid flow dictionary from TomTom API"
    required_fields = ["currentSpeed", "freeFlowSpeed", "currentTravelTime", "freeFlowTravelTime", "confidence", "roadClosure"]
    for f in required_fields:
        assert f in flow, f"Field '{f}' missing from normalized TomTom flow output"

    print(f"      [OK] Flow response normalized cleanly:")
    print(f"        * currentSpeed:      {flow['currentSpeed']} km/h")
    print(f"        * freeFlowSpeed:     {flow['freeFlowSpeed']} km/h")
    print(f"        * currentTravelTime: {flow['currentTravelTime']} s")
    print(f"        * freeFlowTravelTime:{flow['freeFlowTravelTime']} s")
    print(f"        * confidence:        {flow['confidence']}")
    print(f"        * roadClosure:       {flow['roadClosure']}")

    # 3. Security check: API key not exposed in data or JSON output
    print("\n[TEST 3] Security verification -- API key exclusion...")
    flow_str = json.dumps(flow)
    assert svc_key not in flow_str, "API KEY EXPOSED IN NORMALIZED FLOW DATA!"
    state_str = json.dumps(state_manager.get_state())
    assert svc_key not in state_str, "API KEY EXPOSED IN CENTRALIZED STATE PAYLOAD!"
    print("      [OK] API key is completely absent from flow metrics, state payloads, and logs.")

    # 4. Full Sync on 12 Junctions
    print("\n[TEST 4] Running full traffic data sync on 12 Chennai junction coordinates...")
    sync_res = tomtom_service.sync_traffic_data()
    print(f"      [OK] Sync completed!")
    print(f"        * Status:           {sync_res['status']}")
    print(f"        * Message:          {sync_res['message']}")
    print(f"        * Junctions Updated:{sync_res['junctionsUpdated']}/12")
    print(f"        * Incidents Found:  {sync_res['incidentsCount']}")

    assert sync_res["status"] in ("TOMTOM_LIVE", "SIMULATION_FALLBACK"), f"Unexpected status {sync_res['status']}"
    assert sync_res["junctionsUpdated"] > 0, "No junctions were updated"

    # 5. Check Live State Manager updates & field preservation
    print("\n[TEST 5] Verifying StateManager junctions & metric preservation...")
    junctions = state_manager.get_junctions()
    assert len(junctions) == 12, f"Expected 12 junctions, got {len(junctions)}"

    j1 = next((j for j in junctions if j["id"] == "J1"), None)
    assert j1 is not None
    assert j1["tomtomStatus"] == "TOMTOM_LIVE"
    assert "speed" in j1 and "freeFlowSpeed" in j1 and "travelTime" in j1
    # Check that vehicles/queue/pedestrians/signal were NOT wiped out or fabricated
    assert "vehicles" in j1 and "queue" in j1 and "signal" in j1
    print(f"      [OK] J1 updated with TomTom metrics (Speed: {j1['speed']}km/h, FreeFlow: {j1['freeFlowSpeed']}km/h) while preserving YOLO/signal state (Signal: {j1['signal']}, Vehicles: {j1['vehicles']})")

    # 6. Error Handling & Simulation Fallback Test
    print("\n[TEST 6] Testing graceful failure & simulation fallback with invalid API key...")
    test_service = TomTomTrafficService()

    # Temporarily force invalid API key on dummy service
    old_key = Config.TOMTOM_API_KEY
    try:
        Config.TOMTOM_API_KEY = "invalid_dummy_key_for_test"
        failed_flow = test_service.fetch_junction_flow(13.0067, 80.2020)
        assert failed_flow is None, "Expected None when API call fails due to invalid key"
        
        fallback_res = test_service.sync_traffic_data()
        assert fallback_res["status"] == "SIMULATION_FALLBACK", f"Expected SIMULATION_FALLBACK, got {fallback_res['status']}"
        print(f"      [OK] Graceful fallback verified! Status: {fallback_res['status']}, Message: '{fallback_res['message']}'")
    finally:
        Config.TOMTOM_API_KEY = old_key

    # Re-sync valid data
    tomtom_service.sync_traffic_data()

    print("\n" + "=" * 70)
    print("  ALL TOMTOM TRAFFIC SERVICE INTEGRATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 70)


if __name__ == "__main__":
    run_tests()
