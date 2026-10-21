import { Leaf, LogIn, LogOut, ShieldCheck } from 'lucide-react';
import * as api from '@/api/mihome';
import { DeviceSheet } from '@/components/devices/DeviceSheet';
import { SettingsDialog } from '@/components/dialogs/SettingsDialog';
import { LoginDialog } from '@/components/dialogs/LoginDialog';
import { VoiceDialog } from '@/components/dialogs/VoiceDialog';
import { Modal, Notice, Spinner, Toast } from '@/components/ui';
import { useMiHomeContext } from './MiHomeContext';
import { useNavigate } from 'react-router-dom';
export function AppDialogs() {
  const routerNavigate = useNavigate();
  const {
    settings,
    session,
    demo,
    snapshot,
    selectedDid,
    loginOpen,
    settingsOpen,
    voiceOpen,
    accountOpen,
    toast,
    confirmation,
    confirmBusy,
    selectedDevice,
    setSelectedDid,
    setLoginOpen,
    setSettingsOpen,
    setVoiceOpen,
    setAccountOpen,
    setToast,
    setConfirmation,
    setConfirmBusy,
    notify,
    perform,
    saveSettings,
    toggleFavorite,
    writeProperty,
    runAction,
    loginSuccess,
    requestLogout,
    exitDemo,
  } = useMiHomeContext();
  return (
    <>
      <DeviceSheet
        device={selectedDevice}
        onClose={() => setSelectedDid(null)}
        favorite={!!selectedDid && settings.favorites.includes(selectedDid)}
        onFavorite={() => {
          if (selectedDid) void toggleFavorite(selectedDid);
        }}
        onWrite={writeProperty}
        onAction={runAction}
        onExpand={() => {
          if (selectedDid) {
            void routerNavigate(`/device-detail?device=${encodeURIComponent(selectedDid)}`);
            setSelectedDid(null);
          }
        }}
      />
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        devices={snapshot.devices}
        onSave={async (next) => {
          const ok = await saveSettings(next);
          if (ok) notify('偏好设置已保存');
          return ok;
        }}
      />
      <LoginDialog
        open={loginOpen}
        onOpenChange={setLoginOpen}
        onSuccess={(next) => void loginSuccess(next)}
      />
      <VoiceDialog
        open={voiceOpen}
        onOpenChange={setVoiceOpen}
        devices={snapshot.devices}
        defaultSpeaker={settings.defaultSpeaker}
        demo={demo}
        onSend={async (did, text, silent) =>
          perform(`向音箱发送${silent ? '静默' : '语音'}指令`, () =>
            api.sendVoice(did, text, silent),
          )
        }
      />
      <Modal
        open={accountOpen}
        onOpenChange={setAccountOpen}
        title={demo ? '你的演示空间' : '我的账号'}
        description={
          demo
            ? '所有设备与场景均为模拟，操作不会影响真实家庭。'
            : '你的登录凭据由桌面客户端保存在本机。'
        }
        className="account-dialog"
      >
        <div className="account-profile">
          <span className="avatar">
            <Leaf size={30} />
          </span>
          <h3>{demo ? 'MiHome 体验官' : `小米账号 ${session.userId || ''}`}</h3>
          <p>{demo ? '无需登录，安心探索' : `当前区域 · ${session.region.toUpperCase()}`}</p>
        </div>
        {demo ? (
          <>
            <Notice>演示模式不会向真实设备发送任何控制请求。</Notice>
            <button
              className="button primary full-width"
              onClick={() => {
                setAccountOpen(false);
                setLoginOpen(true);
              }}
            >
              <LogIn size={16} />
              连接我的小米账号
            </button>
            {api.isDesktop && (
              <button className="button secondary full-width" onClick={() => void exitDemo()}>
                退出演示模式
              </button>
            )}
          </>
        ) : (
          <>
            <div className="account-facts">
              <span>
                登录状态
                <strong>
                  <i className="live-dot" />
                  已登录
                </strong>
              </span>
              <span>
                凭据保存<strong>本机安全存储</strong>
              </span>
            </div>
            <button className="button secondary full-width danger-text" onClick={requestLogout}>
              <LogOut size={16} />
              退出当前账号
            </button>
          </>
        )}
        <p className="unofficial-note">非官方客户端 · 请勿在不受信任的设备上登录</p>
      </Modal>
      <Modal
        open={!!confirmation}
        onOpenChange={(value) => {
          if (!value && !confirmBusy) setConfirmation(null);
        }}
        title={confirmation?.title || '确认操作'}
        description={confirmation?.description}
        className="confirm-dialog"
        footer={
          <>
            <button
              className="button secondary"
              disabled={confirmBusy}
              onClick={() => setConfirmation(null)}
            >
              取消
            </button>
            <button
              className="button primary"
              disabled={confirmBusy}
              onClick={async () => {
                if (!confirmation) return;
                setConfirmBusy(true);
                try {
                  if (await confirmation.run()) setConfirmation(null);
                } finally {
                  setConfirmBusy(false);
                }
              }}
            >
              {confirmBusy ? <Spinner label="执行中" /> : '确认执行'}
            </button>
          </>
        }
      >
        {confirmation?.detail && <div className="confirmation-detail">{confirmation.detail}</div>}
        <div className="confirmation-note">
          <ShieldCheck size={17} />
          {demo ? '模拟操作 · 不影响真实设备' : '此操作将在确认后发送至米家云端'}
        </div>
      </Modal>
      {toast && (
        <Toast message={toast.message} error={toast.error} onClose={() => setToast(null)} />
      )}
    </>
  );
}
