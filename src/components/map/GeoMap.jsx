import React, { useMemo, useState } from 'react';
import { MapPin, X, Camera, Building2, Clock } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useTraffic } from '../../context/TrafficContext';
import { ROAD_CONNECTIONS } from '../../data/mockData';

// ── Source Badge component ────────────────────────────────────────────────────
export const SourceBadge = ({ source, type, label }) => {
  const s = (source || type || label || '').toUpperCase();
  if (s.includes('TOMTOM') || s === 'LIVE') {
    return <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-extrabold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">▲ TOMTOM LIVE</span>;
  }
  if (s.includes('YOLO')) {
    return <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">● YOLO11n VIDEO INPUT</span>;
  }
  if (s.includes('DERIVED')) {
    return <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-extrabold bg-purple-500/15 text-purple-300 border border-purple-500/30">◇ DERIVED</span>;
  }
  if (s.includes('UNAVAIL')) {
    return <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-extrabold bg-red-500/15 text-red-400 border border-red-500/30">✕ UNAVAILABLE</span>;
  }
  return <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-extrabold bg-amber-500/15 text-amber-400 border border-amber-500/30">◎ SIMULATION FALLBACK</span>;
};

// ── Status colours ────────────────────────────────────────────────────────────
const STATUS_COLOR = {
  SMOOTH:   { fill: '#10b981', stroke: '#059669', text: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/25' },
  MODERATE: { fill: '#f59e0b', stroke: '#d97706', text: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/25' },
  HIGH:     { fill: '#f97316', stroke: '#ea580c', text: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/25' },
  CRITICAL: { fill: '#ef4444', stroke: '#dc2626', text: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/25' },
};

const SIGNAL_COLOR = {
  GREEN:  'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40',
  RED:    'bg-red-500/20 text-red-400 border border-red-500/40',
  YELLOW: 'bg-amber-500/20 text-amber-400 border border-amber-500/40',
  ALL_RED:'bg-red-700/20 text-red-300 border border-red-700/40',
};

// ── Helper: parse lat/lng that may come as "12.9784° N" string or as number ──
function toNum(v) {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return parseFloat(v);
  return 0;
}

// ── Junction Detail Panel (shown on click) ────────────────────────────────────
export const JunctionPanel = ({ junction, onClose }) => {
  if (!junction) return null;
  const sc = STATUS_COLOR[junction.status] || STATUS_COLOR.SMOOTH;
  const isTomTomLive = junction.tomtomStatus === 'TOMTOM_LIVE' || junction.dataSource === 'TOMTOM_LIVE';

  const formatConfidence = (c) => {
    if (c == null) return '--';
    if (typeof c === 'number') {
      return c <= 1 ? `${Math.round(c * 100)}%` : `${Math.round(c)}%`;
    }
    return `${c}`;
  };

  return (
    <div className="absolute top-3 right-3 z-[900] w-80 bg-[#0C0F13] border border-[#1E2530] rounded-xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#1E2530] flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono font-bold text-[10px] text-[#5A636B] bg-[#141A20] px-2 py-0.5 rounded border border-[#1E2530]">{junction.id}</span>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${sc.bg} ${sc.text}`}>{junction.status}</span>
            <SourceBadge source={isTomTomLive ? 'TOMTOM_LIVE' : (junction.dataSource || 'SIMULATED')} />
          </div>
          <h3 className="text-sm font-bold text-white truncate">{junction.name}</h3>
          <p className="text-[10px] text-[#5A636B] mt-0.5 truncate">{junction.address}</p>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-[#1E2530] text-[#5A636B] hover:text-white transition-colors shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto max-h-[480px]">
        {/* Coordinates */}
        <div className="bg-[#141A20] rounded-lg p-3 border border-[#1E2530]">
          <div className="text-[9px] font-bold text-[#5A636B] uppercase tracking-wider mb-2">Exact Coordinates</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[9px] text-[#5A636B]">Latitude (N)</div>
              <div className="font-data text-xs text-white font-bold">{toNum(junction.lat).toFixed(6)}°</div>
            </div>
            <div>
              <div className="text-[9px] text-[#5A636B]">Longitude (E)</div>
              <div className="font-data text-xs text-white font-bold">{toNum(junction.lng).toFixed(6)}°</div>
            </div>
          </div>
        </div>

        {/* Traffic Flow (TomTom Live) OR Traffic Metrics (Simulated Fallback) */}
        {isTomTomLive ? (
          <div>
            <div className="text-[9px] font-bold text-[#5A636B] uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Traffic Flow</span>
              <SourceBadge source="TOMTOM_LIVE" />
            </div>
            <div className="bg-[#141A20] rounded-lg p-3 border border-[#1E2530] space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#8A939B]">Current Speed</span>
                <span className="font-data font-bold text-white">{junction.speed != null ? `${junction.speed} km/h` : '--'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#8A939B]">Free Flow Speed</span>
                <span className="font-data font-bold text-cyan-400">{junction.freeFlowSpeed != null ? `${junction.freeFlowSpeed} km/h` : '--'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#8A939B]">Current Travel Time</span>
                <span className="font-data font-bold text-white">{junction.travelTime != null ? `${junction.travelTime} s` : '--'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#8A939B]">Free Flow Travel Time</span>
                <span className="font-data font-bold text-white">{junction.freeFlowTravelTime != null ? `${junction.freeFlowTravelTime} s` : '--'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#8A939B]">Confidence</span>
                <span className="font-data font-bold text-emerald-400">{formatConfidence(junction.confidence)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#8A939B]">Congestion Status</span>
                <span className={`font-data font-bold ${sc.text}`}>{junction.status}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#8A939B]">Road Closure</span>
                <span className={`font-data font-bold ${junction.roadClosure ? 'text-red-400' : 'text-emerald-400'}`}>
                  {junction.roadClosure ? 'CLOSED' : 'OPEN'}
                </span>
              </div>
              <div className="border-t border-[#1E2530] pt-2 text-[9px] text-[#5A636B] font-mono flex items-center justify-between">
                <span>LAST UPDATED:</span>
                <span className="text-[#8A939B] font-bold">{junction.lastUpdated || 'JUST NOW'}</span>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="text-[9px] font-bold text-[#5A636B] uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Traffic Metrics</span>
              <SourceBadge source="SIMULATED" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Vehicles', value: junction.vehicles, unit: '' },
                { label: 'Queue Length', value: junction.queue, unit: 'veh' },
                { label: 'Avg Speed', value: junction.speed, unit: 'km/h' },
                { label: 'Flow Rate', value: junction.flow, unit: 'v/min' },
                { label: 'Pedestrians', value: junction.pedestrians, unit: '' },
                { label: 'D/S Capacity', value: `${junction.downstreamCapacity}%`, unit: '' },
              ].map(m => (
                <div key={m.label} className="bg-[#141A20] rounded-lg p-2.5 border border-[#1E2530]">
                  <div className="text-[9px] text-[#5A636B]">{m.label}</div>
                  <div className="font-data text-sm font-bold text-white mt-0.5">{m.value}<span className="text-[9px] text-[#5A636B] ml-0.5">{m.unit}</span></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Signal State */}
        <div>
          <div className="text-[9px] font-bold text-[#5A636B] uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Signal State</span>
            <SourceBadge source="SIMULATED" />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-3 py-1 rounded font-data font-bold text-xs ${SIGNAL_COLOR[junction.signal] || SIGNAL_COLOR.RED}`}>
              ● {junction.signal}
            </span>
            <span className="text-[10px] text-[#5A636B]">→ Recommended:</span>
            <span className={`px-2 py-0.5 rounded font-data text-[10px] font-bold ${SIGNAL_COLOR[junction.recommendedSignal] || SIGNAL_COLOR.GREEN}`}>
              {junction.recommendedSignal}
            </span>
          </div>
          <div className="bg-[#141A20] rounded-lg p-2.5 border border-[#1E2530] text-[10px] text-[#8A939B]">
            {junction.signalReason}
          </div>
        </div>

        {/* Infrastructure */}
        <div>
          <div className="text-[9px] font-bold text-[#5A636B] uppercase tracking-wider mb-2 flex items-center gap-2">
            Nearby Infrastructure <SourceBadge source="STATIC" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-start gap-2 text-[10px] text-[#8A939B]">
              <Building2 className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
              <span>{junction.nearestHospital}</span>
            </div>
            {(junction.nearbyLandmarks || []).map(lm => (
              <div key={lm} className="flex items-start gap-2 text-[10px] text-[#5A636B]">
                <MapPin className="w-3.5 h-3.5 text-[#3D4850] shrink-0 mt-0.5" />
                <span>{lm}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Camera Reference */}
        <div>
          <div className="text-[9px] font-bold text-[#5A636B] uppercase tracking-wider mb-2 flex items-center gap-2">
            Camera Reference <SourceBadge source={junction.id === 'J1' ? 'LIVE API DATA' : 'SIMULATED'} />
          </div>
          <div className="bg-[#141A20] rounded-lg p-2.5 border border-[#1E2530] flex items-start gap-2">
            <Camera className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-[10px] text-[#8A939B]">{junction.cameraRef}</div>
              <div className="text-[9px] font-mono font-bold mt-0.5">
                {junction.id === 'J1' ? (
                  <span className="text-emerald-400">● REAL YOLO ACTIVE (CAM-01 / J1)</span>
                ) : (
                  <span className="text-[#5A636B] italic">Simulated camera feed</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Last Updated Footer */}
        <div className="flex items-center justify-between text-[9px] text-[#3D4850] border-t border-[#1E2530] pt-3">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Last updated: {junction.lastUpdated || 'JUST NOW'}</span>
          </div>
          <span className="font-data">WGS-84</span>
        </div>
      </div>
    </div>
  );
};

// ── Build a Leaflet divIcon for a junction marker ─────────────────────────────
function makeJunctionIcon(j, isAmbulanceCurrent) {
  const sc = STATUS_COLOR[j.status] || STATUS_COLOR.SMOOTH;
  const size = isAmbulanceCurrent ? 18 : 14;
  const glowPx = isAmbulanceCurrent ? 8 : 4;
  const color = isAmbulanceCurrent ? '#f97316' : sc.fill;
  const border = isAmbulanceCurrent ? '#ea580c' : sc.stroke;

  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;display:flex;align-items:center;justify-content:center;">
        <div style="
          width:${size}px;height:${size}px;border-radius:50%;
          background:${color};border:2px solid ${border};
          box-shadow:0 0 ${glowPx}px ${color}80;cursor:pointer;
          transition:transform 0.15s;
        "></div>
        <div style="
          position:absolute;top:${isAmbulanceCurrent ? -22 : -20}px;left:50%;
          transform:translateX(-50%);font-size:9px;font-weight:700;
          font-family:'Inter',system-ui,sans-serif;white-space:nowrap;
          color:#E2E5E9;background:rgba(12,15,19,0.92);
          padding:2px 6px;border-radius:4px;border:1px solid #252C34;
          pointer-events:none;box-shadow:0 2px 6px rgba(0,0,0,0.6);
        "><span style="color:#F59E0B;font-family:'JetBrains Mono',monospace;font-weight:800;margin-right:4px;">${j.id}</span>${j.name}</div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// ── Build a Leaflet divIcon for the ambulance ─────────────────────────────────
function makeAmbulanceIcon() {
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;display:flex;align-items:center;justify-content:center;">
        <div style="
          width:32px;height:32px;border-radius:8px;
          background:#EF4444;border:2px solid #FFFFFF;
          box-shadow:0 0 12px rgba(239,68,68,0.7);
          display:flex;align-items:center;justify-content:center;
          font-size:16px;
        ">🚑</div>
        <div style="
          position:absolute;top:-22px;left:50%;transform:translateX(-50%);
          font-size:9px;font-weight:700;font-family:'JetBrains Mono',monospace;
          white-space:nowrap;color:#FFF;background:#EF4444;
          padding:1px 6px;border-radius:3px;pointer-events:none;
        ">AMB-102</div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

// ── Ambulance marker sub-component (needs useMap for dynamic positioning) ─────
const AmbulanceMarker = ({ position }) => {
  if (!position) return null;
  const icon = useMemo(() => makeAmbulanceIcon(), []);
  return <Marker position={position} icon={icon} />;
};

// ── Geographic Map using React Leaflet + OpenStreetMap tiles ──────────────────
export const GeoMap = ({ onSelectJunction, selectedRoute = null, showAmbulance = false }) => {
  const { junctions, ambulance } = useTraffic();
  const [selectedJunction, setSelectedJunction] = useState(null);

  // Always derive live selected junction object from junctions array
  const currentSelectedJunction = useMemo(() => {
    if (!selectedJunction) return null;
    return junctions.find(j => j.id === selectedJunction.id) || selectedJunction;
  }, [selectedJunction, junctions]);

  // Build lookup map for junctions by ID
  const junctionMap = useMemo(() => {
    const m = {};
    junctions.forEach(j => { m[j.id] = j; });
    return m;
  }, [junctions]);

  // ── Road connection polylines ───────────────────────────────────────────────
  const roadPolylines = useMemo(() => {
    return ROAD_CONNECTIONS.map(conn => {
      const j1 = junctionMap[conn.from];
      const j2 = junctionMap[conn.to];
      if (!j1 || !j2) return null;
      const lat1 = toNum(j1.lat), lng1 = toNum(j1.lng);
      const lat2 = toNum(j2.lat), lng2 = toNum(j2.lng);
      if (!lat1 || !lat2) return null;

      const isHighCongestion = j1.status === 'CRITICAL' || j2.status === 'CRITICAL';
      const isMedCongestion  = j1.status === 'HIGH'     || j2.status === 'HIGH';
      const color = isHighCongestion ? '#ef4444' : isMedCongestion ? '#f97316' : '#10b981';

      return {
        key: `${conn.from}-${conn.to}`,
        positions: [[lat1, lng1], [lat2, lng2]],
        color,
        weight: isHighCongestion ? 4 : 3,
        opacity: isHighCongestion ? 0.85 : 0.6,
      };
    }).filter(Boolean);
  }, [junctionMap]);

  // ── Selected route overlay ──────────────────────────────────────────────────
  const routePolyline = useMemo(() => {
    if (!selectedRoute?.path) return null;
    const coords = selectedRoute.path
      .map(id => junctionMap[id])
      .filter(Boolean)
      .map(j => [toNum(j.lat), toNum(j.lng)])
      .filter(([lat, lng]) => lat && lng);
    return coords.length > 1 ? coords : null;
  }, [selectedRoute, junctionMap]);

  // ── Ambulance corridor overlay ──────────────────────────────────────────────
  const ambCorridorCoords = useMemo(() => {
    if (!showAmbulance || !ambulance.active) return null;
    const coords = ambulance.routeJunctions
      .map(id => junctionMap[id])
      .filter(Boolean)
      .map(j => [toNum(j.lat), toNum(j.lng)])
      .filter(([lat, lng]) => lat && lng);
    return coords.length > 1 ? coords : null;
  }, [showAmbulance, ambulance, junctionMap]);

  // ── Current ambulance position ──────────────────────────────────────────────
  const ambPosition = useMemo(() => {
    if (!showAmbulance || (!ambulance.active && !ambulance.emergencyActive)) return null;
    if (toNum(ambulance.latitude) && toNum(ambulance.longitude)) {
      return [toNum(ambulance.latitude), toNum(ambulance.longitude)];
    }
    const currentId = ambulance.routeJunctions ? ambulance.routeJunctions[ambulance.currentJunctionIndex] : 'J1';
    const j = junctionMap[currentId];
    if (!j) return null;
    const lat = toNum(j.lat), lng = toNum(j.lng);
    return (lat && lng) ? [lat, lng] : null;
  }, [showAmbulance, ambulance, junctionMap]);

  // ── Junction marker icons (memoised per status + ambulance state) ───────────
  const junctionIcons = useMemo(() => {
    const icons = {};
    junctions.forEach(j => {
      const isAmbCurrent = showAmbulance && ambulance.active &&
        ambulance.routeJunctions.includes(j.id) &&
        ambulance.routeJunctions[ambulance.currentJunctionIndex] === j.id;
      icons[j.id] = makeJunctionIcon(j, isAmbCurrent);
    });
    return icons;
  }, [junctions, showAmbulance, ambulance]);

  const handleMarkerClick = (j) => {
    setSelectedJunction(j);
    if (onSelectJunction) onSelectJunction(j.id);
  };

  return (
    <div className="relative w-full h-full">
      {/* React Leaflet map centered on Chennai, Tamil Nadu */}
      <MapContainer
        center={[13.0827, 80.2707]}
        zoom={12.5}
        scrollWheelZoom={true}
        zoomControl={true}
        attributionControl={true}
        className="w-full h-full rounded-xl"
        style={{ background: '#0C0F13' }}
      >
        {/* Official OpenStreetMap raster tiles */}
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />

        {/* Road connection polylines on top of OSM base layer */}
        {roadPolylines.map(road => (
          <Polyline
            key={road.key}
            positions={road.positions}
            pathOptions={{ color: road.color, weight: road.weight, opacity: road.opacity }}
          />
        ))}

        {/* Selected route overlay */}
        {routePolyline && (
          <Polyline
            positions={routePolyline}
            pathOptions={{ color: '#f59e0b', weight: 5, opacity: 0.9, dashArray: '8 4' }}
          />
        )}

        {/* Ambulance corridor overlay */}
        {ambCorridorCoords && (
          <Polyline
            positions={ambCorridorCoords}
            pathOptions={{ color: '#ef4444', weight: 5, opacity: 0.95, dashArray: '6 3' }}
          />
        )}

        {/* Junction markers with real Chennai names */}
        {junctions.map(j => {
          const lat = toNum(j.lat);
          const lng = toNum(j.lng);
          if (!lat || !lng) return null;
          return (
            <Marker
              key={j.id}
              position={[lat, lng]}
              icon={junctionIcons[j.id]}
              eventHandlers={{ click: () => handleMarkerClick(j) }}
            />
          );
        })}

        {/* Ambulance marker */}
        {ambPosition && <AmbulanceMarker position={ambPosition} />}
      </MapContainer>

      {/* Map source badge */}
      <div className="absolute bottom-3 left-3 z-[800] flex items-center gap-2">
        <span className="badge-static">Map: © OpenStreetMap (Chennai, TN)</span>
        <span className="badge-sim">Center: [13.0827, 80.2707]</span>
      </div>

      {/* Legend */}
      <div className="absolute top-3 left-3 z-[800] bg-[#0C0F13]/90 backdrop-blur-sm border border-[#1E2530] rounded-lg p-3 shadow-xl">
        <div className="text-[9px] font-bold text-[#5A636B] uppercase tracking-wider mb-2">Chennai Traffic Status</div>
        {Object.entries(STATUS_COLOR).map(([status, sc]) => (
          <div key={status} className="flex items-center gap-2 mb-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: sc.fill }} />
            <span className="text-[9px] text-[#8A939B] font-medium">{status}</span>
          </div>
        ))}
        {showAmbulance && ambulance.active && (
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#1E2530]">
            <div className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-[9px] text-orange-400 font-bold">EMERGENCY CORRIDOR</span>
          </div>
        )}
      </div>

      {/* Junction detail panel */}
      {currentSelectedJunction && (
        <JunctionPanel
          junction={currentSelectedJunction}
          onClose={() => setSelectedJunction(null)}
        />
      )}
    </div>
  );
};

export default GeoMap;
