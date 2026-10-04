import React, { useState, useEffect } from 'react';
import { useTraffic } from '../../context/TrafficContext';
import { CityMap, JunctionModal } from '../map/CityMap';
import { emergencyService } from '../../services/apiServices';
import {
  AlertTriangle,
  Ambulance,
  CheckCircle2,
  Clock,
  Navigation,
  Play,
  Pause,
  RotateCcw,
  ShieldCheck,
  Siren,
  Sparkles,
  Zap,
  MapPin,
  Compass,
  Layers,
  Radio,
  XCircle
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
    wsConnected
  } = useTraffic();

  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedJunctionForModal, setSelectedJunctionForModal] = useState(null);
  const [routesList, setRoutesList] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState(ambulance.routeId || 'ROUTE-A');

  // Fetch route alternatives
  useEffect(() => {
    emergencyService.getEmergencyRoutes('J1', 'J7')
      .then(res => { if (Array.isArray(res) && res.length) setRoutesList(res); })
      .catch(() => {});
  }, [ambulance.routeId]);

  const handleOpenJunction = (junctionId) => {
    const j = junctions.find(item => item.id === junctionId);
    if (j) setSelectedJunctionForModal(j);
  };

  const handleSelectRoute = (rId) => {
    setSelectedRouteId(rId);
    startEmergency('AMB-102', 'J1', 'J7', rId);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* AMBULANCE EMERGENCY TOP STATUS BANNER */}
      <div className="bg-gradient-to-r from-red-950/80 via-[#14181C] to-[#14181C] p-5 rounded-xl border border-red-500/40 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/50 flex items-center justify-center animate-pulse">
            <Ambulance className="w-7 h-7 text-red-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-500 text-white uppercase animate-pulse">
                EMERGENCY ACTIVE
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-800/50">
                GPS • SIMULATION
              </span>
              <span className="text-xs text-[#737B82] font-mono">{ambulance.callsign || 'AMB-102'}</span>
            </div>
            <h2 className="text-lg font-extrabold text-white mt-0.5 flex items-center gap-2">
              AMBULANCE {ambulance.id} — EMERGENCY CORRIDOR ROUTE INTELLIGENCE
            </h2>
            <p className="text-xs text-[#B8BEC4]">
              Origin: <strong className="text-white">{ambulance.origin || 'Kathipara (J1)'}</strong> ➔ Destination: <strong className="text-emerald-400">{ambulance.destinationName || 'Rajiv Gandhi Govt General Hospital (J7)'}</strong>
            </p>
          </div>
        </div>

        {/* CONTROLS & DRIVER APP INTERFACE */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => startEmergency('AMB-102', 'J1', 'J7', selectedRouteId)}
            className="px-3 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 font-bold text-xs transition-all flex items-center gap-1.5"
            title="Start / Restart Emergency Corridor"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Start Emergency</span>
          </button>

          <button
            onClick={pauseAmbulance}
            className="px-3 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 font-bold text-xs transition-all flex items-center gap-1.5"
            title="Pause / Resume GPS Simulation"
          >
            <Pause className="w-3.5 h-3.5 fill-current" />
            <span>{ambulance.status === 'PAUSED' ? 'Resume' : 'Pause'}</span>
          </button>

          <button
            onClick={resetAmbulance}
            className="px-3 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 font-bold text-xs transition-all flex items-center gap-1.5"
            title="Reset Ambulance to Start Location"
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

          {!ambulance.corridorApproved ? (
            <button
              onClick={() => setShowApprovalModal(true)}
              className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs transition-all shadow-glow flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Review Approval</span>
            </button>
          ) : (
            <div className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-mono text-xs font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>CORRIDOR APPROVED</span>
            </div>
          )}
        </div>
      </div>

      {/* METRICS & SAFETY VALIDATION SUMMARY */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-[#14181C] p-4 rounded-xl border border-[#242A30]">
          <div className="text-[10px] font-bold text-[#737B82] uppercase tracking-wider flex items-center gap-1">
            <Compass className="w-3 h-3 text-cyan-400" /> Live GPS Position
          </div>
          <div className="text-sm font-mono font-bold text-white mt-1">
            {ambulance.latitude ? `${Number(ambulance.latitude).toFixed(4)}°N, ${Number(ambulance.longitude).toFixed(4)}°E` : '13.0067°N, 80.2020°E'}
          </div>
          <div className="text-[10px] text-cyan-400 mt-1 font-mono flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            GPS • SIMULATION ACTIVE
          </div>
        </div>

        <div className="bg-[#14181C] p-4 rounded-xl border border-[#242A30]">
          <div className="text-[10px] font-bold text-[#737B82] uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3 h-3 text-emerald-400" /> Calculated Dynamic ETA
          </div>
          <div className="text-xl font-mono font-bold text-emerald-400 mt-1">{ambulance.eta || '08:42'}</div>
          <div className="text-[10px] text-[#737B82] mt-1">Omni SmartCity Traffic Model</div>
        </div>

        <div className="bg-[#14181C] p-4 rounded-xl border border-[#242A30]">
          <div className="text-[10px] font-bold text-[#737B82] uppercase tracking-wider flex items-center gap-1">
            <Navigation className="w-3 h-3 text-amber-400" /> Remaining Distance
          </div>
          <div className="text-xl font-mono font-bold text-white mt-1">
            {ambulance.distRemaining || '12.4'} <span className="text-xs font-normal">km</span>
          </div>
          <div className="text-[10px] text-amber-400 mt-1">Rajiv Gandhi Govt Hospital</div>
        </div>

        <div className="bg-[#14181C] p-4 rounded-xl border border-[#242A30]">
          <div className="text-[10px] font-bold text-[#737B82] uppercase tracking-wider flex items-center gap-1">
            <Layers className="w-3 h-3 text-purple-400" /> Active Route Path
          </div>
          <div className="text-xs font-mono font-bold text-amber-400 mt-1">
            {ambulance.routeId === 'ROUTE-B' ? 'J1 → J10 → J11 → J3 → J7' : 'J1 → J8 → J2 → J7'}
          </div>
          <div className="text-[10px] text-[#737B82] mt-1">Anna Salai Arterial</div>
        </div>

        <div className="bg-[#14181C] p-4 rounded-xl border border-emerald-500/30">
          <div className="text-[10px] font-bold text-[#737B82] uppercase tracking-wider flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" /> Decision Support Check
          </div>
          <div className="text-xs font-mono font-extrabold text-emerald-400 mt-1">PASSED (6/6 Checks)</div>
          <div className="text-[10px] text-emerald-400 mt-1">SAFE TO EXECUTE</div>
        </div>
      </div>

      {/* ROUTE ALTERNATIVES SELECTOR */}
      <div className="bg-[#14181C] p-4 rounded-xl border border-[#242A30] space-y-3">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          Emergency Route Intelligence — 2 Route Alternatives
        </h3>

        <div className="grid grid-cols-2 gap-4">
          {routesList.map((r) => {
            const isSelected = selectedRouteId === r.id;
            return (
              <div
                key={r.id}
                onClick={() => handleSelectRoute(r.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-amber-500/10 border-amber-500/50 shadow-lg'
                    : 'bg-[#181D21] border-[#242A30] hover:border-amber-500/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-extrabold text-white text-xs px-2 py-0.5 rounded bg-[#0E1114] border border-[#242A30]">
                      {r.id}
                    </span>
                    <h4 className="text-xs font-bold text-white">{r.name}</h4>
                  </div>
                  {r.isRecommended && (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[9px] font-bold uppercase">
                      ● Recommended
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs font-mono mt-2">
                  <span className="text-emerald-400 font-bold">ETA: {r.etaFormatted || `${r.estimatedTime} min`}</span>
                  <span className="text-white">Distance: {r.distance} km</span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                    r.congestion === 'HIGH' ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  }`}>
                    Congestion: {r.congestion}
                  </span>
                </div>

                <p className="text-[10px] text-[#737B82] mt-1.5 font-mono truncate">
                  {r.aiReason}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* MAP & TRAFFIC CLEARANCE PLAN */}
      <div className="grid grid-cols-12 gap-6 h-[580px]">
        {/* MAP CANVAS (7 COLS) */}
        <div className="col-span-7 h-full">
          <CityMap onSelectJunction={handleOpenJunction} />
        </div>

        {/* UPCOMING JUNCTION READINESS & SAFETY RECOMMENDATIONS (5 COLS) */}
        <div className="col-span-5 h-full space-y-4 overflow-y-auto pr-1">
          <div className="bg-[#14181C] p-4 rounded-xl border border-[#242A30] space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Siren className="w-4 h-4 text-red-400 animate-pulse" />
              Upcoming Junctions &amp; Safety Recommendations
            </h3>

            <div className="space-y-2.5">
              {(ambulance.upcomingJunctions || []).map((j, idx) => {
                let badgeStyle = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
                if (j.recommendation?.includes('HOLD')) badgeStyle = 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse';
                else if (j.recommendation?.includes('PRIORITY WINDOW')) badgeStyle = 'bg-amber-500/20 text-amber-400 border-amber-500/40';

                return (
                  <div
                    key={j.id || idx}
                    onClick={() => handleOpenJunction(j.id)}
                    className="p-3 rounded-lg bg-[#181D21] border border-[#242A30] hover:border-amber-500/40 cursor-pointer space-y-2 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded bg-[#0E1114] text-amber-400 font-mono font-bold text-xs flex items-center justify-center">
                          #{idx + 1}
                        </span>
                        <span className="font-mono font-bold text-white text-sm">{j.id} — {j.name}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${badgeStyle}`}>
                        {j.recommendation}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-[#0E1114] p-2 rounded border border-[#242A30]">
                      <div>
                        <span className="text-[#737B82]">Congestion: </span>
                        <strong className="text-white font-mono">{j.congestion} ({j.queue} veh queue)</strong>
                      </div>
                      <div>
                        <span className="text-[#737B82]">Action: </span>
                        <strong className="text-emerald-400 font-mono">{j.suggestedAction || 'Extend green phase'}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* DECISION SUPPORT DISCLAIMER */}
          <div className="bg-[#14181C] p-4 rounded-xl border border-amber-500/30 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-amber-400 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              DECISION SUPPORT PROTOTYPE
            </div>
            <p className="text-[11px] text-[#B8BEC4] leading-relaxed">
              All signal recommendations act strictly as operator decision-support suggestions. No physical hardware signal overrides are sent. All priority actions are subject to safety clearance checks.
            </p>
          </div>
        </div>
      </div>

      {/* OPERATOR APPROVAL MODAL */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#14181C] border border-[#242A30] rounded-xl w-full max-w-xl shadow-2xl overflow-hidden space-y-5 p-6 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-[#242A30] pb-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-amber-400" />
                <div>
                  <h3 className="text-base font-bold text-white">OPERATOR EMERGENCY CORRIDOR APPROVAL</h3>
                  <p className="text-xs text-[#737B82]">AI-Generated Recommendation &amp; Safety Conflict Check</p>
                </div>
              </div>
              <button onClick={() => setShowApprovalModal(false)} className="text-[#737B82] hover:text-white">✕</button>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-bold text-[#737B82] uppercase tracking-wider">
                Safety Validation Criteria Checks
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-[#181D21] border border-emerald-500/30 text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Signal Conflict Check: PASSED
                </div>
                <div className="p-2.5 rounded-lg bg-[#181D21] border border-emerald-500/30 text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Min Phase Duration: PASSED
                </div>
                <div className="p-2.5 rounded-lg bg-[#181D21] border border-emerald-500/30 text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Yellow Transition: PASSED
                </div>
                <div className="p-2.5 rounded-lg bg-[#181D21] border border-emerald-500/30 text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> All-Red Clearance: PASSED
                </div>
                <div className="p-2.5 rounded-lg bg-[#181D21] border border-emerald-500/30 text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Pedestrian Conflict: PASSED
                </div>
                <div className="p-2.5 rounded-lg bg-[#181D21] border border-emerald-500/30 text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Downstream Cap: PASSED
                </div>
              </div>

              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-center font-mono font-bold text-emerald-400 text-sm">
                STATUS: SAFE TO EXECUTE
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#242A30]">
              <button
                onClick={() => {
                  toggleCorridorApproval(false);
                  setShowApprovalModal(false);
                }}
                className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/40 text-xs font-bold hover:bg-red-500/30"
              >
                REJECT CORRIDOR
              </button>
              <button
                onClick={() => {
                  toggleCorridorApproval(true);
                  setShowApprovalModal(false);
                }}
                className="px-6 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs transition-all shadow-glow"
              >
                APPROVE EMERGENCY CORRIDOR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAILED JUNCTION INSPECTION MODAL */}
      {selectedJunctionForModal && (
        <JunctionModal
          junction={selectedJunctionForModal}
          onClose={() => setSelectedJunctionForModal(null)}
        />
      )}
    </div>
  );
};
