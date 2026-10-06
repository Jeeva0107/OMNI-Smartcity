import React, { useState, useEffect } from 'react';
import { useTraffic } from '../../context/TrafficContext';
import { Bell, Clock, Play, Pause, AlertTriangle, Ambulance } from 'lucide-react';

const PAGE_TITLES = {
  overview:             { title: 'CITY TRAFFIC OVERVIEW', subtitle: 'Real-time traffic intelligence and coordinated traffic management' },
  live_traffic:         { title: 'LIVE CITY TRAFFIC MAP', subtitle: 'Junction telemetry, speed metrics, and density visualization' },
  traffic_intelligence: { title: 'TRAFFIC INTELLIGENCE', subtitle: 'YOLO Computer Vision analytics, vehicle classification & predictive trends' },
  junction_control:     { title: 'JUNCTION CONTROL',     subtitle: 'Autonomous signal coordination, clearance planning & manual override' },
  emergency_corridor:   { title: 'EMERGENCY CORRIDORS', subtitle: 'Green-wave ambulance corridor optimization & traffic clearance' },
  camera_analytics:     { title: 'CAMERA ANALYTICS',     subtitle: 'Local traffic video and live junction detection telemetry' },
  incidents:            { title: 'ACTIVITY & EVENTS',    subtitle: 'System event stream, traffic logs, and safety validation history' },
  settings:             { title: 'SETTINGS & SIMULATION', subtitle: 'Simulation controls, traffic state triggers, and preferences' },
  system_status:        { title: 'SYSTEM STATUS',        subtitle: 'Backend services status, YOLO engine diagnostics, and sync health' },
  junctions:            { title: 'JUNCTIONS',            subtitle: 'Signal state, queue depth and operator controls' },
  route_eta:            { title: 'ROUTE & ETA',          subtitle: 'Traffic-aware route comparison and arrival time estimation' },
};

export const Header = () => {
  const {
    activeTab,
    ambulance,
    incidents,
    junctions,
    setSelectedJunctionId,
    isSimulating,
    setIsSimulating,
    simSpeed,
    setSimSpeed,
    setActiveTab,
    backendOnline,
    wsConnected,
    backendError,
    demoMode,
    setDemoMode,
  } = useTraffic();

  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('en-IN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const meta = PAGE_TITLES[activeTab] || PAGE_TITLES.overview;
  const alertCount = (incidents || []).filter(e => e.severity === 'CRITICAL' || e.severity === 'WARNING').length;
  const liveBackendConnected = backendOnline && wsConnected && !backendError;

  // Filter low confidence junctions (< 40%) — system uses 0-100 integer scale.
  // Normalize defensively in case a 0-1 float slips through before backend fix takes effect.
  const normalizeConf = (c) => (typeof c === 'number' && c <= 1.0 && c > 0) ? Math.round(c * 100) : Math.round(c ?? 82);
  const lowConfidenceJunctions = (junctions || []).filter(j => j.confidence != null && normalizeConf(j.confidence) < 40);

  const handleLowConfClick = (junctionId) => {
    setSelectedJunctionId(junctionId);
    setActiveTab('junction_control');
  };

  return (
    <div className="flex flex-col shrink-0 select-none z-20">
      <header className="min-h-14 h-auto border-b border-slate-200 bg-white px-4 py-2 shadow-sm flex flex-wrap items-center justify-between gap-2">

        {/* PAGE TITLE */}
        <div className="min-w-[150px] flex-1">
          <h1 className="text-[13px] font-bold tracking-wide text-slate-900">{meta.title}</h1>
          <p className="hidden text-[10px] font-medium text-slate-600 md:block">{meta.subtitle}</p>
        </div>

        {/* RIGHT ACTION BAR */}
        <div className="flex flex-wrap items-center justify-end gap-2">

          {/* Ambulance alert (only when active) */}
          {activeTab === 'emergency_corridor' && ambulance?.active && (
            <button
              onClick={() => setActiveTab('emergency_corridor')}
              className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[10px] font-semibold text-red-800 transition-colors hover:bg-red-100"
              title="Emergency corridor active"
            >
              <Ambulance className="w-3.5 h-3.5" />
              <span>EMERGENCY CORRIDOR ACTIVE · {ambulance.id}</span>
              <span className="text-red-300 font-mono">{ambulance.eta}</span>
            </button>
          )}

          {lowConfidenceJunctions.length > 0 && (
            <button
              onClick={() => handleLowConfClick(lowConfidenceJunctions[0].id)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[10px] font-semibold text-amber-800"
              title="Open the first low-confidence junction for review"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Review {lowConfidenceJunctions.length} junction{lowConfidenceJunctions.length === 1 ? '' : 's'}
            </button>
          )}

          {/* Alerts count */}
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[10px] text-slate-700">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>Alerts</span>
            <span className="font-mono font-bold text-amber-800">{alertCount}</span>
          </div>

          {/* Simple Mode Indicator (LIVE MODE / FALLBACK MODE / DEMO MODE) */}
          <button
            onClick={() => setDemoMode(!demoMode)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold border transition-colors ${
              demoMode
                ? 'bg-violet-50 text-violet-800 border-violet-200 hover:bg-violet-100'
                : liveBackendConnected
                ? 'bg-green-50 text-green-800 border-green-200 hover:bg-green-100'
                : backendError
                ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
            }`}
            title="Click to toggle Developer/Demo Mode"
          >
            <span className={`w-2 h-2 rounded-full ${
              demoMode ? 'bg-purple-500 animate-pulse' : liveBackendConnected ? 'bg-emerald-500 pulse-dot' : backendError ? 'bg-red-500' : 'bg-amber-500'
            }`} />
            <span>{demoMode ? 'LOCAL DEMO MODE' : liveBackendConnected ? 'LIVE BACKEND CONNECTED' : backendError ? 'BACKEND ERROR' : 'CONNECTING TO BACKEND'}</span>
          </button>

          {/* Developer controls — only shown when demoMode is active */}
          {demoMode && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-purple-950/30 border border-purple-800/40 text-[10px]">
              <button
                onClick={() => setIsSimulating(!isSimulating)}
                className={`flex items-center gap-1 font-semibold ${isSimulating ? 'text-purple-300' : 'text-[#5A636B]'}`}
              >
                {isSimulating ? <Play className="w-3 h-3 fill-current text-purple-400" /> : <Pause className="w-3 h-3 text-purple-400" />}
                <span>SIM</span>
              </button>
              <span className="mx-1 h-3 w-px bg-violet-200" />
              {[1, 2, 5].map(s => (
                <button
                  key={s}
                  onClick={() => setSimSpeed(s)}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                    simSpeed === s ? 'bg-violet-600 text-white' : 'text-violet-800 hover:bg-violet-50'
                  }`}
                >
                  {s}×
                </button>
              ))}
            </div>
          )}

          {/* Clock */}
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-[10px] text-slate-800">
            <Clock className="h-3.5 w-3.5 text-slate-600" />
            <span>{timeStr}</span>
          </div>
        </div>
      </header>

    </div>
  );
};
