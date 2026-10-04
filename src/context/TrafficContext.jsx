import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import {
  INITIAL_JUNCTIONS,
  INITIAL_ROUTES,
  INITIAL_AMBULANCE,
  INITIAL_CAMERAS,
  INITIAL_EVENTS,
} from '../data/mockData';
import {
  junctionService,
  emergencyService,
  eventService,
} from '../services/apiServices';

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────
const WS_URL         = 'ws://localhost:5000/ws/live';
const RECONNECT_BASE = 1500;   // ms — first retry delay
const RECONNECT_MAX  = 30000;  // ms — cap at 30 s
const PING_INTERVAL  = 20000;  // ms — keep-alive ping

const TrafficContext = createContext(null);

// ─────────────────────────────────────────────────────────────────────────────
// Normalise the ambulance dict that comes from the backend
// ─────────────────────────────────────────────────────────────────────────────
function normalizeAmbulance(raw) {
  if (!raw || typeof raw !== 'object') return null;
  return {
    active:               raw.active               ?? false,
    id:                   raw.id                   ?? 'AMB-102',
    callsign:             raw.callsign             ?? 'MEDIC-102',
    unit:                 raw.unit                 ?? '',
    patientStatus:        raw.patientStatus        ?? '',
    origin:               raw.origin               ?? '',
    destination:          raw.destination          ?? '',
    speed:                raw.speed                ?? 0,
    eta:                  raw.eta                  ?? '--:--',
    distRemaining:        raw.distRemaining        ?? '',
    corridorApproved:     raw.corridorApproved     ?? false,
    currentJunctionIndex: raw.currentJunctionIndex ?? 0,
    routeJunctions:       raw.routeJunctions       ?? [],
    junctionStatus:       raw.junctionStatus       ?? {},
    dataSource:           raw.dataSource           ?? 'LIVE',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────
export const TrafficProvider = ({ children }) => {
  // ── Tab / UI state ──────────────────────────────────────────────────────────
  const [activeTab, setActiveTab]                   = useState('overview');
  const [selectedJunctionId, setSelectedJunctionId] = useState(null);
  const [selectedRouteId, setSelectedRouteId]       = useState('ROUTE-B');
  const [selectedCameraId, setSelectedCameraId]     = useState(null);

  // ── Simulation controls ─────────────────────────────────────────────────────
  const [isSimulating, setIsSimulating]   = useState(true);
  const [simSpeed, setSimSpeed]           = useState(1);
  const [filterTraffic, setFilterTraffic] = useState('ALL');

  // ── Core data (seeded from mock; overridden by WS on connect) ──────────────
  const [junctions,   setJunctions]   = useState(INITIAL_JUNCTIONS);
  const [cameras,     setCameras]     = useState(INITIAL_CAMERAS);
  const [routes,      setRoutes]      = useState(INITIAL_ROUTES);
  const [ambulance,   setAmbulance]   = useState(INITIAL_AMBULANCE);
  const [events,      setEvents]      = useState(INITIAL_EVENTS);
  const [yoloMetrics,   setYoloMetrics]   = useState(null);
  const [etaData,       setEtaData]       = useState(null);
  const [corridorData,  setCorridorData]  = useState(null);
  const [tomtomStatus,  setTomtomStatus]  = useState(null); // TomTom live-data status

  // ── Connection state (drives the "LIVE API CONNECTED" badge) ───────────────
  const [wsConnected,   setWsConnected]   = useState(false);
  const [backendOnline, setBackendOnline] = useState(false);
  const [lastUpdated,   setLastUpdated]   = useState(null);

  // ── Internal WS refs ────────────────────────────────────────────────────────
  const wsRef         = useRef(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef(null);
  const pingTimerRef  = useRef(null);
  const mountedRef    = useRef(true);

  const selectedJunction = junctions.find(j => j.id === selectedJunctionId) || null;

  // ─────────────────────────────────────────────────────────────────────────────
  // Apply a full backend state snapshot to local React state
  // ─────────────────────────────────────────────────────────────────────────────
  const applyStateSnapshot = useCallback((data) => {
    if (!data || typeof data !== 'object') return;

    if (Array.isArray(data.junctions)  && data.junctions.length)  setJunctions(data.junctions);
    if (Array.isArray(data.cameras)    && data.cameras.length)     setCameras(data.cameras);
    if (Array.isArray(data.routes)     && data.routes.length)      setRoutes(data.routes);
    if (Array.isArray(data.events)     && data.events.length)      setEvents(data.events);

    // ambulance — backend can send as 'ambulances' OR 'ambulance'
    const rawAmb = data.ambulances ?? data.ambulance;
    const norm   = normalizeAmbulance(rawAmb);
    if (norm) setAmbulance(norm);

    const yolo = data.yoloMetrics ?? data.yolo_metrics;
    if (yolo && typeof yolo === 'object') setYoloMetrics(yolo);

    if (data.eta && typeof data.eta === 'object') setEtaData(data.eta);

    const corridor = data.emergencyCorridor ?? data.emergency_corridor;
    if (corridor && typeof corridor === 'object') setCorridorData(corridor);

    // TomTom live status — camelCase alias sent by backend get_state()
    const tt = data.tomtomStatus ?? data.tomtom_status;
    if (tt && typeof tt === 'object') setTomtomStatus(tt);

    if (data.lastUpdated) setLastUpdated(data.lastUpdated);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // WebSocket message handler
  // ─────────────────────────────────────────────────────────────────────────────
  const handleWsMessage = useCallback((event) => {
    let msg;
    try { msg = JSON.parse(event.data); } catch { return; }

    const { type, data, timestamp } = msg;
    if (timestamp) setLastUpdated(timestamp);

    switch (type) {
      case 'INITIAL_STATE':
      case 'STATE_UPDATE':
      case 'JUNCTION_UPDATED':
      case 'JUNCTIONS_SET':
      case 'TICK':
        applyStateSnapshot(data);
        break;

      case 'CORRIDOR_UPDATED':
      case 'AMBULANCE_UPDATED': {
        const rawAmb = data?.ambulances ?? data?.ambulance;
        const norm   = normalizeAmbulance(rawAmb);
        if (norm) setAmbulance(norm);
        const corridor = data?.emergencyCorridor ?? data?.emergency_corridor;
        if (corridor) setCorridorData(corridor);
        if (data?.eta) setEtaData(data.eta);
        break;
      }

      case 'EVENT_ADDED':
        if (Array.isArray(data?.events)) setEvents(data.events);
        break;

      case 'ROUTES_UPDATED':
        if (Array.isArray(data?.routes)) setRoutes(data.routes);
        break;

      case 'CAMERAS_UPDATED':
        if (Array.isArray(data?.cameras)) setCameras(data.cameras);
        break;

      case 'YOLO_METRICS_UPDATED': {
        const yolo = data?.yoloMetrics ?? data?.yolo_metrics;
        if (yolo) setYoloMetrics(yolo);
        break;
      }

      case 'TOMTOM_UPDATED': {
        // Backend broadcasts this whenever TomTom data is refreshed
        const tt = data?.tomtomStatus ?? data?.tomtom_status;
        if (tt && typeof tt === 'object') setTomtomStatus(tt);
        // Also refresh junctions — they carry updated speed/freeFlowSpeed
        if (Array.isArray(data?.junctions) && data.junctions.length) setJunctions(data.junctions);
        break;
      }

      case 'PONG':
        break; // keep-alive acknowledged

      default:
        // Generic full-state payload
        if (data && typeof data === 'object' && data.junctions) applyStateSnapshot(data);
    }
  }, [applyStateSnapshot]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Connect to WebSocket (called on mount and after each disconnect)
  // ─────────────────────────────────────────────────────────────────────────────
  const scheduleReconnect = useCallback(() => {
    if (!mountedRef.current) return;
    clearTimeout(retryTimerRef.current);
    const delay = Math.min(
      RECONNECT_BASE * Math.pow(1.6, retryCountRef.current),
      RECONNECT_MAX
    );
    retryCountRef.current += 1;
    retryTimerRef.current = setTimeout(() => {
      if (mountedRef.current) connectWs(); // eslint-disable-line no-use-before-define
    }, delay);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const connectWs = useCallback(() => {
    if (!mountedRef.current) return;

    // Close any lingering socket
    if (wsRef.current) {
      try { wsRef.current.close(); } catch {}
      wsRef.current = null;
    }

    let ws;
    try { ws = new WebSocket(WS_URL); }
    catch { scheduleReconnect(); return; }

    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) { ws.close(); return; }
      retryCountRef.current = 0;
      setWsConnected(true);
      setBackendOnline(true);

      // Start keep-alive pings
      clearInterval(pingTimerRef.current);
      pingTimerRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'PING' }));
        }
      }, PING_INTERVAL);
    };

    ws.onmessage = handleWsMessage;
    ws.onerror   = () => {};   // onclose fires right after

    ws.onclose = () => {
      if (!mountedRef.current) return;
      clearInterval(pingTimerRef.current);
      setWsConnected(false);
      setBackendOnline(false);
      scheduleReconnect();
    };
  }, [handleWsMessage, scheduleReconnect]);

  // Mount once
  useEffect(() => {
    mountedRef.current = true;
    connectWs();
    return () => {
      mountedRef.current = false;
      clearTimeout(retryTimerRef.current);
      clearInterval(pingTimerRef.current);
      if (wsRef.current) try { wsRef.current.close(); } catch {}
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────────────────────────────────────
  // SIMULATION fallback ticker — only when WS is offline AND isSimulating
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isSimulating || wsConnected) return;

    const interval = setInterval(() => {
      setJunctions(prev => prev.map(j => {
        const delta       = Math.floor(Math.random() * 6) - 2;
        const newVehicles = Math.max(5, Math.min(95, j.vehicles + delta));
        let status = j.status;
        if      (newVehicles > 60) status = 'CRITICAL';
        else if (newVehicles > 40) status = 'HIGH';
        else if (newVehicles > 25) status = 'MODERATE';
        else                       status = 'SMOOTH';
        return {
          ...j,
          vehicles: newVehicles,
          queue:    Math.max(1, Math.min(newVehicles - 4, Math.round(newVehicles * 0.4))),
          status,
        };
      }));
    }, 4000 / simSpeed);

    return () => clearInterval(interval);
  }, [isSimulating, simSpeed, wsConnected]);

  // ─────────────────────────────────────────────────────────────────────────────
  // addEvent — optimistic local insert + backend push
  // ─────────────────────────────────────────────────────────────────────────────
  const addEvent = useCallback((evtData) => {
    const newEvt = {
      id:     `EVT-${Date.now().toString().slice(-4)}`,
      time:   new Date().toLocaleTimeString('en-US', { hour12: false }),
      status: 'ACTIVE',
      ...evtData,
    };
    setEvents(prev => [newEvt, ...prev]);
    eventService.pushEvent(newEvt).catch(() => {});
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // Signal transition
  // ─────────────────────────────────────────────────────────────────────────────
  const transitionSignal = useCallback((junctionId, targetSignal) => {
    setJunctions(prev => prev.map(j =>
      j.id === junctionId ? { ...j, signal: 'YELLOW', status: 'OPTIMIZING' } : j
    ));

    addEvent({
      category:    'SIGNAL',
      location:    junctionId,
      title:       `Signal Transition Triggered (${targetSignal})`,
      description: `Junction ${junctionId} signal transitioning: CURRENT → YELLOW.`,
      severity:    'INFO',
      status:      'IN_PROGRESS',
    });

    junctionService.updateJunctionSignal(junctionId, targetSignal).catch(() => {});

    setTimeout(() => {
      setJunctions(prev => prev.map(j =>
        j.id === junctionId ? { ...j, signal: 'ALL_RED' } : j
      ));

      setTimeout(() => {
        setJunctions(prev => prev.map(j => {
          if (j.id !== junctionId) return j;
          return {
            ...j,
            signal:            targetSignal,
            recommendedSignal: targetSignal,
            status: targetSignal === 'GREEN' ? (j.vehicles > 50 ? 'MODERATE' : 'SMOOTH') : j.status,
            queue:  targetSignal === 'GREEN' ? Math.max(2, j.queue - 8) : j.queue,
          };
        }));

        addEvent({
          category:    'SIGNAL',
          location:    junctionId,
          title:       `Signal Updated to ${targetSignal}`,
          description: `Junction ${junctionId} signal changed to ${targetSignal}. Queue clearing active.`,
          severity:    'INFO',
          status:      'COMPLETED',
        });
      }, 1500 / simSpeed);
    }, 1500 / simSpeed);
  }, [simSpeed, addEvent]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Ambulance Driver / Control App Actions
  // ─────────────────────────────────────────────────────────────────────────────
  const advanceAmbulanceStep = useCallback(() => {
    emergencyService.advanceAmbulance().catch(() => {});
  }, []);

  const pauseAmbulance = useCallback(() => {
    emergencyService.pauseEmergency().catch(() => {});
  }, []);

  const resetAmbulance = useCallback(() => {
    emergencyService.resetEmergency().catch(() => {});
  }, []);

  const startEmergency = useCallback((ambulanceId = 'AMB-102', origin = 'J1', destination = 'J7', routeId = 'ROUTE-A') => {
    emergencyService.startEmergency(ambulanceId, origin, destination, routeId).catch(() => {});
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // Congestion spike
  // ─────────────────────────────────────────────────────────────────────────────
  const triggerCongestion = useCallback((junctionId = 'J5') => {
    junctionService.triggerCongestion(junctionId).catch(() => {});

    setJunctions(prev => prev.map(j =>
      j.id === junctionId
        ? { ...j, status: 'CRITICAL', vehicles: 82, queue: 38, speed: 8, signal: 'RED',
            recommendedSignal: 'GREEN',
            recommendedReason: 'Urgent queue dissipation recommended by AI Vision engine.' }
        : j
    ));

    addEvent({
      category:    'TRAFFIC',
      location:    junctionId,
      title:       `Critical Congestion Spike at ${junctionId}`,
      description: 'Vehicle queue surged to 38 units. AI recommending green phase extension.',
      severity:    'WARNING',
      status:      'INVESTIGATING',
    });
  }, [addEvent]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Corridor approval toggle
  // ─────────────────────────────────────────────────────────────────────────────
  const toggleCorridorApproval = useCallback((approved) => {
    const apiCall = approved
      ? emergencyService.approveCorridor(ambulance.id)
      : emergencyService.rejectCorridor(ambulance.id);

    apiCall
      .then(data => { if (data?.ambulance) setAmbulance(normalizeAmbulance(data.ambulance) ?? ambulance); })
      .catch(() => {});

    setAmbulance(prev => ({ ...prev, corridorApproved: approved }));

    addEvent({
      category:    'EMERGENCY',
      location:    'CENTRAL_CONTROL',
      title:       approved ? 'Emergency Corridor APPROVED by Operator' : 'Emergency Corridor REJECTED by Operator',
      description: approved
        ? 'Signal override green-wave armed for route J1 → J2 → J5 → J7.'
        : 'Emergency corridor request denied. Operating on normal automated signal logic.',
      severity: approved ? 'CRITICAL' : 'WARNING',
      status:   approved ? 'ACTIVE'   : 'CANCELLED',
    });
  }, [ambulance.id, addEvent]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Context value
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <TrafficContext.Provider value={{
      // Tab
      activeTab,
      setActiveTab,

      // Junctions
      junctions,
      setJunctions,
      selectedJunctionId,
      setSelectedJunctionId,
      selectedJunction,

      // Routes
      routes,
      setRoutes,
      selectedRouteId,
      setSelectedRouteId,

      // Ambulance / corridor
      ambulance,
      setAmbulance,
      corridorData,
      etaData,

      // Cameras / YOLO
      cameras,
      setCameras,
      selectedCameraId,
      setSelectedCameraId,
      yoloMetrics,
      tomtomStatus,

      // Events
      events,
      incidents: events,   // legacy alias used by Overview & Header
      addEvent,

      // Actions
      transitionSignal,
      advanceAmbulanceStep,
      pauseAmbulance,
      resetAmbulance,
      startEmergency,
      triggerCongestion,
      toggleCorridorApproval,

      // Simulation
      isSimulating,
      setIsSimulating,
      simSpeed,
      setSimSpeed,
      filterTraffic,
      setFilterTraffic,

      // Connection / status
      wsConnected,
      backendOnline,
      lastUpdated,
    }}>
      {children}
    </TrafficContext.Provider>
  );
};

export const useTraffic = () => {
  const ctx = useContext(TrafficContext);
  if (!ctx) throw new Error('useTraffic must be used within a TrafficProvider');
  return ctx;
};
