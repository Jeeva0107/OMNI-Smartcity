import React, { useState } from 'react';
import { useTraffic } from '../../context/TrafficContext';
import { GeoMap, SourceBadge } from '../map/GeoMap';
import { CheckCircle, Clock, MapPin, Navigation, ArrowRight } from 'lucide-react';

const CONGESTION_STYLE = {
  LOW:      { text: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/25', label: 'Low' },
  MODERATE: { text: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/25',   label: 'Moderate' },
  HIGH:     { text: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/25',       label: 'High' },
};

export const RouteEtaTab = () => {
  const { routes, junctions, selectedRouteId, setSelectedRouteId } = useTraffic();
  const [origin, setOrigin] = useState('J1');
  const [destination, setDestination] = useState('J9');

  const selectedRoute = routes.find(r => r.id === selectedRouteId) || routes[1];

  // Compute ETA from simulated junction speeds
  const computeETA = (route) => {
    const pathJunctions = route.path.map(id => junctions.find(j => j.id === id)).filter(Boolean);
    if (pathJunctions.length === 0) return route.estimatedTime;
    const avgSpeed = pathJunctions.reduce((s, j) => s + j.speed, 0) / pathJunctions.length;
    if (avgSpeed < 1) return route.estimatedTime;
    return Math.round((route.distance / avgSpeed) * 60);
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Control bar */}
      <div className="px-5 py-3 border-b border-[#1A2028] flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-2 bg-[#10141A] border border-[#1A2028] rounded-lg px-3 py-2">
          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[10px] text-[#5A636B]">Origin</span>
          <select
            value={origin}
            onChange={e => setOrigin(e.target.value)}
            className="bg-transparent text-white font-data font-bold text-xs outline-none"
          >
            {junctions.map(j => <option key={j.id} value={j.id}>{j.id} — {j.name}</option>)}
          </select>
        </div>

        <ArrowRight className="w-4 h-4 text-[#3D4850]" />

        <div className="flex items-center gap-2 bg-[#10141A] border border-[#1A2028] rounded-lg px-3 py-2">
          <Navigation className="w-3.5 h-3.5 text-red-400" />
          <span className="text-[10px] text-[#5A636B]">Destination</span>
          <select
            value={destination}
            onChange={e => setDestination(e.target.value)}
            className="bg-transparent text-white font-data font-bold text-xs outline-none"
          >
            {junctions.map(j => <option key={j.id} value={j.id}>{j.id} — {j.name}</option>)}
          </select>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] text-[#5A636B]">ETA calculation:</span>
          <SourceBadge source="SIMULATED" />
          <span className="text-[9px] text-[#3D4850] italic">(distance ÷ avg simulated speed)</span>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* Route list */}
        <div className="w-80 border-r border-[#1A2028] flex flex-col overflow-y-auto p-3 space-y-3">
          <div className="text-[9px] font-bold text-[#5A636B] uppercase tracking-wider px-1">
            Route Alternatives ({routes.length})
          </div>

          {routes.map(route => {
            const isSelected = route.id === selectedRouteId;
            const eta = computeETA(route);
            const cs = CONGESTION_STYLE[route.congestion] || CONGESTION_STYLE.HIGH;

            return (
              <button
                key={route.id}
                onClick={() => setSelectedRouteId(route.id)}
                className={`w-full text-left p-4 rounded-xl border transition-colors ${
                  route.isRecommended
                    ? 'border-amber-500/35 bg-[#141A14]'
                    : isSelected
                    ? 'border-sky-500/25 bg-[#10141A]'
                    : 'border-[#1A2028] bg-[#10141A] hover:bg-[#141A20]'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-data font-bold text-[9px] text-[#5A636B] bg-[#0C0F13] px-2 py-0.5 rounded border border-[#1A2028]">{route.id}</span>
                      {route.isRecommended && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-amber-500 text-black">
                          RECOMMENDED
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-semibold text-white">{route.name}</div>
                  </div>
                </div>

                {/* ETA and stats */}
                <div className="grid grid-cols-3 gap-2 bg-[#0C0F13] p-2.5 rounded-lg border border-[#1A2028] mb-3">
                  <div className="text-center">
                    <div className="text-[8px] text-[#5A636B] font-bold uppercase">Distance</div>
                    <div className="font-data font-bold text-white text-sm mt-0.5">{route.distance} km</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[8px] text-[#5A636B] font-bold uppercase">Est. ETA</div>
                    <div className={`font-data font-bold text-sm mt-0.5 ${route.isRecommended ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {eta} min
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[8px] text-[#5A636B] font-bold uppercase">Congestion</div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${cs.bg} ${cs.text} font-data`}>
                      {cs.label}
                    </span>
                  </div>
                </div>

                {/* Path nodes */}
                <div className="flex items-center gap-1 flex-wrap mb-2">
                  {route.pathNames.map((name, idx) => (
                    <React.Fragment key={idx}>
                      <span className="text-[9px] text-[#8A939B] bg-[#0C0F13] px-1.5 py-0.5 rounded border border-[#1A2028]">
                        {route.path[idx]}
                      </span>
                      {idx < route.path.length - 1 && (
                        <span className="text-[#3D4850] text-[9px]">→</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>

                {/* Rationale */}
                <div className="text-[9px] text-[#5A636B] leading-relaxed">{route.reason}</div>

                {/* Source badge */}
                <div className="mt-2"><SourceBadge source={route.dataSource} /></div>
              </button>
            );
          })}
        </div>

        {/* Map with route overlay */}
        <div className="flex-1 p-4">
          <GeoMap selectedRoute={selectedRoute} onSelectJunction={() => {}} />
        </div>

        {/* Active route detail */}
        <div className="w-64 border-l border-[#1A2028] flex flex-col p-4 space-y-4 overflow-y-auto">
          <div className="text-[9px] font-bold text-[#5A636B] uppercase tracking-wider">
            Route Detail
          </div>

          {selectedRoute && (() => {
            const eta = computeETA(selectedRoute);
            const cs = CONGESTION_STYLE[selectedRoute.congestion] || CONGESTION_STYLE.HIGH;

            return (
              <div className="space-y-3">
                <div className="bg-[#10141A] p-3 rounded-lg border border-[#1A2028]">
                  <div className="text-[9px] text-[#5A636B] font-bold uppercase mb-1">Route</div>
                  <div className="text-xs font-semibold text-white">{selectedRoute.name}</div>
                </div>

                <div className="bg-[#10141A] p-3 rounded-lg border border-[#1A2028]">
                  <div className="text-[9px] text-[#5A636B] font-bold uppercase mb-1">Origin → Destination</div>
                  <div className="text-[10px] text-[#8A939B]">{selectedRoute.originName}</div>
                  <div className="text-[9px] text-[#3D4850] my-1">↓</div>
                  <div className="text-[10px] text-[#8A939B]">{selectedRoute.destinationName}</div>
                </div>

                <div className="bg-[#10141A] p-3 rounded-lg border border-[#1A2028]">
                  <div className="text-[9px] text-[#5A636B] font-bold uppercase mb-2 flex items-center gap-2">
                    ETA (Traffic-Weighted)
                    <SourceBadge source="SIMULATED" />
                  </div>
                  <div className="font-data font-bold text-2xl text-white">{eta} <span className="text-sm text-[#5A636B]">min</span></div>
                  <div className="text-[9px] text-[#3D4850] mt-1">Based on {selectedRoute.path.length} junctions × avg simulated speed</div>
                </div>

                <div className="bg-[#10141A] p-3 rounded-lg border border-[#1A2028]">
                  <div className="text-[9px] text-[#5A636B] font-bold uppercase mb-1">Distance</div>
                  <div className="font-data font-bold text-white text-base">{selectedRoute.distance} km</div>
                </div>

                <div className="bg-[#10141A] p-3 rounded-lg border border-[#1A2028]">
                  <div className="text-[9px] text-[#5A636B] font-bold uppercase mb-1">Congestion Level</div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold border font-data ${cs.bg} ${cs.text}`}>
                    {selectedRoute.congestion}
                  </span>
                </div>

                <div className="text-[9px] text-[#3D4850] leading-relaxed p-3 bg-[#0C0F13] rounded-lg border border-[#1A2028]">
                  {selectedRoute.reason}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};
