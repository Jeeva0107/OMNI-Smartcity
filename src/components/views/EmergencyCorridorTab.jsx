import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Ambulance, MapPin, Pause, Play, RotateCcw, ShieldCheck, StopCircle } from 'lucide-react';
import { useTraffic } from '../../context/TrafficContext';
import { emergencyService } from '../../services/apiServices';
import { INITIAL_ROUTES } from '../../data/mockData';
import { GeoMap } from '../map/GeoMap';

const signalStyles = {
  GREEN: 'border-green-200 bg-green-50 text-green-800',
  'GREEN FOR AMBULANCE': 'border-green-200 bg-green-50 text-green-800',
  YELLOW: 'border-amber-200 bg-amber-50 text-amber-800',
  AMBER: 'border-amber-200 bg-amber-50 text-amber-800',
  PREPARING: 'border-amber-200 bg-amber-50 text-amber-800',
  RED: 'border-red-200 bg-red-50 text-red-800',
  ALL_RED: 'border-red-200 bg-red-100 text-red-900',
  CLEARED: 'border-green-200 bg-green-50 text-green-800',
  NORMAL: 'border-slate-200 bg-slate-50 text-slate-700',
};

const signalColor = signal => {
  const normalized = String(signal || 'RED').toUpperCase();
  return normalized === 'GREEN' ? '#22C55E' : normalized === 'YELLOW' || normalized === 'AMBER' ? '#F59E0B' : '#EF4444';
};

const getJunctionSignalDetails = ({ ambulance, junction, junctionId, index, currentIndex, currentJunctionId, nextJunctionId, isActive }) => {
  const junctionState = ambulance.junctionStatus?.[junctionId] || {};
  const normalSignal = ambulance.normalSignalStates?.[junctionId];
  const restoredSignal = typeof normalSignal === 'string' ? normalSignal : normalSignal?.signal;
  const passed = index < currentIndex || ['PASSED', 'CLEARED'].includes(String(junctionState.status || '').toUpperCase());
  const isCurrent = currentJunctionId === junctionId;
  const isNext = nextJunctionId === junctionId;
  const signal = passed && restoredSignal
    ? restoredSignal
    : junction?.signal || junctionState.signal || 'RED';
  const state = !isActive
    ? 'NORMAL'
    : passed
      ? 'CLEARED'
      : isCurrent && String(signal).toUpperCase().includes('GREEN')
        ? 'GREEN FOR AMBULANCE'
        : isCurrent || isNext
          ? 'PREPARING'
          : 'NORMAL';

  return {
    signal,
    state,
    phase: junctionState.phase || junction?.currentPhase || signal,
    countdown: junctionState.remainingTime ?? junction?.remainingTime ?? '—',
    passed,
    isCurrent,
    isNext,
  };
};

export const EmergencyCorridorTab = () => {
  const {
    ambulance,
    toggleCorridorApproval,
    advanceAmbulanceStep,
    pauseAmbulance,
    resetAmbulance,
    endAmbulanceTrip,
    startEmergency,
    junctions,
    lastTripSummary,
    wsConnected,
    backendOnline,
    backendError,
  } = useTraffic();
  const [routeOptions, setRouteOptions] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState(ambulance.routeId || 'ROUTE-A');
  const [selectedJunctionId, setSelectedJunctionId] = useState('');

  useEffect(() => {
    let cancelled = false;
    emergencyService.getEmergencyRoutes('J1', 'J7')
      .then(routes => {
        if (!cancelled && Array.isArray(routes) && routes.length) setRouteOptions(routes);
      })
      .catch(error => console.warn('[EmergencyCorridor] Route alternatives unavailable:', error.message));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (ambulance.routeId) setSelectedRouteId(ambulance.routeId);
  }, [ambulance.routeId]);

  const isActive = Boolean(ambulance.active);
  const isSimulatedTrip = ambulance.gpsMode === 'SIMULATED';
  const configuredRoute = useMemo(
    () => routeOptions.find(route => route.id === selectedRouteId)
      || INITIAL_ROUTES.find(route => route.id === selectedRouteId)
      || INITIAL_ROUTES[0],
    [routeOptions, selectedRouteId],
  );
  const routeJunctions = useMemo(() => {
    const activeRoute = isActive && Array.isArray(ambulance.routeJunctions)
      ? ambulance.routeJunctions
      : [];
    const ids = activeRoute.length ? activeRoute : configuredRoute?.path || [];
    return ids.filter(id => junctions.some(junction => junction.id === id));
  }, [isActive, ambulance.routeJunctions, configuredRoute, junctions]);
  const currentIndex = Math.max(0, Number(ambulance.currentJunctionIndex) || 0);
  const currentJunctionId = isActive
    ? ambulance.currentJunctionId || routeJunctions[currentIndex] || ''
    : '';
  const currentRouteIndex = currentJunctionId ? routeJunctions.indexOf(currentJunctionId) : -1;
  const nextJunctionId = isActive
    ? ambulance.nextJunctionId || routeJunctions[(currentRouteIndex >= 0 ? currentRouteIndex : currentIndex) + 1] || ''
    : '';
  const focusedJunctionId = selectedJunctionId || currentJunctionId || nextJunctionId;
  const focusedJunction = junctions.find(junction => junction.id === focusedJunctionId);
  const focusedRouteIndex = routeJunctions.indexOf(focusedJunctionId);
  const focusedSignal = getJunctionSignalDetails({
    ambulance,
    junction: focusedJunction,
    junctionId: focusedJunctionId,
    index: focusedRouteIndex < 0 ? 0 : focusedRouteIndex,
    currentIndex: currentRouteIndex < 0 ? currentIndex : currentRouteIndex,
    currentJunctionId,
    nextJunctionId,
    isActive,
  });
  const backendStatus = backendOnline && wsConnected && !backendError
    ? 'LIVE BACKEND CONNECTED'
    : isSimulatedTrip && !backendOnline
      ? 'LOCAL DEMO MODE'
      : backendError
        ? 'BACKEND ERROR'
        : 'CONNECTING TO BACKEND';
  const signalChanges = (Array.isArray(ambulance.signalChanges) ? ambulance.signalChanges : [])
    .filter(change => routeJunctions.includes(change.junctionId));

  useEffect(() => {
    setSelectedJunctionId(currentJunctionId || nextJunctionId || '');
  }, [currentJunctionId]);

  return (
    <div className="light-dashboard flex-1 min-h-0 overflow-y-auto p-4 md:p-5">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Emergency corridor</h1>
          <p className="mt-1 text-sm text-slate-500">Shared ambulance trip, route, junction priority and signal status</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-2.5 py-1.5 text-[9px] font-bold tracking-wide ${
            backendStatus === 'LIVE BACKEND CONNECTED'
              ? 'border-green-200 bg-green-50 text-green-800'
              : backendStatus === 'LOCAL DEMO MODE'
                ? 'border-amber-200 bg-amber-50 text-amber-800'
                : 'border-slate-200 bg-white text-slate-700'
          }`}>
            {backendStatus}
          </span>
          {isActive && (
            <>
              <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-[10px] font-bold tracking-wide text-red-700">
                EMERGENCY CORRIDOR ACTIVE
              </span>
              {isSimulatedTrip && (
                <>
                  <button
                    onClick={pauseAmbulance}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                  >
                    {ambulance.status === 'PAUSED' ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                    {ambulance.status === 'PAUSED' ? 'Resume' : 'Pause'}
                  </button>
                  <button
                    onClick={advanceAmbulanceStep}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700"
                  >
                    <MapPin className="h-4 w-4" />
                    Next GPS step
                  </button>
                  <button
                    onClick={resetAmbulance}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset demo
                  </button>
                </>
              )}
              <button
                onClick={endAmbulanceTrip}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
              >
                <StopCircle className="h-4 w-4" />
                End trip
              </button>
            </>
          )}
          {!isActive && (
            <>
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
                Demo route
                <select
                  value={selectedRouteId}
                  onChange={event => setSelectedRouteId(event.target.value)}
                  className="bg-transparent font-semibold text-slate-800 outline-none"
                >
                  {(routeOptions.length ? routeOptions : [{ id: 'ROUTE-A' }, { id: 'ROUTE-B' }]).map(route => (
                    <option key={route.id} value={route.id}>{route.id}</option>
                  ))}
                </select>
              </label>
              <button
                onClick={() => startEmergency(ambulance.id || 'AMB-204', 'J1', 'J7', selectedRouteId)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700"
              >
                <Play className="h-4 w-4" />
                Start demo corridor
              </button>
            </>
          )}
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="relative h-[min(62vh,620px)] min-h-[420px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <GeoMap
            showAmbulance={isActive}
            showJunctionMarkers
            emergencyCorridorOnly
            corridorJunctionIds={routeJunctions}
            selectedJunctionId={selectedJunctionId || currentJunctionId}
            onSelectJunction={setSelectedJunctionId}
            showJunctionPanel={false}
          />
          {!isActive && (
            <div className="pointer-events-none absolute bottom-12 right-3 z-[800] rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm">
              No active emergency corridor
            </div>
          )}
        </div>

        <aside className="space-y-3">
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${isActive ? 'bg-red-50 text-red-600' : 'bg-violet-50 text-violet-700'}`}>
                  <Ambulance className="h-6 w-6" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-slate-900">EMERGENCY CORRIDOR</h2>
                  <p className={`mt-0.5 text-[10px] font-bold ${isActive ? 'text-red-700' : 'text-slate-500'}`}>
                    {isActive ? 'ACTIVE' : 'INACTIVE'}
                  </p>
                </div>
              </div>
              {isActive && (
                <span className="shrink-0 rounded-full border border-red-200 bg-red-50 px-2 py-1 text-[9px] font-bold text-red-700">
                  EMERGENCY CORRIDOR ACTIVE
                </span>
              )}
            </div>

            {!isActive && <p className="mt-3 text-xs text-slate-600">No active emergency corridor</p>}

            <dl className="mt-4 grid grid-cols-2 gap-2">
              {[
                { label: 'Ambulance ID', value: isActive ? ambulance.id || '—' : '—' },
                { label: 'Destination', value: isActive ? ambulance.destination || '—' : '—' },
                { label: 'ETA', value: isActive ? ambulance.eta || '—' : '—' },
                { label: 'Speed', value: isActive ? `${ambulance.speed || 0} km/h` : '—' },
                { label: 'Current junction', value: currentJunctionId || '—' },
                { label: 'Next junction', value: nextJunctionId || '—' },
                { label: 'Backend status', value: backendStatus },
              ].map(metric => (
                <div key={metric.label} className="min-w-0 rounded-lg bg-slate-50 p-2">
                  <dt className="text-[9px] font-medium text-slate-500">{metric.label}</dt>
                  <dd className="mt-0.5 truncate text-[11px] font-bold text-slate-900" title={metric.value}>{metric.value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-3">
              <div className="mb-1 flex justify-between text-[10px] text-slate-500">
                <span>Route progress</span>
                <strong className="text-slate-800">{isActive ? Math.round(ambulance.routeProgress || 0) : 0}%</strong>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-violet-100">
                <div
                  className="h-full rounded-full bg-violet-600 transition-[width] duration-500"
                  style={{ width: `${isActive ? Math.min(100, Math.max(0, Number(ambulance.routeProgress) || 0)) : 0}%` }}
                />
              </div>
            </div>

            {isActive && (
              <>
                <p className="mt-2 break-all font-data text-[10px] text-slate-600">
                  Location: {ambulance.latitude ?? '—'}, {ambulance.longitude ?? '—'}
                </p>
                <button
                  onClick={() => toggleCorridorApproval(!ambulance.corridorApproved)}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-800 hover:bg-violet-100"
                >
                  <ShieldCheck className="h-4 w-4" />
                  {ambulance.corridorApproved ? 'Revoke corridor approval' : 'Approve corridor'}
                </button>
              </>
            )}
          </article>

          {focusedJunction && (
            <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Selected junction · {focusedJunction.id}</p>
                  <h3 className="mt-0.5 truncate text-xs font-bold text-slate-900">{focusedJunction.name}</h3>
                </div>
                <span className={`rounded-full border px-2 py-1 text-[9px] font-bold ${signalStyles[focusedSignal.state] || signalStyles.NORMAL}`}>
                  {focusedSignal.state}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-700">
                <span className="inline-flex items-center gap-1.5 font-semibold">
                  <span className="h-3 w-3 rounded-full ring-2 ring-white shadow" style={{ background: signalColor(focusedSignal.signal) }} />
                  {focusedSignal.signal}
                </span>
                <span>Phase: {focusedSignal.phase}</span>
                <span>Countdown: {focusedSignal.countdown}s</span>
              </div>
            </article>
          )}

          {lastTripSummary && (
            <article className="rounded-xl border border-green-200 bg-green-50 p-4">
              <h2 className="text-xs font-bold text-green-800">Last trip ended</h2>
              <p className="mt-1 text-xs text-green-800">
                {lastTripSummary.ambulanceId || 'Ambulance'} · {lastTripSummary.destination || 'Destination not supplied'}
              </p>
              <p className="mt-1 font-data text-[10px] text-green-700">
                Trip {lastTripSummary.tripId || '—'} · ETA at end {lastTripSummary.eta || '—'}
              </p>
            </article>
          )}
        </aside>
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-violet-700" />
            <h2 className="text-sm font-bold text-slate-900">Junction timeline</h2>
          </div>
          {routeJunctions.length ? (
            <div className="space-y-1.5">
              {routeJunctions.map((junctionId, index) => {
                const junction = junctions.find(item => item.id === junctionId);
                const details = getJunctionSignalDetails({
                  ambulance,
                  junction,
                  junctionId,
                  index,
                  currentIndex: currentRouteIndex >= 0 ? currentRouteIndex : currentIndex,
                  currentJunctionId,
                  nextJunctionId,
                  isActive,
                });
                const selected = focusedJunctionId === junctionId;
                return (
                  <button
                    key={junctionId}
                    type="button"
                    onClick={() => setSelectedJunctionId(junctionId)}
                    aria-pressed={selected}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
                      details.isCurrent
                        ? 'border-red-200 bg-red-50'
                        : selected
                          ? 'border-violet-200 bg-violet-50'
                          : 'border-slate-100 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold text-white" style={{ background: signalColor(details.signal) }}>
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-900">{junctionId} · {junction?.name || 'Junction'}</p>
                        <p className="mt-0.5 truncate text-[10px] text-slate-600">
                          {details.phase} · {details.countdown}s · {details.passed ? 'Signal restored' : 'Signal phase'}
                        </p>
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-bold ${signalStyles[details.state] || signalStyles.NORMAL}`}>
                      {details.state}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-500">Junction route will appear when a trip starts.</p>
          )}
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-violet-700" />
            <h2 className="text-sm font-bold text-slate-900">Signal-change activity</h2>
          </div>
          {signalChanges.length ? (
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {signalChanges.map((change, index) => {
                const signal = change.signalState || change.newSignal || change.currentPhase || 'RED';
                return (
                  <div key={`${change.junctionId || 'signal'}-${change.timestamp || index}`} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-900">{change.junctionId || 'Junction'} · {change.status || 'UPDATED'}</p>
                      <p className="mt-0.5 text-[10px] text-slate-500">{change.timestamp || 'Recent'} · countdown {change.remainingTime ?? '—'}s</p>
                    </div>
                    <span className={`rounded-full border px-2 py-1 text-[9px] font-bold ${signalStyles[signal] || signalStyles.RED}`}>{signal}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-500">Signal changes from the shared trip will appear here.</p>
          )}
        </article>
      </section>
    </div>
  );
};

export default EmergencyCorridorTab;
