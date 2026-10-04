"""
Phase 1 WebSocket Verification Script
--------------------------------------
Tests ws://localhost:5000/ws/live independently.
Does NOT modify any frontend files.
"""
import json
import time
import threading
import urllib.request
from websockets.sync.client import connect

WS_URL = "ws://localhost:5000/ws/live"
REST_URL = "http://localhost:5000"

RESULTS = {
    "WEBSOCKET CONNECTION": "FAIL",
    "INITIAL MESSAGE": "FAIL",
    "MULTIPLE UPDATES": "FAIL",
    "LIVE STATE CHANGE": "FAIL",
}

messages = []
ws_ref = [None]  # mutable ref so threads can share


def ws_listener():
    """Connect to /ws/live, collect all messages until timeout."""
    try:
        ws = connect(WS_URL)
        ws_ref[0] = ws
        RESULTS["WEBSOCKET CONNECTION"] = "PASS"
        print("[1] WebSocket connection to ws://localhost:5000/ws/live  -> OPENED")

        # Collect messages for up to 12 seconds
        deadline = time.time() + 12
        while time.time() < deadline:
            try:
                raw = ws.recv(timeout=2.0)
                msg = json.loads(raw)
                messages.append(msg)
            except TimeoutError:
                continue
            except Exception:
                break
    except Exception as e:
        print(f"[1] WebSocket connection FAILED: {e}")


def trigger_state_change():
    """After a short delay, hit a REST endpoint that mutates backend state."""
    time.sleep(2.5)  # let initial messages arrive first
    print("\n[3] Triggering state change via POST /api/junctions/congestion (J3)...")
    body = json.dumps({"junctionId": "J3"}).encode()
    req = urllib.request.Request(
        f"{REST_URL}/api/junctions/congestion",
        data=body,
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read())
            print(f"    REST response: success={data.get('success')}")
    except Exception as e:
        print(f"    REST trigger failed: {e}")


# ── Run ───────────────────────────────────────────────────────────────────────
print("=" * 60)
print("  OMNI SMARTCITY  Phase 1 WebSocket Verification")
print("=" * 60)

listener = threading.Thread(target=ws_listener, daemon=True)
trigger = threading.Thread(target=trigger_state_change, daemon=True)

listener.start()
trigger.start()

# Wait for everything to finish
trigger.join(timeout=15)
time.sleep(3)  # extra buffer for WS messages to arrive

# Close WS if still open
if ws_ref[0]:
    try:
        ws_ref[0].close()
    except Exception:
        pass

listener.join(timeout=2)

# ── Analyse collected messages ────────────────────────────────────────────────
print("\n" + "-" * 60)
print(f"Total WebSocket messages received: {len(messages)}")
print("-" * 60)

for i, msg in enumerate(messages):
    mt = msg.get("type", "?")
    ts = msg.get("timestamp", "?")
    data_keys = list(msg.get("data", {}).keys()) if isinstance(msg.get("data"), dict) else "N/A"
    print(f"  #{i+1}  type={mt}  timestamp={ts}  data_keys={data_keys}")

# ── Check: INITIAL MESSAGE ────────────────────────────────────────────────────
if messages:
    first = messages[0]
    print(f"\n[2] First message type: {first.get('type')}")
    print(f"    First message timestamp: {first.get('timestamp')}")
    if first.get("type") == "INITIAL_STATE" and isinstance(first.get("data"), dict):
        RESULTS["INITIAL MESSAGE"] = "PASS"
        state = first["data"]
        print("    JSON contents of first message (top-level keys):")
        for k in state:
            val = state[k]
            if isinstance(val, list):
                print(f"      {k}: list[{len(val)}]")
            elif isinstance(val, dict):
                print(f"      {k}: dict({len(val)} keys)")
            else:
                print(f"      {k}: {val}")

        required = [
            "junctions", "cameras", "yolo_metrics", "ambulances",
            "routes", "eta", "emergency_corridor", "events",
        ]
        missing = [k for k in required if k not in state]
        if missing:
            print(f"    WARNING: missing keys in state: {missing}")
            RESULTS["INITIAL MESSAGE"] = "FAIL"
        else:
            print("    All 8 required state sections present.")

# ── Check: MULTIPLE UPDATES ──────────────────────────────────────────────────
if len(messages) >= 2:
    RESULTS["MULTIPLE UPDATES"] = "PASS"
    second = messages[1]
    print(f"\n[4] Second message received: type={second.get('type')}")

# ── Check: LIVE STATE CHANGE ─────────────────────────────────────────────────
# Look for a JUNCTION_UPDATED or TICK or EVENT_ADDED message that arrived
# AFTER the trigger (messages index >= 1, type != INITIAL_STATE and != PONG)
state_change_msgs = [
    m for m in messages
    if m.get("type") not in ("INITIAL_STATE", "PONG")
]
if state_change_msgs:
    RESULTS["LIVE STATE CHANGE"] = "PASS"
    print(f"\n[5] Live state change broadcast detected:")
    for m in state_change_msgs[:3]:
        print(f"    type={m.get('type')}  timestamp={m.get('timestamp')}")

# ── Final Scorecard ───────────────────────────────────────────────────────────
phase1 = all(v == "PASS" for v in RESULTS.values())
RESULTS["PHASE 1"] = "PASS" if phase1 else "FAIL"

print("\n" + "=" * 60)
print("  PHASE 1 SCORECARD")
print("=" * 60)
for label, result in RESULTS.items():
    tag = "[PASS]" if result == "PASS" else "[FAIL]"
    print(f"  {label}: {tag}")
print("=" * 60)
