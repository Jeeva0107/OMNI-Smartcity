import React from 'react';
import { useTraffic } from '../../context/TrafficContext';
import { GeoMap, SourceBadge } from '../map/GeoMap';
import { CheckCircle2, Cpu, Database, Network, Radio, Server, ShieldCheck } from 'lucide-react';

export const SystemStatusTab = () => {
  const { backendOnline } = useTraffic();

  const services = [
    {
      name: 'Python Telemetry Server (Flask)',
      status: backendOnline ? 'ONLINE' : 'FALLBACK SIMULATION',
      type: backendOnline ? 'LIVE' : 'SIMULATED',
      latency: backendOnline ? '12ms' : 'Local Loop',
      detail: backendOnline ? 'HTTP/REST & WebSocket endpoints active' : 'Internal state loop running',
    },
    {
      name: 'Simulated Emergency Vehicle GPS',
      status: 'ACTIVE',
      type: 'SIMULATED',
      latency: '100ms interval',
      detail: 'GPS coordinate sequence interpolator for ambulance demo',
    },
    {
      name: 'Junction Network GIS Graph Database',
      status: 'ONLINE',
      type: 'STATIC',
      latency: '0ms (Memory)',
      detail: '8 Junction nodes with verified WGS-84 coordinates & road links',
    },
    {
      name: 'Traffic Density Telemetry Simulator',
      status: 'RUNNING',
      type: 'SIMULATED',
      latency: '3s cycle',
      detail: 'Simulates vehicles/min, queue length, and flow speed metrics',
    },
    {
      name: 'Traffic-Aware Route & ETA Calculator',
      status: 'ONLINE',
      type: 'SIMULATED',
      latency: '2ms',
      detail: 'Distance / flow-speed dynamic ETA calculator',
    },
    {
      name: 'Camera Feed Indexer',
      status: 'ONLINE',
      type: 'STATIC',
      latency: 'Indexed',
      detail: 'High-definition static snapshot reference for traffic cameras',
    }
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#090B0D]">
      {/* HEADER */}
      <div className="bg-[#14181C] p-4 rounded-xl border border-[#242A30] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <Server className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              System Infrastructure & Data Source Integrity
            </h3>
            <p className="text-[11px] text-[#737B82]">
              Real-time health status, backend connectivity and explicit data source provenance
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <SourceBadge type={backendOnline ? 'LIVE' : 'SIMULATED'} label={backendOnline ? 'BACKEND ONLINE' : 'SIMULATION MODE'} />
        </div>
      </div>

      {/* SERVICES GRID */}
      <div className="grid grid-cols-2 gap-4">
        {services.map((srv) => (
          <div
            key={srv.name}
            className="p-4 rounded-xl bg-[#14181C] border border-[#242A30] flex items-center justify-between hover:border-emerald-500/40 transition-all"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-[#181D21] border border-[#242A30] flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-white">{srv.name}</h4>
                  <SourceBadge type={srv.type} />
                </div>
                <p className="text-[10px] text-[#737B82] mt-0.5">{srv.detail}</p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                ● {srv.status}
              </span>
              <div className="text-[10px] font-mono text-[#737B82] mt-1">{srv.latency}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
