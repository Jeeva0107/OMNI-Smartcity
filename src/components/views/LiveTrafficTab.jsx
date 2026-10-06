import React, { useState } from 'react';
import { useTraffic } from '../../context/TrafficContext';
import { GeoMap } from '../map/GeoMap';
import { Filter, Search } from 'lucide-react';

const SIGNAL_COLOR = {
  GREEN:  'bg-green-50 text-green-700 border-green-200',
  RED:    'bg-red-50 text-red-700 border-red-200',
  YELLOW: 'bg-amber-50 text-amber-700 border-amber-200',
  AMBER:  'bg-amber-50 text-amber-700 border-amber-200',
  ALL_RED:'bg-red-100 text-red-800 border-red-200',
};

export const LiveTrafficTab = () => {
  const { junctions, incidents = [], filterTraffic, setFilterTraffic } = useTraffic();
  const [selectedJunctionId, setSelectedJunctionId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = junctions.filter(junction => {
    const matchesLevel = filterTraffic === 'ALL' || junction.status === filterTraffic;
    const matchesSearch = `${junction.id} ${junction.name}`.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  return (
    <div className="light-dashboard flex-1 overflow-hidden flex flex-col bg-[var(--page-bg)]">
      <div className="flex items-center justify-between px-5 pb-2 pt-4">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900">Live Traffic</h1>
          <p className="mt-0.5 text-xs text-slate-600">Junction signals, congestion, incidents, and traffic density</p>
        </div>
      </div>
      {/* Filter bar */}
      <div className="px-5 py-3 border-b border-slate-200 flex items-center gap-3 shrink-0 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-[#5A636B]" />
        <span className="text-[10px] text-[#5A636B] font-semibold uppercase tracking-wider">Filter:</span>
        {['ALL', 'SMOOTH', 'MODERATE', 'HIGH', 'CRITICAL'].map(level => (
          <button
            key={level}
            onClick={() => setFilterTraffic(level)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-colors ${
              filterTraffic === level
                ? 'bg-violet-100 text-violet-800 border-violet-200'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {level} ({level === 'ALL' ? junctions.length : junctions.filter(j => j.status === level).length})
          </button>
        ))}
        <div className="ml-auto text-[10px] text-[#5A636B] font-mono">
          {filtered.length} of {junctions.length} junctions
        </div>
      </div>

      <div className="live-traffic-layout flex-1 min-h-0 overflow-hidden flex">
        {/* Map */}
        <div className="live-traffic-map flex-1 min-w-0 p-4 relative">
          <GeoMap
            showJunctionMarkers
            selectedJunctionId={selectedJunctionId}
            onSelectJunction={(id) => {
              setSelectedJunctionId(id);
            }}
          />
        </div>

        {/* Junction list */}
        <aside className="live-traffic-junctions w-72 shrink-0 border-l border-slate-200 overflow-y-auto p-3 space-y-2">
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              aria-label="Search junctions"
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
              placeholder="Search junctions"
              className="min-w-0 flex-1 bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-400"
            />
          </label>
          <div className="px-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Junction telemetry · {filtered.length}
          </div>
          {filtered.map(j => {
            const statusColor =
              j.status === 'CRITICAL' ? 'border-l-red-500' :
              j.status === 'HIGH'     ? 'border-l-orange-500' :
              j.status === 'MODERATE' ? 'border-l-amber-500' : 'border-l-green-500';
            const hasIncident = incidents.some(event =>
              event.location === j.id
              && event.status !== 'COMPLETED'
              && /INCIDENT|ROAD_BLOCK|COLLISION|HAZARD/i.test(`${event.category || ''} ${event.title || ''}`),
            );

            return (
              <button
                key={j.id}
                onClick={() => setSelectedJunctionId(j.id)}
                className={`w-full rounded-xl border border-l-4 p-3 text-left transition-colors ${
                  selectedJunctionId === j.id
                    ? 'border-violet-300 bg-violet-50'
                    : `border-slate-200 bg-white hover:bg-slate-50 ${statusColor}`
                }`}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="font-data text-[10px] font-bold text-slate-500">{j.id}</span>
                    <span className="truncate text-xs font-semibold text-slate-900">{j.name}</span>
                  </div>
                  <span className={`shrink-0 rounded-md border px-1.5 py-0.5 font-data text-[9px] font-bold ${SIGNAL_COLOR[j.signal] || SIGNAL_COLOR.RED}`}>
                    {j.signal || 'RED'} · {j.remainingTime ?? '—'}s
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1 text-center">
                  {[
                    { label: 'Vehicles', value: j.vehicles ?? '—' },
                    { label: 'Queue', value: j.queue ?? '—' },
                    { label: 'Speed', value: j.speed == null ? '—' : `${j.speed}` },
                    { label: 'Flow', value: j.flow ?? '—' },
                  ].map(metric => (
                    <div key={metric.label}>
                      <div className="text-[8px] uppercase text-slate-500">{metric.label}</div>
                      <div className="font-data text-[11px] font-bold text-slate-800">{metric.value}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex items-center justify-between text-[9px]">
                  <span className="text-slate-500">{j.currentPhase || j.signal} · {j.status || 'UNKNOWN'}</span>
                  <span className={hasIncident ? 'font-semibold text-amber-800' : 'text-slate-600'}>
                    {hasIncident ? 'INCIDENT' : 'No incident'}
                  </span>
                </div>
              </button>
            );
          })}
        </aside>
      </div>
    </div>
  );
};
