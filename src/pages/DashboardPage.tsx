import { AudioLines, Plus } from 'lucide-react';
import { useMiHomeContext } from '@/app/MiHomeContext';
import { HomeHero } from '@/components/dashboard/HomeHero';
import { DeviceCollection } from '@/components/devices/DeviceCollection';
import { QuickScenes } from '@/components/scenes/QuickScenes';
import { SecurityPanel } from '@/components/dashboard/SecurityPanel';
import { CameraPanel } from '@/components/dashboard/CameraPanel';
import { EnergyPanel, EnvironmentPanel, MessagesPanel } from '@/components/dashboard/InsightPanels';

export function DashboardPage() {
  const { navigate, setVoiceOpen } = useMiHomeContext();
  return (
    <div className="home-dashboard">
      <HomeHero />
      <div className="dashboard-scenes">
        <QuickScenes />
        <div className="scene-utilities">
          <button onClick={() => setVoiceOpen(true)}>
            <AudioLines size={17} />
            小爱语音
          </button>
          <button onClick={() => navigate('add-device')}>
            <Plus size={17} />
            添加设备
          </button>
        </div>
      </div>
      <div className="dashboard-middle">
        <div className="dashboard-devices">
          <DeviceCollection compact />
        </div>
        <aside className="dashboard-right">
          <SecurityPanel />
          <CameraPanel />
        </aside>
      </div>
      <div className="dashboard-bottom">
        <EnergyPanel />
        <EnvironmentPanel />
        <MessagesPanel />
      </div>
    </div>
  );
}
