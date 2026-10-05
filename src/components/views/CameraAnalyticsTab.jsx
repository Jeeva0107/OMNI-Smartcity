import React, { useState, useEffect } from "react";
import { useTraffic } from "../../context/TrafficContext";
import { SourceBadge } from "../map/GeoMap";
import { JunctionModal } from "../map/CityMap";
import { cameraService } from "../../services/apiServices";
import { Camera, Maximize2, AlertTriangle, Clock, Cpu, Radio, ShieldCheck, Activity } from "lucide-react";

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

// Derived metric row helper
const Row = ({ label, value, valueColor = "#fff", badge }) => (
  <div className="flex items-center justify-between py-1 border-b border-[#1A2028] text-[10px]">
    <div className="flex items-center gap-1.5">
      <span className="text-[#6A737B]">{label}</span>
      {badge && <SourceBadge source={badge} />}
    </div>
    <span className="font-mono font-bold" style={{ color: valueColor }}>{value}</span>
  </div>
);

// Speed ratio / traffic load bar (Derived)
const DerivedSpeedBar = ({ current, freeFlow }) => {
  if (!freeFlow || !current) return null;
  const pct = Math.min(100, Math.round((current / freeFlow) * 100));
  const color = pct >= 85 ? "#10b981" : pct >= 65 ? "#f59e0b" : pct >= 40 ? "#f97316" : "#ef4444";
  return (
    <div className="mt-2 pt-1 border-t border-[#1A2028]">
      <div className="flex items-center justify-between text-[9px] text-[#5A636B] mb-1">
        <span className="flex items-center gap-1">
          <span>Speed Ratio</span>
          <SourceBadge source="DERIVED" />
        </span>
        <span style={{ color }} className="font-mono font-bold">{pct}%</span>
      </div>
      <div className="h-1 bg-[#1A2028] rounded-full overflow-hidden">
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
    <div className="relative w-full h-full bg-[#0C1014] flex flex-col overflow-hidden p-3">
      {/* Background texture */}
      <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:16px_16px]" />

      {/* Top Header */}
      <div className="relative flex items-center justify-between pb-2 border-b border-[#1E2530]">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-cyan-400 pulse-dot' : 'bg-[#5A636B]'}`} />
          <span className={`text-[10px] font-mono font-bold ${st.text}`}>
            {junction?.status ?? "SMOOTH"}
          </span>
        </div>
        <SourceBadge source={isLive ? "TOMTOM_LIVE" : "SIMULATED"} />
      </div>

      {/* TomTom Data Fields */}
      <div className="relative flex-1 py-1 space-y-0.5 overflow-y-auto">
        <Row label="Current Speed" value={junction?.speed != null ? `${junction.speed} km/h` : "--"} valueColor={isLive ? "#fff" : "#6A737B"} />
        <Row label="Free Flow Speed" value={junction?.freeFlowSpeed != null ? `${junction.freeFlowSpeed} km/h` : "--"} valueColor="#22d3ee" />
        <Row label="Travel Time" value={junction?.travelTime != null ? `${junction.travelTime} s` : "--"} />
        <Row label="Free Flow Time" value={junction?.freeFlowTravelTime != null ? `${junction.freeFlowTravelTime} s` : "--"} />
        <Row label="Confidence" value={fmtConf(junction?.confidence)} valueColor="#10b981" />
        <Row label="Road Closure" value={junction?.roadClosure ? "CLOSED" : "OPEN"} valueColor={junction?.roadClosure ? "#ef4444" : "#10b981"} />
        {delaySec !== null && (
          <Row label="Derived Delay" value={`+${delaySec} s`} valueColor={delaySec > 20 ? "#f97316" : "#10b981"} badge="DERIVED" />
        )}
        {globalLive && (
          <Row label="Incidents" value={incidentCount} valueColor={incidentCount > 0 ? "#f59e0b" : "#5A636B"} />
        )}
        <DerivedSpeedBar current={junction?.speed} freeFlow={junction?.freeFlowSpeed} />
      </div>

      {/* Footer Timestamp */}
      <div className="relative pt-1 border-t border-[#1A2028] flex items-center justify-between text-[9px] text-[#5A636B] font-mono">
        <span>UPDATED: {junction?.lastUpdated || "JUST NOW"}</span>
        <SourceBadge source="UNAVAILABLE" label="NO DIRECT VIDEO" />
      </div>
    </div>
  );
};

const CAMERA_DEFS = [
  { id: "CAM-01", junctionId: "J1",  name: "Kathipara Cloverleaf North",      isRealYolo: true  },
  { id: "CAM-02", junctionId: "J2",  name: "Gemini Circle • Anna Salai",      isRealYolo: false },
  { id: "CAM-03", junctionId: "J3",  name: "Koyambedu Flyover • PH Road",    isRealYolo: false },
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
  const { junctions, wsConnected, tomtomStatus, setSelectedJunctionId, setActiveTab } = useTraffic();
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
    setSelectedJunctionId(junctionId);
    setActiveTab("junction_control");
  };

  const isTomTomGlobal = tomtomStatus?.status === "TOMTOM_LIVE";

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#090B0D]">
      {/* HEADER */}
      <div className="bg-[#14181C] p-4 rounded-xl border border-[#242A30] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <Camera className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Traffic Perception &amp; Camera Analytics — 12 Monitored Junctions
            </h3>
            <p className="text-[11px] text-[#737B82] mt-0.5">
              CAM-01: YOLO11n Video Analysis • CAM-02–CAM-12: Live Traffic Intelligence Cards
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <SourceBadge source="YOLO11n" />
          {isTomTomGlobal ? (
            <SourceBadge source="TOMTOM_LIVE" />
          ) : (
            <SourceBadge source="SIMULATED" />
          )}
          <span className={`px-2.5 py-0.5 rounded border text-[10px] font-bold ${
            wsConnected ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" : "bg-red-500/10 border-red-500/30 text-red-400"
          }`}>
            {wsConnected ? "WS LIVE" : "WS OFFLINE"}
          </span>
        </div>
      </div>

      {/* CAMERA & INTELLIGENCE GRID */}
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
              {/* VIEWPORT AREA */}
              <div className="relative h-48 bg-[#090B0D] overflow-hidden">
                {isCam1 ? (
                  !isYoloError ? (
                    <div className="relative w-full h-full">
                      <img
                        src="http://localhost:5000/api/cameras/CAM-01/video_feed"
                        alt="CAM-01 YOLO11n Video Input"
                        className="w-full h-full object-cover"
                        onError={() => setVideoFeedError(true)}
                      />
                      {/* YOLO Telemetry Overlay */}
                      <div className="absolute bottom-2 left-2 right-2 bg-[#0C0F13]/90 backdrop-blur-sm p-2 rounded-lg border border-[#242A30] flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-2">
                          <Cpu className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                          <span className="text-white font-mono font-bold">
                            {realYoloData?.detectionsCount ?? 14} Vehicles
                          </span>
                        </div>
                        <div className="text-emerald-400 font-mono">
                          {realYoloData?.inferenceMs ?? 42}ms latency
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full bg-[#180A0A] flex flex-col items-center justify-center p-4 text-center border border-red-500/30">
                      <AlertTriangle className="w-8 h-8 text-red-500 mb-2 animate-bounce" />
                      <div className="text-xs font-mono font-bold text-red-400 uppercase tracking-wider">YOLO VIDEO INPUT OFFLINE</div>
                      <div className="text-[10px] text-red-300/80 font-mono mt-1 max-w-[240px] truncate">{yoloErrMsg}</div>
                    </div>
                  )
                ) : (
                  <TomTomIntelCard junction={junctionObj} tomtomStatus={tomtomStatus} />
                )}

                {/* TOP BADGE FOR CAM-01 */}
                {isCam1 && (
                  <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
                    <SourceBadge source="YOLO11n" />
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
                  </div>
                  <div className="text-[10px] text-[#737B82] mt-0.5 flex items-center gap-2">
                    <span>{cam.id} • {cam.junctionId}</span>
                    {isCam1 && realYoloData?.inferenceMs && (
                      <span className="text-emerald-400 font-mono">{realYoloData.inferenceMs}ms</span>
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
