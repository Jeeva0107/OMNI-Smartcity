import React, { useState, useEffect } from "react";
import { useTraffic } from "../../context/TrafficContext";
import { JunctionModal } from "../map/CityMap";
import { cameraService } from "../../services/apiServices";
import { Camera, Maximize2, AlertTriangle, Clock } from "lucide-react";

// Status colour tokens
const STATUS_STYLES = {
  SMOOTH:   { text: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30", dot: "bg-emerald-400" },
  MODERATE: { text: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/30",     dot: "bg-amber-400"   },
  HIGH:     { text: "text-orange-400",  bg: "bg-orange-500/10 border-orange-500/30",   dot: "bg-orange-400"  },
  CRITICAL: { text: "text-red-400",     bg: "bg-red-500/10 border-red-500/30",         dot: "bg-red-400"     },
  OFFLINE:  { text: "text-[#5A636B]",  bg: "bg-[#1A2028] border-[#242A30]",           dot: "bg-[#5A636B]"   },
};
const statusStyle = (s) => STATUS_STYLES[s] || STATUS_STYLES.SMOOTH;
const fmtConf = (c) => {
  if (c == null) return "--";
  if (typeof c === "number") return c <= 1 ? `${Math.round(c * 100)}%` : `${Math.round(c)}%`;
  return `${c}`;
};

// Speed ratio bar
const SpeedBar = ({ current, freeFlow }) => {
  if (!freeFlow || !current) return null;
  const pct   = Math.min(100, Math.round((current / freeFlow) * 100));
  const color = pct >= 85 ? "#10b981" : pct >= 65 ? "#f59e0b" : pct >= 40 ? "#f97316" : "#ef4444";
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#5A636B", marginBottom: 2 }}>
        <span>Speed ratio</span>
        <span style={{ color, fontFamily: "monospace", fontWeight: 700 }}>{pct}%</span>
      </div>
      <div style={{ height: 4, background: "#1A2028", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ height: 4, width: `${pct}%`, background: color, borderRadius: 4, transition: "width 0.7s" }} />
      </div>
    </div>
  );
};

// Row helper inside TomTomIntelCard
const Row = ({ label, value, valueColor = "#fff" }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid #1A2028" }}>
    <span style={{ fontSize: 10, color: "#6A737B" }}>{label}</span>
    <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 11, color: valueColor }}>{value}</span>
  </div>
);

// TomTom Intelligence Card (replaces fake canvas for CAM-02 to CAM-12)
const TomTomIntelCard = ({ junction, tomtomStatus }) => {
  const isLive = junction?.tomtomStatus === "TOMTOM_LIVE" || junction?.dataSource === "TOMTOM_LIVE";
  const st = statusStyle(junction?.status);
  const globalLive = tomtomStatus?.status === "TOMTOM_LIVE";
  const incidentCount = tomtomStatus?.incidentsCount ?? 0;
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background: "#0C1014", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Subtle grid texture */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.04, pointerEvents: "none",
        backgroundImage: "linear-gradient(#06b6d4 1px,transparent 1px),linear-gradient(90deg,#06b6d4 1px,transparent 1px)",
        backgroundSize: "20px 20px"
      }} />
      {/* Status bar */}
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 12px", borderBottom: "1px solid #1E2530" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: isLive ? "#22d3ee" : "#5A636B", display: "inline-block" }} />
          <span style={{ fontSize: 9, fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.06em" }} className={st.text}>
            {junction?.status ?? "UNKNOWN"}
          </span>
        </div>
        {isLive ? (
          <span style={{ fontSize: 8, fontFamily: "monospace", fontWeight: 800, color: "#22d3ee", background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.3)", padding: "2px 6px", borderRadius: 4 }}>
            ? TOMTOM LIVE
          </span>
        ) : (
          <span style={{ fontSize: 8, fontFamily: "monospace", color: "#4A535B", background: "#141A20", border: "1px solid #242A30", padding: "2px 6px", borderRadius: 4 }}>
            SIMULATION FALLBACK
          </span>
        )}
      </div>
      {/* Data rows */}
      <div style={{ position: "relative", flex: 1, padding: "4px 12px", overflowY: "auto" }}>
        <Row label="Current Speed"      value={junction?.speed != null ? `${junction.speed} km/h` : "--"}           valueColor={isLive ? "#fff" : "#6A737B"} />
        <Row label="Free Flow Speed"    value={junction?.freeFlowSpeed != null ? `${junction.freeFlowSpeed} km/h` : "--"} valueColor="#22d3ee" />
        <Row label="Travel Time"        value={junction?.travelTime != null ? `${junction.travelTime} s` : "--"} />
        <Row label="Free Flow Time"     value={junction?.freeFlowTravelTime != null ? `${junction.freeFlowTravelTime} s` : "--"} />
        <Row label="Confidence"         value={fmtConf(junction?.confidence)} valueColor="#10b981" />
        <Row label="Road Closure"       value={junction?.roadClosure ? "CLOSED" : "OPEN"}  valueColor={junction?.roadClosure ? "#ef4444" : "#10b981"} />
        {globalLive && (
          <Row label="Active Incidents" value={incidentCount} valueColor={incidentCount > 0 ? "#f59e0b" : "#5A636B"} />
        )}
        <SpeedBar current={junction?.speed} freeFlow={junction?.freeFlowSpeed} />
      </div>
      {/* Timestamp footer */}
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", borderTop: "1px solid #1A2028" }}>
        <span style={{ fontSize: 9, fontFamily: "monospace", color: "#4A535B" }}>UPDATED: {junction?.lastUpdated ?? "--:--:--"}</span>
      </div>
    </div>
  );
};

const CAMERA_DEFS = [
  { id: "CAM-01", junctionId: "J1",  name: "Kathipara Cloverleaf North",      isRealYolo: true  },
  { id: "CAM-02", junctionId: "J2",  name: "Gemini Circle — Anna Salai",      isRealYolo: false },
  { id: "CAM-03", junctionId: "J3",  name: "Koyambedu Flyover — PH Road",    isRealYolo: false },
  { id: "CAM-04", junctionId: "J4",  name: "Madhya Kailash — OMR Entry",     isRealYolo: false },
  { id: "CAM-05", junctionId: "J5",  name: "Tidel Park — South Camera",      isRealYolo: false },
  { id: "CAM-06", junctionId: "J6",  name: "Velachery Vijaya Nagar Flyover", isRealYolo: false },
  { id: "CAM-07", junctionId: "J7",  name: "RGGGH ER Gate — Central",        isRealYolo: false },
  { id: "CAM-08", junctionId: "J8",  name: "Saidapet Signal — South",        isRealYolo: false },
  { id: "CAM-09", junctionId: "J9",  name: "Sholinganallur Junction",        isRealYolo: false },
  { id: "CAM-10", junctionId: "J10", name: "Porur Flyover — West",           isRealYolo: false },
  { id: "CAM-11", junctionId: "J11", name: "Vadapalani Signal Camera",       isRealYolo: false },
  { id: "CAM-12", junctionId: "J12", name: "Chennai Port Gate",              isRealYolo: false },
];

export const CameraAnalyticsTab = () => {
  const { junctions, wsConnected, tomtomStatus } = useTraffic();
  const [selectedJunctionForModal, setSelectedJunctionForModal] = useState(null);
  const [realYoloData, setRealYoloData] = useState(null);
  const [videoFeedError, setVideoFeedError] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchRealYolo = async () => {
      try {
        const data = await cameraService.getCameraDetections("CAM-01");
        if (active && data) {
          setRealYoloData(data);
          if (data.status === "OK") setVideoFeedError(false);
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
    const j = junctions.find(item => item.id === junctionId);
    if (j) setSelectedJunctionForModal(j);
  };

  const isTomTomGlobal = tomtomStatus?.status === "TOMTOM_LIVE";

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* HEADER */}
      <div className="bg-[#14181C] p-4 rounded-xl border border-[#242A30] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <Camera className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Traffic Perception &amp; Intelligence — 12 Junctions
            </h3>
            <p className="text-[11px] text-[#737B82] mt-0.5">
              CAM-01: YOLO11n video analysis&nbsp;&bull;&nbsp;CAM-02&#8594;CAM-12: TomTom live traffic intelligence
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="flex items-center gap-2 px-3 py-1 rounded bg-[#181D21] border border-emerald-500/30 text-emerald-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            YOLO11n ANALYSIS ACTIVE
          </span>
          {isTomTomGlobal ? (
            <span className="flex items-center gap-2 px-3 py-1 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              TOMTOM LIVE &middot; {tomtomStatus.junctionsUpdated}/12
            </span>
          ) : (
            <span className="flex items-center gap-2 px-3 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              TOMTOM FALLBACK
            </span>
          )}
          <span className={`flex items-center gap-2 px-3 py-1 rounded border font-bold ${
            wsConnected ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" : "bg-red-500/10 border-red-500/30 text-red-400"
          }`}>
            <span className={`w-2 h-2 rounded-full ${wsConnected ? "bg-cyan-400 animate-pulse" : "bg-red-400"}`} />
            {wsConnected ? "WS LIVE" : "WS OFFLINE"}
          </span>
        </div>
      </div>

      {/* CAMERA GRID */}
      <div className="grid grid-cols-3 gap-5">
        {CAMERA_DEFS.map((cam) => {
          const junctionObj = junctions.find(j => j.id === cam.junctionId);
          const isCam1      = cam.id === "CAM-01";
          const isYoloError = isCam1 && (realYoloData?.status === "ERROR" || videoFeedError);
          const yoloErrMsg  = realYoloData?.error || "YOLO Engine Offline";
          const camStatus   = isYoloError ? "OFFLINE" : (junctionObj?.status ?? "SMOOTH");
          const st          = statusStyle(camStatus);

          return (
            <div
              key={cam.id}
              onClick={() => handleOpenJunction(cam.junctionId)}
              className="bg-[#14181C] rounded-xl border border-[#242A30] hover:border-amber-500/40 transition-all overflow-hidden cursor-pointer group flex flex-col shadow-lg"
            >
              {/* VIDEO / INTEL VIEWPORT */}
              <div className="relative h-44 bg-[#090B0D] overflow-hidden">
                {isCam1 ? (
                  !isYoloError ? (
                    <img
                      src="http://localhost:5000/api/cameras/CAM-01/video_feed"
                      alt="CAM-01 YOLO11n Video Input"
                      className="w-full h-full object-cover"
                      onError={() => setVideoFeedError(true)}
                    />
                  ) : (
                    <div className="w-full h-full bg-[#180A0A] flex flex-col items-center justify-center p-4 text-center border border-red-500/30">
                      <AlertTriangle className="w-8 h-8 text-red-500 mb-2 animate-bounce" />
                      <div className="text-xs font-mono font-bold text-red-400 uppercase tracking-wider">YOLO OFFLINE</div>
                      <div className="text-[10px] text-red-300/80 font-mono mt-1 max-w-[240px] truncate">{yoloErrMsg}</div>
                    </div>
                  )
                ) : (
                  <TomTomIntelCard junction={junctionObj} tomtomStatus={tomtomStatus} />
                )}

                {/* TOP-LEFT BADGE — only for CAM-01; TomTomIntelCard has its own */}
                {isCam1 && (
                  <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
                    {isYoloError ? (
                      <span className="px-2 py-0.5 rounded bg-red-600 text-white text-[9px] font-mono font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-white" /> YOLO OFFLINE
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded bg-emerald-600 text-black text-[9px] font-mono font-extrabold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-black animate-pulse" />
                        YOLO11n &bull; VIDEO INPUT
                      </span>
                    )}
                  </div>
                )}

                {/* HOVER INSPECT */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all bg-[#0E1114]/90 px-2 py-1 rounded text-xs text-white border border-[#242A30] font-semibold flex items-center gap-1 z-10">
                  <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Inspect</span>
                </div>
              </div>

              {/* CARD FOOTER */}
              <div className="p-3 bg-[#14181C] flex items-center justify-between border-t border-[#242A30]">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-white truncate">{cam.name}</h4>
                    {isCam1 ? (
                      <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 font-mono font-bold">YOLO11n</span>
                    ) : (
                      <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 font-mono font-bold">TomTom</span>
                    )}
                  </div>
                  <div className="text-[10px] text-[#737B82] mt-0.5 flex items-center gap-2">
                    <span>{cam.id} &rarr; {cam.junctionId}</span>
                    {isCam1 && realYoloData?.inferenceMs && (
                      <span className="text-amber-400 font-mono">{realYoloData.inferenceMs}ms</span>
                    )}
                    {!isCam1 && junctionObj?.speed != null && (
                      <span className="text-cyan-400 font-mono font-bold">{junctionObj.speed} km/h</span>
                    )}
                  </div>
                </div>
                <span className={`shrink-0 px-2 py-0.5 text-[9px] font-bold rounded border ${st.bg} ${st.text}`}>
                  {isYoloError ? "OFFLINE" : camStatus}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* JUNCTION INSPECTION MODAL */}
      {selectedJunctionForModal && (
        <JunctionModal
          junction={selectedJunctionForModal}
          onClose={() => setSelectedJunctionForModal(null)}
        />
      )}
    </div>
  );
};
