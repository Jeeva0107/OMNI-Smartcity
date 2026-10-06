# OMNI SmartCity — Local Workspace & Backend Guide

This document provides setup instructions, real API route references, WebSocket and Socket.IO specifications, environment variables, and troubleshooting commands for working on the OMNI SmartCity project.

---

## 1. Project Architecture & Components

```
OMNI-Smartcity/
├── backend/                  # Python Flask + Socket.IO Backend API
│   ├── app.py                # Backend entry point
│   ├── config.py             # Configuration loader
│   ├── requirements.txt      # Python dependencies
│   ├── .env.example          # Environment template
│   ├── yolo11n.pt            # Pretrained YOLO model weights
│   ├── data/                 # Video & mock data
│   │   ├── traffic.mp4
│   │   └── mock_data.py
│   ├── routes/               # Flask Blueprints (/api/*)
│   │   ├── ambulance_routes.py
│   │   ├── event_routes.py
│   │   ├── junction_routes.py
│   │   ├── route_routes.py
│   │   └── traffic_routes.py
│   └── services/             # Core business logic & state engines
│       ├── camera_manager.py
│       ├── emergency_service.py
│       ├── socket_service.py # Socket.IO server for Ambulance App
│       ├── state_manager.py  # Centralized live state store
│       ├── tomtom_traffic.py # TomTom traffic integration
│       └── vehicle_detection.py # YOLO vehicle detector
├── src/                      # React + Vite Web Dashboard (Control Room)
│   ├── components/
│   ├── context/              # TrafficContext (Socket.IO + REST snapshot fallback)
│   ├── services/             # apiServices.js (REST client)
│   └── App.jsx
├── index.html
├── package.json              # Web dashboard dependencies (Vite, React, Leaflet)
└── vite.config.js
```

> **Note on the Expo / React Native Ambulance App:**  
> The repository contains the **Python Flask backend** and the **Vite + React Control Room web dashboard**. The **Expo / React Native ambulance app** is in a separate external repository or project. The backend code in this repository (`ambulance_routes.py`, `socket_service.py`, `test_ambulance_api.py`) is already built to interface directly with that Expo mobile app.

---

## 2. Environment Variables

Create a `.env` file inside `backend/` by copying `backend/.env.example`:

```bash
cd backend
copy .env.example .env
```

### Configurable Variables

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `5000` | Server listening port (Render sets this dynamically) |
| `HOST` | `0.0.0.0` | Host IP binding |
| `DEBUG` | `false` | Flask debug mode |
| `TOMTOM_API_KEY` | *(empty string)* | TomTom API key. When omitted, system operates seamlessly in simulation fallback mode. |
| `TOMTOM_SYNC_INTERVAL` | `30` | Seconds between TomTom traffic data refreshes |
| `USE_REAL_YOLO` | `true` | When true, runs local YOLO detection on `traffic.mp4`. Set to `false` for pure simulation without ML. |
| `USE_REAL_GPS` | `false` | When true, queries external GPS endpoint. |
| `GPS_ENDPOINT` | `http://localhost:8081/gps` | External GPS URL (only used if `USE_REAL_GPS=true`) |
| `TRAFFIC_VIDEO_PATH` | `backend/data/traffic.mp4` | Video source for local YOLO tracking |
| `YOLO_MODEL_NAME` | `backend/yolo11n.pt` | Model weights for YOLO tracking |

> **Security Rule:** Never commit `.env` or paste live API keys, tokens, or credentials into public files. `.env` is ignored by `.gitignore`.

---

## 3. How to Run the Backend Locally

### Step 1: Open PowerShell / Terminal in `backend`
```powershell
cd C:\Users\LENOVO\Downloads\omnismartcitydashboard\OMNI-Smartcity\backend
```

### Step 2: Activate the Virtual Environment
The virtual environment has already been created at `backend/.venv`:
```powershell
.\.venv\Scripts\Activate.ps1
```
*(If script execution is disabled in PowerShell, run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` or activate using Command Prompt: `.\.venv\Scripts\activate.bat`)*

### Step 3: Package Considerations (Heavy ML vs Lightweight Web)
The core web/API packages (`flask`, `flask-cors`, `flask-sock`, `flask-socketio`, `python-socketio`, `python-dotenv`, `simple-websocket`) are installed in `.venv`.
- To run without downloading heavy PyTorch (~2.5 GB) or CUDA packages, the YOLO imports in `services/vehicle_detection.py` must either be satisfied with `opencv-python-headless` and `ultralytics` (CPU), or wrapped with graceful fallbacks.
- If full YOLO video processing is required locally, install:
  ```powershell
  pip install ultralytics opencv-python
  ```

### Step 4: Start the Backend Server
```powershell
python app.py
```
Expected terminal output on startup:
```
=======================================================
  OMNI SMARTCITY  Backend API & Central Live State
  Running on  http://0.0.0.0:5000
  WebSocket:   ws://localhost:5000/ws/live
  Socket.IO:   http://localhost:5000
  CORS origins: ['http://localhost:3000', 'http://localhost:5173', ...]
  YOLO real:    True
  GPS real:     False
=======================================================
```

---

## 4. How to Run the Web Dashboard Locally

From the root directory:
```powershell
cd C:\Users\LENOVO\Downloads\omnismartcitydashboard\OMNI-Smartcity
npm install
npm run dev
```
The dashboard runs at `http://localhost:5173`.

---

## 5. How to Run the Expo Mobile App (When Located)

When accessing the Expo / React Native ambulance app repository:

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Configure Backend URL:**
   In `.env` or app config:
   - For deployed Render backend:
     ```env
     EXPO_PUBLIC_API_URL=https://omni-smartcity-backend.onrender.com
     ```
   - For local physical device testing via Expo Go:
     Use your computer's local network IP (e.g. `http://192.168.1.X:5000`), because mobile phones cannot connect to `localhost`.
3. **Start Expo:**
   ```bash
   npx expo start -c
   ```
4. **Scan QR Code:** Scan using Expo Go on your mobile device (on the same Wi-Fi network).

---

## 6. Available Backend API Routes

All REST routes are prefixed under `/api` (except `/`, `/health`, and `/ws/live`):

### Health & State
| Method | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Root service status `{ "service": "Omni SmartCity Backend", "status": "ok" }` |
| `GET` | `/health` | Health check, websocket and socketio status |
| `GET` | `/api/state` | Returns full centralized live state snapshot |

### Junctions & Signals
| Method | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/api/junctions` | Telemetry for all 12 junctions (supports `?status=HIGH,CRITICAL`) |
| `GET` | `/api/junctions/<junction_id>` | Single junction details (e.g. `/api/junctions/J1`) |
| `POST` | `/api/signal/recommend` | Set signal state: `{ "junctionId": "J5", "signalState": "GREEN" }` |
| `POST` | `/api/junctions/congestion` | Trigger congestion spike simulation: `{ "junctionId": "J5" }` |

### Traffic & Video Feeds
| Method | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/api/traffic` | System-wide KPI summary (vehicles, congestion, alerts) |
| `GET` | `/api/traffic/tomtom` | TomTom service live status without exposing keys |
| `POST` | `/api/traffic/tomtom/sync` | Manually triggers immediate TomTom telemetry sync |
| `GET` | `/api/traffic/classifications`| Aggregated vehicle counts (cars, buses, trucks, bikes) |
| `GET` | `/api/traffic/history` | Historical traffic metrics for charts (`?window=10`) |
| `GET` | `/api/traffic/predictions` | 15-minute predictive congestion index per junction |
| `GET` | `/api/cameras` | Status of all 12 traffic cameras (CAM-01 to CAM-12) |
| `GET` | `/api/cameras/<cam_id>/detections` | Detections for specific camera |
| `GET` | `/api/cameras/<cam_id>/video_feed` | MJPEG video stream (real YOLO or simulated) |

### Route Intelligence
| Method | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/api/routes` | Pre-computed or calculated routes (`?origin=J1&destination=J9&mode=normal`) |
| `POST` | `/api/route/calculate` | Compute best route based on current live traffic |
| `POST` | `/api/route/recalculate` | Alias to `/api/route/calculate` |

### Ambulance & Emergency Corridors (Mobile App Endpoints)
| Method | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/api/ambulance`, `/api/ambulances` | Full live ambulance + corridor state |
| `GET` | `/api/emergency/routes` | Alternative emergency routes A and B (`?origin=J1&destination=J7`) |
| `POST` | `/api/ambulances/trips/start`, `/api/ambulance/trips/start` | Start ambulance trip from driver app |
| `POST` | `/api/ambulances/location`, `/api/ambulance/location` | GPS location telemetry update from mobile driver |
| `POST` | `/api/ambulances/route-change`, `/api/ambulance/route-change` | Route switch event (e.g. detour due to blockage) |
| `POST` | `/api/ambulances/trips/end`, `/api/ambulance/trips/end` | Finish/complete active ambulance trip |
| `GET` | `/api/ambulances/events`, `/api/ambulance/events` | Trip events list for ambulance (`?ambulanceId=...`) |
| `GET` | `/api/ambulances/notifications`, `/api/ambulance/notifications` | Notifications for driver app (`?ambulanceId=...`) |
| `POST` | `/api/emergency/start` | Initiate emergency corridor simulation |
| `POST` | `/api/emergency/pause` | Pause / resume simulated GPS movement |
| `POST` | `/api/emergency/reset` | Reset ambulance to origin |
| `POST` | `/api/emergency/advance` | Step ambulance forward by one waypoint |
| `POST` | `/api/corridor/approve` | Operator approves green wave corridor (`{ "ambulanceId": "..." }`) |
| `POST` | `/api/corridor/reject` | Operator rejects green wave corridor |

### Audit & Activity Log
| Method | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/api/events` | Activity log events (`?category=...&severity=...&limit=...`) |
| `POST` | `/api/events` | Push new event to central live state |

---

## 7. Real-Time Protocols

### A. Legacy raw WebSocket (`/ws/live`)
- **URL:** `ws://<host>:<port>/ws/live`
- **Used by:** Legacy clients. The dashboard now uses Flask-SocketIO below.
- **Messages sent by server:**
  - `INITIAL_STATE`: Sent immediately on connection with current snapshot.
  - `STATE_UPDATE`: Broadcast whenever junction, ambulance, or incident state changes.
  - `PONG`: Response to incoming `PING`.
- **Messages accepted by server:**
  - `{"type": "PING"}` -> responds with `{"type": "PONG"}`
  - `{"type": "GET_STATE"}` -> responds with `{"type": "STATE_UPDATE"}`

### B. Flask-SocketIO (Ambulance App and Control Room Dashboard)
- **Path:** `/socket.io/` on host root
- **CORS:** Allowed origins `*`, `async_mode="threading"`
- **Dashboard URL:** `https://omni-smartcity-backend.onrender.com`
- **Dashboard transports:** WebSocket with polling fallback; automatic reconnection enabled.
- **Client -> Server Events:**
  - `connect`: Handshake
  - `disconnect`: Session disconnect
  - `ambulance:join-trip`: Payload `{ "ambulanceId": "AMB-102", "tripId": "TRIP-102" }` (joins rooms `ambulance-trip-{tripId}` and `ambulance-trip-{ambulanceId}`)
  - `ambulance:trip-ended`: Payload `{ "ambulanceId": "AMB-102", "tripId": "TRIP-102" }`
  - `emergency_trip_ended`: Legacy alias for ending a trip.
- **Server -> Client Events:**
  - `connected`: Sent on initial connection confirmation
  - `joined-trip`: Sent upon room entry confirmation
  - `state:update`: Complete shared backend-state snapshot/update for the dashboard
  - `emergency_trip_started`, `ambulance:trip-started`: Active trip and initial route
  - `ambulance_location_updated`: GPS coordinates, speed, progress and ETA
  - `emergency_corridor_updated`, `corridor:status-updated`: Corridor status
  - `traffic_signal_changed`, `junction:signal-updated`: Signal phase and countdown
  - `emergency_route_updated`, `ambulance:route-changed`: Route/reroute information
  - `emergency_trip_ended`, `ambulance:trip-ended`: Trip completion and corridor removal
  - `junction:signal-updated`: Emitted when junction signals change along the corridor
  - `corridor:status-updated`: Emitted when corridor status changes (e.g. APPROVED, ACTIVE, BLOCKED)
  - `ambulance:notification`: Emitted to push alerts to the ambulance driver
  - `ambulance:route-changed`: Emitted when detour or route update is assigned
  - `ambulance:trip-ended`: Emitted when emergency trip ends

### C. Expo-to-Dashboard Emergency Corridor
- Expo REST calls use the Render API base `https://omni-smartcity-backend.onrender.com`.
- Start: `POST /api/ambulances/trips/start`
- Location: `POST /api/ambulances/location`
- Reroute: `POST /api/ambulances/route-change`
- End: `POST /api/ambulances/trips/end`
- After connecting, the dashboard requests `GET /api/state`; it applies the live trip and subsequent Socket.IO events from the shared Flask state. If Socket.IO is disconnected, it refreshes `/api/state` as a recovery path. Its offline demo ticker is disabled while an active trip is present.
- The trip state includes `tripId`, `ambulanceId`, location, destination, route, route progress, ETA, current/next junctions, signal changes, active status and `lastUpdated`.
- To test end-to-end, open the dashboard, start a trip from the Expo app, send at least one location update, optionally send a route-change, then end the trip. The Emergency Corridor and Live Traffic views should show the active ambulance, its route and signals, then remove it and restore the pre-trip signal states on completion.

---

## 8. Common Troubleshooting Commands

### Test Deployed Render Backend
```powershell
# Health check
curl https://omni-smartcity-backend.onrender.com/health

# Central live state snapshot
curl https://omni-smartcity-backend.onrender.com/api/state

# Test active ambulance status
curl https://omni-smartcity-backend.onrender.com/api/ambulance
```

### Test Local Backend
```powershell
# Local health check
curl http://localhost:5000/health

# Check if port 5000 is occupied
netstat -ano | findstr :5000

# Terminate process on port 5000 (replace <PID> with process ID)
taskkill /PID <PID> /F
```

### Test Starting a Trip via PowerShell
```powershell
$headers = @{ "Content-Type" = "application/json" }
$body = @{
    ambulanceId = "AMB-204"
    tripId = "TRIP-TEST-001"
    hospital = "Apollo Hospitals"
    routeId = "ROUTE-A"
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri "https://omni-smartcity-backend.onrender.com/api/ambulances/trips/start" -Headers $headers -Body $body
```
