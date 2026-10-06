import React, { useEffect, useMemo, useState } from 'react';
import { MapPin, X, Camera, Building2, Clock } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Polyline, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useTraffic } from '../../context/TrafficContext';
import { ROAD_CONNECTIONS } from '../../data/mockData';
import {
  CHENNAI_JUNCTION_BOUNDS,
  CHENNAI_MAP_CENTER,
  CHENNAI_MAP_MAX_ZOOM,
  CHENNAI_MAP_MIN_ZOOM,
  CHENNAI_MAP_ZOOM,
} from './mapConfig';

const DEFAULT_CORRIDOR_JUNCTIONS = ['J1', 'J8', 'J2', 'J7'];
const EMPTY_CORRIDOR_JUNCTIONS = [];
const EMPTY_SIGNAL_STATES = Object.freeze({});
const CHENNAI_LEAFLET_BOUNDS = L.latLngBounds(CHENNAI_JUNCTION_BOUNDS);

const MapBoundsController = () => {
  const map = useMap();

  useEffect(() => {
    map.setMaxBounds(CHENNAI_LEAFLET_BOUNDS);
    map.options.maxBoundsViscosity = 1;
    const keepMapInChennai = () => map.panInsideBounds(CHENNAI_LEAFLET_BOUNDS, { animate: false });
    map.on('dragend zoomend', keepMapInChennai);
    return () => map.off('dragend zoomend', keepMapInChennai);
  }, [map]);

  return null;
};

// ── Source Badge component ────────────────────────────────────────────────────
export const SourceBadge = ({ source, type, label }) => {
  const s = (source || type || label || '').toUpperCase();
  if (s.includes('TOMTOM') || s === 'LIVE' || s.includes('LIVE BACKEND') || s.includes('LIVE GPS')) {
    const liveLabel = s.includes('TOMTOM') ? '▲ TOMTOM LIVE' : '● LIVE BACKEND';
    return <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-extrabold bg-cyan-50 text-cyan-800 border border-cyan-200">{liveLabel}</span>;
  }
  if (s.includes('YOLO')) {
    return <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">● YOLO11n VIDEO INPUT</span>;
  }
  if (s.includes('DERIVED')) {
    return <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-extrabold bg-violet-50 text-violet-800 border border-violet-200">◇ DERIVED</span>;
  }
  if (s.includes('UNAVAIL')) {
    return <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-extrabold bg-red-50 text-red-700 border border-red-200">✕ UNAVAILABLE</span>;
  }
  return <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-extrabold bg-amber-50 text-amber-800 border border-amber-200">◎ SIMULATION FALLBACK</span>;
};

// ── Status colours ─────────────────────────────────────────────────────────[...]
const STATUS_COLOR = {
  SMOOTH:   { fill: '#10b981', stroke: '#059669', text: 'text-green-800', bg: 'bg-green-50 border-green-200' },
  MODERATE: { fill: '#f59e0b', stroke: '#d97706', text: 'text-amber-800', bg: 'bg-amber-50 border-amber-200' },
  HIGH:     { fill: '#f97316', stroke: '#ea580c', text: 'text-orange-800', bg: 'bg-orange-50 border-orange-200' },
  CRITICAL: { fill: '#ef4444', stroke: '#dc2626', text: 'text-red-800', bg: 'bg-red-50 border-red-200' },
};

const SIGNAL_COLOR = {
  GREEN:  'bg-green-50 text-green-800 border border-green-200',
  RED:    'bg-red-50 text-red-800 border border-red-200',
  YELLOW: 'bg-amber-50 text-amber-800 border border-amber-200',
  AMBER:  'bg-amber-50 text-amber-800 border border-amber-200',
  ALL_RED:'bg-red-100 text-red-900 border border-red-300',
};

// ── Helper: parse lat/lng that may come as "12.9784° N" string or as number ──
function toNum(v) {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return parseFloat(v);
  return 0;
}

function toPosition(point) {
  if (Array.isArray(point) && point.length >= 2) {
    const lat = toNum(point[0]);
    const lng = toNum(point[1]);
    return lat && lng ? [lat, lng] : null;
  }
  if (!point || typeof point !== 'object') return null;
  const lat = toNum(point.latitude ?? point.lat);
  const lng = toNum(point.longitude ?? point.lng);
  return lat && lng ? [lat, lng] : null;
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
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`px-3 py-1 rounded font-data font-bold text-xs ${SIGNAL_COLOR[junction.signal] || SIGNAL_COLOR.RED}`}>
              Current signal: {junction.signal}
            </span>
            <span className="text-xs font-semibold text-slate-700">
              {junction.currentPhase || junction.phase || 'Current phase'}
            </span>
            <span className="text-xs font-semibold text-slate-700">
              {junction.remainingTime ?? '—'} seconds remaining
            </span>
          </div>
          <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200 text-xs text-slate-700">
            <span className="font-semibold">Why this signal is active: </span>
            {junction.signalReason || 'Current phase follows the active signal plan.'}
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
function makeJunctionIcon(j, isAmbulanceCurrent, isSelected) {
  const signal = String(j.signal || j.currentPhase || 'RED').toUpperCase();
  const activeColor = signal === 'GREEN' ? '#16a34a' : signal === 'YELLOW' ? '#d97706' : '#dc2626';
  const size = isAmbulanceCurrent || isSelected ? 21 : 18;
  const red = signal === 'RED' || signal === 'ALL_RED' ? '#ef4444' : '#fecaca';
  const amber = signal === 'YELLOW' ? '#f59e0b' : '#fde68a';
  const green = signal === 'GREEN' ? '#22c55e' : '#bbf7d0';

  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;display:flex;align-items:center;justify-content:center;">
        <div style="
          width:${size}px;height:${size * 1.45}px;border-radius:8px;
          background:#17233c;border:2px solid ${isAmbulanceCurrent ? '#ef4444' : isSelected ? '#7c3aed' : '#ffffff'};
          box-shadow:0 2px 8px ${activeColor}80;cursor:pointer;
          display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;
        ">
          <i style="width:5px;height:5px;border-radius:50%;background:${red};"></i>
          <i style="width:5px;height:5px;border-radius:50%;background:${amber};"></i>
          <i style="width:5px;height:5px;border-radius:50%;background:${green};"></i>
        </div>
        <div style="
          position:absolute;top:${isAmbulanceCurrent ? -25 : -23}px;left:50%;
          transform:translateX(-50%);font-size:9px;font-weight:700;
          font-family:'Inter',system-ui,sans-serif;white-space:nowrap;
          color:#18243d;background:rgba(255,255,255,0.96);
          padding:2px 6px;border-radius:5px;border:1px solid #dfe3ee;
          pointer-events:none;box-shadow:0 2px 6px rgba(24,36,61,0.16);
        ">
          <div><span style="color:${activeColor};font-family:'JetBrains Mono',monospace;font-weight:800;margin-right:4px;">${j.id}</span>${j.name}</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:8px;color:${activeColor};margin-top:2px;">
            ${signal} · ${j.remainingTime ?? '—'}s
          </div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:7px;color:#475569;margin-top:1px;">
            ${j.vehicles ?? '—'} vehicles · ${j.status || 'UNKNOWN'}
          </div>
        </div>
      </div>
    `,
    iconSize: [size, size * 1.45],
    iconAnchor: [size / 2, (size * 1.45) / 2],
  });
}

function makeCorridorJunctionIcon(junction, signal, countdown, isCurrent, isNext, isSelected) {
  const normalizedSignal = String(signal || 'RED').toUpperCase();
  const signalColor = normalizedSignal.includes('GREEN')
    ? '#22C55E'
    : normalizedSignal.includes('YELLOW') || normalizedSignal.includes('AMBER')
      ? '#F59E0B'
      : '#EF4444';
  const borderColor = isCurrent ? '#EF4444' : isSelected ? '#7C3AED' : isNext ? '#F59E0B' : '#FFFFFF';
  const id = String(junction.id || '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);

  return L.divIcon({
    className: 'emergency-corridor-junction-icon',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
        <span style="
          border:1px solid #E2E8F0;border-radius:5px;background:#FFFFFF;
          box-shadow:0 1px 4px rgba(23,37,84,.18);color:#172554;
          font:800 9px/14px Inter,system-ui,sans-serif;padding:0 5px;white-space:nowrap;
        ">${id}</span>
        <span style="
          align-items:center;background:${signalColor};border:3px solid ${borderColor};
          border-radius:50%;box-shadow:0 1px 5px rgba(15,23,42,.35);
          color:#FFFFFF;display:flex;font:800 8px/1 Inter,system-ui,sans-serif;
          height:22px;justify-content:center;width:22px;
        ">${countdown ?? '—'}</span>
      </div>
    `,
    iconSize: [38, 42],
    iconAnchor: [19, 37],
  });
}

// ── Build a Leaflet divIcon for the ambulance ─────────────────────────────────
function makeAmbulanceIcon(ambulanceId) {
  return L.divIcon({
    className: 'ambulance-marker-icon',
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
        ">${ambulanceId || 'AMB-000'}</div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function makeDestinationIcon() {
  return L.divIcon({
    className: '',
    html: '<div style="width:30px;height:30px;border:2px solid #fff;border-radius:50% 50% 50% 4px;transform:rotate(-45deg);background:#7c3aed;box-shadow:0 2px 8px #4c1d95aa;display:flex;align-items:center;justify-content:center;color:#fff;font:700 11px Inter,sans-serif;"><span style="transform:rotate(45deg)">ER</span></div>',
    iconSize: [30, 30],
    iconAnchor: [15, 26],
  });
}

// ── Ambulance marker sub-component (needs useMap for dynamic positioning) ─────
const AmbulanceMarker = ({ position, ambulanceId }) => {
  if (!position) return null;
  const icon = useMemo(() => makeAmbulanceIcon(ambulanceId), [ambulanceId]);
  return <Marker position={position} icon={icon} />;
};

// ── Geographic Map using React Leaflet + OpenStreetMap tiles ──────────────────
export const GeoMap = ({
  onSelectJunction,
  selectedRoute = null,
  showAmbulance = false,
  showJunctionMarkers = true,
  selectedJunctionId = null,
  emergencyCorridorOnly = false,
  corridorJunctionIds = EMPTY_CORRIDOR_JUNCTIONS,
  showJunctionPanel = true,
}) => {
  const { junctions, ambulance, tomtomStatus, incidents = [] } = useTraffic();
  const [selectedJunction, setSelectedJunction] = useState(null);
  const activeAmbulance = Boolean(showAmbulance && (ambulance.active || ambulance.emergencyActive));

  const corridorIds = useMemo(() => {
    if (!emergencyCorridorOnly) return [];
    const ids = corridorJunctionIds.length
      ? corridorJunctionIds
      : ambulance.routeJunctions?.length
        ? ambulance.routeJunctions
        : DEFAULT_CORRIDOR_JUNCTIONS;
    return [...new Set(ids.filter(id => typeof id === 'string' && id))];
  }, [emergencyCorridorOnly, corridorJunctionIds, ambulance.routeJunctions]);
  const corridorIdSet = useMemo(() => new Set(corridorIds), [corridorIds]);
  const visibleJunctions = useMemo(
    () => emergencyCorridorOnly ? junctions.filter(junction => corridorIdSet.has(junction.id)) : junctions,
    [emergencyCorridorOnly, junctions, corridorIdSet],
  );

  // Always derive live selected junction object from junctions array
  const currentSelectedJunction = useMemo(() => {
    const selectedId = selectedJunctionId || selectedJunction?.id;
    if (!selectedId) return null;
    return junctions.find(j => j.id === selectedId) || selectedJunction;
  }, [selectedJunction, selectedJunctionId, junctions]);

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

  const corridorNetworkPolylines = useMemo(() => {
    if (!emergencyCorridorOnly || activeAmbulance) return [];
    const routeEdges = new Set();
    corridorIds.slice(1).forEach((id, index) => {
      const previousId = corridorIds[index];
      routeEdges.add(`${previousId}-${id}`);
      routeEdges.add(`${id}-${previousId}`);
    });
    return roadPolylines
      .filter(road => routeEdges.has(road.key))
      .map(road => ({ ...road, color: '#475569', weight: 4, opacity: 0.75 }));
  }, [emergencyCorridorOnly, activeAmbulance, corridorIds, roadPolylines]);
  const visibleRoadPolylines = emergencyCorridorOnly ? corridorNetworkPolylines : roadPolylines;

  // ── Selected route overlay ──────────────────────────────────────────────────
  const routePolyline = useMemo(() => {
    if (emergencyCorridorOnly || !selectedRoute?.path) return null;
    const coords = selectedRoute.path
      .map(id => junctionMap[id])
      .filter(Boolean)
      .map(j => [toNum(j.lat), toNum(j.lng)])
      .filter(([lat, lng]) => lat && lng);
    return coords.length > 1 ? coords : null;
  }, [emergencyCorridorOnly, selectedRoute, junctionMap]);

  // ── Ambulance corridor overlay ──────────────────────────────────────────────
  const ambCorridorCoords = useMemo(() => {
    if (!activeAmbulance) return null;
    const routePositions = (Array.isArray(ambulance.route) ? ambulance.route : [])
      .map(toPosition)
      .filter(Boolean);
    if (routePositions.length > 1) return routePositions;
    const coords = corridorIds
      .map(id => junctionMap[id])
      .filter(Boolean)
      .map(j => [toNum(j.lat), toNum(j.lng)])
      .filter(([lat, lng]) => lat && lng);
    return coords.length > 1 ? coords : null;
  }, [activeAmbulance, ambulance, corridorIds, junctionMap]);

  const destinationPosition = useMemo(() => {
    const destination = ambulance.destinationLocation;
    const directPosition = toPosition(destination);
    if (directPosition) return directPosition;
    if (ambCorridorCoords?.length) return ambCorridorCoords[ambCorridorCoords.length - 1];
    const destinationJunction = junctionMap[corridorIds[corridorIds.length - 1]];
    if (destinationJunction) return [toNum(destinationJunction.lat), toNum(destinationJunction.lng)];
    return null;
  }, [ambulance.destinationLocation, ambCorridorCoords, corridorIds, junctionMap]);

  const incidentMarkers = useMemo(() => {
    if (emergencyCorridorOnly) return [];
    const providerIncidents = Array.isArray(tomtomStatus?.incidents) ? tomtomStatus.incidents : [];
    const eventIncidents = incidents
      .filter(event => /INCIDENT|ROAD_BLOCK|COLLISION|HAZARD/i.test(`${event.category || ''} ${event.title || ''}`))
      .map(event => {
        const junction = junctionMap[event.location];
        return {
          ...event,
          latitude: event.latitude ?? event.lat ?? junction?.lat,
          longitude: event.longitude ?? event.lng ?? junction?.lng,
        };
      });
    return [...providerIncidents, ...eventIncidents]
      .map(incident => ({ incident, position: toPosition(incident) }))
      .filter(item => item.position);
  }, [emergencyCorridorOnly, tomtomStatus, incidents, junctionMap]);

  // ── Current ambulance position ──────────────────────────────────────────────
  const ambPosition = useMemo(() => {
    if (!activeAmbulance) return null;
    if (toNum(ambulance.latitude) && toNum(ambulance.longitude)) {
      return [toNum(ambulance.latitude), toNum(ambulance.longitude)];
    }
    const currentId = corridorIds[Number(ambulance.currentJunctionIndex) || 0] || corridorIds[0] || 'J1';
    const j = junctionMap[currentId];
    if (!j) return null;
    const lat = toNum(j.lat), lng = toNum(j.lng);
    return (lat && lng) ? [lat, lng] : null;
  }, [activeAmbulance, ambulance.currentJunctionIndex, ambulance.latitude, ambulance.longitude, corridorIds, junctionMap]);

  const corridorSignalStates = useMemo(() => {
    if (!emergencyCorridorOnly) return EMPTY_SIGNAL_STATES;
    const currentId = ambulance.currentJunctionId
      || corridorIds[Number(ambulance.currentJunctionIndex) || 0];
    const routeCurrentIndex = corridorIds.indexOf(currentId);
    const currentIndex = routeCurrentIndex >= 0
      ? routeCurrentIndex
      : Number(ambulance.currentJunctionIndex) || 0;
    return Object.fromEntries(visibleJunctions.map(junction => {
      const junctionState = ambulance.junctionStatus?.[junction.id] || {};
      const originalSignal = ambulance.normalSignalStates?.[junction.id];
      const restoredSignal = typeof originalSignal === 'string'
        ? originalSignal
        : originalSignal?.signal ?? originalSignal?.currentPhase;
      const routeIndex = corridorIds.indexOf(junction.id);
      const passed = routeIndex >= 0 && (
        routeIndex < currentIndex
        || ['PASSED', 'CLEARED'].includes(String(junctionState.status || '').toUpperCase())
      );
      return [junction.id, passed && restoredSignal
        ? restoredSignal
        : junction.signal || junction.currentPhase || 'RED'];
    }));
  }, [
    emergencyCorridorOnly,
    visibleJunctions,
    ambulance.currentJunctionId,
    ambulance.currentJunctionIndex,
    ambulance.junctionStatus,
    ambulance.normalSignalStates,
    corridorIds,
  ]);

  // ── Junction marker icons (memoised per status + ambulance state) ───────────
  const junctionIcons = useMemo(() => {
    const icons = {};
    const currentAmbulanceJunctionId = ambulance.currentJunctionId
      || corridorIds[Number(ambulance.currentJunctionIndex) || 0];
    const currentIndex = Math.max(0, corridorIds.indexOf(currentAmbulanceJunctionId));
    const nextAmbulanceJunctionId = ambulance.nextJunctionId || corridorIds[currentIndex + 1];
    visibleJunctions.forEach(junction => {
      const isAmbCurrent = activeAmbulance && currentAmbulanceJunctionId === junction.id;
      const isNext = activeAmbulance && nextAmbulanceJunctionId === junction.id;
      const isSelected = (selectedJunctionId || selectedJunction?.id) === junction.id;
      icons[junction.id] = emergencyCorridorOnly
        ? makeCorridorJunctionIcon(
            junction,
            corridorSignalStates[junction.id],
            junction.remainingTime,
            isAmbCurrent,
            isNext,
            isSelected,
          )
        : makeJunctionIcon(junction, isAmbCurrent, isSelected);
    });
    return icons;
  }, [
    visibleJunctions,
    emergencyCorridorOnly,
    activeAmbulance,
    ambulance.currentJunctionId,
    ambulance.nextJunctionId,
    ambulance.currentJunctionIndex,
    corridorIds,
    corridorSignalStates,
    selectedJunctionId,
    selectedJunction?.id,
  ]);

  const handleMarkerClick = (j) => {
    setSelectedJunction(j);
    if (onSelectJunction) onSelectJunction(j.id);
  };

  return (
    <div className="relative w-full h-full">
      {/* React Leaflet map centered on Chennai, Tamil Nadu */}
      <MapContainer
        center={CHENNAI_MAP_CENTER}
        zoom={CHENNAI_MAP_ZOOM}
        minZoom={CHENNAI_MAP_MIN_ZOOM}
        maxZoom={CHENNAI_MAP_MAX_ZOOM}
        maxBounds={CHENNAI_JUNCTION_BOUNDS}
        maxBoundsViscosity={1}
        scrollWheelZoom={true}
        inertia={false}
        bounceAtZoomLimits={false}
        zoomControl={true}
        dragging={true}
        zoomAnimation={false}
        fadeAnimation={false}
        markerZoomAnimation={false}
        attributionControl={true}
        className="w-full h-full rounded-xl"
        style={{ background: '#F1F5F9' }}
      >
        <MapBoundsController />
        {/* Official OpenStreetMap raster tiles */}
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />

        {/* Road connection polylines on top of OSM base layer */}
        {visibleRoadPolylines.map(road => (
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
        {activeAmbulance && ambCorridorCoords && (
          <Polyline
            positions={ambCorridorCoords}
            pathOptions={{ color: '#ef4444', weight: 5, opacity: 0.95, dashArray: '6 3' }}
          />
        )}

        {/* Junction markers with real Chennai names (rendered only when showJunctionMarkers is true) */}
        {showJunctionMarkers && visibleJunctions.map(j => {
          const lat = toNum(j.lat);
          const lng = toNum(j.lng);
          if (!lat || !lng) return null;
          return (
            <Marker
              key={j.id}
              position={[lat, lng]}
              icon={junctionIcons[j.id]}
              eventHandlers={{ click: () => handleMarkerClick(j) }}
            >
              <Tooltip direction="top">
                <strong>{j.name}</strong><br />
                Phase: {j.currentPhase || j.signal}<br />
                Signal: {emergencyCorridorOnly ? corridorSignalStates[j.id] : j.signal || 'RED'} · {j.remainingTime ?? '—'}s<br />
                {emergencyCorridorOnly
                  ? `Corridor status: ${ambulance.junctionStatus?.[j.id]?.status || 'NORMAL'}`
                  : `Traffic: ${j.vehicles ?? '—'} vehicles · ${j.status || 'UNKNOWN'}`}
              </Tooltip>
            </Marker>
          );
        })}

        {/* Ambulance marker — now uses live ambulance ID */}
        {ambPosition && <AmbulanceMarker position={ambPosition} ambulanceId={ambulance.id || 'AMB-000'} />}
        {activeAmbulance && destinationPosition && (
          <Marker position={destinationPosition} icon={makeDestinationIcon()}>
            <Tooltip direction="top">
              Destination: {ambulance.destination || 'Hospital'}
            </Tooltip>
          </Marker>
        )}
        {!emergencyCorridorOnly && incidentMarkers.map(({ incident, position }, index) => (
          <CircleMarker
            key={incident.id || incident.incidentId || `${position.join('-')}-${index}`}
            center={position}
            radius={8}
            pathOptions={{ color: '#b91c1c', weight: 2, fillColor: '#ef4444', fillOpacity: 0.8 }}
          >
            <Tooltip direction="top">
              <strong>{incident.title || incident.description || 'Traffic incident'}</strong>
              {incident.location ? <><br />{incident.location}</> : null}
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>

      {/* Map source badge */}
      <div className="absolute bottom-3 left-3 z-[800] flex items-center gap-2">
        <span className="badge-static">Map: © OpenStreetMap (Chennai, TN)</span>
        {!emergencyCorridorOnly && <span className="badge-sim">Center: [13.0827, 80.2707]</span>}
      </div>

      {/* Legend */}
      {emergencyCorridorOnly ? (
        <div className="absolute bottom-3 right-3 z-[800] flex items-center gap-3 rounded-lg border border-slate-200 bg-white/95 px-2.5 py-2 shadow-sm backdrop-blur-sm">
          <span className="flex items-center gap-1 text-[9px] font-semibold text-slate-700">
            <span className={`h-0 w-4 border-t-2 ${activeAmbulance ? 'border-dashed border-red-500' : 'border-slate-600'}`} />
            Route
          </span>
          {[
            ['#22C55E', 'Green'],
            ['#F59E0B', 'Amber'],
            ['#EF4444', 'Red'],
          ].map(([color, label]) => (
            <span key={label} className="flex items-center gap-1 text-[9px] font-medium text-slate-700">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
              {label}
            </span>
          ))}
        </div>
      ) : (
        <div className="absolute left-3 top-3 z-[800] rounded-lg border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur-sm">
          <div className="mb-2 text-[9px] font-bold uppercase tracking-wider text-slate-500">Map legend</div>
          {[
            ['#475569', 'Road network'],
            ['#16a34a', 'Green signal'],
            ['#d97706', 'Amber signal'],
            ['#dc2626', 'Red signal'],
            ['#7c3aed', 'Hospital destination'],
            ['#ef4444', 'Incident'],
          ].map(([color, label]) => (
            <div key={label} className="mb-1 flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
              <span className="text-[9px] font-medium text-slate-600">{label}</span>
            </div>
          ))}
          {activeAmbulance && (
            <>
              <div className="mt-2 flex items-center gap-2 border-t border-[#1E2530] pt-2">
                <span className="text-sm" aria-hidden="true">🚑</span>
                <span className="text-[9px] font-bold text-red-700">AMBULANCE · ACTIVE ROUTE</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="h-0 w-4 border-t-2 border-dashed border-red-500" />
                <span className="text-[9px] font-medium text-slate-600">Emergency route</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Junction detail panel */}
      {showJunctionPanel && currentSelectedJunction && (
        <JunctionPanel
          junction={currentSelectedJunction}
          onClose={() => setSelectedJunction(null)}
        />
      )}
    </div>
  );
};

export default GeoMap;
