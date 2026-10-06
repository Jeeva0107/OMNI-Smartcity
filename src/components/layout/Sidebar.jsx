import React from 'react';
import { useTraffic } from '../../context/TrafficContext';
import {
  LayoutDashboard,
  Map,
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
  { id: 'junction_control',     label: 'Junction Control',     icon: TrafficCone },
  { id: 'emergency_corridor',   label: 'Emergency Corridors', icon: Ambulance },
  { id: 'camera_analytics',     label: 'Camera Analytics',     icon: Camera },
  { id: 'incidents',            label: 'Activity & Events',    icon: AlertTriangle },
];

const SYSTEM_ITEMS = [
  { id: 'system_status',        label: 'System Status',        icon: Server },
];

export const Sidebar = () => {
  const {
    activeTab,
    setActiveTab,
    backendOnline,
    wsConnected,
    backendError,
    incidents,
    ambulance,
    demoMode,
    setDemoMode,
  } = useTraffic();

  const activeIncidentCount = (incidents || []).filter(
    e => e.status === 'ACTIVE' || e.status === 'INVESTIGATING'
  ).length;
  const liveBackendConnected = backendOnline && wsConnected && !backendError;

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
            ? 'bg-violet-100 text-violet-900 border-l-2 border-violet-600'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`}
      >
        <div className="flex items-center gap-3">
          <Icon className={`w-4 h-4 ${isActive ? 'text-violet-700' : isEmergencyActive ? 'text-red-500 animate-pulse' : 'text-slate-500'}`} />
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
    <aside className="z-30 flex h-screen w-56 shrink-0 select-none flex-col border-r border-slate-200 bg-white shadow-sm">

      {/* BRANDING */}
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-violet-100">
            <Activity className="h-4 w-4 text-violet-800" />
          </div>
          <div>
            <div className="text-sm font-bold leading-tight tracking-tight text-slate-900">
              OMNI <span className="text-violet-800">SMARTCITY</span>
            </div>
            <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-600">
              Control Room
            </div>
          </div>
        </div>

        {/* Mode Pill */}
        <div className={`mt-3 flex items-center justify-between gap-1.5 px-2.5 py-1 rounded text-[9px] font-mono font-semibold border ${
          demoMode
            ? 'bg-violet-50 text-violet-800 border-violet-200'
              : liveBackendConnected
            ? 'bg-green-50 text-green-800 border-green-200'
            : backendError
              ? 'bg-red-50 text-red-800 border-red-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
        }`}>
          <div className="flex items-center gap-1.5 truncate">
            <span className={`h-1.5 w-1.5 rounded-full ${demoMode ? 'bg-violet-600 pulse-dot' : liveBackendConnected ? 'bg-green-700 pulse-dot' : backendError ? 'bg-red-700' : 'bg-amber-700'}`} />
              <span className="truncate">
                {demoMode ? 'LOCAL DEMO MODE' : liveBackendConnected ? 'LIVE BACKEND CONNECTED' : backendError ? 'BACKEND ERROR' : 'CONNECTING TO BACKEND'}
              </span>
          </div>
        </div>
      </div>

      {/* NAV */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        <div className="px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-slate-600">
          Operations
        </div>
        {NAV_ITEMS.map(renderItem)}

        <div className="mt-4 px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-slate-600">
          System
        </div>
        {SYSTEM_ITEMS.map(renderItem)}

        {demoMode && (
          <>
            <div className="mt-4 flex items-center gap-1 px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-violet-800">
              <span>Developer / Demo</span>
            </div>
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'settings' ? 'bg-violet-50 text-violet-900 border-l-2 border-violet-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Settings className="h-3.5 w-3.5 text-violet-700" />
                <span>Simulation Controls</span>
              </div>
            </button>
          </>
        )}
      </div>

      {/* FOOTER */}
      <div className="flex items-center justify-between border-t border-slate-200 px-3 py-3 text-[9px]">
        <div>
          <div className="font-mono font-medium text-slate-700">Chennai Control Room</div>
          <div className="mt-0.5 text-slate-600">Coord: WGS-84</div>
        </div>
        <button
          onClick={() => setDemoMode(!demoMode)}
          className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold transition-all border ${
            demoMode
              ? 'bg-violet-50 text-violet-800 border-violet-200'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
          }`}
          title="Toggle hidden Developer/Demo Mode"
        >
          {demoMode ? 'DEMO ON' : 'DEMO'}
        </button>
      </div>
    </aside>
  );
};
