import React, { useState } from 'react';
import { useTraffic } from '../../context/TrafficContext';
import { CityMap } from '../map/CityMap';
import {
  CheckCircle,
  Clock,
  Compass,
  MapPin,
  Navigation,
  Route as RouteIcon,
  ShieldCheck,
  Zap
} from 'lucide-react';

export const RouteIntelligenceTab = () => {
  const { routes, selectedRouteId, setSelectedRouteId } = useTraffic();
  const [origin, setOrigin] = useState('J1');
  const [destination, setDestination] = useState('J9');

  const selectedRoute = routes.find(r => r.id === selectedRouteId) || routes[1];

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* ROUTE ENGINE CONTROL BAR */}
      <div className="bg-[#14181C] p-4 rounded-xl border border-[#242A30] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#181D21] border border-[#242A30]">
            <MapPin className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-[#737B82]">Origin:</span>
            <select
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              className="bg-transparent text-white font-mono font-bold text-xs outline-none"
            >
              <option value="J1">J1 - Kathipara Flyover</option>
              <option value="J2">J2 - Gemini Circle</option>
              <option value="J3">J3 - Koyambedu Flyover</option>
            </select>
          </div>

          <div className="text-amber-400 font-bold text-sm">➔</div>

          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#181D21] border border-[#242A30]">
            <Navigation className="w-4 h-4 text-red-400" />
            <span className="text-xs text-[#737B82]">Destination:</span>
            <select
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="bg-transparent text-white font-mono font-bold text-xs outline-none"
            >
              <option value="J7">J7 - RGGGH / Central</option>
              <option value="J9">J9 - Sholinganallur (OMR)</option>
              <option value="J12">J12 - Chennai Port Gate</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-[#737B82]">Traffic-Aware Engine:</span>
          <span className="px-3 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono text-xs font-bold">
            ● AI OPTIMIZATION ACTIVE
          </span>
        </div>
      </div>

      {/* ROUTE COMPARISON CARDS & MAP */}
      <div className="grid grid-cols-12 gap-6 h-[600px]">
        {/* AVAILABLE ROUTES COMPARISON COLUMN (5 COLS) */}
        <div className="col-span-5 h-full space-y-4 overflow-y-auto pr-1">
          <h3 className="text-xs font-bold text-[#737B82] uppercase tracking-wider">
            Evaluated Route Alternatives ({routes.length})
          </h3>

          {routes.map((route) => {
            const isSelected = route.id === selectedRouteId;
            let statusStyle = 'border-[#242A30] bg-[#14181C]';
            if (route.isRecommended) statusStyle = 'border-amber-500/50 bg-[#181D21] shadow-glow';
            else if (isSelected) statusStyle = 'border-cyan-500/50 bg-[#181D21]';

            return (
              <div
                key={route.id}
                onClick={() => setSelectedRouteId(route.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer space-y-3 ${statusStyle}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white text-xs px-2 py-0.5 rounded bg-[#0E1114] border border-[#242A30]">
                      {route.id}
                    </span>
                    <h4 className="text-xs font-bold text-white">{route.name}</h4>
                  </div>
                  {route.isRecommended && (
                    <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-amber-500 text-black shadow-glow uppercase tracking-wider">
                      AI RECOMMENDED
                    </span>
                  )}
                </div>

                {/* STATS ROW */}
                <div className="grid grid-cols-3 gap-2 text-center bg-[#0E1114] p-2.5 rounded-lg border border-[#242A30]">
                  <div>
                    <div className="text-[9px] text-[#737B82] font-bold uppercase">Distance</div>
                    <div className="font-mono font-bold text-white text-sm mt-0.5">{route.distance} km</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-[#737B82] font-bold uppercase">Est. Travel Time</div>
                    <div className={`font-mono font-bold text-sm mt-0.5 ${route.isRecommended ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {route.estimatedTime} min
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] text-[#737B82] font-bold uppercase">Congestion</div>
                    <div className={`font-mono font-bold text-xs mt-1 ${
                      route.congestion === 'LOW' ? 'text-emerald-400' :
                      route.congestion === 'MODERATE' ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {route.congestion}
                    </div>
                  </div>
                </div>

                {/* PATH NODES FLOW */}
                <div className="flex items-center gap-1.5 text-xs font-mono text-[#B8BEC4]">
                  <span className="text-[#737B82] text-[10px]">Path:</span>
                  {route.path.map((node, idx) => (
                    <React.Fragment key={idx}>
                      <span className="px-1.5 py-0.5 bg-[#14181C] rounded border border-[#242A30] text-[10px] text-white">
                        {node}
                      </span>
                      {idx < route.path.length - 1 && <span className="text-[#737B82]">→</span>}
                    </React.Fragment>
                  ))}
                </div>

                {/* AI REASON BOX */}
                <div className="p-2.5 rounded-lg bg-[#0E1114] border border-[#242A30] text-[11px] text-[#B8BEC4] flex items-start gap-2">
                  <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-amber-400">Optimization Rationale:</strong> {route.aiReason}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ROUTE MAP VISUALIZATION (7 COLS) */}
        <div className="col-span-7 h-full flex flex-col space-y-4">
          <div className="flex-1">
            <CityMap onSelectJunction={() => {}} />
          </div>

          {/* ACTIVE ROUTE BANNER */}
          <div className="p-4 rounded-xl bg-[#14181C] border border-[#242A30] flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <RouteIcon className="w-5 h-5 text-amber-400" />
              <div>
                <span className="text-[#737B82]">Active Selection: </span>
                <strong className="text-white">{selectedRoute.name}</strong>
              </div>
            </div>
            <div className="flex items-center gap-4 font-mono">
              <span className="text-[#737B82]">Est. Arrival: <strong className="text-emerald-400">{selectedRoute.estimatedTime} mins</strong></span>
              <span className="text-[#737B82]">Length: <strong className="text-white">{selectedRoute.distance} km</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
