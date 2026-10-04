import React, { useState } from 'react';
import { useTraffic } from '../../context/TrafficContext';
import { JunctionModal } from '../map/CityMap';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Play,
  RotateCcw,
  Sliders,
  TrafficCone,
  Zap
} from 'lucide-react';

export const JunctionControlTab = () => {
  const { junctions, transitionSignal } = useTraffic();
  const [selectedJunctionForModal, setSelectedJunctionForModal] = useState(null);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* CONTROL HEADER */}
      <div className="bg-[#14181C] p-4 rounded-xl border border-[#242A30] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <TrafficCone className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Autonomous Signal Coordination & Manual Override Engine
            </h3>
            <p className="text-[11px] text-[#737B82]">
              Real-time phase optimization with safe transition sequence (RED → YELLOW → ALL_RED → GREEN)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="px-3 py-1 rounded bg-[#181D21] border border-[#242A30] text-[#B8BEC4]">
            Monitored Signals: <strong className="text-white">12 Nodes</strong>
          </span>
          <span className="px-3 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
            ● SIGNAL SAFETY GUARD ACTIVE
          </span>
        </div>
      </div>

      {/* JUNCTIONS CARDS GRID (12 JUNCTIONS) */}
      <div className="grid grid-cols-3 gap-6">
        {junctions.map((j) => {
          let statusBadge = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
          if (j.status === 'CRITICAL') statusBadge = 'bg-red-500/10 text-red-400 border-red-500/30';
          else if (j.status === 'HIGH') statusBadge = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
          else if (j.status === 'MODERATE') statusBadge = 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';

          const needsOptimization = j.signal !== j.recommendedSignal;

          return (
            <div
              key={j.id}
              className={`bg-[#14181C] p-5 rounded-xl border transition-all space-y-4 ${
                needsOptimization ? 'border-amber-500/40 shadow-glow' : 'border-[#242A30]'
              }`}
            >
              {/* CARD HEADER */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-extrabold text-white text-base px-2.5 py-1 rounded bg-[#181D21] border border-[#242A30]">
                    {j.id}
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-white">{j.name}</h4>
                    <p className="text-[10px] text-[#737B82]">Cam Feed: {j.cameraId}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${statusBadge}`}>
                  {j.status}
                </span>
              </div>

              {/* METRICS ROW */}
              <div className="grid grid-cols-4 gap-2 text-center bg-[#181D21] p-3 rounded-lg border border-[#242A30]">
                <div>
                  <div className="text-[9px] text-[#737B82] font-bold uppercase">Vehicles</div>
                  <div className="font-mono font-bold text-white text-sm mt-0.5">{j.vehicles}</div>
                </div>
                <div>
                  <div className="text-[9px] text-[#737B82] font-bold uppercase">Queue</div>
                  <div className="font-mono font-bold text-amber-400 text-sm mt-0.5">{j.queue}</div>
                </div>
                <div>
                  <div className="text-[9px] text-[#737B82] font-bold uppercase">Speed</div>
                  <div className="font-mono font-bold text-white text-sm mt-0.5">{j.speed}</div>
                </div>
                <div>
                  <div className="text-[9px] text-[#737B82] font-bold uppercase">Cap. %</div>
                  <div className="font-mono font-bold text-emerald-400 text-sm mt-0.5">{j.downstreamCapacity}%</div>
                </div>
              </div>

              {/* CURRENT vs RECOMMENDED SIGNAL COMPARISON */}
              <div className="p-3 rounded-lg bg-[#0E1114] border border-[#242A30] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#737B82]">Current State:</span>
                  <span className={`font-mono font-bold px-2 py-0.5 rounded text-[10px] ${
                    j.signal === 'GREEN' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
                    j.signal === 'YELLOW' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                    j.signal === 'ALL_RED' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40' :
                    'bg-red-500/20 text-red-400 border border-red-500/40'
                  }`}>
                    ● {j.signal}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#737B82]">AI Recommendation:</span>
                  <span className="font-mono font-bold px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/40">
                    {j.recommendedSignal}
                  </span>
                </div>

                {j.recommendedReason && (
                  <p className="text-[10px] text-[#B8BEC4] pt-1 border-t border-[#242A30] flex items-start gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>{j.recommendedReason}</span>
                  </p>
                )}
              </div>

              {/* SIGNAL ACTION BUTTONS */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  onClick={() => transitionSignal(j.id, 'GREEN')}
                  className="py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-black font-extrabold text-[10px] transition-all shadow-sm text-center"
                >
                  APPLY RECOM.
                </button>
                <button
                  onClick={() => transitionSignal(j.id, 'YELLOW')}
                  className="py-1.5 px-2 rounded-lg bg-[#181D21] border border-[#242A30] hover:bg-[#242A30] text-[#B8BEC4] font-bold text-[10px] text-center"
                >
                  HOLD
                </button>
                <button
                  onClick={() => setSelectedJunctionForModal(j)}
                  className="py-1.5 px-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 font-bold text-[10px] text-center"
                >
                  OVERRIDE
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {selectedJunctionForModal && (
        <JunctionModal
          junction={selectedJunctionForModal}
          onClose={() => setSelectedJunctionForModal(null)}
        />
      )}
    </div>
  );
};
