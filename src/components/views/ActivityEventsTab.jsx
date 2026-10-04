import React, { useState } from 'react';
import { useTraffic } from '../../context/TrafficContext';
import { SourceBadge } from '../map/GeoMap';
import { Activity, Clock, Filter, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';

export const ActivityEventsTab = () => {
  const { events, ambulance } = useTraffic();
  const [filterCategory, setFilterCategory] = useState('ALL');

  const filteredEvents = events.filter(e => {
    if (filterCategory === 'ALL') return true;
    return e.category === filterCategory;
  });

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#090B0D]">
      {/* HEADER */}
      <div className="bg-[#14181C] p-4 rounded-xl border border-[#242A30] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Traffic Incidents & Control Events Log
            </h3>
            <p className="text-[11px] text-[#737B82]">
              Real-time audit log of congestion warnings, emergency dispatches, and manual signal overrides
            </p>
          </div>
        </div>

        <SourceBadge type="SIMULATED" label="SIMULATED & SYSTEM EVENTS" />
      </div>

      {/* EMERGENCY AMBULANCE BANNER (IF ACTIVE) */}
      {ambulance.active && (
        <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-red-500/20 text-red-400 flex items-center justify-center font-bold">
              AMB
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">Emergency Dispatch: AMB-102</span>
                <SourceBadge type="SIMULATED" label="SIMULATED AMBULANCE GPS" />
              </div>
              <p className="text-[11px] text-[#B8BEC4] mt-0.5">
                Route: {ambulance.origin} → {ambulance.destination} (ETA: {ambulance.eta})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-red-500/20 text-red-400 text-xs font-mono font-bold border border-red-500/30">
              CORRIDOR {ambulance.corridorApproved ? 'APPROVED' : 'PENDING'}
            </span>
          </div>
        </div>
      )}

      {/* FILTER BAR */}
      <div className="bg-[#14181C] p-4 rounded-xl border border-[#242A30] flex items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#181D21] border border-[#242A30] text-xs font-semibold text-white">
            <Filter className="w-4 h-4 text-amber-400" />
            <span>Filter:</span>
          </div>
          {['ALL', 'TRAFFIC', 'SIGNAL', 'EMERGENCY', 'SYSTEM'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                filterCategory === cat
                  ? 'bg-amber-500 text-black border-amber-500'
                  : 'bg-[#181D21] text-[#737B82] border-[#242A30] hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="text-xs text-[#737B82] font-mono">
          Total Recorded: <strong className="text-white">{filteredEvents.length}</strong>
        </div>
      </div>

      {/* EVENTS TIMELINE LIST */}
      <div className="bg-[#14181C] p-6 rounded-xl border border-[#242A30] space-y-4">
        <div className="flex items-center justify-between border-b border-[#242A30] pb-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-400" />
            Control Center Audit Log
          </h3>
          <SourceBadge type="SIMULATED" label="SIMULATED TELEMETRY LOG" />
        </div>

        <div className="space-y-3">
          {filteredEvents.map((evt) => {
            let categoryColor = 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            if (evt.category === 'EMERGENCY') categoryColor = 'bg-red-500/20 text-red-400 border-red-500/40';
            else if (evt.category === 'SIGNAL') categoryColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
            else if (evt.category === 'TRAFFIC') categoryColor = 'bg-amber-500/20 text-amber-400 border-amber-500/30';

            return (
              <div
                key={evt.id}
                className="p-4 rounded-xl bg-[#181D21] border border-[#242A30] hover:border-[#2A323A] transition-all flex items-start justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <div className="font-mono text-xs font-bold text-amber-400 bg-[#0E1114] px-2.5 py-1 rounded border border-[#242A30] flex items-center gap-1.5 shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                    {evt.time}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${categoryColor}`}>
                        {evt.category}
                      </span>
                      <span className="text-xs font-bold text-[#737B82]">Location: {evt.location}</span>
                    </div>
                    <h4 className="text-sm font-bold text-white">{evt.title}</h4>
                    <p className="text-xs text-[#B8BEC4]">{evt.description}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-mono text-[10px] text-[#737B82]">{evt.id}</span>
                  <div className="text-[10px] font-bold text-emerald-400 mt-1">{evt.status}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
