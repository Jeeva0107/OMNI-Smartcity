import React from 'react';
import { TrafficProvider, useTraffic } from './context/TrafficContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';

import { OverviewTab } from './components/views/OverviewTab';
import { LiveTrafficTab } from './components/views/LiveTrafficTab';
import { TrafficIntelligenceTab } from './components/views/TrafficIntelligenceTab';
import { RouteIntelligenceTab } from './components/views/RouteIntelligenceTab';
import { JunctionControlTab } from './components/views/JunctionControlTab';
import { EmergencyCorridorTab } from './components/views/EmergencyCorridorTab';
import { CameraAnalyticsTab } from './components/views/CameraAnalyticsTab';
import { ActivityEventsTab } from './components/views/ActivityEventsTab';
import { SettingsSimTab } from './components/views/SettingsSimTab';
import { SystemStatusTab } from './components/views/SystemStatusTab';
import { JunctionsTab } from './components/views/JunctionsTab';
import { RouteEtaTab } from './components/views/RouteEtaTab';

const MainContent = () => {
  const { activeTab } = useTraffic();

  return (
    <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[#F5F4FA] text-[#18243D]">
      <Header />
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#F5F4FA]">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'live_traffic' && <LiveTrafficTab />}
        {activeTab === 'traffic_intelligence' && <TrafficIntelligenceTab />}
        {activeTab === 'route_intelligence' && <RouteIntelligenceTab />}
        {activeTab === 'junction_control' && <JunctionControlTab />}
        {activeTab === 'emergency_corridor' && <EmergencyCorridorTab />}
        {activeTab === 'camera_analytics' && <CameraAnalyticsTab />}
        {activeTab === 'incidents' && <ActivityEventsTab />}
        {activeTab === 'settings' && <SettingsSimTab />}
        {activeTab === 'system_status' && <SystemStatusTab />}
        {activeTab === 'junctions' && <JunctionsTab />}
        {activeTab === 'route_eta' && <RouteEtaTab />}
      </div>
    </main>
  );
};

export default function App() {
  return (
    <TrafficProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-[#F5F4FA] text-[#18243D] antialiased">
        <Sidebar />
        <MainContent />
      </div>
    </TrafficProvider>
  );
}
