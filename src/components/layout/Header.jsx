import React, { useState, useEffect } from 'react';
import { useTraffic } from '../../context/TrafficContext';
import { Bell, Clock, Play, Pause, AlertTriangle, Ambulance } from 'lucide-react';

const PAGE_TITLES = {
  overview:             { title: 'CITY TRAFFIC OVERVIEW', subtitle: 'Real-time traffic intelligence and coordinated traffic management' },
  live_traffic:         { title: 'LIVE CITY TRAFFIC MAP', subtitle: 'Junction telemetry, speed metrics, and density visualization' },
  traffic_intelligence: { title: 'TRAFFIC INTELLIGENCE', subtitle: 'YOLO Computer Vision analytics, vehicle classification & predictive trends' },
  route_intelligence:   { title: 'ROUTE INTELLIGENCE',   subtitle: 'AI-assisted traffic-aware route optimization engine' },
  junction_control:     { title: 'JUNCTION CONTROL',     subtitle: 'Autonomous signal coordination, clearance planning & manual override' },
  emergency_corridor:   { title: 'EMERGENCY CORRIDORS', subtitle: 'Green-wave ambulance corridor optimization & traffic clearance' },
  camera_analytics:     { title: 'CAMERA ANALYTICS',     subtitle: 'YOLO v8 live visual monitoring and bounding box detection grid' },
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
      <header className="h-14 bg-[#0C0F13] border-b border-[#1A2028] px-5 flex items-center justify-between">

        {/* PAGE TITLE */}
        <div>
          <h1 className="text-[13px] font-bold text-white tracking-wide">{meta.title}</h1>
          <p className="text-[10px] text-[#5A636B] font-medium">{meta.subtitle}</p>
        </div>

        {/* RIGHT ACTION BAR */}
        <div className="flex items-center gap-3">

          {/* Ambulance alert (only when active) */}
          {ambulance?.active && (
            <button
              onClick={() => setActiveTab('emergency_corridor')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/15 text-[10px] font-semibold transition-colors"
              title="Emergency corridor active"
            >
              <Ambulance className="w-3.5 h-3.5" />
              <span>CORRIDOR ACTIVE — {ambulance.id}</span>
              <span className="text-red-300 font-mono">{ambulance.eta}</span>
            </button>
          )}

          {/* Alerts count */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#141A20] border border-[#1A2028] text-[10px] text-[#8A939B]">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>Alerts</span>
            <span className="font-mono font-bold text-amber-400">{alertCount}</span>
          </div>

          {/* Simple Mode Indicator (LIVE MODE / FALLBACK MODE / DEMO MODE) */}
          <button
            onClick={() => setDemoMode(!demoMode)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold border transition-colors ${
              demoMode
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 hover:bg-purple-500/30'
                : backendOnline
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/25 hover:bg-amber-500/20'
            }`}
            title="Click to toggle Developer/Demo Mode"
          >
            <span className={`w-2 h-2 rounded-full ${
              demoMode ? 'bg-purple-400 animate-pulse' : backendOnline ? 'bg-emerald-400 pulse-dot' : 'bg-amber-400'
            }`} />
            <span>{demoMode ? 'DEMO MODE' : backendOnline ? 'LIVE MODE' : 'FALLBACK MODE'}</span>
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
              <span className="w-px h-3 bg-purple-900/50 mx-1" />
              {[1, 2, 5].map(s => (
                <button
                  key={s}
                  onClick={() => setSimSpeed(s)}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                    simSpeed === s ? 'bg-purple-500 text-white' : 'text-purple-300/70 hover:text-white'
                  }`}
                >
                  {s}×
                </button>
              ))}
            </div>
          )}

          {/* Clock */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#141A20] border border-[#1A2028] text-[10px] font-mono text-white">
            <Clock className="w-3.5 h-3.5 text-[#5A636B]" />
            <span>{timeStr}</span>
          </div>
        </div>
      </header>

      {/* PERSISTENT LOW-CONFIDENCE ALERT BAR */}
      {lowConfidenceJunctions.length > 0 && (
        <div className="bg-red-950/90 border-b border-red-500/40 px-5 py-2 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-3">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
            <span className="font-extrabold text-red-300 uppercase tracking-wide">
              ⚠️ LOW AI CONFIDENCE ALERT:
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {lowConfidenceJunctions.map(j => (
                <button
                  key={j.id}
                  onClick={() => handleLowConfClick(j.id)}
                  className="px-2.5 py-0.5 rounded bg-red-900/60 hover:bg-red-800 text-red-200 border border-red-500/50 font-bold transition-all flex items-center gap-1.5"
                >
                  <span>{j.name} ({j.id})</span>
                  <span className="px-1.5 py-0.2 rounded bg-red-500 text-black font-black text-[10px]">
                    {normalizeConf(j.confidence)}%
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="text-[10px] text-red-300/80 font-bold uppercase tracking-wider">
            HUMAN REVIEW REQUIRED • Click junction to inspect &amp; override
          </div>
        </div>
      )}
    </div>
  );
};
