"""
Traffic Intelligence & Camera Routes  —  Blueprint: /api/traffic & /api/cameras
---------------------------------------------------------------------------
Phase 3: CameraManager integrated for CAM-02 → CAM-12 simulation streams.
CAM-01 → real YOLO (vehicle_detection.py)
CAM-02→CAM-12 → CameraManager simulation (camera_manager.py)
---------------------------------------------------------------------------
"""
import time
from flask import Blueprint, jsonify, request, Response
from services.vehicle_detection import (
    get_all_vehicle_classifications,
    get_camera_status,
    get_vehicle_counts_for_junction,
    get_video_stream,
)
from services.junction_service import get_all_junctions
from services.tomtom_traffic import tomtom_service
from services.state_manager import state_manager

traffic_bp = Blueprint("traffic", __name__)


@traffic_bp.get("/traffic")
def get_traffic_overview():
    """GET /api/traffic — System-wide KPI summary."""
    junctions = get_all_junctions()
    high_critical = len([j for j in junctions if j.get("status") in ("HIGH", "CRITICAL")])
    yolo_stats = get_all_vehicle_classifications()
    tomtom_info = state_manager.get_tomtom_status()

    return jsonify({
        "activeJunctions":    len(junctions),
        "vehiclesMonitored":  yolo_stats.get("totalTracked", 0) if yolo_stats.get("status") == "OK"
                              else sum(j.get("vehicles", 0) for j in junctions),
        "highCongestion":     high_critical,
        "activeIncidents":    tomtom_info.get("incidentsCount", 2),
        "emergencyCorridors": 1,
        "systemStatus":       "ONLINE",
        "yoloSource":         yolo_stats.get("source", "real_yolo"),
        "yoloStatus":         yolo_stats.get("status", "OK"),
        "tomtomStatus":       tomtom_info.get("status", "SIMULATION_FALLBACK"),
        "tomtomMessage":      tomtom_info.get("message", ""),
        "timestamp":          time.strftime("%H:%M:%S"),
    })


@traffic_bp.get("/traffic/tomtom")
def get_tomtom_status_endpoint():
    """GET /api/traffic/tomtom — Returns TomTom service live status without API key."""
    return jsonify(state_manager.get_tomtom_status())


@traffic_bp.post("/traffic/tomtom/sync")
def trigger_tomtom_sync():
    """POST /api/traffic/tomtom/sync — Manually trigger immediate TomTom telemetry sync."""
    res = tomtom_service.sync_traffic_data()
    return jsonify(res)


@traffic_bp.get("/traffic/classifications")
def get_classifications():
    """GET /api/traffic/classifications — Aggregated real YOLO metrics."""
    data = get_all_vehicle_classifications()
    return jsonify(data)


@traffic_bp.get("/traffic/history")
def get_traffic_history():
    """GET /api/traffic/history?window=N — Rolling traffic history for charts."""
    window = int(request.args.get("window", 10))
    now = time.time()
    history = []
    for i in range(window, 0, -1):
        t_str = time.strftime("%H:%M", time.localtime(now - i * 60))
        history.append({
            "time":             t_str,
            "volume":           1400 + (i * 17) % 350,
            "avgSpeed":         38 - (i % 7),
            "congestionIndex":  round(0.42 + (i % 5) * 0.08, 2),
        })
    return jsonify(history)


@traffic_bp.get("/traffic/predictions")
def get_traffic_predictions():
    """GET /api/traffic/predictions — 15-min congestion predictions per junction."""
    junctions = get_all_junctions()
    predictions = []
    for j in junctions:
        veh = j.get("vehicles", 30)
        predicted_veh = max(5, veh + (hash(j["id"]) % 15) - 7)
        predictions.append({
            "junctionId":            j["id"],
            "name":                  j["name"],
            "currentVehicles":       veh,
            "predictedVehicles15m":  predicted_veh,
            "predictedStatus":       "CRITICAL" if predicted_veh > 60 else "HIGH" if predicted_veh > 40 else "SMOOTH",
            "trend":                 "INCREASING" if predicted_veh > veh else "STABLE",
        })
    return jsonify(predictions)


@traffic_bp.get("/cameras")
def list_cameras():
    """
    GET /api/cameras
    CAM-01 → real_yolo  |  CAM-02→CAM-12 → simulation
    """
    from services.camera_manager import camera_manager
    cams = get_camera_status()          # populates CAM-01 YOLO info

    sim_all = camera_manager.get_all_sim_metrics()
    for cam in cams:
        cid = cam.get("id", "")
        if cid == "CAM-01":
            cam["sourceType"] = "real_yolo"
        elif cid in sim_all:
            m = sim_all[cid]
            cam["sourceType"]  = "simulation"
            cam["vehicles"]    = m["vehicles"]
            cam["status"]      = "OK"
            cam["congestion"]  = m["congestion"]
            cam["fps"]         = 30
            cam["timestamp"]   = m["timestamp"]

    return jsonify(cams)


@traffic_bp.get("/cameras/<cam_id>/detections")
def get_camera_detections(cam_id: str):
    """
    GET /api/cameras/{cam_id}/detections
    CAM-01  → real YOLO metrics
    CAM-02→CAM-12 → simulated metrics (sourceType=simulation)
    """
    from services.camera_manager import camera_manager
    cam_upper = cam_id.upper()

    if cam_upper == "CAM-01":
        data = get_vehicle_counts_for_junction("J1")
        return jsonify(data)

    metrics = camera_manager.get_sim_metrics(cam_upper)
    if metrics is None:
        return jsonify({"error": f"Unknown camera {cam_upper}"}), 404
    return jsonify(metrics)


@traffic_bp.get("/cameras/<cam_id>/video_feed")
def video_feed(cam_id: str):
    """
    GET /api/cameras/{cam_id}/video_feed
    CAM-01  → MJPEG with real YOLO11n bounding boxes on traffic.mp4
    CAM-02→CAM-12 → MJPEG with animated procedural traffic simulation
    """
    from services.camera_manager import camera_manager
    cam_upper = cam_id.upper()

    if cam_upper == "CAM-01":
        return Response(
            get_video_stream(),
            mimetype="multipart/x-mixed-replace; boundary=frame"
        )

    return Response(
        camera_manager.generate_sim_stream(cam_upper),
        mimetype="multipart/x-mixed-replace; boundary=frame"
    )
