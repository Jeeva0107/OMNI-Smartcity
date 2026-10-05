import React, { useState, useEffect } from 'react';
import { useTraffic } from '../../context/TrafficContext';
import { SourceBadge } from '../map/GeoMap';
import { GeoMap } from '../map/GeoMap';
import { emergencyService } from '../../services/apiServices';
import {
  AlertTriangle, Ambulance, CheckCircle2, Clock, Navigation, Play, Pause, RotateCcw, ShieldCheck, Siren, Sparkles, Zap, MapPin, Compass, Layers, Radio, XCircle
} from 'lucide-react';

export const EmergencyCorridorTab = () => {
  const {
    ambulance,
    toggleCorridorApproval,
    advanceAmbulanceStep,
    pauseAmbulance,
    resetAmbulance,
    startEmergency,
    junctions,
    wsConnected,
    tomtomStatus
  } = useTraffic();

  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [routesList, setRoutesList] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState(ambulance.routeId || 'ROUTE-A');

  // Fetch route alternatives
  useEffect(() => {
    emergencyService.getEmergencyRoutes('J1', 'J7')
      .then(res => { if (Array.isArray(res) && res.length) setRoutesList(res); })
      .catch(() => {});
  }, [ambulance.routeId]);

  const routeJunctionsList = ambulance.routeJunctions || ['J1', 'J8', 'J2', 'J7'];

  // Debug logging as required by specification
  useEffect(() => {
    console.log('[EmergencyCorridor] LIVE AMBULANCE:', {
      id: ambulance?.id,
      latitude: ambulance?.latitude,
      longitude: ambulance?.longitude,
      active: ambulance?.active
    });
  }, [ambulance]);

  // Determine if ambulance is live active
  const isLiveActive = Boolean(ambulance && ambulance.active);
  const ambulanceId = isLiveActive ? (ambulance.id || 'AMB-ACTIVE') : 'NO_ACTIVE_AMBULANCE';
  const dataSource = isLiveActive ? (ambulance.source || ambulance.dataSource || 'LIVE BACKEND') : 'STANDBY';

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#090B0D]">

      {/* TOP EMERGENCY CORRIDOR HEADER */}
      <div className="bg-gradient-to-r from-red-950/80 via-[#14181C] to-[#14181C] p-5 rounded-xl border border-red-500/40 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/50 flex items-center justify-center animate-pulse">
            <Ambulance className="w-7 h-7 text-red-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-500 text-white uppercase animate-pulse">
                EMERGENCY CORRIDOR
              </span>
              <SourceBadge source={dataSource} label={dataSource === 'LIVE BACKEND' ? 'LIVE GPS' : 'STANDBY'} />
              <span className="text-xs text-[#737B82] font-mono">{isLiveActive ? (ambulance.callsign || ambulanceId) : 'NO ACTIVE AMBULANCE'}</span>
            </div>
            <h2 className="text-lg font-extrabold text-white mt-0.5">
              AMBULANCE CORRIDOR ROUTE &amp; GREEN-WAVE CLEARANCE
            </h2>
            <p className="text-xs text-[#B8BEC4]">
              {isLiveActive ? (
                <>Active Trip: <strong className="text-cyan-400">{ambulanceId}</strong> • Position Source: <strong className="text-white">Live Backend GPS</strong> • Destination: <strong className="text-emerald-400">{ambulance.destination || 'Rajiv Gandhi Govt General Hospital'}</strong></>
              ) : (
                <>No Active Emergency Trip • Position Source: <strong className="text-white">Standby</strong> • Destination: <strong className="text-emerald-400">Rajiv Gandhi Govt General Hospital</strong></>
              )}
            </p>
          </div>
        </div>

        {/* DRIVER / CONTROL ACTIONS */}
        <div className="flex items-center gap-2">
          {!isLiveActive && (
            <button
              onClick={() => startEmergency(ambulance?.id || 'AMB-204', 'J1', 'J7', selectedRouteId)}
              className="px-3 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 font-bold text-xs transition-all flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Corridor</span>
            </button>
          )}

          {isLiveActive && (
            <>
              <button
                onClick={pauseAmbulance}
                className="px-3 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 font-bold text-xs transition-all flex items-center gap-1.5"
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>{ambulance.status === 'PAUSED' ? 'Resume' : 'Pause'}</span>
              </button>

              <button
                onClick={resetAmbulance}
                className="px-3 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 font-bold text-xs transition-all flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>

              <button
                onClick={advanceAmbulanceStep}
                className="px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs transition-all shadow-glow flex items-center gap-1.5"
              >
                <Navigation className="w-3.5 h-3.5 fill-current" />
                <span>Next GPS Step →</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* NO ACTIVE TRIP MESSAGE */}
      {!isLiveActive && (
        <div className="bg-[#14181C] px-4 py-3 rounded-lg border border-amber-500/30 text-xs text-amber-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 shrink-0" />
            <span>
              <strong>No Active Emergency Trip.</strong> Waiting for live ambulance app connection or simulation start.
            </span>
          </div>
        </div>
      )}

      {/* SYSTEM NOTE REGARDING YOLO & GPS */}
      <div className="bg-[#14181C] px-4 py-2.5 rounded-lg border border-[#242A30] text-[11px] text-[#8A939B] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            <strong className="text-white">Telemetry Note:</strong> Ambulance tracking is driven strictly by GPS coordinates. YOLO11n computer vision detects general traffic flow, not the ambulance.
          </span>
        </div>
        <SourceBadge source="DERIVED" label="GPS DUAL SYSTEM" />
      </div>

      {/* METRICS & POSITION SUMMARY */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-[#14181C] p-4 rounded-xl border border-[#242A30]">
          <div className="text-[10px] font-bold text-[#737B82] uppercase tracking-wider flex items-center gap-1">
            <Compass className="w-3 h-3 text-cyan-400" /> Live GPS Position
          </div>
          <div className="text-sm font-mono font-bold text-white mt-1">
            {isLiveActive && ambulance.latitude ? `${Number(ambulance.latitude).toFixed(4)}°N, ${Number(ambulance.longitude).toFixed(4)}°E` : '13.0067°N, 80.2020°E'}
          </div>
          <div className="text-[10px] mt-1 font-mono" style={{ color: isLiveActive ? '#10b981' : '#06b6d4' }}>
            {isLiveActive ? 'LIVE BACKEND GPS' : 'Simulated Driver GPS'}
          </div>
        </div>

        <div className="bg-[#14181C] p-4 rounded-xl border border-[#242A30]">
          <div className="text-[10px] font-bold text-[#737B82] uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3 h-3 text-emerald-400" /> Dynamic ETA
          </div>
          <div className="text-xl font-mono font-bold text-emerald-400 mt-1">{ambulance.eta || '08:42'}</div>
          <div className="text-[10px] text-[#737B82] mt-1">TomTom flow-aware model</div>
        </div>

        <div className="bg-[#14181C] p-4 rounded-xl border border-[#242A30]">
          <div className="text-[10px] font-bold text-[#737B82] uppercase tracking-wider flex items-center gap-1">
            <Navigation className="w-3 h-3 text-amber-400" /> Distance Remaining
          </div>
          <div className="text-xl font-mono font-bold text-white mt-1">
            {ambulance.distRemaining || '12.4'} <span className="text-xs font-normal">km</span>
          </div>
          <div className="text-[10px] text-amber-400 mt-1">To Hospital ER</div>
        </div>

        <div className="bg-[#14181C] p-4 rounded-xl border border-[#242A30]">
          <div className="text-[10px] font-bold text-[#737B82] uppercase tracking-wider flex items-center gap-1">
            <Layers className="w-3 h-3 text-purple-400" /> Corridor Route Path
          </div>
          <div className="text-xs font-mono font-bold text-amber-400 mt-1 truncate">
            {routeJunctionsList.join(' → ')}
          </div>
          <div className="text-[10px] text-[#737B82] mt-1">Anna Salai Arterial</div>
        </div>

        <div className="bg-[#14181C] p-4 rounded-xl border border-emerald-500/30">
          <div className="text-[10px] font-bold text-[#737B82] uppercase tracking-wider flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Corridor Status
          </div>
          <div className="text-xs font-mono font-extrabold text-emerald-400 mt-1">
            {isLiveActive ? (ambulance.corridorApproved ? 'APPROVED (ACTIVE)' : 'STANDBY PENDING') : 'INACTIVE'}
          </div>
          {isLiveActive && (
            <button
              onClick={() => toggleCorridorApproval(!ambulance.corridorApproved)}
              className="mt-1 text-[9px] text-amber-400 underline font-bold"
            >
              {ambulance.corridorApproved ? 'Revoke Approval' : 'Approve Green-Wave'}
            </button>
          )}
        </div>
      </div>

      {/* MAP & ROUTE JUNCTIONS CLEARANCE GRID */}
      <div className="grid grid-cols-12 gap-6">

        {/* MAP VIEWPORT (7 Cols) */}
        <div className="col-span-7 bg-[#0C0F13] rounded-xl border border-[#1A2028] h-[450px] relative overflow-hidden">
          <GeoMap showAmbulance={true} />
        </div>

        {/* UPCOMING JUNCTIONS & PREPARED ACTIONS (5 Cols) */}
        <div className="col-span-5 space-y-4 bg-[#14181C] p-4 rounded-xl border border-[#242A30] overflow-y-auto max-h-[450px]">
          <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between border-b border-[#242A30] pb-2">
            <span>Route Congestion &amp; Signal Clearance</span>
            <SourceBadge source={tomtomStatus?.status === 'TOMTOM_LIVE' ? 'TOMTOM_LIVE' : 'SIMULATED'} />
          </div>

          {isLiveActive ? (
            <div className="space-y-3">
              {routeJunctionsList.map((jId, idx) => {
                const node = junctions.find(j => j.id === jId) || { id: jId, name: jId, speed: 32, status: 'SMOOTH' };
                const isPassed = (ambulance.currentJunctionIndex || 0) > idx;
                const isCurrent = (ambulance.currentJunctionIndex || 0) === idx;

                return (
                  <div
                    key={jId}
                    className={`p-3 rounded-lg border flex items-center justify-between transition-all ${
                      isCurrent
                        ? 'bg-red-500/10 border-red-500/50 shadow-glow'
                        : isPassed
                        ? 'bg-[#0E1114] border-[#1E2530] opacity-60'
                        : 'bg-[#181D21] border-[#242A30]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center font-mono font-bold text-xs ${
                        isCurrent ? 'bg-red-500 text-white animate-pulse' : 'bg-[#242A30] text-[#8A939B]'
                      }`}>
                        {idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-white">{node.name}</span>
                          <span className="font-mono text-[9px] text-[#5A636B]">({node.id})</span>
                        </div>
                        <div className="text-[10px] text-[#737B82] mt-0.5">
                          Speed: <span className="text-white font-mono font-bold">{node.speed || 30} km/h</span> • Status: <span className="text-emerald-400 font-bold">{node.status}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border ${
                        isCurrent
                          ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
                          : isPassed
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {isCurrent ? 'CLEARING NOW' : isPassed ? 'PASSED' : 'PREPARED'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-[#5A636B]">
              <p className="text-sm font-mono">No active emergency trip.</p>
              <p className="text-xs text-[#3D4850] mt-1">Start a trip to see junction clearance status.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default EmergencyCorridorTab;
