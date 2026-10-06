import React, { useState } from 'react';
import { useTraffic } from '../../context/TrafficContext';
import { SourceBadge } from '../map/GeoMap';
import {
  AlertTriangle, CheckCircle2, Clock, Play, RotateCcw, Sliders, TrafficCone, Zap,
  ShieldCheck, ShieldAlert, Radio, UserCheck, Lock, Activity, Ambulance, Check, RefreshCw, Cpu
} from 'lucide-react';

const formatCoordinate = (value, direction) => {
  if (value == null) return '—';
  const coordinate = Number.parseFloat(value);
  return Number.isFinite(coordinate) ? `${coordinate.toFixed(4)}° ${direction}` : String(value);
};

export const JunctionControlTab = () => {
  const {
    junctions,
    selectedJunctionId,
    setSelectedJunctionId,
    transitionSignal,
    restoreAIControl,
    switchFallbackMode,
    overrideAIDecision,
    addEvent,
    ambulance,
    tomtomStatus,
    backendOnline,
    wsConnected,
    backendError,
    demoMode,
  } = useTraffic();

  const activeJunctionId = selectedJunctionId || 'J1';
  const j = (junctions && junctions.length > 0) ? (junctions.find(item => item.id === activeJunctionId) || junctions[0]) : null;

  // Manual timing custom modal/input state
  const [customGreenInput, setCustomGreenInput] = useState(45);
  const [customRedInput, setCustomRedInput] = useState(35);
  const [showOverrideForm, setShowOverrideForm] = useState(false);

  if (!j) {
    return (
      <div className="light-dashboard junction-control-dashboard flex-1 overflow-y-auto p-6 flex items-center justify-center bg-[var(--page-bg)]">
        <div className="text-center text-slate-700 text-sm">
          Loading Junction Analysis Telemetry...
        </div>
      </div>
    );
  }

  // Derived metrics & confidence logic
  // The system uses a 0–100 integer scale for confidence throughout.
  // Mock/simulation data: rule-based integer (e.g. 94, 76, 35).
  // TomTom LIVE data: TomTom API returns 0–1 float (road sensor data quality),
  //   normalized to 0–100 in tomtom_traffic.py at ingestion.
  // Defensive: if a stale 0–1 float ever reaches the frontend, normalize it here too.
  //
  // Single shared helper — used for selected junction AND global banner scan.
  const normalizeConf = (c) => {
    const v = c != null ? c : 82;
    return (typeof v === 'number' && v <= 1.0 && v > 0) ? Math.round(v * 100) : Math.round(v);
  };

  const rawConf = j.confidence != null ? j.confidence : 82;
  const confidenceScore = normalizeConf(rawConf);
  const isLowConfidence = confidenceScore < 40;
  const isModerateConfidence = confidenceScore >= 40 && confidenceScore < 70;
  const isHighConfidence = confidenceScore >= 70;
  // Label depends on data source — do NOT call simulated/TomTom data "AI Confidence"
  const isTomTomLiveJunction = j?.tomtomStatus === 'TOMTOM_LIVE' || j?.dataSource === 'TOMTOM_LIVE';
  const confidenceLabel = isTomTomLiveJunction ? 'Sensor Data Quality' : 'Decision Confidence';

  // Global low-confidence scan across ALL junctions (drives the top-level alert banner).
  // This updates automatically whenever the junctions array from live state changes.
  const allLowConfJunctions = (junctions || []).filter(jn => normalizeConf(jn.confidence) < 40);
  const otherLowConfJunctions = allLowConfJunctions.filter(jn => jn.id !== j.id);

  const controlMode = j.controlMode || 'AI_CONTROL';
  const isAIControl = controlMode === 'AI_CONTROL';
  const isManual = controlMode === 'MANUAL';
  const isFallback = controlMode === 'FALLBACK';

  // Emergency corridor check for active junction
  const isEmergencyRouteJunction = ambulance?.active && ambulance?.routeJunctions?.includes(j.id);
  const isCurrentAmbulanceNode = isEmergencyRouteJunction && ambulance?.routeJunctions?.[ambulance?.currentJunctionIndex] === j.id;

  const isTomTomLive = j?.tomtomStatus === 'TOMTOM_LIVE' || j?.dataSource === 'TOMTOM_LIVE';
  const liveBackendConnected = backendOnline && wsConnected && !backendError;
  const telemetryStatus = demoMode
    ? 'LOCAL DEMO MODE'
    : liveBackendConnected
      ? 'LIVE TELEMETRY CONNECTED'
      : backendError
        ? 'BACKEND ERROR'
        : 'CONNECTING TO BACKEND';

  const handleManualSetSignal = (targetSignal) => {
    overrideAIDecision(j.id, targetSignal, Number(customGreenInput) || 45, Number(customRedInput) || 35);
  };

  const handleRestoreAI = () => {
    restoreAIControl(j.id);
  };

  const handleSwitchFallback = () => {
    switchFallbackMode(j.id);
  };
  const signalDecisionReason = isLowConfidence
    ? 'Low AI confidence — manual review recommended'
    : j.signalReason || 'Current phase follows the active signal plan.';

  return (
    <div className="light-dashboard junction-control-dashboard flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 bg-[var(--page-bg)]">

      {/* TOP HEADER BANNER & MODE INDICATOR */}
      <div className="bg-[#14181C] p-4 rounded-xl border border-[#242A30] flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <Cpu className="w-5 h-5 text-amber-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h3 className="min-w-0 break-words text-sm font-bold text-white">
                Junction analysis &amp; signal control
              </h3>

              {/* OPERATIONAL MODE BADGE */}
              {isAIControl && (
                <span className="px-2.5 py-1 rounded text-[10px] font-mono font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 animate-pulse flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  AI CONTROL ACTIVE — TIMING AUTOMATICALLY APPLIED
                </span>
              )}

              {isManual && (
                <span className="px-2.5 py-1 rounded text-[10px] font-mono font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  MANUAL OVERRIDE ACTIVE
                </span>
              )}

              {isFallback && (
                <span className="px-2.5 py-1 rounded text-[10px] font-mono font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                  FALLBACK FIXED-TIME MODE (60s GREEN / 60s RED)
                </span>
              )}
            </div>
            <p className="mt-0.5 break-words text-[11px] text-[#737B82] font-mono">
              Operational node: <strong className="text-white">{j.name} ({j.id})</strong> · Real-time signal control
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <span className="px-3 py-1.5 rounded bg-[#181D21] border border-[#242A30] text-[#B8BEC4]">
            {confidenceLabel}: <strong className={confidenceScore >= 70 ? 'text-emerald-400' : confidenceScore >= 40 ? 'text-amber-400' : 'text-red-400'}>{confidenceScore}%</strong>
          </span>
          <span className={`px-3 py-1.5 rounded border font-bold ${
            demoMode
              ? 'bg-violet-50 text-violet-800 border-violet-200'
              : liveBackendConnected
                ? 'bg-green-50 text-green-800 border-green-200'
                : backendError
                  ? 'bg-red-50 text-red-800 border-red-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}>
            {telemetryStatus}
          </span>
        </div>
      </div>

      {/* ── GLOBAL LOW-CONFIDENCE ALERT BANNER ───────────────────────────────────
          Derived from ALL junctions in live state. Appears when ≥1 junction has
          normalized confidence < 40%. Hidden when all junctions are ≥40%.
          Clicking a junction pill navigates directly to its analysis.
      ─────────────────────────────────────────────────────────────────────────── */}
      {otherLowConfJunctions.length > 0 && (
        <div className="rounded-xl border border-red-300 bg-red-100 p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-red-900">Low AI confidence — human review required</h3>
              <p className="mt-1 text-sm text-slate-800">
                The AI confidence score is below the safe threshold. Select a junction to review its applied signal.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {otherLowConfJunctions.map(jn => (
                <button
                  key={jn.id}
                  onClick={() => setSelectedJunctionId(jn.id)}
                  className="rounded-lg border border-red-400 bg-white px-3 py-2 font-semibold text-red-900 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                  title={`Select ${jn.id} — ${jn.name}`}
                >
                  {jn.id} · {normalizeConf(jn.confidence)}%
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* JUNCTION SELECTOR TABS (All 12 Monitored Junctions) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#1A2028]">
        {junctions.map((node) => {
          const isSelected = node.id === j.id;
          const isCrit = node.status === 'CRITICAL';
          const nodeConf = normalizeConf(node.confidence);
          const isNodeLowConf = nodeConf < 40;
          const isNodeModConf = nodeConf >= 40 && nodeConf < 70;
          return (
            <button
              key={node.id}
              onClick={() => setSelectedJunctionId(node.id)}
              className={`px-3 py-2 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-2 shrink-0 ${
                isSelected
                  ? 'bg-amber-500 text-black shadow-glow'
                  : isNodeLowConf
                  ? 'bg-red-950/40 text-red-300 border border-red-500/40 hover:bg-red-950/70'
                  : isNodeModConf
                  ? 'bg-amber-950/30 text-amber-300 border border-amber-500/30 hover:bg-amber-950/50'
                  : 'bg-[#14181C] text-[#8A939B] border border-[#242A30] hover:text-white'
              }`}
            >
              <span>{node.id}</span>
              <span className={`w-1.5 h-1.5 rounded-full ${
                isNodeLowConf ? 'bg-red-400 animate-pulse' :
                isCrit ? 'bg-red-400 pulse-dot' :
                isNodeModConf ? 'bg-amber-400' :
                node.status === 'HIGH' ? 'bg-orange-400' : 'bg-emerald-400'
              }`} />
              {isNodeLowConf && (
                <span className="px-1 rounded bg-red-600 text-white text-[9px] font-black">!</span>
              )}
            </button>
          );
        })}
      </div>

      {/* LOW-CONFIDENCE ALERT BANNER (<40%) */}
      {isLowConfidence && (
        <div className="rounded-xl border border-red-300 bg-red-100 p-4 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-800" />
              <div>
                <h3 className="text-base font-bold text-red-900">Low AI confidence — human review required</h3>
                <p className="mt-1 text-sm text-slate-800">
                  The AI confidence score is below the safe threshold. Please review the junction status before applying an automated signal decision.
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">Confidence: {confidenceScore}%</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowOverrideForm(true)}
                className="min-h-11 rounded-lg bg-red-600 px-4 py-2 text-base font-semibold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Override AI decision
              </button>
              <button
                onClick={handleSwitchFallback}
                className="min-h-11 rounded-lg bg-amber-500 px-4 py-2 text-base font-semibold text-slate-900 hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
              >
                Switch to fallback timing
              </button>
              <button
                onClick={handleRestoreAI}
                className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 py-2 text-base font-semibold text-slate-900 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
              >
                Restore AI control
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODERATE-CONFIDENCE ADVISORY BANNER (40% - 69%) */}
      {isModerateConfidence && (
        <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-mono font-bold">
            <AlertTriangle className="w-4 h-4" />
            <span>MODERATE CONFIDENCE ({confidenceScore}%) — ADVISORY MONITORING ACTIVE</span>
          </div>
          <span className="text-[10px] text-amber-300/80 font-mono">AI operating normally under supervisory monitoring</span>
        </div>
      )}

      {/* MAIN OPERATIONAL DRILL-DOWN GRID */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12 xl:gap-6">

        {/* LEFT COLUMN: JUNCTION TELEMETRY & LIVE STATE (4 Cols) */}
        <div className="space-y-4 xl:col-span-4">

          {/* Junction Overview Card */}
          <div className="bg-[#14181C] p-4 rounded-xl border border-[#242A30] space-y-3">
            <div className="flex items-center justify-between border-b border-[#242A30] pb-2">
              <div>
                <span className="text-[9px] font-mono font-bold text-[#5A636B] uppercase">{j.id} · Chennai Metro</span>
                <h4 className="text-sm font-bold text-white">{j.name}</h4>
              </div>
              <SourceBadge source={isTomTomLive ? 'TOMTOM_LIVE' : (j.dataSource || 'SIMULATED')} />
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800">
              <p><span className="font-semibold">Current signal:</span> {j.signal}</p>
              <p className="mt-1"><span className="font-semibold">Phase:</span> {j.currentPhase || 'Main road signal phase'}</p>
              <p className="mt-1"><span className="font-semibold">Remaining:</span> {j.remainingTime ?? '—'} seconds</p>
              <p className="mt-1"><span className="font-semibold">Traffic:</span> {j.status || 'UNKNOWN'}</p>
              <p className="mt-1"><span className="font-semibold">{confidenceLabel}:</span> {confidenceScore}%</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="bg-[#0E1114] p-2.5 rounded-lg border border-[#1E2530]">
                <div className="text-[#5A636B]">Congestion Status</div>
                <div className={`font-bold mt-0.5 ${
                  j.status === 'CRITICAL' ? 'text-red-400' : j.status === 'HIGH' ? 'text-orange-400' : 'text-emerald-400'
                }`}>{j.status}</div>
              </div>

              <div className="bg-[#0E1114] p-2.5 rounded-lg border border-[#1E2530]">
                <div className="text-[#5A636B]">Current Signal Phase</div>
                <div className="font-mono font-bold text-amber-400 mt-0.5">● {j.signal}</div>
              </div>
            </div>

            {/* Coordinates & Camera */}
            <div className="text-[10px] text-[#737B82] space-y-1 font-mono pt-1">
              <div>Address: <span className="text-white">{j.address}</span></div>
              <div>Coords: {formatCoordinate(j.lat, 'N')}, {formatCoordinate(j.lng, 'E')}</div>
              <div>Camera Ref: <span className="text-white">{j.cameraId || 'CAM-01'}</span></div>
            </div>
          </div>

          {/* TomTom Live Telemetry Card */}
          <div className="bg-[#14181C] p-4 rounded-xl border border-[#242A30] space-y-2">
            <div className="flex items-center justify-between text-[9px] font-bold text-[#5A636B] uppercase tracking-wider mb-1">
              <span>TomTom Live Traffic Telemetry</span>
              <SourceBadge source="TOMTOM_LIVE" />
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between border-b border-[#1E2530] py-1">
                <span className="text-[#8A939B]">Current Speed</span>
                <span className="font-mono font-bold text-white">{j.speed != null ? `${j.speed} km/h` : '--'}</span>
              </div>
              <div className="flex justify-between border-b border-[#1E2530] py-1">
                <span className="text-[#8A939B]">Free Flow Speed</span>
                <span className="font-mono font-bold text-cyan-400">{j.freeFlowSpeed != null ? `${j.freeFlowSpeed} km/h` : '--'}</span>
              </div>
              <div className="flex justify-between border-b border-[#1E2530] py-1">
                <span className="text-[#8A939B]">Current Travel Time</span>
                <span className="font-mono font-bold text-white">{j.travelTime != null ? `${j.travelTime} s` : '--'}</span>
              </div>
              <div className="flex justify-between border-b border-[#1E2530] py-1">
                <span className="text-[#8A939B]">Free Flow Time</span>
                <span className="font-mono font-bold text-white">{j.freeFlowTravelTime != null ? `${j.freeFlowTravelTime} s` : '--'}</span>
              </div>
              <div className="flex justify-between border-b border-[#1E2530] py-1">
                <span className="text-[#8A939B]">TomTom Telemetry Score</span>
                <span className="font-mono font-bold text-emerald-400">{confidenceScore}%</span>
              </div>
              <div className="flex justify-between py-1 text-[10px] text-[#5A636B] font-mono">
                <span>Last Refreshed:</span>
                <span className="text-[#8A939B] font-bold">{j.lastUpdated || 'JUST NOW'}</span>
              </div>
            </div>
          </div>

          {/* Emergency Corridor Status for Junction */}
          {isEmergencyRouteJunction && (
            <div className="bg-red-950/30 p-4 rounded-xl border border-red-500/40 space-y-2 shadow-lg">
              <div className="flex items-center gap-2 text-red-400 font-bold text-xs">
                <Ambulance className="w-4 h-4 animate-pulse" />
                <span>EMERGENCY CORRIDOR ON ROUTE</span>
              </div>
              <p className="text-[11px] text-[#B8BEC4]">
                Ambulance {ambulance.id} corridor active via {j.id}. Green phase extended.
              </p>
              {isCurrentAmbulanceNode && (
                <div className="px-2 py-1 rounded bg-red-500 text-white font-mono text-[10px] font-bold text-center animate-pulse">
                  AMBULANCE AT JUNCTION NOW
                </div>
              )}
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: CURRENTLY APPLIED SIGNAL DECISION & CONTROLLER OVERRIDE (8 Cols) */}
        <div className="space-y-4 xl:col-span-8">

          {/* CURRENTLY APPLIED SIGNAL DECISION CARD */}
          <div className="bg-[#14181C] p-5 rounded-xl border border-[#242A30] space-y-5 shadow-xl">

            {/* Header / Mode Indicator */}
            <div className="flex items-center justify-between border-b border-[#242A30] pb-3">
              <div>
                <span className="text-[9px] font-bold text-[#5A636B] uppercase tracking-wider font-mono">
                  Current signal decision
                </span>
                <p className="mt-1 text-sm font-semibold text-slate-700">{j.id} · Chennai Metro · {j.name}</p>
                <h3 className="text-base font-bold text-white flex items-center gap-2 mt-0.5">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Signal:</span>
                  <span className={`px-3 py-1 rounded text-xs font-mono font-extrabold border ${
                    j.signal === 'GREEN' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' :
                    j.signal === 'RED' ? 'bg-red-500/20 text-red-400 border-red-500/40' :
                    j.signal === 'YELLOW' || j.signal === 'AMBER' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' :
                    'bg-purple-500/20 text-purple-400 border-purple-500/40'
                  }`}>
                    ● {j.signal}
                  </span>
                </h3>
              </div>

              <div className="text-right flex items-center gap-3">
                {/* AI Control Label */}
                <div className="text-right">
                  <div className="text-[9px] text-[#5A636B] font-mono">STATUS</div>
                  <div className={`px-3 py-1 rounded text-xs font-mono font-extrabold border ${
                    isAIControl ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' :
                    isManual ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' :
                    'bg-purple-500/15 text-purple-300 border-purple-500/30'
                  }`}>
                    {isAIControl ? 'AI CONTROL ACTIVE' : isManual ? 'MANUAL OVERRIDE' : 'FALLBACK FIXED-TIME'}
                  </div>
                </div>
              </div>
            </div>

            {/* SIGNAL TIMING METRICS (Active phase, Green/Red durations, Remaining time) */}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-[#0E1114] p-3 rounded-xl border border-[#1E2530]">
                <div className="text-[9px] text-[#5A636B] font-mono font-bold uppercase">Current Phase</div>
                <div className="text-xs font-bold text-white mt-1 truncate" title={j.currentPhase}>
                  {j.currentPhase || 'Phase 1: Main Arterial'}
                </div>
              </div>

              <div className="bg-[#0E1114] p-3 rounded-xl border border-[#1E2530]">
                <div className="text-[9px] text-[#5A636B] font-mono font-bold uppercase">Green Duration</div>
                <div className="text-lg font-data font-bold text-emerald-400 mt-0.5">
                  {j.greenDuration || 45} <span className="text-xs text-[#5A636B]">sec</span>
                </div>
              </div>

              <div className="bg-[#0E1114] p-3 rounded-xl border border-[#1E2530]">
                <div className="text-[9px] text-[#5A636B] font-mono font-bold uppercase">Red Duration</div>
                <div className="text-lg font-data font-bold text-red-400 mt-0.5">
                  {j.redDuration || 35} <span className="text-xs text-[#5A636B]">sec</span>
                </div>
              </div>

              <div className="bg-[#0E1114] p-3 rounded-xl border border-amber-500/30 bg-amber-500/5">
                <div className="text-[9px] text-amber-400 font-mono font-bold uppercase flex items-center justify-between">
                  <span>Remaining Time</span>
                  <Clock className="w-3 h-3 text-amber-400 animate-spin" />
                </div>
                <div className="text-lg font-data font-bold text-amber-300 mt-0.5">
                  {j.remainingTime ?? '—'} <span className="text-xs text-amber-400/80">sec</span>
                </div>
              </div>
            </div>

            {/* RATIONALE & EXPECTED IMPACT */}
            <div className="bg-[#0E1114] p-4 rounded-xl border border-[#1E2530] space-y-3">
              <div>
                <div className="text-[10px] font-mono font-bold text-[#737B82] uppercase tracking-wider mb-1">
                  Reason
                </div>
                <p className="text-sm text-slate-800 leading-relaxed">
                  {signalDecisionReason}
                </p>
              </div>

              <div className="pt-2 border-t border-[#1E2530] flex items-center justify-between text-[11px]">
                <span className="text-[#5A636B] font-mono">Expected / Observed Impact:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {j.expectedImpact || '-28% Queue Delay • +14 km/h Corridor Speed'}
                </span>
              </div>
            </div>

            {/* TRAFFIC FACTORS USED MATRIX */}
            <div className="space-y-2">
              <div className="text-[10px] font-mono font-bold text-[#737B82] uppercase tracking-wider flex items-center justify-between">
                <span>Traffic Factors Evaluated by AI Engine</span>
                <SourceBadge source="DERIVED" label="LIVE FACTORS" />
              </div>

              <div className="grid grid-cols-3 gap-2.5 text-[10px]">
                <div className="bg-[#0E1114] p-2.5 rounded-lg border border-[#1E2530]">
                  <div className="text-[#5A636B]">Queue Length</div>
                  <div className="font-mono font-bold text-white mt-0.5">{j.factors?.queue || `${j.queue} vehicles`}</div>
                </div>

                <div className="bg-[#0E1114] p-2.5 rounded-lg border border-[#1E2530]">
                  <div className="text-[#5A636B]">Avg Waiting Time</div>
                  <div className="font-mono font-bold text-white mt-0.5">{j.factors?.waitingTime || `${Math.round(j.queue * 3.2)}s avg wait`}</div>
                </div>

                <div className="bg-[#0E1114] p-2.5 rounded-lg border border-[#1E2530]">
                  <div className="text-[#5A636B]">Traffic Density</div>
                  <div className="font-mono font-bold text-white mt-0.5">{j.factors?.density || `${Math.round((j.vehicles / 95) * 100)}% capacity`}</div>
                </div>

                <div className="bg-[#0E1114] p-2.5 rounded-lg border border-[#1E2530]">
                  <div className="text-[#5A636B]">Traffic Flow Rate</div>
                  <div className="font-mono font-bold text-white mt-0.5">{j.factors?.flow || `${j.flow || 38} v/min`}</div>
                </div>

                <div className="bg-[#0E1114] p-2.5 rounded-lg border border-[#1E2530]">
                  <div className="text-[#5A636B]">Emergency Priority</div>
                  <div className={`font-mono font-bold mt-0.5 ${isEmergencyRouteJunction ? 'text-red-400' : 'text-emerald-400'}`}>
                    {j.factors?.emergencyPriority || (isEmergencyRouteJunction ? 'HIGH (+40%)' : 'NORMAL (0%)')}
                  </div>
                </div>

                <div className="bg-[#0E1114] p-2.5 rounded-lg border border-[#1E2530]">
                  <div className="text-[#5A636B]">Downstream Capacity</div>
                  <div className="font-mono font-bold text-emerald-400 mt-0.5">{j.factors?.downstreamCap || `${j.downstreamCapacity}% available`}</div>
                </div>
              </div>
            </div>

            {/* CONTROLLER OVERRIDE ACTION PANEL */}
            <div className="pt-3 border-t border-[#242A30] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    Controller Override Options
                  </h4>
                  <p className="text-[10px] text-[#737B82]">
                    Controller intervention is an exception workflow. Normal AI decisions are applied automatically.
                  </p>
                </div>

                <button
                  onClick={() => setShowOverrideForm(!showOverrideForm)}
                  className="px-3 py-1.5 rounded-lg bg-[#1E2530] hover:bg-[#283240] text-amber-400 font-bold text-[11px] font-mono border border-amber-500/30 transition-colors flex items-center gap-1.5"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>{showOverrideForm ? 'Hide Manual Settings' : 'Override AI Decision'}</span>
                </button>
              </div>

              {/* OVERRIDE BUTTONS BAR */}
              <div className="grid grid-cols-3 gap-3">

                {/* 1. Set Manual Signal Timing */}
                <button
                  onClick={() => handleManualSetSignal('GREEN')}
                  className="py-2.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-bold text-xs transition-all text-center flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>SET MANUAL GREEN</span>
                </button>

                {/* 2. Switch to Normal / Fallback Timing */}
                <button
                  onClick={handleSwitchFallback}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs transition-all text-center flex items-center justify-center gap-2 border ${
                    isFallback
                      ? 'bg-purple-600 text-white border-purple-400 shadow-glow'
                      : 'bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  <span>{isFallback ? 'FALLBACK ACTIVE (60s/60s)' : 'SWITCH TO FALLBACK (60s/60s)'}</span>
                </button>

                {/* 3. Restore AI Control */}
                <button
                  onClick={handleRestoreAI}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs transition-all text-center flex items-center justify-center gap-2 border ${
                    isAIControl
                      ? 'bg-emerald-500 text-black border-emerald-400 shadow-glow'
                      : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>{isAIControl ? 'AI CONTROL ACTIVE' : 'RESTORE AI CONTROL'}</span>
                </button>
              </div>

              {/* CUSTOM MANUAL TIMING FORM (Expands when clicked) */}
              {showOverrideForm && (
                <div className="bg-[#0E1114] p-4 rounded-xl border border-amber-500/30 space-y-3">
                  <div className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider">
                    Configure Manual Signal Durations
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-[#737B82] block mb-1">Manual Green Duration (seconds)</label>
                      <input
                        type="number"
                        min="10"
                        max="180"
                        value={customGreenInput}
                        onChange={e => setCustomGreenInput(e.target.value)}
                        className="w-full bg-[#14181C] border border-[#242A30] rounded-lg px-3 py-1.5 text-xs text-white font-mono outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-[#737B82] block mb-1">Manual Red Duration (seconds)</label>
                      <input
                        type="number"
                        min="10"
                        max="180"
                        value={customRedInput}
                        onChange={e => setCustomRedInput(e.target.value)}
                        className="w-full bg-[#14181C] border border-[#242A30] rounded-lg px-3 py-1.5 text-xs text-white font-mono outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleManualSetSignal('GREEN')}
                      className="px-4 py-1.5 rounded-lg bg-emerald-500 text-black font-extrabold text-xs font-mono"
                    >
                      Apply Manual GREEN
                    </button>
                    <button
                      onClick={() => handleManualSetSignal('RED')}
                      className="px-4 py-1.5 rounded-lg bg-red-500 text-white font-extrabold text-xs font-mono"
                    >
                      Apply Manual RED
                    </button>
                  </div>
                </div>
              )}

            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

export default JunctionControlTab;
