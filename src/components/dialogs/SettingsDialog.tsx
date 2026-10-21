import { useEffect, useState } from 'react';
import { AppWindow, Check, Monitor, Moon, Palette, ShieldCheck, Sun } from 'lucide-react';
import * as api from '@/api/mihome';
import type { AppInfo, Device, Settings } from '@/types';
import { deviceKind } from '@/utils/device-kind';
import { Modal, Notice, Spinner, Toggle } from '@/components/ui';

export function SettingsDialog({
  open,
  onOpenChange,
  settings,
  devices,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: Settings;
  devices: Device[];
  onSave: (settings: Settings) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState(settings);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (open) {
      setDraft(settings);
      setError('');
      api
        .getAppInfo()
        .then(setInfo)
        .catch(() => setInfo(null));
    }
  }, [open, settings]);
  const patch = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  return (
    <Modal
      open={open}
      onOpenChange={(value) => {
        if (!busy) onOpenChange(value);
      }}
      title="偏好设置"
      description="让 MiHome 更贴合你的使用习惯"
      className="settings-dialog"
      footer={
        <>
          <span className="footer-note">设置保存在本机</span>
          <button className="button secondary" onClick={() => onOpenChange(false)} disabled={busy}>
            取消
          </button>
          <button
            className="button primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const ok = await onSave(draft);
              setBusy(false);
              if (ok) onOpenChange(false);
              else setError('设置未保存，请重试。');
            }}
          >
            {busy ? (
              <Spinner label="保存中" />
            ) : (
              <>
                <Check size={16} />
                保存设置
              </>
            )}
          </button>
        </>
      }
    >
      {error && <Notice danger>{error}</Notice>}
      <div className="settings-section">
        <h3>
          <Palette size={16} />
          外观
        </h3>
        <label className="field-label">
          <span>界面主题</span>
          <div className="theme-options">
            {(
              [
                { value: 'light', label: '浅色', icon: Sun },
                { value: 'dark', label: '深色', icon: Moon },
                { value: 'system', label: '跟随系统', icon: Monitor },
              ] as const
            ).map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                className={draft.theme === value ? 'selected' : ''}
                type="button"
                aria-pressed={draft.theme === value}
                onClick={() => patch('theme', value)}
              >
                <Icon size={21} />
                <span>{label}</span>
                {draft.theme === value && <Check size={13} />}
              </button>
            ))}
          </div>
        </label>
        <div className="settings-row">
          <div>
            <strong>界面缩放</strong>
            <small>调整文字与控件的显示比例</small>
          </div>
          <select
            aria-label="界面缩放"
            value={draft.scale}
            onChange={(event) => patch('scale', Number(event.target.value))}
          >
            <option value={0.5}>50%</option>
            <option value={0.75}>75%</option>
            <option value={0.85}>85%</option>
            <option value={1}>100% · 默认</option>
            <option value={1.1}>110%</option>
            <option value={1.25}>125%</option>
            <option value={1.5}>150%</option>
            <option value={1.75}>175%</option>
            <option value={2}>200%</option>
          </select>
        </div>
      </div>
      <div className="settings-section">
        <h3>
          <AppWindow size={16} />
          日常使用
        </h3>
        {(
          [
            {
              key: 'minimizeToTray',
              label: '关闭窗口时最小化到托盘',
              note: api.isDesktop ? '在后台保持设备连接' : '仅桌面客户端可用',
              native: true,
            },
            {
              key: 'autoStart',
              label: '开机自动启动',
              note: api.isDesktop ? '登录系统后自动打开 MiHome' : '仅桌面客户端可用',
              native: true,
            },
            {
              key: 'showScenes',
              label: '显示智能场景',
              note: '在侧边栏与家庭概览中显示场景',
              native: false,
            },
            {
              key: 'hideUnsupported',
              label: '隐藏不支持的设备',
              note: '隐藏未提供 MIoT 规格的设备',
              native: false,
            },
          ] as const
        ).map((item) => (
          <div className="settings-row" key={item.key}>
            <div>
              <strong>{item.label}</strong>
              <small>{item.note}</small>
            </div>
            <Toggle
              label={item.label}
              checked={draft[item.key]}
              disabled={item.native && !api.isDesktop}
              onChange={(value) => patch(item.key, value)}
            />
          </div>
        ))}
        <div className="settings-row">
          <div>
            <strong>自动刷新间隔</strong>
            <small>只在当前会话已连接时刷新</small>
          </div>
          <select
            aria-label="自动刷新间隔"
            value={draft.refreshInterval}
            onChange={(event) => patch('refreshInterval', Number(event.target.value))}
          >
            <option value={0}>手动刷新</option>
            <option value={30}>30 秒</option>
            <option value={60}>1 分钟</option>
            <option value={120}>2 分钟</option>
            <option value={300}>5 分钟</option>
          </select>
        </div>
        <div className="settings-row">
          <div>
            <strong>默认语音音箱</strong>
            <small>语音指令发送时的首选设备</small>
          </div>
          <select
            aria-label="默认语音音箱"
            value={draft.defaultSpeaker || ''}
            onChange={(event) => patch('defaultSpeaker', event.target.value || null)}
          >
            <option value="">每次选择</option>
            {devices
              .filter((device) => deviceKind(device) === 'speaker')
              .map((device) => (
                <option key={device.did} value={device.did}>
                  {device.name}
                  {!device.online ? '（离线）' : ''}
                </option>
              ))}
          </select>
        </div>
      </div>
      <div className="about-app">
        <div className="brand-mini">
          m<span>i</span>
        </div>
        <div>
          <strong>
            MiHome <span>{info ? `v${info.version}` : '桌面版'}</span>
          </strong>
          <p>用心连接，让家更自在。</p>
        </div>
        <ShieldCheck size={22} />
        <small>独立开发的非官方米家客户端 · 与小米公司无隶属关系</small>
        {info && (
          <small className="data-dir" title={info.dataDir}>
            {info.platform} · 数据目录：{info.dataDir}
          </small>
        )}
      </div>
    </Modal>
  );
}
