import React from 'react';
import { useTraffic } from '../../context/TrafficContext';
import {
  LayoutDashboard,
  Map,
  BrainCircuit,
  Navigation,
  TrafficCone,
  Ambulance,
  Camera,
  AlertTriangle,
  Settings,
  Server,
  Activity
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'overview',             label: 'Overview',             icon: LayoutDashboard },
  { id: 'live_traffic',         label: 'Live Traffic',         icon: Map },
  { id: 'route_intelligence',   label: 'Route Intelligence',   icon: Navigation },
  { id: 'junction_control',     label: 'Junction Control',     icon: TrafficCone },
  { id: 'emergency_corridor',   label: 'Emergency Corridors', icon: Ambulance },
  { id: 'camera_analytics',     label: 'Camera Analytics',     icon: Camera },
  { id: 'incidents',            label: 'Activity & Events',    icon: AlertTriangle },
];

const SYSTEM_ITEMS = [
  { id: 'system_status',        label: 'System Status',        icon: Server },
];

export const Sidebar = () => {
  const { activeTab, setActiveTab, backendOnline, incidents, ambulance, demoMode, setDemoMode } = useTraffic();

  const activeIncidentCount = (incidents || []).filter(
    e => e.status === 'ACTIVE' || e.status === 'INVESTIGATING'
  ).length;

  const renderItem = (item) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;
    const hasBadge = item.id === 'incidents' && activeIncidentCount > 0;
    const isEmergencyActive = item.id === 'emergency_corridor' && ambulance?.active;

    return (
      <button
        key={item.id}
        onClick={() => setActiveTab(item.id)}
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors duration-100 ${
          isActive
            ? 'bg-[#1A2128] text-white border-l-2 border-amber-500'
            : 'text-[#8A939B] hover:bg-[#141A20] hover:text-[#C8CDD2]'
        }`}
      >
        <div className="flex items-center gap-3">
          <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : isEmergencyActive ? 'text-red-400 animate-pulse' : 'text-[#5A636B]'}`} />
          <span>{item.label}</span>
        </div>
        {hasBadge && (
          <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold rounded bg-amber-500/15 text-amber-400 border border-amber-500/25">
            {activeIncidentCount}
          </span>
        )}
        {isEmergencyActive && (
          <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold rounded bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse">
            LIVE
          </span>
        )}
      </button>
    );
  };

  return (
    <aside className="w-56 bg-[#0C0F13] border-r border-[#1A2028] flex flex-col h-screen shrink-0 select-none z-30">

      {/* BRANDING */}
      <div className="px-5 py-4 border-b border-[#1A2028]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-amber-600 flex items-center justify-center shrink-0">
            <Activity className="w-4 h-4 text-black" />
          </div>
          <div>
            <div className="font-bold text-sm text-white leading-tight tracking-tight">
              OMNI <span className="text-amber-500">SMARTCITY</span>
            </div>
            <div className="text-[9px] text-[#5A636B] uppercase tracking-wider font-semibold mt-0.5">
              Control Room
            </div>
          </div>
        </div>

        {/* Mode Pill */}
        <div className={`mt-3 flex items-center justify-between gap-1.5 px-2.5 py-1 rounded text-[9px] font-mono font-semibold border ${
          demoMode
            ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
            : backendOnline
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
        }`}>
          <div className="flex items-center gap-1.5 truncate">
            <span className={`w-1.5 h-1.5 rounded-full ${demoMode ? 'bg-purple-400 pulse-dot' : backendOnline ? 'bg-emerald-400 pulse-dot' : 'bg-amber-400'}`} />
            <span className="truncate">{demoMode ? 'DEMO MODE' : backendOnline ? 'LIVE MODE' : 'FALLBACK MODE'}</span>
          </div>
        </div>
      </div>

      {/* NAV */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        <div className="px-3 py-2 text-[9px] uppercase font-bold text-[#3D4850] tracking-widest">
          Operations
        </div>
        {NAV_ITEMS.map(renderItem)}

        <div className="px-3 py-2 mt-4 text-[9px] uppercase font-bold text-[#3D4850] tracking-widest">
          System
        </div>
        {SYSTEM_ITEMS.map(renderItem)}

        {demoMode && (
          <>
            <div className="px-3 py-2 mt-4 text-[9px] uppercase font-bold text-purple-400 tracking-widest flex items-center gap-1">
              <span>Developer / Demo</span>
            </div>
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'settings' ? 'bg-purple-950/40 text-purple-300 border-l-2 border-purple-500' : 'text-purple-400/70 hover:bg-[#141A20] hover:text-purple-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Settings className="w-3.5 h-3.5 text-purple-400" />
                <span>Simulation Controls</span>
              </div>
            </button>
          </>
        )}
      </div>

      {/* FOOTER */}
      <div className="px-3 py-3 border-t border-[#1A2028] flex items-center justify-between text-[9px]">
        <div>
          <div className="text-[#5A636B] font-mono font-medium">Chennai Control Room</div>
          <div className="text-[#3D4850] mt-0.5">Coord: WGS-84</div>
        </div>
        <button
          onClick={() => setDemoMode(!demoMode)}
          className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold transition-all border ${
            demoMode
              ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
              : 'bg-[#141A20] text-[#5A636B] border-[#1E2530] hover:text-white'
          }`}
          title="Toggle hidden Developer/Demo Mode"
        >
          {demoMode ? 'DEMO ON' : 'DEMO'}
        </button>
      </div>
    </aside>
  );
};
