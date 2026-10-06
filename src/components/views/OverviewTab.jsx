import React from 'react';
import { Activity, AlertTriangle, Car, Gauge, MapPin } from 'lucide-react';
import { useTraffic } from '../../context/TrafficContext';
import { GeoMap } from '../map/GeoMap';

export const OverviewTab = () => {
  const {
    junctions,
    incidents,
    ambulance,
    setActiveTab,
    setSelectedJunctionId,
    tomtomStatus,
  } = useTraffic();

  const totalVehicles = junctions.reduce((sum, junction) => sum + (Number(junction.vehicles) || 0), 0);
  const averageSpeed = Math.round(
    junctions.reduce((sum, junction) => sum + (Number(junction.speed) || 0), 0)
      / Math.max(1, junctions.length),
  );
  const incidentCount = tomtomStatus?.status === 'TOMTOM_LIVE'
    ? (tomtomStatus.incidentsCount ?? 0)
    : (incidents || []).filter(event => event.status === 'ACTIVE').length;
  const recentEvents = (incidents || []).slice(0, 4);

  const openJunction = id => {
    setSelectedJunctionId(id);
    setActiveTab('junction_control');
  };

  return (
    <div className="light-dashboard flex-1 min-h-0 overflow-y-auto p-4 md:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">City overview</h1>
          <p className="mt-1 text-sm text-slate-500">Chennai traffic operations and emergency response</p>
        </div>
        {ambulance.active && (
          <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-[10px] font-bold tracking-wide text-red-800">
            EMERGENCY CORRIDOR ACTIVE · 1 ACTIVE
          </span>
        )}
      </div>

      <section aria-label="Traffic overview" className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: 'Monitored junctions', value: junctions.length, icon: MapPin, color: 'text-violet-700 bg-violet-50' },
          { label: 'Vehicles monitored', value: totalVehicles.toLocaleString(), icon: Car, color: 'text-blue-700 bg-blue-50' },
          { label: 'Average speed', value: `${averageSpeed} km/h`, icon: Gauge, color: 'text-green-700 bg-green-50' },
          { label: 'Active incidents', value: incidentCount, icon: AlertTriangle, color: 'text-amber-700 bg-amber-50' },
        ].map(metric => {
          const Icon = metric.icon;
          return (
            <article key={metric.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-slate-500">{metric.label}</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">{metric.value}</p>
                </div>
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${metric.color}`}>
                  <Icon className="h-5 w-5" />
                </span>
              </div>
            </article>
          );
        })}
      </section>

      <section className="grid min-h-[420px] grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="relative min-h-[420px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <GeoMap showJunctionMarkers onSelectJunction={openJunction} />
        </div>

        <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-4">
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-slate-900">Emergency corridor</h2>
              {ambulance.active && (
                <span className="rounded-full bg-red-50 px-2 py-1 text-[9px] font-bold text-red-700">
                  ACTIVE
                </span>
              )}
            </div>
            {ambulance.active ? (
              <>
                <p className="text-sm font-semibold text-slate-800">1 shared emergency trip is active.</p>
                <button
                  onClick={() => setActiveTab('emergency_corridor')}
                  className="mt-3 text-xs font-semibold text-violet-700 hover:text-violet-900"
                >
                  Open live corridor
                </button>
              </>
            ) : (
              <p className="rounded-lg bg-slate-50 px-3 py-3 text-sm text-slate-600">
                No active emergency corridor
              </p>
            )}
          </article>

          <article className="min-h-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Junction signals</h2>
              <button onClick={() => setActiveTab('live_traffic')} className="text-xs font-semibold text-violet-700">
                View all
              </button>
            </div>
            <div className="space-y-2 overflow-y-auto">
              {junctions.slice(0, 5).map(junction => (
                <button
                  key={junction.id}
                  onClick={() => openJunction(junction.id)}
                  className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 text-left hover:bg-slate-50"
                >
                  <span className="min-w-0">
                    <span className="mr-2 font-data text-[10px] font-bold text-slate-500">{junction.id}</span>
                    <span className="truncate text-xs font-medium text-slate-800">{junction.name}</span>
                  </span>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-bold ${
                    junction.signal === 'GREEN' ? 'bg-green-50 text-green-700' :
                    junction.signal === 'YELLOW' ? 'bg-amber-50 text-amber-700' :
                    'bg-red-50 text-red-700'
                  }`}>
                    {junction.signal || 'RED'} · {junction.remainingTime ?? '—'}s
                  </span>
                </button>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Activity className="h-4 w-4 text-violet-700" />
          <h2 className="text-sm font-bold text-slate-900">Recent activity</h2>
        </div>
        {recentEvents.length ? (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
            {recentEvents.map(event => (
              <div key={event.id} className="min-w-0 rounded-lg bg-slate-50 p-3">
                <p className="truncate text-xs font-semibold text-slate-800">{event.title}</p>
                <p className="mt-1 truncate text-[10px] text-slate-500">{event.description}</p>
                <p className="mt-2 text-[9px] font-medium uppercase tracking-wide text-slate-400">{event.time || event.timestamp || 'Recent'}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500">No recent incidents or activity.</p>
        )}
      </section>
    </div>
  );
};

export default OverviewTab;
