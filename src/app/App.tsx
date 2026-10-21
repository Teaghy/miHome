import { useMiHome } from '@/hooks/useMiHome';
import { useMiHomeContext, MiHomeContext } from './MiHomeContext';
import { HouseholdProvider } from './HouseholdProvider';
import { DesktopShell } from '@/components/layout/DesktopShell';
import { Notice, Spinner } from '@/components/ui';
import { PageHeading } from '@/components/ui/Panel';
import { timeLabel } from '@/utils/presentation';
import { AppDialogs } from './AppDialogs';
import { DashboardPage } from '@/pages/DashboardPage';
import { DevicesPage } from '@/pages/DevicesPage';
import { DeviceDetailPage } from '@/pages/DeviceDetailPage';
import { ScenesPage } from '@/pages/ScenesPage';
import { AutomationPage } from '@/pages/AutomationPage';
import { CamerasPage } from '@/pages/CamerasPage';
import { SecurityPage } from '@/pages/SecurityPage';
import { EnvironmentPage } from '@/pages/EnvironmentPage';
import { EnergyPage } from '@/pages/EnergyPage';
import { MessagesPage } from '@/pages/MessagesPage';
import { FamilyPage } from '@/pages/FamilyPage';
import { RoomsPage } from '@/pages/RoomsPage';
import { AddDevicePage } from '@/pages/AddDevicePage';
import { PairingPage } from '@/pages/PairingPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { SettingsPage } from '@/pages/SettingsPage';
import { ActivityPage } from '@/pages/ActivityPage';
import { WelcomePage } from '@/pages/WelcomePage';
import type { Page } from '@/types';
import type { ComponentType } from 'react';

const views: Record<Page, ComponentType> = {
  home: DashboardPage,
  devices: DevicesPage,
  'device-detail': DeviceDetailPage,
  scenes: ScenesPage,
  automation: AutomationPage,
  cameras: CamerasPage,
  security: SecurityPage,
  environment: EnvironmentPage,
  energy: EnergyPage,
  messages: MessagesPage,
  family: FamilyPage,
  rooms: RoomsPage,
  'add-device': AddDevicePage,
  pairing: PairingPage,
  profile: ProfilePage,
  settings: SettingsPage,
  favorites: DevicesPage,
  activity: ActivityPage,
};

function ApplicationContent() {
  const { initializing, connected, page, error, snapshot, refreshing, refresh } =
    useMiHomeContext();
  const View = views[page];
  return (
    <DesktopShell>
      {initializing ? (
        <div className="initial-loading">
          <Spinner label="正在连接你的家庭…" />
        </div>
      ) : !connected ? (
        <WelcomePage />
      ) : (
        <>
          {error && (
            <div className="error-banner">
              <Notice danger>
                {error} {snapshot.devices.length > 0 && '当前保留上次成功同步的数据。'}
              </Notice>
              <button
                className="button secondary small"
                disabled={refreshing}
                onClick={() => void refresh()}
              >
                重新同步
              </button>
            </div>
          )}
          {snapshot.warnings.map((warning, index) => (
            <Notice key={index}>{warning}</Notice>
          ))}
          {snapshot.cached && (
            <Notice>
              当前显示本地缓存，设备状态可能不是最新。上次更新 {timeLabel(snapshot.updatedAt)}。
            </Notice>
          )}
          {page === 'scenes' && (
            <PageHeading title="智能场景" description="把生活，调成你喜欢的模样。" />
          )}
          {page === 'activity' && (
            <PageHeading title="最近活动" description="只记录本次会话实际发生的操作。" />
          )}
          <View key={page} />
        </>
      )}
    </DesktopShell>
  );
}

export default function App() {
  const controller = useMiHome();
  return (
    <MiHomeContext value={controller}>
      <HouseholdProvider key={`${controller.demo}:${controller.currentHomeId}`}>
        <ApplicationContent />
        <AppDialogs />
      </HouseholdProvider>
    </MiHomeContext>
  );
}
