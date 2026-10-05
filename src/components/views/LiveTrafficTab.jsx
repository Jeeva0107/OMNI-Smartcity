import React, { useState } from 'react';
import { useTraffic } from '../../context/TrafficContext';
import { GeoMap, JunctionPanel, SourceBadge } from '../map/GeoMap';
import { Filter } from 'lucide-react';

const SIGNAL_COLOR = {
  GREEN:  'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
  RED:    'bg-red-500/20 text-red-400 border-red-500/40',
  YELLOW: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  ALL_RED:'bg-red-700/20 text-red-300 border-red-700/40',
};

export const LiveTrafficTab = () => {
  const { junctions, filterTraffic, setFilterTraffic } = useTraffic();
  const [selectedJunction, setSelectedJunction] = useState(null);

  const filtered = filterTraffic === 'ALL' ? junctions : junctions.filter(j => j.status === filterTraffic);

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Filter bar */}
      <div className="px-5 py-3 border-b border-[#1A2028] flex items-center gap-3 shrink-0">
        <Filter className="w-3.5 h-3.5 text-[#5A636B]" />
        <span className="text-[10px] text-[#5A636B] font-semibold uppercase tracking-wider">Filter:</span>
        {['ALL', 'SMOOTH', 'MODERATE', 'HIGH', 'CRITICAL'].map(level => (
          <button
            key={level}
            onClick={() => setFilterTraffic(level)}
            className={`px-2.5 py-1 rounded text-[10px] font-semibold border transition-colors ${
              filterTraffic === level
                ? 'bg-amber-500 text-black border-amber-500'
                : 'bg-[#10141A] text-[#5A636B] border-[#1A2028] hover:text-[#8A939B]'
            }`}
          >
            {level} ({level === 'ALL' ? junctions.length : junctions.filter(j => j.status === level).length})
          </button>
        ))}
        <div className="ml-auto text-[10px] text-[#5A636B] font-mono">
          {filtered.length} of {junctions.length} junctions
          <SourceBadge source="SIMULATED" />
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* Map */}
        <div className="flex-1 p-4 relative">
          <GeoMap
            showJunctionMarkers={false}
            onSelectJunction={(id) => {
              const j = junctions.find(item => item.id === id);
              if (j) setSelectedJunction(j);
            }}
          />
          {selectedJunction && (
            <JunctionPanel
              junction={selectedJunction}
              onClose={() => setSelectedJunction(null)}
            />
          )}
        </div>

        {/* Junction list */}
        <div className="w-72 border-l border-[#1A2028] overflow-y-auto p-3 space-y-2">
          <div className="text-[9px] font-bold text-[#5A636B] uppercase tracking-wider px-1 mb-2">
            Junction Telemetry
          </div>
          {filtered.map(j => {
            const statusColor =
              j.status === 'CRITICAL' ? 'border-l-red-500' :
              j.status === 'HIGH'     ? 'border-l-orange-500' :
              j.status === 'MODERATE' ? 'border-l-amber-500' : 'border-l-emerald-500';

            return (
              <button
                key={j.id}
                onClick={() => setSelectedJunction(j)}
                className={`w-full text-left bg-[#10141A] p-3 rounded-lg border border-[#1A2028] border-l-2 ${statusColor} hover:bg-[#141A20] transition-colors`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-data font-bold text-[10px] text-[#5A636B]">{j.id}</span>
                    <span className="text-xs font-semibold text-white truncate max-w-[120px]">{j.name}</span>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border font-data ${SIGNAL_COLOR[j.signal] || SIGNAL_COLOR.RED}`}>
                    {j.signal}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1 text-center">
                  {[
                    { label: 'Vehicles', value: j.vehicles },
                    { label: 'Queue', value: j.queue },
                    { label: 'Speed', value: `${j.speed}` },
                    { label: 'Flow', value: j.flow },
                  ].map(m => (
                    <div key={m.label}>
                      <div className="text-[8px] text-[#5A636B] uppercase">{m.label}</div>
                      <div className="font-data font-bold text-[11px] text-white">{m.value}</div>
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
