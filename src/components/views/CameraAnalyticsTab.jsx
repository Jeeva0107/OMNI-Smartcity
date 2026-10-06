import React, { useState, useEffect } from "react";
import { useTraffic } from "../../context/TrafficContext";
import { SourceBadge } from "../map/GeoMap";
import { JunctionModal } from "../map/CityMap";
import { cameraService } from "../../services/apiServices";
import { Camera, Maximize2, Video } from "lucide-react";
import trafficSignalVideo from "../../assets/traffic-signal-demo.mp4";

// Status colour tokens
const STATUS_STYLES = {
  SMOOTH:   { text: "text-green-800",  bg: "bg-green-50 border-green-200",    dot: "bg-green-700" },
  MODERATE: { text: "text-amber-800",  bg: "bg-amber-50 border-amber-200",    dot: "bg-amber-700" },
  HIGH:     { text: "text-orange-800", bg: "bg-orange-50 border-orange-200",  dot: "bg-orange-700" },
  CRITICAL: { text: "text-red-800",    bg: "bg-red-50 border-red-200",        dot: "bg-red-700" },
  OFFLINE:  { text: "text-slate-700",  bg: "bg-slate-50 border-slate-200",    dot: "bg-slate-600" },
};

const statusStyle = (s) => STATUS_STYLES[s] || STATUS_STYLES.SMOOTH;

const fmtConf = (c) => {
  if (c == null) return "--";
  if (typeof c === "number") return c <= 1 ? `${Math.round(c * 100)}%` : `${Math.round(c)}%`;
  return `${c}`;
};

// Derived metric row helper
const Row = ({ label, value, valueColor = "#172554", badge }) => (
  <div className="flex items-center justify-between border-b border-slate-200 py-1 text-[10px]">
    <div className="flex items-center gap-1.5">
      <span className="text-slate-600">{label}</span>
      {badge && <SourceBadge source={badge} />}
    </div>
    <span className="font-mono font-bold" style={{ color: valueColor }}>{value}</span>
  </div>
);

// Speed ratio / traffic load bar (Derived)
const DerivedSpeedBar = ({ current, freeFlow }) => {
  if (!freeFlow || !current) return null;
  const pct = Math.min(100, Math.round((current / freeFlow) * 100));
  const color = pct >= 85 ? "#15803D" : pct >= 65 ? "#B45309" : pct >= 40 ? "#C2410C" : "#B91C1C";
  return (
    <div className="mt-2 border-t border-slate-200 pt-1">
      <div className="mb-1 flex items-center justify-between text-[9px] text-slate-600">
        <span className="flex items-center gap-1">
          <span>Speed Ratio</span>
          <SourceBadge source="DERIVED" />
        </span>
        <span style={{ color }} className="font-mono font-bold">{pct}%</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-slate-100">
        <div className="h-1 rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
};

// TomTom Traffic Perception Card (for CAM-02 to CAM-12)
const TomTomIntelCard = ({ junction, tomtomStatus }) => {
  const isLive = junction?.tomtomStatus === "TOMTOM_LIVE" || junction?.dataSource === "TOMTOM_LIVE";
  const st = statusStyle(junction?.status);
  const globalLive = tomtomStatus?.status === "TOMTOM_LIVE";
  const incidentCount = tomtomStatus?.incidentsCount ?? 0;

  // Derived delay
  const delaySec = (junction?.travelTime && junction?.freeFlowTravelTime)
    ? Math.max(0, junction.travelTime - junction.freeFlowTravelTime)
    : null;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white p-3">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${isLive ? 'bg-blue-700 pulse-dot' : 'bg-slate-500'}`} />
          <span className={`text-[10px] font-mono font-bold ${st.text}`}>
            {junction?.status ?? "SMOOTH"}
          </span>
        </div>
        <SourceBadge source={isLive ? "TOMTOM_LIVE" : "SIMULATED"} />
      </div>

      <div className="flex-1 space-y-0.5 overflow-y-auto py-1">
        <Row label="Current Speed" value={junction?.speed != null ? `${junction.speed} km/h` : "--"} valueColor="#172554" />
        <Row label="Free Flow Speed" value={junction?.freeFlowSpeed != null ? `${junction.freeFlowSpeed} km/h` : "--"} valueColor="#1D4ED8" />
        <Row label="Travel Time" value={junction?.travelTime != null ? `${junction.travelTime} s` : "--"} />
        <Row label="Free Flow Time" value={junction?.freeFlowTravelTime != null ? `${junction.freeFlowTravelTime} s` : "--"} />
        <Row label="Confidence" value={fmtConf(junction?.confidence)} valueColor="#15803D" />
        <Row label="Road Closure" value={junction?.roadClosure ? "CLOSED" : "OPEN"} valueColor={junction?.roadClosure ? "#B91C1C" : "#15803D"} />
        {delaySec !== null && (
          <Row label="Derived Delay" value={`+${delaySec} s`} valueColor={delaySec > 20 ? "#C2410C" : "#15803D"} badge="DERIVED" />
        )}
        {globalLive && (
          <Row label="Incidents" value={incidentCount} valueColor={incidentCount > 0 ? "#B45309" : "#475569"} />
        )}
        <DerivedSpeedBar current={junction?.speed} freeFlow={junction?.freeFlowSpeed} />
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 pt-1 font-mono text-[9px] text-slate-600">
        <span>UPDATED: {junction?.lastUpdated || "JUST NOW"}</span>
        <SourceBadge source="UNAVAILABLE" label="NO DIRECT VIDEO" />
      </div>
    </div>
  );
};

const CAMERA_DEFS = [
  { id: "CAM-01", junctionId: "J1",  name: "Kathipara Flyover Junction",      isRealYolo: true  },
  { id: "CAM-02", junctionId: "J2",  name: "Gemini Circle",                   isRealYolo: false },
  { id: "CAM-03", junctionId: "J3",  name: "Koyambedu Flyover",                isRealYolo: false },
  { id: "CAM-04", junctionId: "J4",  name: "Madhya Kailash • OMR Entry",     isRealYolo: false },
  { id: "CAM-05", junctionId: "J5",  name: "Tidel Park • South Hub",         isRealYolo: false },
  { id: "CAM-06", junctionId: "J6",  name: "Velachery Vijaya Nagar Flyover", isRealYolo: false },
  { id: "CAM-07", junctionId: "J7",  name: "RGGGH ER Gate • Central",        isRealYolo: false },
  { id: "CAM-08", junctionId: "J8",  name: "Saidapet Signal • South",        isRealYolo: false },
  { id: "CAM-09", junctionId: "J9",  name: "Sholinganallur Junction",        isRealYolo: false },
  { id: "CAM-10", junctionId: "J10", name: "Porur Flyover • West",           isRealYolo: false },
  { id: "CAM-11", junctionId: "J11", name: "Vadapalani Signal Hub",          isRealYolo: false },
  { id: "CAM-12", junctionId: "J12", name: "Chennai Port Gate",              isRealYolo: false },
];

export const CameraAnalyticsTab = () => {
  const {
    junctions,
    wsConnected,
    backendOnline,
    backendError,
    tomtomStatus,
    setSelectedJunctionId,
    setActiveTab,
  } = useTraffic();
  const [selectedJunctionForModal, setSelectedJunctionForModal] = useState(null);
  const [realYoloData, setRealYoloData] = useState(null);
  const [videoLoadError, setVideoLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchRealYolo = async () => {
      try {
        const data = await cameraService.getCameraDetections("CAM-01");
        if (active && data) {
          setRealYoloData(data);
        }
      } catch (err) {
        if (active) {
          setRealYoloData({ status: "ERROR", source: "real_yolo", error: err.message || "YOLO Backend unreachable" });
        }
      }
    };
    fetchRealYolo();
    const interval = setInterval(fetchRealYolo, 3000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  const handleOpenJunction = (junctionId) => {
    setSelectedJunctionId(junctionId);
    setActiveTab("junction_control");
  };

  const isTomTomGlobal = tomtomStatus?.status === "TOMTOM_LIVE";
  const liveBackendConnected = backendOnline && wsConnected && !backendError;
  const primaryCamera = CAMERA_DEFS[0];
  const primaryJunction = junctions.find(junction => junction.id === primaryCamera.junctionId);
  const rawSignal = String(primaryJunction?.signal || primaryJunction?.currentPhase || "RED").toUpperCase();
  const signal = rawSignal.includes("GREEN") ? "GREEN" : rawSignal.includes("YELLOW") || rawSignal.includes("AMBER") ? "AMBER" : "RED";
  const signalColor = signal === "GREEN" ? "#16A34A" : signal === "AMBER" ? "#D97706" : "#DC2626";
  const detectionStatus = realYoloData?.status === "OK"
    ? "YOLO DETECTION ACTIVE"
    : realYoloData?.status === "ERROR"
      ? "DETECTION BACKEND OFFLINE"
      : "CONNECTING TO DETECTION";
  const detectedVehicles = realYoloData?.detectionsCount ?? primaryJunction?.vehicles ?? 0;

  return (
    <div className="light-dashboard flex-1 min-h-0 overflow-y-auto space-y-4 bg-[var(--page-bg)] p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-violet-200 bg-violet-50">
            <Camera className="h-5 w-5 text-violet-700" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Traffic Perception &amp; Camera Analytics — 12 Monitored Junctions
            </h3>
            <p className="mt-0.5 text-xs text-slate-600">
              CAM-01 local traffic video with live detection telemetry · CAM-02–CAM-12 junction analytics
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[10px] font-bold text-violet-800">YOLO11n</span>
          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${liveBackendConnected ? "border-green-200 bg-green-50 text-green-800" : backendError ? "border-red-200 bg-red-50 text-red-800" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
            {liveBackendConnected ? "LIVE DATA CONNECTED" : backendError ? "BACKEND ERROR" : "CONNECTING TO BACKEND"}
          </span>
          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${isTomTomGlobal ? "border-blue-200 bg-blue-50 text-blue-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
            {isTomTomGlobal ? "TOMTOM LIVE" : "LOCAL TRAFFIC DATA"}
          </span>
        </div>
      </div>

      <section className="camera-grid">
        <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-slate-900">{primaryCamera.id} · {primaryCamera.name}</h2>
              <p className="mt-0.5 text-xs text-slate-600">{primaryJunction?.name || primaryCamera.junctionId}</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-800">
              <Video className="h-3.5 w-3.5" /> LOCAL TRAFFIC VIDEO
            </span>
          </div>
          <div className="relative aspect-video max-h-[260px] overflow-hidden bg-slate-900">
            {videoLoadError ? (
              <div className="flex h-full min-h-48 items-center justify-center px-5 text-center text-sm font-semibold text-white">
                Local camera video could not be loaded.
              </div>
            ) : (
              <video
                className="h-full w-full object-cover"
                src={trafficSignalVideo}
                controls
                playsInline
                preload="metadata"
                aria-label={`${primaryCamera.name} local traffic signal video`}
                onError={() => setVideoLoadError(true)}
              />
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs">
            <span className="text-slate-700">Local project video · standard play, pause, mute, and seek controls</span>
            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${
              realYoloData?.status === "OK"
                ? "border-green-200 bg-green-50 text-green-800"
                : realYoloData?.status === "ERROR"
                  ? "border-red-200 bg-red-50 text-red-800"
                  : "border-amber-200 bg-amber-50 text-amber-800"
            }`}>
              {detectionStatus}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-2 p-4 text-xs sm:grid-cols-3">
            <div><span className="text-slate-600">Traffic severity</span><p className="font-semibold text-slate-900">{primaryJunction?.status || "UNKNOWN"}</p></div>
            <div><span className="text-slate-600">Current speed</span><p className="font-semibold text-slate-900">{primaryJunction?.speed ?? "—"} km/h</p></div>
            <div><span className="text-slate-600">Free-flow speed</span><p className="font-semibold text-slate-900">{primaryJunction?.freeFlowSpeed ?? "—"} km/h</p></div>
            <div><span className="text-slate-600">Travel time</span><p className="font-semibold text-slate-900">{primaryJunction?.travelTime ?? "—"} s</p></div>
            <div><span className="text-slate-600">Confidence</span><p className="font-semibold text-slate-900">{fmtConf(primaryJunction?.confidence)}</p></div>
            <div><span className="text-slate-600">Updated</span><p className="font-semibold text-slate-900">{primaryJunction?.lastUpdated || "JUST NOW"}</p></div>
            <div><span className="text-slate-600">Signal</span><p className="font-semibold" style={{ color: signalColor }}>{signal} · {primaryJunction?.remainingTime ?? "—"} s</p></div>
            <div><span className="text-slate-600">Detected vehicles</span><p className="font-semibold text-slate-900">{detectedVehicles}</p></div>
            <div><span className="text-slate-600">Data source</span><p className="font-semibold text-slate-900">{primaryJunction?.dataSource || (liveBackendConnected ? "Live backend" : "Simulation fallback/unavailable")}</p></div>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-slate-200 p-3">
            <p className="min-w-0 truncate text-xs text-slate-600">
              {realYoloData?.status === "OK"
                ? `Detection active · ${realYoloData.source || "YOLO"}${realYoloData.inferenceMs != null ? ` · ${realYoloData.inferenceMs} ms` : ""}`
                : realYoloData?.error || "Detection telemetry will appear when the backend is available."}
            </p>
            <button
              type="button"
              onClick={() => handleOpenJunction(primaryCamera.junctionId)}
              className="shrink-0 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-800 hover:bg-violet-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              Open controls
            </button>
          </div>
        </article>

        {CAMERA_DEFS.filter(cam => cam.id !== "CAM-01").map((cam) => {
          const junctionObj = junctions.find(j => j.id === cam.junctionId);
          const camStatus   = junctionObj?.status ?? "UNKNOWN";
          const st          = statusStyle(camStatus);

          return (
            <article
              key={cam.id}
              onClick={() => handleOpenJunction(cam.junctionId)}
              className="cursor-pointer group flex min-h-[260px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:border-violet-300 hover:shadow-md"
            >
              <div className="relative min-h-[220px] flex-1 overflow-hidden bg-slate-50">
                <TomTomIntelCard junction={junctionObj} tomtomStatus={tomtomStatus} />
                <div className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded border border-slate-200 bg-white/95 px-2 py-1 text-xs font-semibold text-slate-800 opacity-0 transition-all group-hover:opacity-100">
                  <Maximize2 className="h-3.5 w-3.5 text-violet-700" />
                  <span>Inspect</span>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 bg-white p-3">
                <div className="min-w-0">
                  <h4 className="truncate text-xs font-bold text-slate-900">{cam.id} · {cam.name}</h4>
                  <div className="mt-0.5 flex items-center gap-2 text-[10px] text-slate-600">
                    <span>{junctionObj?.name || cam.junctionId}</span>
                    {junctionObj?.speed != null && (
                      <span className="font-mono font-bold text-blue-800">{junctionObj.speed} km/h</span>
                    )}
                  </div>
                </div>
                <span className={`shrink-0 px-2 py-0.5 text-[9px] font-bold rounded border ${st.bg} ${st.text}`}>
                  {camStatus}
                </span>
              </div>
            </article>
          );
        })}
      </section>

      {/* MODAL */}
      {selectedJunctionForModal && (
        <JunctionModal
          junction={selectedJunctionForModal}
          onClose={() => setSelectedJunctionForModal(null)}
        />
      )}
    </div>
  );
};

export default CameraAnalyticsTab;
