"""
OMNI SMARTCITY — TomTom Traffic API Integration Service
---------------------------------------------------------------------------
Responsibility: Fetch real-time traffic flow telemetry and incident data
from TomTom Traffic API for the 12 Chennai junction coordinates.

Key Principles:
1. Never expose TOMTOM_API_KEY in logs, WebSocket payloads, REST responses, or UI.
2. Normalize only fields returned by TomTom (currentSpeed, freeFlowSpeed, travelTime,
   freeFlowTravelTime, confidence, roadClosure, incidents).
3. Do NOT fabricate vehicle counts, queue lengths, pedestrian counts, or signal states.
4. Update centralized live state (StateManager) and broadcast over /ws/live.
5. Provide data-source status: TOMTOM_LIVE, SIMULATION_FALLBACK, ERROR.
6. Fallback automatically to simulation if TomTom fails or API key is missing.
---------------------------------------------------------------------------
"""
import os
import time
import json
import logging
import threading
import urllib.request
import urllib.error
import urllib.parse
from typing import Dict, List, Any, Tuple, Optional

from config import Config
from services.state_manager import state_manager

logger = logging.getLogger("omni.tomtom_traffic")
logging.basicConfig(level=logging.INFO)


def _parse_coordinate(coord_val: Any) -> float:
    """Safely parse latitude/longitude from numeric or string values like '13.0067° N'."""
    if isinstance(coord_val, (int, float)):
        return float(coord_val)
    s = str(coord_val).strip()
    clean = s.replace("°", "").replace("N", "").replace("E", "").replace("S", "").replace("W", "").strip()
    val = float(clean)
    if "S" in s or "W" in s:
        val = -val
    return val


class TomTomTrafficService:
    """Service to interact with TomTom Traffic API safely and sync central live state."""

    def __init__(self):
        self._lock = threading.Lock()
        self._sync_thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._last_status: Dict[str, Any] = {
            "status": "INITIALIZING",
            "lastUpdated": time.strftime("%H:%M:%S"),
            "statusCode": 200,
            "message": "TomTom traffic service initialized",
            "junctionsUpdated": 0,
            "incidentsCount": 0,
            "incidents": [],
        }

    def get_api_key(self) -> str:
        """Fetch API key from Config or environment variable."""
        return Config.TOMTOM_API_KEY or os.getenv("TOMTOM_API_KEY", "")

    def fetch_junction_flow(self, lat: float, lng: float, timeout: float = 5.0) -> Optional[Dict[str, Any]]:
        """
        Fetch TomTom Flow Segment Data for a single coordinate.
        URL pattern: https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?key={KEY}&point={lat},{lng}
        """
        api_key = self.get_api_key()
        if not api_key:
            logger.warning("[TomTom Service] TOMTOM_API_KEY is missing or empty.")
            return None

        url = f"https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?key={api_key}&point={lat},{lng}"
        req = urllib.request.Request(url, headers={"User-Agent": "OmniSmartCity-Backend/1.0"})

        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                status_code = resp.getcode()
                logger.info("[TomTom Service] Flow API request for point (%.4f, %.4f) HTTP Status: %d", lat, lng, status_code)
                raw_data = resp.read().decode("utf-8")
                payload = json.loads(raw_data)
                
                flow_data = payload.get("flowSegmentData", {})
                if not flow_data:
                    return None

                return {
                    "currentSpeed": flow_data.get("currentSpeed", 0),
                    "freeFlowSpeed": flow_data.get("freeFlowSpeed", 0),
                    "currentTravelTime": flow_data.get("currentTravelTime", 0),
                    "freeFlowTravelTime": flow_data.get("freeFlowTravelTime", 0),
                    "confidence": flow_data.get("confidence", 1.0),
                    "roadClosure": flow_data.get("roadClosure", False),
                    "frc": flow_data.get("frc", ""),
                }
        except urllib.error.HTTPError as e:
            # Safe logging — NEVER log the API key or raw URL containing key
            logger.error("[TomTom Service] Flow API HTTPError %d for point (%.4f, %.4f)", e.code, lat, lng)
            return None
        except urllib.error.URLError as e:
            logger.error("[TomTom Service] Flow API URLError (%s) for point (%.4f, %.4f)", e.reason, lat, lng)
            return None
        except Exception as e:
            logger.error("[TomTom Service] Unexpected exception fetching flow: %s", str(e))
            return None

    def fetch_traffic_incidents(self, bbox: str = "80.14,12.89,80.30,13.10", timeout: float = 5.0) -> List[Dict[str, Any]]:
        """
        Fetch traffic incident details within Chennai bounding box from TomTom Incidents API.
        """
        api_key = self.get_api_key()
        if not api_key:
            return []

        fields = "{incidents{type,geometry{type,coordinates},properties{iconCategory,magnitudeOfDelay,events{description,code},startTime,endTime}}}"
        url = f"https://api.tomtom.com/traffic/services/5/incidentDetails?key={api_key}&bbox={bbox}&fields={urllib.parse.quote(fields)}"
        req = urllib.request.Request(url, headers={"User-Agent": "OmniSmartCity-Backend/1.0"})

        incidents = []
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                logger.info("[TomTom Service] Incidents API HTTP Status: %d", resp.getcode())
                payload = json.loads(resp.read().decode("utf-8"))
                raw_incidents = payload.get("incidents", [])

                for idx, inc in enumerate(raw_incidents[:10]):  # Limit top 10 incidents
                    props = inc.get("properties", {})
                    events = props.get("events", [])
                    desc = events[0].get("description", "Traffic Incident") if events else "Traffic Incident"
                    geom = inc.get("geometry", {})
                    coords = geom.get("coordinates", [])

                    incidents.append({
                        "id": f"TOMTOM-INC-{idx+1}",
                        "description": desc,
                        "magnitudeOfDelay": props.get("magnitudeOfDelay", 0),
                        "iconCategory": props.get("iconCategory", 0),
                        "startTime": props.get("startTime", ""),
                        "coordinates": coords,
                    })
        except Exception as e:
            logger.error("[TomTom Service] Incident fetch failed: %s", str(e))

        return incidents

    def sync_traffic_data(self) -> Dict[str, Any]:
        """
        Fetch real-time TomTom telemetry for all 12 junction coordinates,
        update central live state (StateManager), and return service status.
        """
        api_key = self.get_api_key()
        now_str = time.strftime("%H:%M:%S")

        if not api_key:
            status_update = {
                "status": "ERROR",
                "lastUpdated": now_str,
                "statusCode": 401,
                "message": "TOMTOM_API_KEY is missing in backend/.env",
                "junctionsUpdated": 0,
                "incidentsCount": 0,
                "incidents": [],
            }
            state_manager.update_tomtom_status(status_update, notify=True)
            self._last_status = status_update
            return status_update

        junctions = state_manager.get_junctions()
        updated_junctions = []
        success_count = 0

        for j in junctions:
            j_copy = dict(j)
            try:
                lat = _parse_coordinate(j_copy["lat"])
                lng = _parse_coordinate(j_copy["lng"])
                flow = self.fetch_junction_flow(lat, lng)

                if flow is not None:
                    # Update TomTom normalized fields ONLY
                    # Do NOT fabricate or alter vehicles, queue, pedestrians, signal, recommendedSignal
                    j_copy["speed"] = flow["currentSpeed"]
                    j_copy["freeFlowSpeed"] = flow["freeFlowSpeed"]
                    j_copy["travelTime"] = flow["currentTravelTime"]
                    j_copy["freeFlowTravelTime"] = flow["freeFlowTravelTime"]
                    j_copy["confidence"] = flow["confidence"]
                    j_copy["roadClosure"] = flow["roadClosure"]
                    j_copy["tomtomStatus"] = "TOMTOM_LIVE"
                    j_copy["dataSource"] = "TOMTOM_LIVE"
                    j_copy["lastUpdated"] = now_str
                    
                    # Compute dynamic congestion status from TomTom speed vs freeFlowSpeed
                    ff_speed = flow["freeFlowSpeed"] or 40
                    curr_speed = flow["currentSpeed"]
                    ratio = curr_speed / max(1, ff_speed)
                    if curr_speed < 15 or ratio < 0.4:
                        j_copy["status"] = "CRITICAL"
                    elif curr_speed < 25 or ratio < 0.65:
                        j_copy["status"] = "HIGH"
                    elif curr_speed < 38 or ratio < 0.85:
                        j_copy["status"] = "MODERATE"
                    else:
                        j_copy["status"] = "SMOOTH"

                    success_count += 1
                else:
                    # Fallback to existing simulation telemetry for this junction
                    j_copy["tomtomStatus"] = "SIMULATION_FALLBACK"
                    if "dataSource" not in j_copy or j_copy["dataSource"] != "TOMTOM_LIVE":
                        j_copy["dataSource"] = "SIMULATION_FALLBACK"
            except Exception as e:
                logger.error("[TomTom Service] Error processing junction %s: %s", j_copy.get("id"), str(e))
                j_copy["tomtomStatus"] = "SIMULATION_FALLBACK"

            updated_junctions.append(j_copy)

        # Fetch incidents
        incidents = self.fetch_traffic_incidents()

        if success_count > 0:
            status_code = 200
            service_status = "TOMTOM_LIVE"
            message = f"TomTom Traffic API live — updated {success_count}/12 junctions"
        else:
            status_code = 503
            service_status = "SIMULATION_FALLBACK"
            message = "TomTom API calls failed — falling back to simulation mode"

        status_payload = {
            "status": service_status,
            "lastUpdated": now_str,
            "statusCode": status_code,
            "message": message,
            "junctionsUpdated": success_count,
            "incidentsCount": len(incidents),
            "incidents": incidents,
        }

        # Update Centralized Live State
        state_manager.set_all_junctions(updated_junctions, notify=False)
        state_manager.update_tomtom_status(status_payload, notify=True)

        with self._lock:
            self._last_status = status_payload

        return status_payload

    def get_status(self) -> Dict[str, Any]:
        """Return cached status snapshot without exposing API key."""
        with self._lock:
            return dict(self._last_status)

    def start_background_sync(self, interval: int = 30):
        """Start periodic background sync thread."""
        with self._lock:
            if self._sync_thread and self._sync_thread.is_alive():
                return

            self._stop_event.clear()

            def _worker():
                logger.info("[TomTom Service] Background sync thread started (interval=%ds)...", interval)
                # Initial sync on startup
                try:
                    self.sync_traffic_data()
                except Exception as e:
                    logger.error("[TomTom Service] Initial sync failed: %s", str(e))

                while not self._stop_event.is_set():
                    time.sleep(interval)
                    if self._stop_event.is_set():
                        break
                    try:
                        self.sync_traffic_data()
                    except Exception as e:
                        logger.error("[TomTom Service] Background sync error: %s", str(e))

            self._sync_thread = threading.Thread(target=_worker, daemon=True)
            self._sync_thread.start()

    def stop_background_sync(self):
        """Stop background sync thread."""
        self._stop_event.set()


# Global Singleton TomTom Traffic Service instance
tomtom_service = TomTomTrafficService()
