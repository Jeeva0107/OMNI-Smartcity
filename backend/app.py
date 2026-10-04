"""
OMNI SMARTCITY — Flask Application Entry Point with Centralized Live State & WebSockets
Run:  python app.py
      or  flask --app app run --port 5000
"""
import time
import json
from flask import Flask, jsonify
from flask_cors import CORS
from flask_sock import Sock

from config import Config
from services.state_manager import state_manager
from services.tomtom_traffic import tomtom_service

# ── Blueprint imports ─────────────────────────────────────────────────────────
from routes.junction_routes import junctions_bp
from routes.traffic_routes import traffic_bp
from routes.route_routes import routes_bp
from routes.ambulance_routes import ambulance_bp
from routes.event_routes import events_bp


def create_app() -> Flask:
    app = Flask(__name__)

    # ── Start TomTom Traffic Service ──────────────────────────────────────────
    tomtom_service.start_background_sync(Config.TOMTOM_SYNC_INTERVAL)

    # ── CORS ─────────────────────────────────────────────────────────────────
    CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=False)

    # ── WebSockets ───────────────────────────────────────────────────────────
    sock = Sock(app)

    @sock.route("/ws/live")
    def live_ws(ws):
        """
        WebSocket /ws/live endpoint.
        Connects frontend clients to central backend state stream.
        """
        state_manager.register_ws(ws)
        try:
            # Broadcast initial state snapshot immediately upon connection
            initial_payload = json.dumps({
                "type": "INITIAL_STATE",
                "timestamp": time.strftime("%H:%M:%S"),
                "data": state_manager.get_state(),
            })
            ws.send(initial_payload)

            # Receive loop for incoming WebSocket messages
            while True:
                msg = ws.receive()
                if msg is None:
                    break
                try:
                    payload = json.loads(msg)
                    msg_type = payload.get("type")
                    if msg_type == "PING":
                        ws.send(json.dumps({
                            "type": "PONG",
                            "timestamp": time.strftime("%H:%M:%S")
                        }))
                    elif msg_type == "GET_STATE":
                        ws.send(json.dumps({
                            "type": "STATE_UPDATE",
                            "timestamp": time.strftime("%H:%M:%S"),
                            "data": state_manager.get_state()
                        }))
                except Exception:
                    pass
        except Exception:
            pass
        finally:
            state_manager.unregister_ws(ws)

    # ── Register blueprints under /api ────────────────────────────────────────
    prefix = "/api"
    app.register_blueprint(junctions_bp, url_prefix=prefix)
    app.register_blueprint(traffic_bp, url_prefix=prefix)
    app.register_blueprint(routes_bp, url_prefix=prefix)
    app.register_blueprint(ambulance_bp, url_prefix=prefix)
    app.register_blueprint(events_bp, url_prefix=prefix)

    # ── Central Live State REST Endpoint ──────────────────────────────────────
    @app.get("/api/state")
    def get_live_state():
        """GET /api/state — Returns full centralized live state snapshot."""
        return jsonify(state_manager.get_state())

    # ── Health check ──────────────────────────────────────────────────────────
    @app.get("/health")
    def health():
        return jsonify({
            "status": "ok",
            "service": "omni-smartcity-api",
            "centralState": "ACTIVE",
            "websocketEndpoint": "/ws/live"
        })

    # ── 404 / 405 JSON handlers ───────────────────────────────────────────────
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Endpoint not found", "hint": "Check /health for available routes"}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({"error": "Method not allowed"}), 405

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({"error": "Internal server error", "detail": str(e)}), 500

    return app


if __name__ == "__main__":
    app = create_app()
    print("=" * 55)
    print("  OMNI SMARTCITY  Backend API & Central Live State")
    print(f"  Running on  http://localhost:{Config.PORT}")
    print(f"  WebSocket:   ws://localhost:{Config.PORT}/ws/live")
    print(f"  CORS origins: {Config.CORS_ORIGINS}")
    print(f"  YOLO real:    {Config.USE_REAL_YOLO}")
    print(f"  GPS real:     {Config.USE_REAL_GPS}")
    print("=" * 55)
    app.run(
        host=Config.HOST,
        port=Config.PORT,
        debug=Config.DEBUG,
        threaded=True,
    )
