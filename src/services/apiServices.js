/**
 * OMNI SMARTCITY — API Service Layer
 * ---------------------------------------------------------------------------
 * All UI components talk to this file — NEVER directly to fetch().
 *
 * Strategy: Try the real Flask API first; if it is unreachable (dev / offline),
 * silently fall back to the local mock data so the UI always works.
 *
 * To force mock mode:  set USE_MOCK_DATA = true
 * To use the backend:  set USE_MOCK_DATA = false  (backend must be running on port 5000)
 * ---------------------------------------------------------------------------
 */

import {
  INITIAL_JUNCTIONS,
  INITIAL_ROUTES,
  INITIAL_AMBULANCE,
  INITIAL_CAMERAS,
  INITIAL_EVENTS,
} from '../data/mockData';

// ── Config ────────────────────────────────────────────────────────────────────
const USE_MOCK_DATA = false;          // flip to true to disable all API calls
const API_BASE_URL  = 'http://localhost:5000/api';
const TIMEOUT_MS    = 3000;           // give backend 3 s before falling back

// ── Core fetch helper with timeout + mock fallback ────────────────────────────
async function apiFetch(path, options = {}, mockFallback = null) {
  if (USE_MOCK_DATA) {
    return typeof mockFallback === 'function' ? mockFallback() : mockFallback;
  }

  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
    clearTimeout(timer);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return await res.json();

  } catch (err) {
    clearTimeout(timer);
    // Network / timeout → fall back to mock so UI stays alive
    if (mockFallback !== null) {
      console.warn(`[API] ${path} unreachable (${err.message}) — using mock data`);
      return typeof mockFallback === 'function' ? mockFallback() : mockFallback;
    }
    throw err;
  }
}

// ── Traffic Service ───────────────────────────────────────────────────────────
export const trafficService = {
  /** System-wide KPI overview */
  async getTrafficOverview() {
    return apiFetch('/traffic', {}, () => ({
      activeJunctions:    24,
      vehiclesMonitored:  1842,
      highCongestion:     INITIAL_JUNCTIONS.filter(j => ['HIGH', 'CRITICAL'].includes(j.status)).length,
      activeIncidents:    2,
      emergencyCorridors: 1,
      systemStatus:       'ONLINE',
    }));
  },

  /** Rolling history for chart (window in minutes) */
  async getTrafficHistory(windowMinutes = 10) {
    return apiFetch(`/traffic/history?window=${windowMinutes}`, {}, []);
  },

  /** Per-junction 15-min congestion predictions */
  async getTrafficPredictions() {
    return apiFetch('/traffic/predictions', {}, []);
  },

  /** Aggregated vehicle classification (YOLO) */
  async getVehicleClassification() {
    return apiFetch('/traffic/classifications', {}, {
      cars: 1240, motorcycles: 467, buses: 114,
      trucks: 221, emergencyVehicles: 2,
      totalTracked: 2044, detectionAccuracy: '98.4%', fpsAvg: 30.2,
    });
  },
};

// ── Junction Service ──────────────────────────────────────────────────────────
export const junctionService = {
  /** All 12 junctions with live telemetry */
  async getJunctions(statusFilter = null) {
    const qs = statusFilter ? `?status=${statusFilter}` : '';
    return apiFetch(`/junctions${qs}`, {}, () => [...INITIAL_JUNCTIONS]);
  },

  /** Single junction by ID */
  async getJunction(junctionId) {
    return apiFetch(`/junctions/${junctionId}`, {},
      () => INITIAL_JUNCTIONS.find(j => j.id === junctionId) || null);
  },

  /** Apply a signal state to a junction */
  async updateJunctionSignal(junctionId, newSignalState) {
    return apiFetch('/signal/recommend', {
      method: 'POST',
      body:   JSON.stringify({ junctionId, signalState: newSignalState }),
    }, { success: true, junctionId, signal: newSignalState });
  },

  /** Trigger a congestion spike (simulation) */
  async triggerCongestion(junctionId = 'J5') {
    return apiFetch('/junctions/congestion', {
      method: 'POST',
      body:   JSON.stringify({ junctionId }),
    }, { success: true });
  },
};

// ── Route Service ─────────────────────────────────────────────────────────────
export const routeService = {
  /** Get pre-computed routes (or live if origin/destination supplied) */
  async getRoutes(origin = 'J1', destination = 'J9') {
    return apiFetch(`/routes?origin=${origin}&destination=${destination}`,
      {}, () => [...INITIAL_ROUTES]);
  },

  /** Re-calculate with current live traffic */
  async calculateRoute(origin, destination, mode = 'normal') {
    return apiFetch('/route/calculate', {
      method: 'POST',
      body:   JSON.stringify({ origin, destination, mode }),
    }, () => ({
      success:          true,
      recommendedRoute: INITIAL_ROUTES.find(r => r.isRecommended),
      routes:           [...INITIAL_ROUTES],
    }));
  },

  /** Alias kept for backward compatibility */
  async recalculateRoute(origin, destination) {
    return this.calculateRoute(origin, destination);
  },
};

// ── Emergency Service ─────────────────────────────────────────────────────────
export const emergencyService = {
  /** Current ambulance + corridor status */
  async getEmergencyStatus() {
    return apiFetch('/ambulance', {}, () => ({ ...INITIAL_AMBULANCE }));
  },

  /** Start a new emergency corridor (pending approval) */
  async startEmergency(ambulanceId = 'AMB-204', origin = 'J1', destination = 'J7', routeId = 'ROUTE-A') {
    return apiFetch('/emergency/start', {
      method: 'POST',
      body:   JSON.stringify({ ambulanceId, origin, destination, routeId }),
    }, { success: true, ambulance: { ...INITIAL_AMBULANCE } });
  },

  /** Pause/resume GPS simulation movement */
  async pauseEmergency() {
    return apiFetch('/emergency/pause', { method: 'POST' }, { success: true });
  },

  /** Reset ambulance back to origin */
  async resetEmergency() {
    return apiFetch('/emergency/reset', { method: 'POST' }, { success: true });
  },

  /** Simulate ambulance advancing one GPS step */
  async advanceAmbulance() {
    return apiFetch('/emergency/advance', { method: 'POST' }, { success: true });
  },

  /** Get route alternatives (Route A & Route B) */
  async getEmergencyRoutes(origin = 'J1', destination = 'J7') {
    return apiFetch(`/emergency/routes?origin=${origin}&destination=${destination}`, {}, []);
  },

  /** Operator approves the green-wave corridor */
  async approveCorridor(ambulanceId) {
    return apiFetch('/corridor/approve', {
      method: 'POST',
      body:   JSON.stringify({ ambulanceId }),
    }, { success: true, ambulanceId, status: 'CORRIDOR_APPROVED' });
  },

  /** Operator rejects the corridor */
  async rejectCorridor(ambulanceId) {
    return apiFetch('/corridor/reject', {
      method: 'POST',
      body:   JSON.stringify({ ambulanceId }),
    }, { success: true, ambulanceId, status: 'CORRIDOR_REJECTED' });
  },
};

// ── Camera Service ────────────────────────────────────────────────────────────
export const cameraService = {
  /** All camera feeds with YOLO engine status */
  async getCameras() {
    return apiFetch('/cameras', {}, () => [...INITIAL_CAMERAS]);
  },

  /** Per-camera YOLO detections */
  async getCameraDetections(camId) {
    return apiFetch(`/cameras/${camId}/detections`, {}, null);
  },
};

// ── Event Service ─────────────────────────────────────────────────────────────
export const eventService = {
  /** Fetch activity log (optional category/severity filter) */
  async getEvents(filters = {}) {
    const qs = new URLSearchParams(filters).toString();
    return apiFetch(`/events${qs ? `?${qs}` : ''}`, {}, () => [...INITIAL_EVENTS]);
  },

  /** Push an operator-generated event to the server log */
  async pushEvent(eventData) {
    return apiFetch('/events', {
      method: 'POST',
      body:   JSON.stringify(eventData),
    }, { success: true, event: eventData });
  },
};
