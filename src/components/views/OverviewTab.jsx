import React from 'react';
import { useTraffic } from '../../context/TrafficContext';
import { GeoMap } from '../map/GeoMap';
import { SourceBadge } from '../map/GeoMap';
import {
  Activity, AlertTriangle, Car, CheckCircle, Clock, Navigation, Radio, TrendingUp, Zap, Flame
} from 'lucide-react';

// Tiny metric card — unchanged from original
const MetricCard = ({ label, value, sub, icon: Icon, iconColor = 'text-[#5A636B]', valueColor = 'text-white', source }) => (
  <div className="bg-[#10141A] p-4 rounded-xl border border-[#1A2028] flex flex-col gap-2">
    <div className="flex items-center justify-between">
      <span className="text-[9px] font-bold uppercase tracking-wider text-[#5A636B]">{label}</span>
      <Icon className={`w-4 h-4 ${iconColor}`} />
    </div>
    <div className="flex items-baseline justify-between gap-2">
      <span className={`text-2xl font-data font-bold ${valueColor}`}>{value}</span>
      {sub && <span className="text-[10px] text-[#5A636B] text-right">{sub}</span>}
    </div>
    {source && <div className="mt-1"><SourceBadge source={source} /></div>}
  </div>
);

// ── TomTom status banner — shown only when TomTom is live ──────────────────────
const TomTomBanner = ({ tomtomStatus }) => {
  if (!tomtomStatus) return null;

  const isLive     = tomtomStatus.status === 'TOMTOM_LIVE';
  const isFallback = tomtomStatus.status === 'SIMULATION_FALLBACK';
  const isError    = tomtomStatus.status === 'ERROR';

  if (isLive) {
    return (
      <div className="mx-4 mt-3 flex items-center gap-2 bg-cyan-500/8 border border-cyan-500/20 rounded-lg px-3 py-2">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 pulse-dot shrink-0" />
        <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-wider">TomTom Live</span>
        <span className="text-[9px] text-[#5A636B] ml-auto">
          {tomtomStatus.junctionsUpdated}/12 junctions · {tomtomStatus.lastUpdated}
        </span>
      </div>
    );
  }

  if (isFallback) {
    return (
      <div className="mx-4 mt-3 flex items-center gap-2 bg-amber-500/8 border border-amber-500/20 rounded-lg px-3 py-2">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
        <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider">Simulation Fallback</span>
        <span className="text-[9px] text-[#5A636B] ml-auto">TomTom unavailable</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-4 mt-3 flex items-center gap-2 bg-red-500/8 border border-red-500/20 rounded-lg px-3 py-2">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
        <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider">TomTom Error</span>
        <span className="text-[9px] text-[#5A636B] ml-auto truncate">{tomtomStatus.message}</span>
      </div>
    );
  }

  return null;
};

export const OverviewTab = () => {
  const { junctions, incidents, ambulance, backendOnline, setActiveTab, tomtomStatus } = useTraffic();

  const isTomTomLive = tomtomStatus?.status === 'TOMTOM_LIVE';

  // ── Speed: use TomTom currentSpeed per junction when live, else j.speed ──────
  const avgSpeed = Math.round(
    junctions.reduce((s, j) => {
      const speed = (isTomTomLive && j.tomtomStatus === 'TOMTOM_LIVE' && typeof j.speed === 'number')
        ? j.speed
        : j.speed;
      return s + speed;
    }, 0) / Math.max(1, junctions.length)
  );

  // ── Free-flow speed average (TomTom only) ────────────────────────────────────
  const avgFreeFlow = isTomTomLive
    ? Math.round(
        junctions
          .filter(j => j.tomtomStatus === 'TOMTOM_LIVE' && typeof j.freeFlowSpeed === 'number')
          .reduce((s, j, _, arr) => s + j.freeFlowSpeed / Math.max(1, arr.length), 0)
      )
    : null;

  // ── TomTom incident count when live, else fall back to active events ──────────
  const tomtomIncidentCount  = isTomTomLive ? (tomtomStatus?.incidentsCount ?? 0) : null;
  const activeIncidents      = tomtomIncidentCount ?? (incidents || []).filter(e => e.status === 'ACTIVE').length;

  // ── Status breakdown — driven by TomTom-derived junction.status ──────────────
  const totalVehicles   = junctions.reduce((s, j) => s + j.vehicles, 0);   // YOLO / simulation — never TomTom-fabricated
  const criticalCount   = junctions.filter(j => j.status === 'CRITICAL').length;
  const highCount       = junctions.filter(j => j.status === 'HIGH').length;
  const smoothCount     = junctions.filter(j => j.status === 'SMOOTH').length;

  const recentIncidents = (incidents || []).slice(0, 4);

  // Source label for the Network Summary header
  const networkSource = isTomTomLive ? 'TOMTOM_LIVE' : 'SIMULATED';

  return (
    <div className="flex-1 overflow-hidden flex flex-col">

      {/* TomTom status banner — sits between header and content */}
      <TomTomBanner tomtomStatus={tomtomStatus} />

      <div className="flex-1 flex overflow-hidden mt-1">

        {/* LEFT: MAP (primary) — unchanged */}
        <div className="flex-1 p-4">
          <GeoMap onSelectJunction={() => {}} showAmbulance={true} />
        </div>

        {/* RIGHT: Summary panel */}
        <div className="w-72 flex flex-col border-l border-[#1A2028] overflow-y-auto">

          {/* Metrics */}
          <div className="p-4 border-b border-[#1A2028]">
            <div className="text-[9px] font-bold text-[#5A636B] uppercase tracking-wider mb-3 flex items-center gap-2">
              Network Summary
              <SourceBadge source={networkSource} />
            </div>
            <div className="space-y-2">

              {/* Junctions Tracked */}
              <div className="bg-[#10141A] p-3 rounded-lg border border-[#1A2028] flex items-center justify-between">
                <div>
                  <div className="text-[9px] text-[#5A636B] font-bold uppercase">Junctions Tracked</div>
                  <div className="font-data font-bold text-white text-lg">{junctions.length}</div>
                </div>
                <Radio className="w-4 h-4 text-amber-500" />
              </div>

              {/* Vehicles in Network — always from YOLO/simulation, never fabricated from TomTom */}
              <div className="bg-[#10141A] p-3 rounded-lg border border-[#1A2028] flex items-center justify-between">
                <div>
                  <div className="text-[9px] text-[#5A636B] font-bold uppercase">Vehicles in Network</div>
                  <div className="font-data font-bold text-white text-lg">{totalVehicles}</div>
                </div>
                <Car className="w-4 h-4 text-sky-400" />
              </div>

              {/* Avg Speed — TomTom currentSpeed when live, else simulation speed */}
              <div className="bg-[#10141A] p-3 rounded-lg border border-[#1A2028] flex items-center justify-between">
                <div>
                  <div className="text-[9px] text-[#5A636B] font-bold uppercase flex items-center gap-1.5">
                    Network Avg Speed
                    {isTomTomLive && <SourceBadge source="TOMTOM_LIVE" />}
                  </div>
                  <div className="font-data font-bold text-white text-lg">
                    {avgSpeed} <span className="text-xs text-[#5A636B]">km/h</span>
                  </div>
                  {/* Free-flow speed row — TomTom-only extra field */}
                  {isTomTomLive && avgFreeFlow !== null && (
                    <div className="text-[9px] text-[#5A636B] mt-0.5">
                      Free-flow: <span className="text-cyan-400 font-data font-bold">{avgFreeFlow}</span> km/h
                    </div>
                  )}
                </div>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>

              {/* Active Incidents — TomTom incident count when live */}
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

          {/* Junction status breakdown — congestion derived from TomTom speed when live */}
          <div className="p-4 border-b border-[#1A2028]">
            <div className="text-[9px] font-bold text-[#5A636B] uppercase tracking-wider mb-3 flex items-center gap-2">
              Status Breakdown
              {isTomTomLive && <SourceBadge source="TOMTOM_LIVE" />}
            </div>
            {[
              { label: 'SMOOTH',   count: smoothCount,  color: 'bg-emerald-500' },
              { label: 'MODERATE', count: junctions.filter(j => j.status === 'MODERATE').length, color: 'bg-amber-500' },
              { label: 'HIGH',     count: highCount,     color: 'bg-orange-500' },
              { label: 'CRITICAL', count: criticalCount, color: 'bg-red-500' },
            ].map(({ label, count, color }) => (
              <div key={label} className="flex items-center gap-2 mb-2">
                <div className={`w-2 h-2 rounded-full shrink-0 ${color}`} />
                <span className="text-[10px] text-[#8A939B] flex-1">{label}</span>
                <span className="font-data font-bold text-xs text-white">{count}</span>
                <div className="w-16 bg-[#1A2028] rounded-full h-1 overflow-hidden">
                  <div className={`h-1 rounded-full ${color}`} style={{ width: `${(count / junctions.length) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Ambulance corridor notice — unchanged from original */}
          {ambulance.active && (
            <div className="p-4 border-b border-[#1A2028]">
              <div className="bg-red-500/8 border border-red-500/20 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-red-400 pulse-dot" />
                  <span className="text-[10px] font-bold text-red-400">SIMULATED CORRIDOR</span>
                  <SourceBadge source="SIMULATED" />
                </div>
                <div className="text-[10px] text-[#8A939B]">
                  <div className="font-semibold text-white text-xs mb-1">{ambulance.callsign}</div>
                  <div>{ambulance.origin} → {ambulance.destination}</div>
                  <div className="mt-1 font-data text-red-300">ETA: {ambulance.eta} · {ambulance.distRemaining}</div>
                </div>
                <button onClick={() => setActiveTab('incidents')} className="mt-2 text-[9px] text-red-400 hover:text-red-300 underline underline-offset-2">
                  View corridor details →
                </button>
              </div>
            </div>
          )}

          {/* Recent incidents — unchanged */}
          <div className="p-4 flex-1">
            <div className="text-[9px] font-bold text-[#5A636B] uppercase tracking-wider mb-3">Recent Events</div>
            <div className="space-y-2">
              {recentIncidents.map(evt => (
                <div key={evt.id} className="bg-[#10141A] p-2.5 rounded-lg border border-[#1A2028]">
                  <div className="flex items-start gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${
                      evt.severity === 'CRITICAL' ? 'bg-red-400' :
                      evt.severity === 'WARNING'  ? 'bg-amber-400' : 'bg-emerald-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-semibold text-white truncate">{evt.title}</div>
                      <div className="text-[9px] text-[#5A636B] mt-0.5">{evt.locationName} · {evt.time}</div>
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={() => setActiveTab('incidents')} className="text-[9px] text-amber-500 hover:text-amber-400 underline underline-offset-2">
                View all incidents →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
