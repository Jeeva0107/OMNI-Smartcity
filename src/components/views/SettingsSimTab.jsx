import React from 'react';
import { useTraffic } from '../../context/TrafficContext';
import { SourceBadge } from '../map/GeoMap';
import {
  AlertTriangle,
  Ambulance,
  CheckCircle2,
  Flame,
  Play,
  RotateCcw,
  Settings,
  Sliders,
  Zap
} from 'lucide-react';

export const SettingsSimTab = () => {
  const {
    isSimulating,
    setIsSimulating,
    simSpeed,
    setSimSpeed,
    triggerCongestion,
    advanceAmbulanceStep,
    setAmbulance,
    toggleCorridorApproval,
    addEvent
  } = useTraffic();

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#090B0D]">
      {/* HEADER */}
      <div className="bg-[#14181C] p-4 rounded-xl border border-[#242A30] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <Sliders className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Control Room Demonstration & Simulation Controls
            </h3>
            <p className="text-[11px] text-[#737B82]">
              Configure telemetry generator parameters, trigger test incidents and step emergency corridor simulations
            </p>
          </div>
        </div>

        <SourceBadge type="SIMULATED" label="DEMO SIMULATION ENGINE" />
      </div>

      {/* SIMULATION CONTROLS GRID */}
      <div className="grid grid-cols-2 gap-6">
        {/* SIMULATION ENGINE PARAMETERS */}
        <div className="bg-[#14181C] p-5 rounded-xl border border-[#242A30] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Settings className="w-4 h-4 text-amber-400" />
              Telemetry Generator Loop
            </h3>
            <SourceBadge type="SIMULATED" />
          </div>

          <div className="p-4 rounded-lg bg-[#181D21] border border-[#242A30] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#B8BEC4]">Simulated Live Telemetry Loop:</span>
              <button
                onClick={() => setIsSimulating(!isSimulating)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                  isSimulating
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : 'bg-red-500/20 text-red-400 border-red-500/40'
                }`}
              >
                {isSimulating ? '● RUNNING' : '○ PAUSED'}
              </button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#242A30]">
              <span className="text-xs text-[#B8BEC4]">Simulation Speed Multiplier:</span>
              <div className="flex items-center gap-2">
                {[1, 2, 5].map(s => (
                  <button
                    key={s}
                    onClick={() => setSimSpeed(s)}
                    className={`px-3 py-1 rounded text-xs font-mono font-bold border ${
                      simSpeed === s ? 'bg-amber-500 text-black border-amber-500' : 'bg-[#0E1114] text-[#737B82] border-[#242A30]'
                    }`}
                  >
                    {s}x Speed
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* DEMO SCENARIO TRIGGERS */}
        <div className="bg-[#14181C] p-5 rounded-xl border border-[#242A30] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              Scenario Triggers (Prototype)
            </h3>
            <SourceBadge type="SIMULATED" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => triggerCongestion('J5')}
              className="p-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold text-left space-y-1 transition-all"
            >
              <div className="flex items-center gap-1.5">
                <Flame className="w-4 h-4" />
                <span>Simulate Congestion at J5</span>
              </div>
              <p className="text-[10px] text-[#737B82] font-normal">Surge queue count to 38 vehicles</p>
            </button>

            <button
              onClick={() => {
                setAmbulance(prev => ({ ...prev, active: true, currentJunctionIndex: 0, origin: 'J1', eta: '06:45' }));
                addEvent({ category: 'EMERGENCY', location: 'J1', title: 'Simulated Ambulance Callout (AMB-102)', description: 'Emergency corridor simulation started.', severity: 'CRITICAL', status: 'ACTIVE' });
              }}
              className="p-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold text-left space-y-1 transition-all"
            >
              <div className="flex items-center gap-1.5">
                <Ambulance className="w-4 h-4" />
                <span>Simulate Emergency Ambulance</span>
              </div>
              <p className="text-[10px] text-[#737B82] font-normal">Dispatch AMB-102 to Manipal Hospital</p>
            </button>

            <button
              onClick={advanceAmbulanceStep}
              className="p-3 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-bold text-left space-y-1 transition-all"
            >
              <div className="flex items-center gap-1.5">
                <Play className="w-4 h-4" />
                <span>Step Ambulance Forward</span>
              </div>
              <p className="text-[10px] text-[#737B82] font-normal">Advance ambulance along corridor</p>
            </button>

            <button
              onClick={() => toggleCorridorApproval(true)}
              className="p-3 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold text-left space-y-1 transition-all"
            >
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve Corridor Signal Override</span>
              </div>
              <p className="text-[10px] text-[#737B82] font-normal">Simulate green-wave corridor override</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
