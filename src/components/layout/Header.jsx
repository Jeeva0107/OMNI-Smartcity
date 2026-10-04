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
    isSimulating,
    setIsSimulating,
    simSpeed,
    setSimSpeed,
    setActiveTab
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

  return (
    <header className="h-14 bg-[#0C0F13] border-b border-[#1A2028] px-5 flex items-center justify-between shrink-0 select-none z-20">

      {/* PAGE TITLE */}
      <div>
        <h1 className="text-[13px] font-bold text-white tracking-wide">{meta.title}</h1>
        <p className="text-[10px] text-[#5A636B] font-medium">{meta.subtitle}</p>
      </div>

      {/* RIGHT ACTION BAR */}
      <div className="flex items-center gap-3">

        {/* Ambulance alert (only when active) */}
        {ambulance.active && (
          <button
            onClick={() => setActiveTab('emergency_corridor')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/15 text-[10px] font-semibold transition-colors"
            title="Simulated ambulance corridor active"
          >
            <Ambulance className="w-3.5 h-3.5" />
            <span>CODE RED CORRIDOR — {ambulance.id}</span>
            <span className="text-red-300 font-mono">{ambulance.eta}</span>
          </button>
        )}

        {/* Alerts count */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#141A20] border border-[#1A2028] text-[10px] text-[#8A939B]">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          <span>Alerts</span>
          <span className="font-mono font-bold text-amber-400">{alertCount}</span>
        </div>

        {/* Simulation toggle */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#141A20] border border-[#1A2028] text-[10px]">
          <button
            onClick={() => setIsSimulating(!isSimulating)}
            className={`flex items-center gap-1 font-semibold ${isSimulating ? 'text-emerald-400' : 'text-[#5A636B]'}`}
          >
            {isSimulating ? <Play className="w-3 h-3 fill-current" /> : <Pause className="w-3 h-3" />}
            <span>SIM {isSimulating ? 'ON' : 'OFF'}</span>
          </button>
          <span className="w-px h-3 bg-[#252C34] mx-1" />
          {[1, 2, 5].map(s => (
            <button
              key={s}
              onClick={() => setSimSpeed(s)}
              className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                simSpeed === s ? 'bg-amber-500 text-black' : 'text-[#5A636B] hover:text-[#8A939B]'
              }`}
            >
              {s}×
            </button>
          ))}
        </div>

        {/* Clock */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#141A20] border border-[#1A2028] text-[10px] font-mono text-white">
          <Clock className="w-3.5 h-3.5 text-[#5A636B]" />
          <span>{timeStr}</span>
        </div>
      </div>
    </header>
  );
};
