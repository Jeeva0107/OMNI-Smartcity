import React, { useState } from 'react';
import { useTraffic } from '../../context/TrafficContext';
import { JunctionModal } from '../map/CityMap';
import {
  BrainCircuit,
  Camera,
  Car,
  CheckCircle2,
  Cpu,
  Eye,
  Flame,
  LineChart,
  ShieldCheck,
  Zap
} from 'lucide-react';

export const TrafficIntelligenceTab = () => {
  const { junctions } = useTraffic();
  const [selectedJunctionForModal, setSelectedJunctionForModal] = useState(null);

  const vehicleStats = [
    { label: 'Cars', count: 1240, percentage: 60.6, color: 'bg-blue-500' },
    { label: 'Motorcycles', count: 467, percentage: 22.8, color: 'bg-cyan-400' },
    { label: 'Buses', count: 114, percentage: 5.6, color: 'bg-amber-400' },
    { label: 'Trucks', count: 221, percentage: 10.8, color: 'bg-[#737B82]' },
    { label: 'Emergency Vehicles', count: 2, percentage: 0.2, color: 'bg-red-500' }
  ];

  const predictedAlerts = [
    { junctionId: 'J5', time: 'In 10 min', status: 'HIGH CONGESTION PREDICTED', confidence: '94%', reason: 'Upstream vehicle flow surge from North Expressway.' },
    { junctionId: 'J2', time: 'In 15 min', status: 'QUEUE BUILDUP EXPECTED', confidence: '88%', reason: 'Evening bottleneck pattern detected by vision model.' },
    { junctionId: 'J8', time: 'In 25 min', status: 'STALL RESOLUTION', confidence: '91%', reason: 'Flow recovery projected after signal cycle adjustment.' }
  ];

  const handleOpenJunction = (id) => {
    const j = junctions.find(item => item.id === id);
    if (j) setSelectedJunctionForModal(j);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* COMPUTER VISION & YOLO ENGINE STATUS HEADER */}
      <div className="bg-[#14181C] p-5 rounded-xl border border-[#242A30] space-y-4">
        <div className="flex items-center justify-between border-b border-[#242A30] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <BrainCircuit className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Computer Vision & AI Detection Status
              </h3>
              <p className="text-xs text-[#737B82]">
                Real-time YOLO object detection, tracking and velocity inference
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#181D21] border border-emerald-500/30 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              YOLO ENGINE: ONLINE
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#181D21] border border-emerald-500/30 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              TRACKING: ONLINE
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#181D21] border border-emerald-500/30 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              FEEDS: 12/12 ACTIVE
            </div>
          </div>
        </div>

        {/* VEHICLE CLASSIFICATION COUNTERS ROW */}
        <div>
          <div className="text-[10px] font-bold text-[#737B82] uppercase tracking-wider mb-3">
            Real-Time Vehicle Classification (YOLO Monitored)
          </div>
          <div className="grid grid-cols-5 gap-4">
            {vehicleStats.map((item) => (
              <div key={item.label} className="bg-[#181D21] p-3.5 rounded-xl border border-[#242A30] space-y-1">
                <div className="text-[10px] text-[#737B82] font-semibold">{item.label}</div>
                <div className="text-xl font-mono font-bold text-white">{item.count.toLocaleString()}</div>
                <div className="w-full bg-[#0E1114] h-1.5 rounded-full overflow-hidden mt-2">
                  <div className={`h-full ${item.color}`} style={{ width: `${item.percentage}%` }} />
                </div>
                <div className="text-[9px] text-[#737B82] text-right font-mono">{item.percentage}% total</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CHARTS & PREDICTIVE ANALYTICS GRID */}
      <div className="grid grid-cols-12 gap-6">
        {/* DENSITY TREND & FLOW GRAPH (8 COLS) */}
        <div className="col-span-8 bg-[#14181C] p-5 rounded-xl border border-[#242A30] flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <LineChart className="w-4 h-4 text-amber-400" />
                Traffic Density & Vehicle Flow (Last 30 Minutes)
              </h3>
              <p className="text-[11px] text-[#737B82]">System-wide vehicle volume vs flow velocity index</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1 text-amber-400"><span className="w-2 h-2 rounded bg-amber-400" /> Vehicle Volume</span>
              <span className="flex items-center gap-1 text-cyan-400"><span className="w-2 h-2 rounded bg-cyan-400" /> Flow Rate (v/m)</span>
            </div>
          </div>

          {/* VISUAL MOCK GRAPH */}
          <div className="h-64 w-full bg-[#0E1114] rounded-lg border border-[#242A30] p-4 flex flex-col justify-between">
            <svg viewBox="0 0 600 180" className="w-full h-full overflow-visible">
              <line x1="0" y1="30" x2="600" y2="30" stroke="#1D2328" strokeDasharray="4" />
              <line x1="0" y1="75" x2="600" y2="75" stroke="#1D2328" strokeDasharray="4" />
              <line x1="0" y1="120" x2="600" y2="120" stroke="#1D2328" strokeDasharray="4" />
              <line x1="0" y1="160" x2="600" y2="160" stroke="#242A30" />

              <path
                d="M 0,140 Q 100,60 200,90 T 400,30 T 600,70 L 600,160 L 0,160 Z"
                fill="rgba(245, 158, 11, 0.15)"
              />
              <path
                d="M 0,140 Q 100,60 200,90 T 400,30 T 600,70"
                fill="none"
                stroke="#F59E0B"
                strokeWidth="3"
              />

              <path
                d="M 0,80 Q 100,130 200,110 T 400,150 T 600,100"
                fill="none"
                stroke="#06B6D4"
                strokeWidth="2.5"
                strokeDasharray="6,3"
              />

              <circle cx="200" cy="90" r="4" fill="#F59E0B" />
              <circle cx="400" cy="30" r="5" fill="#EF4444" />
              <circle cx="600" cy="70" r="4" fill="#F59E0B" />
            </svg>

            <div className="flex justify-between text-[10px] text-[#737B82] font-mono border-t border-[#242A30] pt-2">
              <span>10:20 AM</span>
              <span>10:25 AM</span>
              <span>10:30 AM</span>
              <span>10:35 AM</span>
              <span>10:40 AM</span>
              <span>10:45 AM (NOW)</span>
            </div>
          </div>
        </div>

        {/* TOP CONGESTED & PREDICTIVE ALERTS (4 COLS) */}
        <div className="col-span-4 space-y-6">
          {/* PREDICTED CONGESTION CARD */}
          <div className="bg-[#14181C] p-4 rounded-xl border border-[#242A30] space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              AI Congestion Predictions
            </h3>

            <div className="space-y-2.5">
              {predictedAlerts.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => handleOpenJunction(item.junctionId)}
                  className="p-3 rounded-lg bg-[#181D21] border border-[#242A30] hover:border-amber-500/40 cursor-pointer space-y-1 transition-all"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-amber-400">{item.junctionId} • {item.time}</span>
                    <span className="text-[10px] font-mono text-emerald-400">Conf: {item.confidence}</span>
                  </div>
                  <div className="font-bold text-white text-xs">{item.status}</div>
                  <p className="text-[10px] text-[#737B82]">{item.reason}</p>
                </div>
              ))}
            </div>
          </div>

          {/* TOP CONGESTED JUNCTIONS RANK LIST */}
          <div className="bg-[#14181C] p-4 rounded-xl border border-[#242A30] space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Flame className="w-4 h-4 text-red-400" />
              Top Congested Junctions (Click to View)
            </h3>

            <div className="space-y-2">
              {junctions
                .slice()
                .sort((a, b) => b.vehicles - a.vehicles)
                .slice(0, 4)
                .map((j, idx) => (
                  <div
                    key={j.id}
                    onClick={() => handleOpenJunction(j.id)}
                    className="flex items-center justify-between p-2.5 bg-[#181D21] hover:bg-[#242A30] rounded-lg border border-[#242A30] cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded bg-[#0E1114] text-amber-400 text-xs font-mono font-bold flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <div>
                        <div className="font-mono font-bold text-white text-xs">{j.id} - {j.name}</div>
                        <div className="text-[10px] text-[#737B82]">Queue: {j.queue} vehicles</div>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-amber-400 text-xs">{j.vehicles} veh</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
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
