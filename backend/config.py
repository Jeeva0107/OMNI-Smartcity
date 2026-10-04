"""
OMNI SMARTCITY — Backend Configuration
"""
import os
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    load_dotenv()

class Config:
    # Flask
    DEBUG = os.getenv("DEBUG", "true").lower() == "true"
    PORT = int(os.getenv("PORT", 5000))
    HOST = os.getenv("HOST", "0.0.0.0")

    # CORS — allow Vite dev server and any local build
    CORS_ORIGINS = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
        "http://localhost:4173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:4173",
    ]

    # Polling / simulation interval (seconds)
    JUNCTION_TICK_INTERVAL = 4      # How often junction telemetry fluctuates
    AMBULANCE_TICK_INTERVAL = 2     # How often ambulance GPS position is refreshed
    TOMTOM_SYNC_INTERVAL = int(os.getenv("TOMTOM_SYNC_INTERVAL", 30))

    # Feature flags
    USE_REAL_YOLO = os.getenv("USE_REAL_YOLO", "true").lower() == "true"  # Active by default for local video YOLO
    USE_REAL_GPS  = os.getenv("USE_REAL_GPS",  "false").lower() == "true"

    # TomTom API
    TOMTOM_API_KEY = os.getenv("TOMTOM_API_KEY", "")

    # Local YOLO Configuration
    TRAFFIC_VIDEO_PATH = os.getenv(
        "TRAFFIC_VIDEO_PATH",
        os.path.join(os.path.dirname(__file__), "data", "traffic.mp4")
    )
    YOLO_MODEL_NAME = os.getenv(
        "YOLO_MODEL_NAME",
        os.path.join(os.path.dirname(__file__), "yolo11n.pt")
    )

    # GPS endpoint (used only when USE_REAL_GPS = True)
    GPS_ENDPOINT  = os.getenv("GPS_ENDPOINT",  "http://localhost:8081/gps")


