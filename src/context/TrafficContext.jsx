import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { io } from 'socket.io-client';
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
const SOCKET_URL = 'https://omni-smartcity-backend.onrender.com';
const REST_REFRESH_INTERVAL = 15000;

const TrafficContext = createContext(null);

// ─────────────────────────────────────────────────────────────────────────────
// Normalise the ambulance dict that comes from the backend
// ─────────────────────────────────────────────────────────────────────────────
function normalizeAmbulance(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const isActive = Boolean(
    raw.active || 
    raw.emergencyActive || 
    raw.tripStatus === 'ACTIVE' || 
    raw.status === 'EMERGENCY ACTIVE' || 
    raw.corridorStatus === 'PRIORITY ACTIVE'
  );

  // Extract true active ambulance ID (prioritize raw.ambulanceId over stale raw.id)
  const ambId = (raw.ambulanceId && raw.ambulanceId !== 'AMB-102')
    ? raw.ambulanceId
    : (raw.id && raw.id !== 'AMB-102')
      ? raw.id
      : (raw.ambulanceId || (isActive ? raw.id : ''));

  return {
    ...raw,
    active:               isActive,
    id:                   ambId || '',
    callsign:             ambId ? `MEDIC-${ambId.replace(/^AMB-?/, '')}` : (raw.callsign && !raw.callsign.includes('102') ? raw.callsign : ''),
    unit:                 raw.unit                 || '',
    patientStatus:        raw.patientStatus        || '',
    origin:               raw.origin               || '',
    destination:          raw.destination && typeof raw.destination === 'object'
      ? (raw.destination.name || raw.destination.title || raw.destinationName || '')
      : (raw.destination || raw.destinationName || ''),
    destinationLocation:  raw.destinationLocation ?? (raw.destination && typeof raw.destination === 'object' ? raw.destination : null),
    latitude:             raw.latitude ?? raw.lat ?? raw.currentLocation?.latitude ?? raw.location?.latitude ?? null,
    longitude:            raw.longitude ?? raw.lng ?? raw.currentLocation?.longitude ?? raw.location?.longitude ?? null,
    route:                raw.route ?? raw.activeRoute?.polyline ?? raw.activeRoute?.coordinates ?? [],
    speed:                raw.speed                ?? 0,
    eta:                  raw.eta                  || '--:--',
    etaSeconds:           raw.etaSeconds            ?? null,
    routeProgress:        raw.routeProgress         ?? 0,
    currentJunctionId:    raw.currentJunctionId     ?? raw.currentJunction ?? '',
    nextJunctionId:       raw.nextJunctionId        ?? raw.nextJunction ?? '',
    signalChanges:        raw.signalChanges         ?? [],
    lastUpdated:          raw.lastUpdated           ?? raw.updatedAt ?? null,
    distRemaining:        raw.distRemaining        || '',
    corridorApproved:     raw.corridorApproved     ?? false,
    currentJunctionIndex: raw.currentJunctionIndex ?? 0,
    routeJunctions:       raw.routeJunctions       || [],
    junctionStatus:       raw.junctionStatus       || {},
    dataSource:           raw.source               || raw.dataSource || 'LIVE',
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

  // ── Simulation / Demo controls ───────────────────────────────────────────────
  const [demoMode, setDemoMode]           = useState(false);
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

  // ── Internal Socket.IO ref ──────────────────────────────────────────────────
  const socketRef = useRef(null);

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
  // Apply live ambulance events without replacing fields omitted by partial events
  // ─────────────────────────────────────────────────────────────────────────────
  const applyAmbulanceEvent = useCallback((eventData, replace = false) => {
    const raw = eventData?.activeTrip ?? eventData?.trip ?? eventData?.ambulance ?? eventData;
    if (!raw || typeof raw !== 'object') return;
    setAmbulance(previous => normalizeAmbulance(replace ? raw : { ...previous, ...raw }) || previous);
    if (eventData?.signalChanges) {
      setCorridorData(previous => ({ ...(previous || {}), ...eventData }));
    }
  }, []);

  const applySignalEvent = useCallback((eventData) => {
    const junctionId = eventData?.junctionId;
    const signal = eventData?.signalState ?? eventData?.currentPhase;
    if (!junctionId || !signal) return;
    setJunctions(previous => previous.map(junction => junction.id === junctionId
      ? {
          ...junction,
          signal,
          currentPhase: eventData.currentPhase ?? signal,
          remainingTime: eventData.remainingTime ?? junction.remainingTime,
          signalReason: eventData.signalReason ?? junction.signalReason,
        }
      : junction
    ));
    setAmbulance(previous => ({
      ...previous,
      signalChanges: eventData.signalChanges ?? previous.signalChanges,
    }));
  }, []);

  // Connect to the deployed Flask-SocketIO backend; REST snapshots recover missed events.
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
    });
    socketRef.current = socket;

    const refreshSnapshot = () => {
      emergencyService.getLiveState()
        .then(snapshot => {
          applyStateSnapshot(snapshot);
          setBackendOnline(true);
          console.info('[Socket.IO] REST state snapshot refreshed');
        })
        .catch(error => {
          setBackendOnline(false);
          console.warn('[Socket.IO] REST state refresh failed:', error.message);
        });
    };

    socket.on('connect', () => {
      console.info('[Socket.IO] Connected to emergency corridor backend');
      setWsConnected(true);
      setBackendOnline(true);
      refreshSnapshot();
    });
    socket.on('disconnect', reason => {
      console.warn('[Socket.IO] Disconnected from backend:', reason);
      setWsConnected(false);
    });
    socket.on('connect_error', error => {
      console.error('[Socket.IO] Backend connection error:', error.message);
      setWsConnected(false);
      refreshSnapshot();
    });

    const onTripStarted = data => {
      console.info('[Socket.IO] Emergency trip started:', data?.tripId);
      applyAmbulanceEvent(data, true);
      setCorridorData(previous => ({ ...(previous || {}), ...data, active: true }));
    };
    const onLocationUpdated = data => {
      console.info('[Socket.IO] Ambulance location updated:', data?.ambulanceId, data?.latitude, data?.longitude);
      applyAmbulanceEvent(data);
    };
    const onRouteChanged = data => {
      console.info('[Socket.IO] Ambulance route changed:', data?.newRouteId ?? data?.routeId);
      applyAmbulanceEvent({
        ...data,
        routeId: data?.newRouteId ?? data?.routeId,
        route: data?.route ?? data?.newRoute?.polyline ?? data?.newRoute?.coordinates,
        routeJunctions: data?.junctions,
        etaSeconds: data?.newEtaSeconds ?? data?.etaSeconds,
      });
    };
    const onCorridorUpdated = data => {
      applyAmbulanceEvent(data);
      setCorridorData(previous => ({ ...(previous || {}), ...data }));
    };
    const onSignalChanged = data => {
      console.info('[Socket.IO] Traffic signal changed:', data?.junctionId, data?.signalState);
      applySignalEvent(data);
    };
    const onTripEnded = data => {
      console.info('[Socket.IO] Emergency trip ended:', data?.tripId);
      applyAmbulanceEvent({ ...data, active: false, emergencyActive: false, tripStatus: 'COMPLETED' });
      setCorridorData(previous => ({ ...(previous || {}), ...data, active: false }));
    };
    const onStateUpdate = message => {
      if (message?.timestamp) setLastUpdated(message.timestamp);
      if (message?.data) applyStateSnapshot(message.data);
    };

    socket.on('state:update', onStateUpdate);
    socket.on('emergency_trip_started', onTripStarted);
    socket.on('ambulance:trip-started', onTripStarted);
    socket.on('ambulance_location_updated', onLocationUpdated);
    socket.on('emergency_route_updated', onRouteChanged);
    socket.on('ambulance:route-changed', onRouteChanged);
    socket.on('emergency_corridor_updated', onCorridorUpdated);
    socket.on('corridor:status-updated', onCorridorUpdated);
    socket.on('traffic_signal_changed', onSignalChanged);
    socket.on('junction:signal-updated', onSignalChanged);
    socket.on('emergency_trip_ended', onTripEnded);
    socket.on('ambulance:trip-ended', onTripEnded);

    const restFallback = setInterval(() => {
      if (!socket.connected) refreshSnapshot();
    }, REST_REFRESH_INTERVAL);

    return () => {
      clearInterval(restFallback);
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [applyAmbulanceEvent, applySignalEvent, applyStateSnapshot]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Existing offline demo fallback; never synthesize traffic over an active trip.
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isSimulating || wsConnected || ambulance.active) return;

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
  }, [isSimulating, simSpeed, wsConnected, ambulance.active]);

  // ─────────────────────────────────────────────────────────────────────────────
  // addEvent — append a new event to the event log
  // ─────────────────────────────────────────────────────────────────────────────
  const addEvent = useCallback((eventObj) => {
    const newEvent = {
      id: `EVT-${Date.now()}`,
      timestamp: new Date().toISOString(),
      source: 'SYSTEM',
      ...eventObj,
    };
    setEvents(prev => [newEvent, ...prev].slice(0, 200));

    // Also push to backend if online
    eventService.pushEvent(newEvent).catch(() => {});
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // Live countdown ticker for junction remainingTime
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setJunctions(prev => prev.map(j => {
        const rem = (j.remainingTime != null ? j.remainingTime : 20) - 1;
        if (rem <= 0 && ambulance.active) {
          return { ...j, remainingTime: 0 };
        }
        if (rem <= 0) {
          const isGreen = j.signal === 'GREEN';
          const nextSig = isGreen ? 'RED' : 'GREEN';
          const maxTime = isGreen ? (j.redDuration || 35) : (j.greenDuration || 45);
          return {
            ...j,
            signal: nextSig,
            remainingTime: maxTime,
          };
        }
        return { ...j, remainingTime: rem };
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [ambulance.active]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Junction Control Mode & Override Actions
  // ─────────────────────────────────────────────────────────────────────────────
  const restoreAIControl = useCallback((junctionId) => {
    setJunctions(prev => prev.map(j => {
      if (j.id !== junctionId) return j;
      return {
        ...j,
        controlMode: 'AI_CONTROL',
        signalReason: 'AI Adaptive Control active. Automatically evaluating traffic flow, queue depths and emergency priority.',
        greenDuration: 45,
        redDuration: 35,
        remainingTime: 30,
      };
    }));

    addEvent({
      category: 'SIGNAL',
      location: junctionId,
      title: 'AI Control Restored',
      description: `Controller restored automated AI adaptive signal control for ${junctionId}.`,
      severity: 'INFO',
      source: 'OPERATOR_OVERRIDE',
      status: 'ACTIVE',
    });
  }, [addEvent]);

  const switchFallbackMode = useCallback((junctionId) => {
    setJunctions(prev => prev.map(j => {
      if (j.id !== junctionId) return j;
      return {
        ...j,
        controlMode: 'FALLBACK',
        signalReason: 'Fixed-time fallback active (60s Green / 60s Red cycle). Dynamic AI optimization bypassed.',
        greenDuration: 60,
        redDuration: 60,
        remainingTime: 60,
      };
    }));

    addEvent({
      category: 'SAFETY',
      location: junctionId,
      title: 'Fallback Fixed-Time Mode Activated',
      description: `Junction ${junctionId} switched to safe fixed-time 60s Green / 60s Red cycle.`,
      severity: 'WARNING',
      source: 'FALLBACK_SAFETY',
      status: 'ACTIVE',
    });
  }, [addEvent]);

  const overrideAIDecision = useCallback((junctionId, targetSignal = 'GREEN', customGreen = 45, customRed = 40) => {
    setJunctions(prev => prev.map(j => {
      if (j.id !== junctionId) return j;
      return {
        ...j,
        controlMode: 'MANUAL',
        signal: targetSignal,
        recommendedSignal: targetSignal,
        greenDuration: customGreen,
        redDuration: customRed,
        remainingTime: customGreen,
        signalReason: `Controller manual override active (Set to ${targetSignal}, Green: ${customGreen}s, Red: ${customRed}s).`,
      };
    }));

    addEvent({
      category: 'SIGNAL',
      location: junctionId,
      title: `Controller Manual Override Applied (${targetSignal})`,
      description: `Controller manually set ${junctionId} signal state to ${targetSignal} (${customGreen}s Green / ${customRed}s Red).`,
      severity: 'WARNING',
      source: 'MANUAL_OVERRIDE',
      status: 'OVERRIDDEN',
    });
  }, [addEvent]);

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

  const startEmergency = useCallback((ambulanceId, origin = 'J1', destination = 'J7', routeId = 'ROUTE-A') => {
    const targetAmbId = ambulanceId || ambulance?.id || 'AMB-204';
    emergencyService.startEmergency(targetAmbId, origin, destination, routeId).catch(() => {});
  }, [ambulance?.id]);

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
      restoreAIControl,
      switchFallbackMode,
      overrideAIDecision,
      advanceAmbulanceStep,
      pauseAmbulance,
      resetAmbulance,
      startEmergency,
      triggerCongestion,
      toggleCorridorApproval,

      // Simulation / Demo Mode
      demoMode,
      setDemoMode,
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
