import React, { useState } from 'react';
import { useTraffic } from '../../context/TrafficContext';
import { SourceBadge } from '../map/GeoMap';
import { Activity, Clock, Filter, AlertTriangle, CheckCircle, ShieldAlert, UserCheck, Radio, Cpu, RefreshCw } from 'lucide-react';

export const ActivityEventsTab = () => {
  const { events, ambulance } = useTraffic();
  const [filterCategory, setFilterCategory] = useState('ALL');

  const categories = [
    { id: 'ALL', label: 'ALL EVENTS' },
    { id: 'ALERTS', label: 'ALERTS' },
    { id: 'AI_RECOMMENDATION', label: 'AI RECOM.' },
    { id: 'LOW_CONFIDENCE', label: 'LOW CONFIDENCE' },
    { id: 'OPERATOR_OVERRIDE', label: 'OPERATOR OVERRIDE' },
    { id: 'EMERGENCY', label: 'EMERGENCY' },
    { id: 'ROUTE_CHANGE', label: 'ROUTE CHANGE' },
    { id: 'SYSTEM_FAILURE', label: 'SYSTEM / DATA' },
  ];

  const filteredEvents = (events || []).filter(e => {
    if (filterCategory === 'ALL') return true;
    if (filterCategory === 'ALERTS') return e.severity === 'WARNING' || e.severity === 'CRITICAL';
    if (filterCategory === 'AI_RECOMMENDATION') return e.category === 'SIGNAL' || e.source === 'OPERATOR_DECISION_SUPPORT';
    if (filterCategory === 'LOW_CONFIDENCE') return e.title?.toLowerCase().includes('confidence') || e.category === 'LOW_CONFIDENCE';
    if (filterCategory === 'OPERATOR_OVERRIDE') return e.source === 'MANUAL_OVERRIDE' || e.category === 'OVERRIDE';
    if (filterCategory === 'EMERGENCY') return e.category === 'EMERGENCY';
    if (filterCategory === 'ROUTE_CHANGE') return e.category === 'ROUTE';
    if (filterCategory === 'SYSTEM_FAILURE') return e.category === 'SYSTEM';
    return true;
  });

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#090B0D]">
      {/* HEADER */}
      <div className="bg-[#14181C] p-4 rounded-xl border border-[#242A30] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <Activity className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Control Room Audit Trail &amp; Event Stream
            </h3>
            <p className="text-[11px] text-[#737B82]">
              Chronological log of alerts, AI recommendations, low-confidence decisions, operator overrides &amp; data source events
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-3 py-1 rounded bg-[#181D21] border border-[#242A30] text-[#B8BEC4]">
            TOTAL AUDITED: <strong className="text-amber-400">{events?.length || 0}</strong>
          </span>
        </div>
      </div>

      {/* EMERGENCY DISPATCH BANNER IF ACTIVE */}
      {ambulance.active && (
        <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-red-500/20 text-red-400 flex items-center justify-center font-bold font-mono">
              AMB
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">Active Emergency Dispatch: {ambulance.callsign || 'AMB-102'}</span>
                <SourceBadge source="SIMULATED" label="GPS STREAM" />
              </div>
              <p className="text-[11px] text-[#B8BEC4] mt-0.5 font-mono">
                {ambulance.origin} → {ambulance.destination} (ETA: {ambulance.eta})
              </p>
            </div>
          </div>

          <span className="px-2.5 py-1 rounded bg-red-500/20 text-red-400 text-xs font-mono font-bold border border-red-500/30">
            CORRIDOR {ambulance.corridorApproved ? 'APPROVED' : 'PENDING'}
          </span>
        </div>
      )}

      {/* FILTER BAR */}
      <div className="bg-[#14181C] p-4 rounded-xl border border-[#242A30] flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181D21] border border-[#242A30] text-xs font-semibold text-white">
            <Filter className="w-3.5 h-3.5 text-amber-400" />
            <span>Filter Category:</span>
          </div>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold border transition-all ${
                filterCategory === cat.id
                  ? 'bg-amber-500 text-black border-amber-500 shadow-glow'
                  : 'bg-[#181D21] text-[#737B82] border-[#242A30] hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* EVENTS TIMELINE STREAM */}
      <div className="bg-[#14181C] p-5 rounded-xl border border-[#242A30] space-y-4">
        <div className="flex items-center justify-between border-b border-[#242A30] pb-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-400" />
            Audited Event Log Stream
          </h3>
          <span className="text-[10px] text-[#5A636B] font-mono">Sorted by latest timestamp</span>
        </div>

        <div className="space-y-2.5">
          {filteredEvents.map((evt) => {
            let catBadgeClass = 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
            if (evt.category === 'EMERGENCY') catBadgeClass = 'bg-red-500/15 text-red-400 border-red-500/40';
            else if (evt.category === 'SIGNAL') catBadgeClass = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
            else if (evt.severity === 'WARNING' || evt.severity === 'CRITICAL') catBadgeClass = 'bg-amber-500/15 text-amber-400 border-amber-500/30';

            const evtSource = evt.source || (evt.category === 'EMERGENCY' ? 'SIMULATED' : 'TOMTOM_LIVE');

            return (
              <div
                key={evt.id}
                className="p-3.5 rounded-xl bg-[#181D21] border border-[#242A30] hover:border-[#2E3640] transition-all flex items-start justify-between gap-4"
              >
                <div className="flex items-start gap-3.5">
                  <div className="font-mono text-xs font-bold text-amber-400 bg-[#0E1114] px-2.5 py-1 rounded border border-[#242A30] flex items-center gap-1.5 shrink-0">
                    <Clock className="w-3.5 h-3.5 text-[#5A636B]" />
                    {evt.time}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border ${catBadgeClass}`}>
                        {evt.category || 'EVENT'}
                      </span>
                      <span className="text-xs font-bold text-[#737B82]">Junction / Event: <strong className="text-white">{evt.location || evt.locationName || 'N/A'}</strong></span>
                      <SourceBadge source={evtSource} />
                    </div>
                    <h4 className="text-xs font-bold text-white">{evt.title}</h4>
                    <p className="text-[11px] text-[#8A939B]">{evt.description}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-mono text-[9px] text-[#5A636B]">{evt.id}</span>
                  <div className="text-[10px] font-mono font-bold text-emerald-400 mt-1">{evt.status || 'LOGGED'}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ActivityEventsTab;
