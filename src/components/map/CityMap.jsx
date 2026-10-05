import React, { useState, useEffect } from 'react';
import { useTraffic } from '../../context/TrafficContext';
import { cameraService } from '../../services/apiServices';
import { GeoMap } from './GeoMap';
import {
  Ambulance,
  Building2,
  Camera,
  Layers,
  Maximize2,
  Minimize2,
  Navigation,
  Radio,
  Zap,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Compass,
  MapPin,
  Video,
  Activity,
  Sliders,
  ZoomIn,
  ZoomOut,
  RefreshCw
} from 'lucide-react';

export const CityMap = ({ onSelectJunction }) => {
  const { selectedRouteId, routes } = useTraffic();
  const selectedRoute = routes.find(r => r.id === selectedRouteId) || null;

  return (
    <div className="relative w-full h-full bg-[#090B0D] rounded-xl border border-[#242A30] overflow-hidden flex flex-col select-none shadow-2xl">
      <GeoMap
        onSelectJunction={onSelectJunction}
        showAmbulance={true}
        selectedRoute={selectedRoute}
      />
    </div>
  );
};

/**
 * RICH DETAILED JUNCTION INSPECTION MODAL
 * Includes: Location, Coordinates, Interactive Map Zoom, Live YOLO Feed, Vehicle Count,
 * Queue Length, Speed, Density, Signal State, AI Recommendation, Nearby Hospital, and Emergency Corridor Status.
 */
export const JunctionModal = ({ junction, onClose }) => {
  const { transitionSignal, ambulance } = useTraffic();
  const [activeSubTab, setActiveSubTab] = useState('yolo'); // 'yolo' or 'map_zoom'
  const [zoomLevel, setZoomLevel] = useState(2); // 1x, 2x, 4x

  if (!junction) return null;

  // Emergency Corridor status for this junction
  const isEmergencyPath = ambulance.active && ambulance.routeJunctions.includes(junction.id);
  const emergencyJunctionInfo = ambulance.junctionStatus[junction.id] || null;

  let emergencyStatusBadge = 'bg-[#181D21] text-[#737B82] border-[#242A30]';
  let emergencyStatusText = 'NOT IN ACTIVE PATH';
  if (isEmergencyPath) {
    if (emergencyJunctionInfo) {
      if (emergencyJunctionInfo.status === 'PASSED') {
        emergencyStatusBadge = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
        emergencyStatusText = 'PASSED (CLEARANCE COMPLETED)';
      } else if (emergencyJunctionInfo.status === 'READY') {
        emergencyStatusBadge = 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40 animate-pulse';
        emergencyStatusText = 'APPROACHING - READY (GREEN LOCKED)';
      } else if (emergencyJunctionInfo.status === 'PREPARING') {
        emergencyStatusBadge = 'bg-amber-500/20 text-amber-400 border-amber-500/40';
        emergencyStatusText = 'PREPARING (TRANSITION PHASE)';
      } else {
        emergencyStatusBadge = 'bg-purple-500/20 text-purple-400 border-purple-500/40';
        emergencyStatusText = 'SCHEDULED IN CORRIDOR';
      }
    } else {
      emergencyStatusBadge = 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse';
      emergencyStatusText = 'ACTIVE IN AMBULANCE ROUTE';
    }
  }

  let statusBg = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
  if (junction.status === 'CRITICAL') statusBg = 'bg-red-500/10 text-red-400 border-red-500/30';
  else if (junction.status === 'HIGH') statusBg = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
  else if (junction.status === 'MODERATE') statusBg = 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#14181C] border border-[#242A30] rounded-xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in duration-150">
        
        {/* MODAL HEADER WITH GPS & LOCATION */}
        <div className="p-5 border-b border-[#242A30] flex items-center justify-between bg-[#0E1114]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-mono font-extrabold text-amber-400 text-xl shadow-glow">
              {junction.id}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">{junction.name}</h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusBg}`}>
                  {junction.status} DENSITY
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-[#737B82] font-mono mt-0.5">
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-amber-400" /> GPS: {junction.lat}, {junction.lng}</span>
                <span className="flex items-center gap-1"><Camera className="w-3.5 h-3.5 text-cyan-400" /> {junction.cameraName || junction.cameraId}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-[#181D21] border border-[#242A30] text-[#737B82] hover:text-white flex items-center justify-center font-bold text-sm transition-all"
          >
            ✕
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* TOP METRICS ROW (4 CARDS) */}
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-[#181D21] border border-[#242A30]">
              <div className="text-[10px] text-[#737B82] font-bold uppercase tracking-wider">Monitored Vehicles</div>
              <div className="text-2xl font-mono font-bold text-white mt-1">{junction.vehicles}</div>
              <div className="text-[10px] text-cyan-400 mt-1 font-mono">Flow: {junction.flow} veh/min</div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#181D21] border border-[#242A30]">
              <div className="text-[10px] text-[#737B82] font-bold uppercase tracking-wider">Queue Length</div>
              <div className="text-2xl font-mono font-bold text-amber-400 mt-1">{junction.queue} vehicles</div>
              <div className="text-[10px] text-[#737B82] mt-1 font-mono">Pedestrians: {junction.pedestrians}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#181D21] border border-[#242A30]">
              <div className="text-[10px] text-[#737B82] font-bold uppercase tracking-wider">Average Speed</div>
              <div className="text-2xl font-mono font-bold text-emerald-400 mt-1">{junction.speed} <span className="text-xs font-normal">km/h</span></div>
              <div className="text-[10px] text-emerald-400 mt-1 font-mono">Cap: {junction.downstreamCapacity}%</div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#181D21] border border-[#242A30]">
              <div className="text-[10px] text-[#737B82] font-bold uppercase tracking-wider">Current Signal</div>
              <div className="text-xl font-mono font-extrabold text-white mt-1 flex items-center gap-1.5">
                <span className={`w-3 h-3 rounded-full ${
                  junction.signal === 'GREEN' ? 'bg-emerald-500 animate-pulse' :
                  junction.signal === 'YELLOW' ? 'bg-amber-500' : 'bg-red-500'
                }`} />
                {junction.signal}
              </div>
              <div className="text-[10px] text-amber-400 mt-1 font-mono">Rec: {junction.recommendedSignal}</div>
            </div>
          </div>

          {/* MAIN CENTERPIECE: TOGGLE BETWEEN LIVE YOLO FEED AND FOCUSED MAP ZOOM */}
          <div className="bg-[#0E1114] rounded-xl border border-[#242A30] overflow-hidden">
            {/* VIEWPORT CONTROLS BAR */}
            <div className="p-3 border-b border-[#242A30] bg-[#14181C] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveSubTab('yolo')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                    activeSubTab === 'yolo'
                      ? 'bg-amber-500 text-black shadow-glow'
                      : 'bg-[#181D21] text-[#737B82] border border-[#242A30] hover:text-white'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" /> Live YOLO Feed ({junction.cameraId})
                </button>
                <button
                  onClick={() => setActiveSubTab('map_zoom')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                    activeSubTab === 'map_zoom'
                      ? 'bg-amber-500 text-black shadow-glow'
                      : 'bg-[#181D21] text-[#737B82] border border-[#242A30] hover:text-white'
                  }`}
                >
                  <ZoomIn className="w-3.5 h-3.5" /> Focused Map Zoom ({junction.id})
                </button>
              </div>

              {/* MAP ZOOM CONTROLS (WHEN MAP TAB ACTIVE) */}
              {activeSubTab === 'map_zoom' && (
                <div className="flex items-center gap-1 bg-[#181D21] p-1 rounded-lg border border-[#242A30]">
                  <span className="text-[10px] font-mono text-[#737B82] px-2">Zoom Factor:</span>
                  {[1, 2, 4].map(z => (
                    <button
                      key={z}
                      onClick={() => setZoomLevel(z)}
                      className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded ${
                        zoomLevel === z ? 'bg-amber-500 text-black' : 'text-[#737B82] hover:text-white'
                      }`}
                    >
                      {z}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* VIEWPORT CONTENT */}
            <div className="h-64 relative bg-[#090B0D] flex items-center justify-center overflow-hidden">
              {activeSubTab === 'yolo' ? (
                (junction.id === 'J1' || junction.cameraId === 'CAM-01' || junction.cameraRef === 'CAM-01') ? (
                  <div className="relative w-full h-full flex items-center justify-center bg-black">
                    <img
                      src="http://localhost:5000/api/cameras/CAM-01/video_feed"
                      alt="Real YOLO CAM-01 Feed"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded bg-emerald-600 text-black text-[10px] font-mono font-extrabold flex items-center gap-1.5 shadow-glow z-10">
                      <span className="w-2 h-2 rounded-full bg-black animate-pulse" /> ● REAL YOLO / CAM-01
                    </div>
                  </div>
                ) : (
                  <div className="relative w-full h-full">
                    <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-cyan-950/90 text-cyan-400 text-[10px] font-mono font-bold border border-cyan-800/50 z-10">
                      ◎ SIMULATED FEED
                    </div>
                    <svg viewBox="0 0 600 240" className="w-full h-full object-cover">
                      {/* ROAD LAYOUT PERSPECTIVE */}
                      <polygon points="160,240 440,240 340,90 260,90" fill="#14181C" />
                      <line x1="300" y1="90" x2="300" y2="240" stroke="#F59E0B" strokeWidth="2.5" strokeDasharray="10,10" />

                      {/* BOUNDING BOXES FOR DETECTED VEHICLES */}
                      <g>
                        {/* CAR 1 */}
                        <rect x="210" y="150" width="50" height="35" rx="3" fill="none" stroke="#10B981" strokeWidth="2" />
                        <text x="210" y="144" fill="#10B981" fontSize="9" fontWeight="bold" fontFamily="JetBrains Mono">
                          Car #101 [0.97]
                        </text>

                        {/* TRUCK 2 */}
                        <rect x="310" y="160" width="60" height="45" rx="3" fill="none" stroke="#06B6D4" strokeWidth="2" />
                        <text x="310" y="154" fill="#06B6D4" fontSize="9" fontWeight="bold" fontFamily="JetBrains Mono">
                          Truck #44 [0.94]
                        </text>

                        {/* AMBULANCE DETECTED IF IN PATH */}
                        {isEmergencyPath && (
                          <g>
                            <rect x="260" y="110" width="40" height="30" rx="3" fill="none" stroke="#EF4444" strokeWidth="2.5" className="animate-pulse" />
                            <text x="260" y="104" fill="#EF4444" fontSize="9" fontWeight="bold" fontFamily="JetBrains Mono">
                              AMBULANCE {ambulance.id || 'ACTIVE'}
                            </text>
                          </g>
                        )}
                      </g>

                      {/* TOP OVERLAY STAMPS */}
                      <rect x="420" y="12" width="168" height="24" rx="4" fill="#0E1114" opacity="0.85" />
                      <text x="428" y="28" fill="#F59E0B" fontSize="10" fontWeight="bold" fontFamily="JetBrains Mono">
                        Simulation Mode
                      </text>
                    </svg>
                  </div>
                )
              ) : (
                /* FOCUSED MAP ZOOM VIEW AROUND JUNCTION COORDINATES */
                <svg viewBox={`${junction.x - 120 / zoomLevel} ${junction.y - 90 / zoomLevel} ${240 / zoomLevel} ${180 / zoomLevel}`} className="w-full h-full">
                  <rect width="800" height="700" fill="#090B0D" />
                  
                  {/* GRID */}
                  <pattern id="zoomGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#181D21" strokeWidth="1" />
                  </pattern>
                  <rect width="800" height="700" fill="url(#zoomGrid)" />

                  {/* CROSS ROADS */}
                  <line x1={junction.x - 150} y1={junction.y} x2={junction.x + 150} y2={junction.y} stroke="#1D2328" strokeWidth="20" />
                  <line x1={junction.x} y1={junction.y - 150} x2={junction.x} y2={junction.y + 150} stroke="#1D2328" strokeWidth="20" />
                  
                  {/* ROAD COLOR STATUS */}
                  <line x1={junction.x - 150} y1={junction.y} x2={junction.x + 150} y2={junction.y} stroke={junction.status === 'CRITICAL' ? '#EF4444' : '#F59E0B'} strokeWidth="6" />
                  <line x1={junction.x} y1={junction.y - 150} x2={junction.x} y2={junction.y + 150} stroke={junction.status === 'CRITICAL' ? '#EF4444' : '#10B981'} strokeWidth="6" />

                  {/* JUNCTION NODE MARKER */}
                  <circle cx={junction.x} cy={junction.y} r="18" fill="#14181C" stroke="#F59E0B" strokeWidth="3" />
                  <circle cx={junction.x} cy={junction.y} r="6" fill={junction.signal === 'GREEN' ? '#10B981' : '#EF4444'} />
                  
                  <text x={junction.x} y={junction.y - 24} textAnchor="middle" fill="#FFFFFF" fontSize="12" fontWeight="bold" fontFamily="JetBrains Mono">
                    {junction.id} - {junction.name}
                  </text>
                </svg>
              )}
            </div>
          </div>

          {/* TWO-COLUMN DETAILS: NEARBY HOSPITAL & EMERGENCY CORRIDOR STATUS */}
          <div className="grid grid-cols-2 gap-4">
            
            {/* NEARBY HOSPITAL INFO CARD */}
            <div className="p-4 rounded-xl bg-[#181D21] border border-[#242A30] space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                <Building2 className="w-4 h-4 text-emerald-400" />
                <span>Nearest Medical Facility</span>
              </div>
              <div className="text-sm font-bold text-emerald-400 bg-[#0E1114] p-2.5 rounded-lg border border-[#242A30]">
                🏥 {junction.nearestHospital || 'St. Jude General Hospital (1.2 km)'}
              </div>
              <p className="text-[10px] text-[#737B82]">
                Direct emergency vehicle corridor access window connected to ER triage.
              </p>
            </div>

            {/* EMERGENCY CORRIDOR STATUS CARD */}
            <div className="p-4 rounded-xl bg-[#181D21] border border-[#242A30] space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                <Ambulance className="w-4 h-4 text-red-400 animate-pulse" />
                <span>Emergency Corridor Status</span>
              </div>
              <div className={`p-2.5 rounded-lg border font-mono text-xs font-bold ${emergencyStatusBadge}`}>
                {emergencyStatusText}
              </div>
              <p className="text-[10px] text-[#737B82]">
                Corridor response unit: {ambulance.callsign}
              </p>
            </div>
          </div>

          {/* AI RECOMMENDATION & ACTION BOX */}
          <div className="p-4 rounded-xl bg-[#0E1114] border border-[#242A30] space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                AI Signal Recommendation Rationale
              </span>
              <span className="font-mono text-[#737B82]">
                Recommended Signal: <strong className="text-amber-400">{junction.recommendedSignal}</strong>
              </span>
            </div>

            <p className="text-xs text-[#B8BEC4] bg-[#14181C] p-3 rounded-lg border border-[#242A30]">
              {junction.recommendedReason || 'Flow velocity optimal. Maintain green phase for Northbound arterial.'}
            </p>
          </div>

        </div>

        {/* MODAL FOOTER ACTIONS */}
        <div className="p-4 border-t border-[#242A30] bg-[#0E1114] flex items-center justify-between">
          <div className="text-xs font-mono text-[#737B82]">
            Junction Ref: <strong className="text-white">{junction.id}</strong> • Monitored via {junction.cameraId}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[#181D21] border border-[#242A30] text-xs font-semibold text-[#B8BEC4] hover:text-white transition-all"
            >
              Close
            </button>
            <button
              onClick={() => {
                transitionSignal(junction.id, 'GREEN');
                onClose();
              }}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-black font-extrabold text-xs transition-all shadow-glow"
            >
              Apply Green Signal Recommendation
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
