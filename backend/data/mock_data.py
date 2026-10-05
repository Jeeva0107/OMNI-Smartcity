"""
OMNI SMARTCITY — Master Mock Dataset
Mirrors the exact shape expected by the React frontend (src/data/mockData.js).
All services import from here when real sources are unavailable.
"""
import copy, math

# ---------------------------------------------------------------------------
# JUNCTION NETWORK  (J1 – J12)
# Each junction carries all telemetry the frontend needs.
# ---------------------------------------------------------------------------
JUNCTIONS = [
    {
        "id": "J1", "name": "Kathipara Flyover Junction",
        "lat": "13.0067° N", "lng": "80.2020° E", "x": 180, "y": 120,
        "status": "SMOOTH", "vehicles": 18, "queue": 4,
        "speed": 48, "flow": 42,
        "signal": "GREEN", "recommendedSignal": "RED",
        "recommendedReason": "GST Road arterial approach queue clear (queue: 4). AI recommends transitioning green phase to Inner Ring Road cross-street for traffic fairness.",
        "pedestrians": 3, "downstreamCapacity": 88,
        "cameraId": "CAM-01", "cameraName": "Kathipara Cloverleaf North Cam 1",
        "nearestHospital": "MIOT International Hospital (2.1 km)",
        "lastUpdated": "Just now",
        "confidence": 94, "controlMode": "AI_CONTROL", "currentPhase": "Phase 1: GST Road Main Arterial Green",
        "greenDuration": 45, "redDuration": 30, "remainingTime": 22,
        "expectedImpact": "-35% Queue Delay • +18 km/h Arterial Throughput",
        "factors": {"queue": "4 vehicles", "waitingTime": "12s avg wait", "density": "24% capacity", "flow": "42 v/min", "emergencyPriority": "NORMAL (0%)", "downstreamCap": "88% available"}
    },
    {
        "id": "J2", "name": "Gemini Circle (Anna Flyover)",
        "lat": "13.0526° N", "lng": "80.2505° E", "x": 360, "y": 140,
        "status": "HIGH", "vehicles": 52, "queue": 21,
        "speed": 18, "flow": 19,
        "signal": "RED", "recommendedSignal": "GREEN",
        "recommendedReason": "High queue on Anna Salai approach (21 vehicles). AI automatically applied green phase extension to dissipate queue.",
        "pedestrians": 14, "downstreamCapacity": 62,
        "cameraId": "CAM-02", "cameraName": "Gemini Circle Core Cam 2",
        "nearestHospital": "Apollo Hospitals Greams Road (1.2 km)",
        "lastUpdated": "Just now",
        "confidence": 76, "controlMode": "AI_CONTROL", "currentPhase": "Phase 2: Nungambakkam High Road Red / Anna Salai Prep",
        "greenDuration": 55, "redDuration": 35, "remainingTime": 14,
        "expectedImpact": "-22% Queue Buildup • +10 km/h Flow Speed",
        "factors": {"queue": "21 vehicles", "waitingTime": "68s avg wait", "density": "78% capacity", "flow": "19 v/min", "emergencyPriority": "HIGH (+40% - Ambulance Corridor Route)", "downstreamCap": "62% available"}
    },
    {
        "id": "J3", "name": "Koyambedu Junction (CMBT)",
        "lat": "13.0694° N", "lng": "80.1948° E", "x": 140, "y": 280,
        "status": "SMOOTH", "vehicles": 22, "queue": 6,
        "speed": 45, "flow": 38,
        "signal": "GREEN", "recommendedSignal": "RED",
        "recommendedReason": "Poonamallee High Road queue clear (queue: 6). AI recommends cross-street green phase for CMBT bus terminal entrance.",
        "pedestrians": 2, "downstreamCapacity": 90,
        "cameraId": "CAM-03", "cameraName": "Koyambedu Flyover West Cam 3",
        "nearestHospital": "MGM Healthcare (3.5 km)",
        "lastUpdated": "3s ago",
        "confidence": 84, "controlMode": "AI_CONTROL", "currentPhase": "Phase 1: Poonamallee High Road Arterial Green",
        "greenDuration": 40, "redDuration": 30, "remainingTime": 19,
        "expectedImpact": "-28% Bus Terminal Exit Congestion",
        "factors": {"queue": "6 vehicles", "waitingTime": "15s avg wait", "density": "32% capacity", "flow": "38 v/min", "emergencyPriority": "NORMAL (0%)", "downstreamCap": "90% available"}
    },
    {
        "id": "J4", "name": "Madhya Kailash Junction (Adyar)",
        "lat": "13.0063° N", "lng": "80.2543° E", "x": 520, "y": 160,
        "status": "CRITICAL", "vehicles": 79, "queue": 34,
        "speed": 9, "flow": 11,
        "signal": "RED", "recommendedSignal": "GREEN",
        "recommendedReason": "Critical congestion at OMR entry. Downstream capacity bottleneck and sensor occlusions detected.",
        "pedestrians": 8, "downstreamCapacity": 32,
        "cameraId": "CAM-04", "cameraName": "Madhya Kailash OMR Cam 4",
        "nearestHospital": "Fortis Malar Hospital (1.8 km)",
        "lastUpdated": "2s ago",
        "confidence": 35, "controlMode": "AI_CONTROL", "currentPhase": "Phase 3: OMR Entry Red Phase (Hold)",
        "greenDuration": 60, "redDuration": 45, "remainingTime": 8,
        "expectedImpact": "Prevent Downstream Spillback to Adyar Flyover",
        "factors": {"queue": "34 vehicles", "waitingTime": "110s avg wait", "density": "92% capacity", "flow": "11 v/min", "emergencyPriority": "NORMAL (0%)", "downstreamCap": "32% available (CRITICAL BOTTLENECK)"}
    },
    {
        "id": "J5", "name": "Tidel Park Junction (Taramani)",
        "lat": "12.9868° N", "lng": "80.2482° E", "x": 380, "y": 310,
        "status": "HIGH", "vehicles": 58, "queue": 22,
        "speed": 16, "flow": 15,
        "signal": "RED", "recommendedSignal": "GREEN",
        "recommendedReason": "Queue buildup on OMR IT corridor approach (22 vehicles). AI recommends green phase activation.",
        "pedestrians": 22, "downstreamCapacity": 48,
        "cameraId": "CAM-05", "cameraName": "Tidel Park Core Cam 5",
        "nearestHospital": "Voluntary Health Services (VHS) Hospital (0.8 km)",
        "lastUpdated": "Just now",
        "confidence": 58, "controlMode": "AI_CONTROL", "currentPhase": "Phase 2: CSIR Road Cross-Street Green / OMR Red",
        "greenDuration": 50, "redDuration": 40, "remainingTime": 27,
        "expectedImpact": "-18% Peak Hour Delay on IT Corridor",
        "factors": {"queue": "22 vehicles", "waitingTime": "75s avg wait", "density": "74% capacity", "flow": "15 v/min", "emergencyPriority": "NORMAL (0%)", "downstreamCap": "48% available"}
    },
    {
        "id": "J6", "name": "Velachery Vijaya Nagar Junction",
        "lat": "12.9782° N", "lng": "80.2212° E", "x": 640, "y": 290,
        "status": "MODERATE", "vehicles": 38, "queue": 13,
        "speed": 28, "flow": 24,
        "signal": "YELLOW", "recommendedSignal": "ALL_RED",
        "recommendedReason": "Clearance yellow active on 100 Feet Bypass arm. AI recommends ALL_RED safety interval before cross-street green.",
        "pedestrians": 5, "downstreamCapacity": 71,
        "cameraId": "CAM-06", "cameraName": "Velachery Flyover Cam 6",
        "nearestHospital": "Prashanth Super Speciality Hospital (1.5 km)",
        "lastUpdated": "4s ago",
        "confidence": 88, "controlMode": "AI_CONTROL", "currentPhase": "Phase 4: Clearance Yellow Interval",
        "greenDuration": 45, "redDuration": 35, "remainingTime": 3,
        "expectedImpact": "Safe Inter-Phase Clearance • Zero Intersect Conflicts",
        "factors": {"queue": "13 vehicles", "waitingTime": "38s avg wait", "density": "52% capacity", "flow": "24 v/min", "emergencyPriority": "NORMAL (0%)", "downstreamCap": "71% available"}
    },
    {
        "id": "J7", "name": "RGGGH / Chennai Central Junction",
        "lat": "13.0817° N", "lng": "80.2778° E", "x": 410, "y": 470,
        "status": "MODERATE", "vehicles": 29, "queue": 9,
        "speed": 36, "flow": 31,
        "signal": "GREEN", "recommendedSignal": "GREEN",
        "recommendedReason": "Hospital ER access ramp priority active. AI recommends maintaining arterial green wave.",
        "pedestrians": 11, "downstreamCapacity": 94,
        "cameraId": "CAM-07", "cameraName": "RGGGH ER Gate Cam 7",
        "nearestHospital": "Rajiv Gandhi Govt General Hospital (0.1 km - DIRECT ER ACCESS)",
        "lastUpdated": "Just now",
        "confidence": 96, "controlMode": "AI_CONTROL", "currentPhase": "Phase 1: ER Priority Green Wave",
        "greenDuration": 60, "redDuration": 25, "remainingTime": 34,
        "expectedImpact": "Unobstructed ER Access • +22 km/h Emergency Speed",
        "factors": {"queue": "9 vehicles", "waitingTime": "18s avg wait", "density": "41% capacity", "flow": "31 v/min", "emergencyPriority": "HIGH (+50% - Hospital Gate Clearance)", "downstreamCap": "94% available"}
    },
    {
        "id": "J8", "name": "Saidapet Signal (Anna Salai)",
        "lat": "13.0247° N", "lng": "80.2227° E", "x": 220, "y": 450,
        "status": "HIGH", "vehicles": 54, "queue": 19,
        "speed": 19, "flow": 17,
        "signal": "RED", "recommendedSignal": "GREEN",
        "recommendedReason": "High queue on Anna Salai northbound approach (19 vehicles). AI recommends green phase transition.",
        "pedestrians": 19, "downstreamCapacity": 55,
        "cameraId": "CAM-08", "cameraName": "Saidapet Signal Cam 8",
        "nearestHospital": "Government Peripheral Hospital Saidapet (0.6 km)",
        "lastUpdated": "Just now",
        "confidence": 38, "controlMode": "AI_CONTROL", "currentPhase": "Phase 2: Mount Road Cross-Street Green",
        "greenDuration": 50, "redDuration": 40, "remainingTime": 11,
        "expectedImpact": "Relieve Anna Salai Northbound Queue",
        "factors": {"queue": "19 vehicles", "waitingTime": "62s avg wait", "density": "72% capacity", "flow": "17 v/min", "emergencyPriority": "NORMAL (0%)", "downstreamCap": "55% available"}
    },
    {
        "id": "J9", "name": "Sholinganallur Junction (OMR)",
        "lat": "12.9010° N", "lng": "80.2279° E", "x": 610, "y": 460,
        "status": "SMOOTH", "vehicles": 15, "queue": 3,
        "speed": 52, "flow": 40,
        "signal": "GREEN", "recommendedSignal": "RED",
        "recommendedReason": "OMR IT corridor approach clear (queue: 3). AI recommends giving green phase to ECR link road.",
        "pedestrians": 4, "downstreamCapacity": 92,
        "cameraId": "CAM-09", "cameraName": "Sholinganallur Junction Cam 9",
        "nearestHospital": "Gleneagles Global Health City (2.5 km)",
        "lastUpdated": "5s ago",
        "confidence": 91, "controlMode": "AI_CONTROL", "currentPhase": "Phase 1: OMR Main Expressway Green",
        "greenDuration": 45, "redDuration": 30, "remainingTime": 28,
        "expectedImpact": "Smooth Expressway Flow • Optimized ECR Link Clearance",
        "factors": {"queue": "3 vehicles", "waitingTime": "10s avg wait", "density": "20% capacity", "flow": "40 v/min", "emergencyPriority": "NORMAL (0%)", "downstreamCap": "92% available"}
    },
    {
        "id": "J10", "name": "Porur Junction",
        "lat": "13.0334° N", "lng": "80.1582° E", "x": 160, "y": 600,
        "status": "SMOOTH", "vehicles": 21, "queue": 4,
        "speed": 46, "flow": 37,
        "signal": "GREEN", "recommendedSignal": "YELLOW",
        "recommendedReason": "Green phase duration completed. AI recommends clearance yellow before switching to Mount-Poonamallee Road arm.",
        "pedestrians": 15, "downstreamCapacity": 89,
        "cameraId": "CAM-10", "cameraName": "Porur Flyover Cam 10",
        "nearestHospital": "Sri Ramachandra Medical Centre (1.5 km)",
        "lastUpdated": "2s ago",
        "confidence": 85, "controlMode": "AI_CONTROL", "currentPhase": "Phase 1: Arcot Road Approach Green",
        "greenDuration": 40, "redDuration": 35, "remainingTime": 6,
        "expectedImpact": "Equitable Cycle Split • Smooth DLF Tech Park Access",
        "factors": {"queue": "4 vehicles", "waitingTime": "14s avg wait", "density": "28% capacity", "flow": "37 v/min", "emergencyPriority": "NORMAL (0%)", "downstreamCap": "89% available"}
    },
    {
        "id": "J11", "name": "Vadapalani Junction",
        "lat": "13.0503° N", "lng": "80.2122° E", "x": 390, "y": 620,
        "status": "MODERATE", "vehicles": 38, "queue": 14,
        "speed": 29, "flow": 25,
        "signal": "YELLOW", "recommendedSignal": "ALL_RED",
        "recommendedReason": "Transition yellow phase active. AI recommends ALL_RED clearance before Inner Ring Road green phase.",
        "pedestrians": 7, "downstreamCapacity": 76,
        "cameraId": "CAM-11", "cameraName": "Vadapalani Signal Cam 11",
        "nearestHospital": "SIMS Hospital Vadapalani (0.3 km)",
        "lastUpdated": "1s ago",
        "confidence": 64, "controlMode": "AI_CONTROL", "currentPhase": "Phase 3: Yellow Transition Interval",
        "greenDuration": 45, "redDuration": 35, "remainingTime": 2,
        "expectedImpact": "Safe Phase Transition • Reduced Temple Zone Delay",
        "factors": {"queue": "14 vehicles", "waitingTime": "40s avg wait", "density": "54% capacity", "flow": "25 v/min", "emergencyPriority": "NORMAL (0%)", "downstreamCap": "76% available"}
    },
    {
        "id": "J12", "name": "Chennai Port Gate (Rajaji Salai)",
        "lat": "13.0768° N", "lng": "80.2872° E", "x": 650, "y": 610,
        "status": "SMOOTH", "vehicles": 17, "queue": 2,
        "speed": 55, "flow": 48,
        "signal": "GREEN", "recommendedSignal": "RED",
        "recommendedReason": "Port freight expressway queue clear (queue: 2). AI recommends switching signal to Rajaji Salai local access.",
        "pedestrians": 1, "downstreamCapacity": 96,
        "cameraId": "CAM-12", "cameraName": "Chennai Port Gate Cam 12",
        "nearestHospital": "Port Trust Hospital (1.2 km)",
        "lastUpdated": "6s ago",
        "confidence": 95, "controlMode": "AI_CONTROL", "currentPhase": "Phase 1: Freight Expressway Green",
        "greenDuration": 55, "redDuration": 25, "remainingTime": 31,
        "expectedImpact": "+25% Freight Transit Velocity",
        "factors": {"queue": "2 vehicles", "waitingTime": "8s avg wait", "density": "18% capacity", "flow": "48 v/min", "emergencyPriority": "NORMAL (0%)", "downstreamCap": "96% available"}
    },
]

# ---------------------------------------------------------------------------
# CAMERA FEEDS  (1-to-1 with junctions)
# ---------------------------------------------------------------------------
CAMERAS = [
    {"id": "CAM-01", "junctionId": "J1",  "name": "Kathipara Cloverleaf North Cam 1", "status": "ONLINE", "vehicles": 18, "yoloEngine": "ONLINE", "fps": 30},
    {"id": "CAM-02", "junctionId": "J2",  "name": "Gemini Circle Core Cam 2",        "status": "ONLINE", "vehicles": 52, "yoloEngine": "ONLINE", "fps": 30},
    {"id": "CAM-03", "junctionId": "J3",  "name": "Koyambedu Flyover West Cam 3",     "status": "ONLINE", "vehicles": 22, "yoloEngine": "ONLINE", "fps": 30},
    {"id": "CAM-04", "junctionId": "J4",  "name": "Madhya Kailash OMR Cam 4",         "status": "ONLINE", "vehicles": 34, "yoloEngine": "ONLINE", "fps": 29},
    {"id": "CAM-05", "junctionId": "J5",  "name": "Tidel Park Core Cam 5",           "status": "ONLINE", "vehicles": 68, "yoloEngine": "ONLINE", "fps": 30},
    {"id": "CAM-06", "junctionId": "J6",  "name": "Velachery Flyover Cam 6",          "status": "ONLINE", "vehicles": 19, "yoloEngine": "ONLINE", "fps": 30},
    {"id": "CAM-07", "junctionId": "J7",  "name": "RGGGH ER Gate Cam 7",             "status": "ONLINE", "vehicles": 29, "yoloEngine": "ONLINE", "fps": 30},
    {"id": "CAM-08", "junctionId": "J8",  "name": "Saidapet Signal Cam 8",           "status": "ONLINE", "vehicles": 74, "yoloEngine": "ONLINE", "fps": 28},
    {"id": "CAM-09", "junctionId": "J9",  "name": "Sholinganallur Junction Cam 9",    "status": "ONLINE", "vehicles": 15, "yoloEngine": "ONLINE", "fps": 30},
    {"id": "CAM-10", "junctionId": "J10", "name": "Porur Flyover Cam 10",            "status": "ONLINE", "vehicles": 21, "yoloEngine": "ONLINE", "fps": 30},
    {"id": "CAM-11", "junctionId": "J11", "name": "Vadapalani Signal Cam 11",        "status": "ONLINE", "vehicles": 38, "yoloEngine": "ONLINE", "fps": 30},
    {"id": "CAM-12", "junctionId": "J12", "name": "Chennai Port Gate Cam 12",        "status": "ONLINE", "vehicles": 17, "yoloEngine": "ONLINE", "fps": 30},
]

# ---------------------------------------------------------------------------
# ROUTE ALTERNATIVES
# ---------------------------------------------------------------------------
ROUTES = [
    {
        "id": "ROUTE-A", "name": "Via Anna Salai Arterial",
        "origin": "J1", "destination": "J7",
        "distance": 12.4, "estimatedTime": 34, "congestion": "HIGH",
        "path": ["J1", "J8", "J2", "J7"], "isRecommended": False,
        "aiReason": "Heavy congestion at Gemini Circle (J2) and Saidapet (J8) adds +12 mins delay.",
    },
    {
        "id": "ROUTE-B", "name": "Via Inner Ring Road & PH Road (Recommended)",
        "origin": "J1", "destination": "J7",
        "distance": 14.8, "estimatedTime": 24, "congestion": "LOW",
        "path": ["J1", "J10", "J11", "J3", "J7"], "isRecommended": True,
        "aiReason": "Optimal AI recommendation. 2.4 km longer but saves 10 minutes via higher flow velocity.",
    },
    {
        "id": "ROUTE-C", "name": "Via IT Corridor (OMR Bypass)",
        "origin": "J1", "destination": "J9",
        "distance": 18.2, "estimatedTime": 28, "congestion": "MODERATE",
        "path": ["J1", "J4", "J5", "J9"], "isRecommended": False,
        "aiReason": "Steady IT corridor flow via OMR with moderate queue at Tidel Park.",
    },
]

# ---------------------------------------------------------------------------
# AMBULANCE / EMERGENCY STATE
# ---------------------------------------------------------------------------
AMBULANCE = {
    "active": True,
    "id": "AMB-102",
    "callsign": "MEDIC-102 (CRITICAL CHENNAI RESPONDER)",
    "driver": "Unit 44 - Chennai Central Emergency Station",
    "patientStatus": "CODE RED - ACUTE TRAUMA",
    "origin": "J1 (Kathipara Flyover)",
    "destination": "Rajiv Gandhi Govt General Hospital (J7)",
    "speed": 64,
    "eta": "06:45",
    "etaSeconds": 405,
    "distRemaining": 12.4,
    "corridorApproved": True,
    "currentJunctionIndex": 0,
    "routeJunctions": ["J1", "J2", "J7"],
    "junctionStatus": {
        "J1": {"status": "PASSED",    "signal": "GREEN",             "clearanceWindow": "0s",  "queueCleared": True},
        "J2": {"status": "READY",     "signal": "GREEN",             "clearanceWindow": "45s", "queueCleared": True},
        "J7": {"status": "SCHEDULED", "signal": "RED",               "clearanceWindow": "140s","queueCleared": False},
    },
    "safetyValidation": {
        "signalConflict": True, "minPhaseDuration": True,
        "yellowTransition": True, "allRedClearance": True,
        "pedestrianConflict": True, "downstreamCapacity": True,
        "overall": "SAFE TO EXECUTE",
    },
}

# ---------------------------------------------------------------------------
# ACTIVITY EVENTS
# ---------------------------------------------------------------------------
EVENTS = [
    {"id": "EVT-108", "time": "10:49:05", "category": "EMERGENCY", "location": "J2",      "title": "Emergency Vehicle Corridor Active",    "description": "Ambulance AMB-102 approach signal locked GREEN for 60s.", "severity": "CRITICAL", "status": "ACTIVE"},
    {"id": "EVT-107", "time": "10:48:42", "category": "AI",        "location": "J5",      "title": "Signal Optimization Recommended",      "description": "YOLO queue detector recommended extended green phase on North approach.", "severity": "WARNING",  "status": "PENDING_APPROVAL"},
    {"id": "EVT-106", "time": "10:47:15", "category": "TRAFFIC",   "location": "J8",      "title": "Heavy Congestion Spike",               "description": "Vehicle count reached 74 (threshold 60). Velocity dropped to 11 km/h.", "severity": "WARNING",  "status": "INVESTIGATING"},
    {"id": "EVT-105", "time": "10:46:02", "category": "SIGNAL",    "location": "J2",      "title": "Manual Signal Transition Approved",    "description": "Operator approved green phase advance for Junction J2.", "severity": "INFO",     "status": "COMPLETED"},
    {"id": "EVT-104", "time": "10:44:30", "category": "SYSTEM",    "location": "CENTRAL", "title": "YOLO Computer Vision Sync",            "description": "Vehicle tracking updated across all 12 camera feeds at 30 FPS.", "severity": "INFO",     "status": "SYSTEM_OK"},
    {"id": "EVT-103", "time": "10:42:10", "category": "AI",        "location": "CITYWIDE","title": "Traffic Prediction Model Updated",     "description": "Predicted 18% congestion surge on Tech Park Corridor in 15 mins.", "severity": "INFO",     "status": "RESOLVED"},
]

# ---------------------------------------------------------------------------
# VEHICLE CLASSIFICATION  (for YOLO analytics page)
# ---------------------------------------------------------------------------
VEHICLE_CLASSIFICATION = {
    "cars": 1240, "motorcycles": 467, "buses": 114,
    "trucks": 221, "emergencyVehicles": 2,
    "totalTracked": 2044, "detectionAccuracy": "98.4%", "fpsAvg": 30.2,
}

# ---------------------------------------------------------------------------
# HELPERS — return deep copies so callers can mutate freely
# ---------------------------------------------------------------------------
def get_junctions():
    jList = copy.deepcopy(JUNCTIONS)
    for j in jList:
        j["cameraSource"] = "real_yolo" if j["id"] == "J1" else "simulation"
    return jList

def get_cameras():
    cList = copy.deepcopy(CAMERAS)
    for c in cList:
        c["sourceType"] = "real_yolo" if c["id"] == "CAM-01" else "simulation"
    return cList

def get_routes():       return copy.deepcopy(ROUTES)
def get_ambulance():    return copy.deepcopy(AMBULANCE)
def get_events():       return copy.deepcopy(EVENTS)
def get_vehicle_classification(): return copy.deepcopy(VEHICLE_CLASSIFICATION)
def get_junction(jid):
    juncs = get_junctions()
    return next((j for j in juncs if j["id"] == jid), None)

