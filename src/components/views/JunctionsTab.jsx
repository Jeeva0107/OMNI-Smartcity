import React, { useState } from 'react';
import { useTraffic } from '../../context/TrafficContext';
import { JunctionPanel, SourceBadge } from '../map/GeoMap';
import { Search, Zap } from 'lucide-react';

const SIGNAL_COLOR = {
  GREEN:  'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
  RED:    'text-red-400 bg-red-500/10 border-red-500/25',
  YELLOW: 'text-amber-400 bg-amber-500/10 border-amber-500/25',
  ALL_RED:'text-red-300 bg-red-700/10 border-red-700/25',
  OPTIMIZING: 'text-sky-400 bg-sky-500/10 border-sky-500/25',
};

const STATUS_ROW = {
  SMOOTH:   'border-l-emerald-500',
  MODERATE: 'border-l-amber-500',
  HIGH:     'border-l-orange-500',
  CRITICAL: 'border-l-red-500',
};

export const JunctionsTab = () => {
  const { junctions, transitionSignal } = useTraffic();
  const [selectedJunction, setSelectedJunction] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingSignal, setPendingSignal] = useState({});

  const filtered = junctions.filter(j =>
    j.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    j.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSignalOverride = (junctionId, signal) => {
    setPendingSignal(prev => ({ ...prev, [junctionId]: true }));
    transitionSignal(junctionId, signal);
    setTimeout(() => setPendingSignal(prev => ({ ...prev, [junctionId]: false })), 3500);
  };

  return (
    <div className="flex-1 overflow-hidden flex">

      {/* Junction list */}
      <div className="w-80 border-r border-[#1A2028] flex flex-col">
        <div className="p-3 border-b border-[#1A2028]">
          <div className="flex items-center gap-2 bg-[#10141A] border border-[#1A2028] rounded-lg px-3 py-2">
            <Search className="w-3.5 h-3.5 text-[#5A636B]" />
            <input
              type="text"
              placeholder="Search junctions..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent text-xs text-white placeholder-[#3D4850] outline-none w-full"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {filtered.map(j => (
            <button
              key={j.id}
              onClick={() => setSelectedJunction(j)}
              className={`w-full text-left bg-[#10141A] p-3 rounded-lg border border-[#1A2028] border-l-2 ${STATUS_ROW[j.status] || 'border-l-[#1A2028]'} ${
                selectedJunction?.id === j.id ? 'bg-[#141A22] border-amber-500/40' : 'hover:bg-[#141A20]'
              } transition-colors`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-data font-bold text-[10px] text-[#5A636B]">{j.id}</span>
                  <span className="text-xs font-semibold text-white">{j.name}</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border font-data ${SIGNAL_COLOR[j.signal] || SIGNAL_COLOR.RED}`}>
                  {j.signal}
                </span>
              </div>
              <div className="text-[9px] text-[#5A636B] mt-1 truncate">{j.address}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Detail panel */}
      <div className="flex-1 overflow-y-auto p-5">
        {selectedJunction ? (
          <div className="max-w-2xl space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-data font-bold text-[10px] text-[#5A636B] bg-[#10141A] px-2 py-0.5 rounded border border-[#1A2028]">{selectedJunction.id}</span>
                  <SourceBadge source={selectedJunction.dataSource} />
                </div>
                <h2 className="text-lg font-bold text-white">{selectedJunction.name}</h2>
                <p className="text-[11px] text-[#5A636B] mt-0.5">{selectedJunction.address}</p>
                <p className="text-[10px] text-[#3D4850] mt-0.5 font-data">
                  {selectedJunction.lat.toFixed(6)}°N, {selectedJunction.lng.toFixed(6)}°E · WGS-84
                </p>
              </div>
            </div>

            {/* Traffic metrics */}
            <div>
              <div className="text-[9px] font-bold text-[#5A636B] uppercase tracking-wider mb-2 flex items-center gap-2">
                Traffic Metrics <SourceBadge source="SIMULATED" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Vehicles', value: selectedJunction.vehicles },
                  { label: 'Queue', value: `${selectedJunction.queue} veh` },
                  { label: 'Avg Speed', value: `${selectedJunction.speed} km/h` },
                  { label: 'Flow Rate', value: `${selectedJunction.flow} v/min` },
                  { label: 'Pedestrians', value: selectedJunction.pedestrians },
                  { label: 'D/S Capacity', value: `${selectedJunction.downstreamCapacity}%` },
                ].map(m => (
                  <div key={m.label} className="bg-[#10141A] p-3 rounded-lg border border-[#1A2028]">
                    <div className="text-[9px] text-[#5A636B] font-bold uppercase">{m.label}</div>
                    <div className="font-data font-bold text-white text-base mt-1">{m.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Signal control */}
            <div className="bg-[#10141A] p-4 rounded-xl border border-[#1A2028]">
              <div className="text-[9px] font-bold text-[#5A636B] uppercase tracking-wider mb-3 flex items-center gap-2">
                Signal Control <SourceBadge source="SIMULATED" />
                <span className="text-[9px] text-[#3D4850] font-normal italic">(prototype — no physical signal connected)</span>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div>
                  <div className="text-[9px] text-[#5A636B] mb-1">Current state</div>
                  <span className={`px-3 py-1.5 rounded font-data font-bold text-xs border ${SIGNAL_COLOR[selectedJunction.signal] || SIGNAL_COLOR.RED}`}>
                    ● {selectedJunction.signal}
                  </span>
                </div>
                <div className="text-[#3D4850]">→</div>
                <div>
                  <div className="text-[9px] text-[#5A636B] mb-1">Recommended</div>
                  <span className={`px-3 py-1.5 rounded font-data font-bold text-xs border ${SIGNAL_COLOR[selectedJunction.recommendedSignal] || SIGNAL_COLOR.GREEN}`}>
                    {selectedJunction.recommendedSignal}
                  </span>
                </div>
              </div>
              <div className="bg-[#0C0F13] rounded-lg p-2.5 border border-[#1A2028] text-[10px] text-[#8A939B] mb-3 flex items-start gap-2">
                <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <span>{selectedJunction.signalReason}</span>
              </div>
              <div className="flex gap-2">
                {['GREEN', 'YELLOW', 'RED'].map(sig => (
                  <button
                    key={sig}
                    onClick={() => handleSignalOverride(selectedJunction.id, sig)}
                    disabled={pendingSignal[selectedJunction.id]}
                    className={`px-3 py-1.5 rounded text-[10px] font-bold border transition-colors disabled:opacity-50 ${
                      sig === 'GREEN'  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20' :
                      sig === 'YELLOW' ? 'bg-amber-500/10 text-amber-400 border-amber-500/25 hover:bg-amber-500/20' :
                      'bg-red-500/10 text-red-400 border-red-500/25 hover:bg-red-500/20'
                    }`}
                  >
                    Set {sig}
                  </button>
                ))}
                {pendingSignal[selectedJunction.id] && (
                  <span className="text-[10px] text-[#5A636B] self-center animate-pulse">Transitioning…</span>
                )}
              </div>
            </div>

            {/* Infrastructure */}
            <div className="bg-[#10141A] p-4 rounded-xl border border-[#1A2028]">
              <div className="text-[9px] font-bold text-[#5A636B] uppercase tracking-wider mb-3 flex items-center gap-2">
                Nearby Infrastructure <SourceBadge source="STATIC" />
              </div>
              <div className="space-y-1.5 text-[10px]">
                <div className="flex items-center gap-2 text-[#8A939B]">
                  <span className="text-red-400">🏥</span>
                  <span>{selectedJunction.nearestHospital}</span>
                </div>
                {(selectedJunction.nearbyLandmarks || []).map(lm => (
                  <div key={lm} className="flex items-center gap-2 text-[#5A636B]">
                    <span>📍</span>
                    <span>{lm}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Camera reference */}
            <div className="bg-[#10141A] p-4 rounded-xl border border-[#1A2028]">
              <div className="text-[9px] font-bold text-[#5A636B] uppercase tracking-wider mb-2 flex items-center gap-2">
                Camera Reference <SourceBadge source="STATIC" />
              </div>
              <div className="text-[10px] text-[#8A939B]">{selectedJunction.cameraRef}</div>
              <div className="text-[9px] text-[#3D4850] mt-1 italic">
                Camera analytics are not available in this prototype. Reference IDs link to physical camera records.
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-[#3D4850] text-sm font-semibold mb-1">Select a junction</div>
              <div className="text-[9px] text-[#2A3038]">Click any entry in the list to view details</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
