import { Select, SelectOption } from '@/components/ui/Select';
import { useState } from 'react';
import { Bell, Check, Info, Monitor, Moon, Palette, Settings2, Sun } from 'lucide-react';
import { useMiHomeContext } from '@/app/MiHomeContext';
import { useHousehold } from '@/app/HouseholdContext';
import { isDesktop } from '@/api/mihome';
import type { Settings } from '@/types';
import { PageHeading, Panel } from '@/components/ui/Panel';
import { Toggle } from '@/components/ui';

export function SettingsPage() {
  const { settings, saveSettings, notify, homeDevices } = useMiHomeContext();
  const { household, update } = useHousehold();
  const [draft, setDraft] = useState(settings);
  const [busy, setBusy] = useState(false);
  const patch = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const save = async () => {
    setBusy(true);
    try {
      if (await saveSettings(draft)) notify('偏好设置已保存');
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHeading
        title="设置"
        description="恰到好处的设置，让每一天用得更顺手。"
        action={
          <button className="button primary" disabled={busy} onClick={() => void save()}>
            <Check size={16} />
            {busy ? '保存中…' : '保存设置'}
          </button>
        }
      />
      <div className="settings-page-grid">
        <div>
          <Panel title="外观" action={<Palette size={19} />}>
            <p className="settings-group-label">界面主题</p>
            <div className="theme-preview-options">
              {(
                [
                  { value: 'light', label: '浅色', icon: Sun },
                  { value: 'dark', label: '深色', icon: Moon },
                  { value: 'system', label: '跟随系统', icon: Monitor },
                ] as const
              ).map(({ icon: Icon, ...option }) => (
                <button
                  key={option.value}
                  className={`${option.value} ${draft.theme === option.value ? 'selected' : ''}`}
                  aria-pressed={draft.theme === option.value}
                  onClick={() => patch('theme', option.value)}
                >
                  <span className="theme-preview">
                    <i />
                    <span>
                      <b />
                      <b />
                      <b />
                    </span>
                  </span>
                  <span>
                    <Icon size={16} />
                    {option.label}
                    {draft.theme === option.value && <Check size={14} />}
                  </span>
                </button>
              ))}
            </div>
            <div className="settings-row">
              <div>
                <strong>界面缩放</strong>
                <small>调整文字与控件，适合不同尺寸的屏幕</small>
              </div>
              <Select
                aria-label="界面缩放"
                value={draft.scale}
                onValueChange={(value) => patch('scale', Number(value))}
              >
                {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((value) => (
                  <SelectOption key={value} value={value}>
                    {Math.round(value * 100)}%{value === 1 ? ' · 默认' : ''}
                  </SelectOption>
                ))}
              </Select>
            </div>
          </Panel>
          <Panel title="日常使用" action={<Settings2 size={19} />}>
            {(
              [
                {
                  key: 'minimizeToTray',
                  name: '关闭窗口时最小化到托盘',
                  note: '在后台保持设备连接',
                  native: true,
                },
                {
                  key: 'autoStart',
                  name: '开机自动启动',
                  note: '登录系统后自动打开米家桌面端',
                  native: true,
                },
                {
                  key: 'showScenes',
                  name: '显示智能场景',
                  note: '在侧边栏与家庭首页中显示场景',
                  native: false,
                },
                {
                  key: 'hideUnsupported',
                  name: '隐藏不支持的设备',
                  note: '仅显示提供 MIoT 控制规格的设备',
                  native: false,
                },
              ] as const
            ).map((item) => (
              <div className="settings-row" key={item.key}>
                <div>
                  <strong>{item.name}</strong>
                  <small>{item.native && !isDesktop ? '仅桌面客户端可用' : item.note}</small>
                </div>
                <Toggle
                  label={item.name}
                  checked={draft[item.key]}
                  disabled={item.native && !isDesktop}
                  onChange={(value) => patch(item.key, value)}
                />
              </div>
            ))}
            <div className="settings-row">
              <div>
                <strong>自动刷新间隔</strong>
                <small>保持家庭设备状态及时更新</small>
              </div>
              <Select
                aria-label="自动刷新间隔"
                value={draft.refreshInterval}
                onValueChange={(value) => patch('refreshInterval', Number(value))}
              >
                {[0, 30, 60, 120, 300].map((value) => (
                  <SelectOption key={value} value={value}>
                    {value ? `${value} 秒` : '手动刷新'}
                  </SelectOption>
                ))}
              </Select>
            </div>
            <div className="settings-row">
              <div>
                <strong>默认语音音箱</strong>
                <small>将小爱文字指令发送给这台设备</small>
              </div>
              <Select
                aria-label="默认语音音箱"
                value={draft.defaultSpeaker || ''}
                onValueChange={(value) => patch('defaultSpeaker', value || null)}
              >
                <SelectOption value="">每次选择</SelectOption>
                {homeDevices
                  .filter((d) => d.category === 'speaker')
                  .map((d) => (
                    <SelectOption key={d.did} value={d.did}>
                      {d.name}
                    </SelectOption>
                  ))}
              </Select>
            </div>
          </Panel>
        </div>
        <div>
          <Panel title="消息通知" action={<Bell size={19} />}>
            {(['security', 'device', 'system'] as const).map((type, index) => (
              <div className="settings-row" key={type}>
                <div>
                  <strong>{['安防提醒', '设备动态', '系统消息'][index]}</strong>
                  <small>
                    {
                      [
                        '重要的守护事件，及时知晓',
                        '设备完成任务或状态异常',
                        '账号、连接和应用更新',
                      ][index]
                    }
                  </small>
                </div>
                <Toggle
                  label={['安防提醒', '设备动态', '系统消息'][index]}
                  checked={household?.notificationPreferences[type] ?? false}
                  disabled={!household}
                  onChange={(checked) => {
                    if (
                      update((current) => ({
                        ...current,
                        notificationPreferences: {
                          ...current.notificationPreferences,
                          [type]: checked,
                        },
                      }))
                    )
                      notify('本地通知偏好已保存');
                  }}
                />
              </div>
            ))}
          </Panel>
          <Panel title="关于米家桌面端" action={<Info size={19} />}>
            <div className="settings-about">
              <span className="brand-symbol">
                <Settings2 size={25} />
              </span>
              <h2>米家桌面端</h2>
              <span>MiHome Desktop · 0.1.0</span>
              <p>用心连接，让家更自在。</p>
            </div>
            <p className="data-footnote">独立开发的非官方客户端，与小米公司无隶属关系。</p>
          </Panel>
        </div>
      </div>
    </>
  );
}
