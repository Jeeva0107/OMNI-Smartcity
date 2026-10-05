import React, { useState } from 'react';
import { useTraffic } from '../../context/TrafficContext';
import { GeoMap, SourceBadge } from '../map/GeoMap';
import {
  Activity, AlertTriangle, Car, CheckCircle, Clock, Navigation, Radio, TrendingUp, Zap, Flame, ShieldAlert, CheckCircle2, ArrowRight
} from 'lucide-react';

// ── TomTom status banner ──────────────────────────────────────────────────
const TomTomBanner = ({ tomtomStatus }) => {
  if (!tomtomStatus) return null;

  const isLive     = tomtomStatus.status === 'TOMTOM_LIVE';
  const isFallback = tomtomStatus.status === 'SIMULATION_FALLBACK';
  const isError    = tomtomStatus.status === 'ERROR';

  if (isLive) {
    return (
      <div className="mx-4 mt-3 flex items-center gap-2 bg-cyan-500/8 border border-cyan-500/20 rounded-lg px-3 py-2">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 pulse-dot shrink-0" />
        <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-wider">TomTom Live API Active</span>
        <span className="text-[9px] text-[#5A636B] ml-auto">
          {tomtomStatus.junctionsUpdated}/12 junctions · Updated: {tomtomStatus.lastUpdated}
        </span>
      </div>
    );
  }

  if (isFallback) {
    return (
      <div className="mx-4 mt-3 flex items-center gap-2 bg-amber-500/8 border border-amber-500/20 rounded-lg px-3 py-2">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
        <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider">Simulation Fallback Active</span>
        <span className="text-[9px] text-[#5A636B] ml-auto">TomTom API baseline active</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-4 mt-3 flex items-center gap-2 bg-red-500/8 border border-red-500/20 rounded-lg px-3 py-2">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
        <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider">TomTom Service Notice</span>
        <span className="text-[9px] text-[#5A636B] ml-auto truncate">{tomtomStatus.message}</span>
      </div>
    );
  }

  return null;
};

export const OverviewTab = () => {
  const { junctions, incidents, backendOnline, setActiveTab, tomtomStatus, setSelectedJunctionId } = useTraffic();

  const isTomTomLive = tomtomStatus?.status === 'TOMTOM_LIVE';

  // ── Network Speed averages ──────────────────────────────────────────────
  const avgSpeed = Math.round(
    junctions.reduce((s, j) => s + (j.speed || 0), 0) / Math.max(1, junctions.length)
  );

  const avgFreeFlow = isTomTomLive
    ? Math.round(
        junctions
          .filter(j => typeof j.freeFlowSpeed === 'number')
          .reduce((s, j, _, arr) => s + j.freeFlowSpeed / Math.max(1, arr.length), 0)
      )
    : null;

  const tomtomIncidentCount  = isTomTomLive ? (tomtomStatus?.incidentsCount ?? 0) : null;
  const activeIncidents      = tomtomIncidentCount ?? (incidents || []).filter(e => e.status === 'ACTIVE').length;

  const totalVehicles   = junctions.reduce((s, j) => s + j.vehicles, 0);   // YOLO / simulation
  const criticalCount   = junctions.filter(j => j.status === 'CRITICAL').length;
  const highCount       = junctions.filter(j => j.status === 'HIGH').length;
  const smoothCount     = junctions.filter(j => j.status === 'SMOOTH').length;

  const recentIncidents = (incidents || []).slice(0, 4);

  const handleSelectMapJunction = (jId) => {
    setSelectedJunctionId(jId);
    setActiveTab('junction_control');
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-[#090B0D]">

      {/* OPERATOR WORKFLOW STAGES HEADER BANNER */}
      <div className="bg-[#0D1115] border-b border-[#1A2028] px-5 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold">
          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
            SITUATIONAL AWARENESS
          </span>
          <ArrowRight className="w-3 h-3 text-[#3D4850]" />
          <span className="px-2 py-0.5 rounded bg-[#141A20] text-[#737B82] border border-[#1E2530]">
            ALERT
          </span>
          <ArrowRight className="w-3 h-3 text-[#3D4850]" />
          <span className="px-2 py-0.5 rounded bg-[#141A20] text-[#737B82] border border-[#1E2530]">
            INVESTIGATE
          </span>
          <ArrowRight className="w-3 h-3 text-[#3D4850]" />
          <span className="px-2 py-0.5 rounded bg-[#141A20] text-[#737B82] border border-[#1E2530]">
            DECIDE
          </span>
          <ArrowRight className="w-3 h-3 text-[#3D4850]" />
          <span className="px-2 py-0.5 rounded bg-[#141A20] text-[#737B82] border border-[#1E2530]">
            ACT
          </span>
          <ArrowRight className="w-3 h-3 text-[#3D4850]" />
          <span className="px-2 py-0.5 rounded bg-[#141A20] text-[#737B82] border border-[#1E2530]">
            AUDIT
          </span>
        </div>

        <div className="text-[10px] text-[#5A636B] font-mono flex items-center gap-2">
          <span>Map Layer: <strong className="text-white">Chennai OSM</strong></span>
          <span>•</span>
          <span>12 Monitored Junctions</span>
        </div>
      </div>

      <TomTomBanner tomtomStatus={tomtomStatus} />

      <div className="flex-1 flex overflow-hidden p-4 gap-4">

        {/* LEFT: MAP (Primary situational awareness viewport) */}
        <div className="flex-1 rounded-xl overflow-hidden border border-[#1A2028] bg-[#0C0F13] relative">
          <GeoMap onSelectJunction={handleSelectMapJunction} showAmbulance={false} />
        </div>

        {/* RIGHT: COMMAND CENTER CONTROL PANEL */}
        <div className="w-80 bg-[#0C0F13] rounded-xl border border-[#1A2028] flex flex-col overflow-y-auto divide-y divide-[#1A2028]">

          {/* Network Summary */}
          <div className="p-4 space-y-3">
            <div className="text-[9px] font-bold text-[#5A636B] uppercase tracking-wider flex items-center justify-between">
              <span>Network Summary</span>
              <SourceBadge source={isTomTomLive ? 'TOMTOM_LIVE' : 'SIMULATED'} />
            </div>

            <div className="space-y-2">
              <div className="bg-[#10141A] p-3 rounded-lg border border-[#1A2028] flex items-center justify-between">
                <div>
                  <div className="text-[9px] text-[#5A636B] font-bold uppercase">Junctions Tracked</div>
                  <div className="font-data font-bold text-white text-lg">{junctions.length}</div>
                </div>
                <Radio className="w-4 h-4 text-amber-500" />
              </div>

              <div className="bg-[#10141A] p-3 rounded-lg border border-[#1A2028] flex items-center justify-between">
                <div>
                  <div className="text-[9px] text-[#5A636B] font-bold uppercase flex items-center gap-1.5">
                    Network Avg Speed
                    {isTomTomLive && <SourceBadge source="TOMTOM_LIVE" />}
                  </div>
                  <div className="font-data font-bold text-white text-lg">
                    {avgSpeed} <span className="text-xs text-[#5A636B]">km/h</span>
                  </div>
                  {isTomTomLive && avgFreeFlow !== null && (
                    <div className="text-[9px] text-[#5A636B] mt-0.5">
                      Free-flow: <span className="text-cyan-400 font-data font-bold">{avgFreeFlow}</span> km/h
                    </div>
                  )}
                </div>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>

              {/* Vehicles Detected (Labeled honest source) */}
              <div className="bg-[#10141A] p-3 rounded-lg border border-[#1A2028] flex items-center justify-between">
                <div>
                  <div className="text-[9px] text-[#5A636B] font-bold uppercase flex items-center gap-1">
                    <span>Vehicles Monitored</span>
                    <SourceBadge source="LIVE API DATA" label="YOLO / SIM" />
                  </div>
                  <div className="font-data font-bold text-white text-lg">{totalVehicles}</div>
                </div>
                <Car className="w-4 h-4 text-sky-400" />
              </div>

              {/* Active Incidents */}
              <div className="bg-[#10141A] p-3 rounded-lg border border-[#1A2028] flex items-center justify-between">
                <div>
                  <div className="text-[9px] text-[#5A636B] font-bold uppercase flex items-center gap-1.5">
                    Active Incidents
                    {isTomTomLive && <SourceBadge source="TOMTOM_LIVE" />}
                  </div>
                  <div className={`font-data font-bold text-lg ${activeIncidents > 0 ? 'text-amber-400' : 'text-white'}`}>
                    {activeIncidents}
                  </div>
                </div>
                <AlertTriangle className={`w-4 h-4 ${activeIncidents > 0 ? 'text-amber-400' : 'text-[#5A636B]'}`} />
              </div>
            </div>
          </div>

          {/* Status Breakdown */}
          <div className="p-4 space-y-2">
            <div className="text-[9px] font-bold text-[#5A636B] uppercase tracking-wider flex items-center justify-between mb-1">
              <span>Traffic Congestion Status</span>
              {isTomTomLive && <SourceBadge source="TOMTOM_LIVE" />}
            </div>
            {[
              { label: 'SMOOTH',   count: smoothCount,  color: 'bg-emerald-500' },
              { label: 'MODERATE', count: junctions.filter(j => j.status === 'MODERATE').length, color: 'bg-amber-500' },
              { label: 'HIGH',     count: highCount,     color: 'bg-orange-500' },
              { label: 'CRITICAL', count: criticalCount, color: 'bg-red-500' },
            ].map(({ label, count, color }) => (
              <div key={label} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full shrink-0 ${color}`} />
                <span className="text-[10px] text-[#8A939B] flex-1">{label}</span>
                <span className="font-data font-bold text-xs text-white">{count}</span>
                <div className="w-16 bg-[#1A2028] rounded-full h-1 overflow-hidden">
                  <div className={`h-1 rounded-full ${color}`} style={{ width: `${(count / junctions.length) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Quick Monitored Junctions Analysis List */}
          <div className="p-4 space-y-2">
            <div className="text-[9px] font-bold text-[#5A636B] uppercase tracking-wider flex items-center justify-between mb-1">
              <span>Monitored Junctions (Click for Analysis)</span>
              <span className="text-[9px] text-[#3D4850] font-mono">12 Total</span>
            </div>

            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {junctions.map(j => {
                const rawConf = j.confidence != null ? j.confidence : 82;
                const conf = (typeof rawConf === 'number' && rawConf <= 1.0 && rawConf > 0)
                  ? Math.round(rawConf * 100)
                  : Math.round(rawConf);
                return (
                  <button
                    key={j.id}
                    onClick={() => handleSelectMapJunction(j.id)}
                    className="w-full text-left bg-[#10141A] hover:bg-[#18202A] p-2 rounded-lg border border-[#1A2028] transition-colors flex items-center justify-between text-[11px]"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-mono font-bold text-amber-400 shrink-0">{j.id}</span>
                      <span className="text-white truncate font-medium">{j.name}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 font-mono text-[10px]">
                      <span className={`px-1.5 py-0.5 rounded font-bold border ${
                        j.signal === 'GREEN' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        j.signal === 'RED' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                        'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {j.signal}
                      </span>
                      <span className={`font-bold ${conf < 40 ? 'text-red-400 font-extrabold' : 'text-[#8A939B]'}`}>
                        {conf}%
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Data Honesty Disclaimer */}
          <div className="p-4 bg-[#090B0D]">
            <div className="text-[9px] font-bold text-[#5A636B] uppercase tracking-wider mb-2">Data Source Provenance</div>
            <div className="text-[10px] text-[#737B82] space-y-1 font-mono">
              <p>• <strong className="text-cyan-400">TOMTOM LIVE</strong>: Speed, travel time &amp; incident flow API</p>
              <p>• <strong className="text-emerald-400">YOLO11n</strong>: Video perception (CAM-01 / J1)</p>
              <p>• <strong className="text-amber-400">SIMULATED</strong>: Baseline telemetry</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
