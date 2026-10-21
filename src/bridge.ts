import { invoke } from '@tauri-apps/api/core';
import { createDemoDetail, createDemoSnapshot } from './demo';
import { defaultSettings, validateProperty, validateSettings } from './domain';
import type { AppInfo, DeviceDetail, LoginTicket, Session, Settings, Snapshot } from './types';
export const isDesktop = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
let demoMode = !isDesktop;
let snapshot = createDemoSnapshot();
const details = new Map<string, DeviceDetail>();
let demoSettings = structuredClone(defaultSettings);
try {
  const saved = globalThis.localStorage?.getItem('mihome.demo.settings.v1');
  if (saved) demoSettings = validateSettings({ ...defaultSettings, ...JSON.parse(saved) });
} catch {
  /* Invalid demo settings must not prevent startup. */
}
export const isDemo = () => demoMode;
export function setDemoMode(enabled: boolean): void {
  demoMode = enabled;
}
export function getDefaultSettings(): Settings {
  return structuredClone(defaultSettings);
}
export function getDemoSnapshot(): Snapshot {
  return structuredClone(snapshot);
}
async function native<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (!isDesktop) throw new Error('真实米家连接需要使用 Tauri 桌面版，浏览器仅支持演示。');
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    const message =
      typeof error === 'string'
        ? error
        : error instanceof Error
          ? error.message
          : typeof error === 'object' && error && 'message' in error
            ? String(error.message)
            : '操作失败，请稍后重试';
    throw new Error(message);
  }
}
function demoDevice(did: string) {
  const device = snapshot.devices.find((item) => item.did === did);
  if (!device) throw new Error('设备不存在');
  return device;
}
export async function getSession(): Promise<Session> {
  return demoMode ? { authenticated: false, userId: null, region: 'cn' } : native('get_session');
}
export const beginLogin = (): Promise<LoginTicket> => native('begin_login');
export const waitLogin = (ticketId: string): Promise<Session> => native('wait_login', { ticketId });
export const cancelLogin = (ticketId: string): Promise<void> =>
  native('cancel_login', { ticketId });
export async function logout(): Promise<void> {
  // Logout always clears the actual desktop session, never just the demo view.
  if (isDesktop) await native('logout');
}
export async function refreshDevices(): Promise<Snapshot> {
  if (!demoMode) return native('refresh_devices');
  snapshot.updatedAt = new Date().toISOString();
  snapshot.cached = false;
  return getDemoSnapshot();
}
export async function getCachedSnapshot(): Promise<Snapshot | null> {
  return demoMode ? getDemoSnapshot() : native('get_cached_snapshot');
}
export async function getDeviceDetail(did: string): Promise<DeviceDetail> {
  if (!demoMode) return native('get_device_detail', { did });
  const device = demoDevice(did);
  if (!details.has(did)) details.set(did, createDemoDetail(device));
  return structuredClone(details.get(did)!);
}
export async function setProperty(
  did: string,
  siid: number,
  piid: number,
  value: unknown,
): Promise<void> {
  if (!demoMode) return native('set_property', { did, siid, piid, value });
  const device = demoDevice(did);
  if (!device.online) throw new Error('设备已离线，无法控制');
  const detail = await getDeviceDetail(did);
  const property = detail.properties.find((item) => item.siid === siid && item.piid === piid);
  if (!property) throw new Error('属性不存在');
  validateProperty(property, value);
  property.value = value;
  details.set(did, detail);
  if (property.name === 'on') device.power = value as boolean;
}
export async function runAction(
  did: string,
  siid: number,
  aiid: number,
  inputs: unknown[],
): Promise<void> {
  if (!demoMode) return native('run_action', { did, siid, aiid, inputs });
  if (!demoDevice(did).online) throw new Error('设备已离线，无法执行动作');
  const detail = await getDeviceDetail(did);
  const action = detail.actions.find((item) => item.siid === siid && item.aiid === aiid);
  if (!action) throw new Error('动作不存在');
  if (inputs.length !== action.inputs.length)
    throw new Error(`该动作需要 ${action.inputs.length} 个参数`);
  if (demoDevice(did).category === 'vacuum') {
    const status = detail.properties.find((item) => item.name === 'status');
    if (status) status.value = aiid === 1 ? 1 : 2;
    demoDevice(did).metrics = aiid === 1 ? '清扫中' : '返回充电';
    details.set(did, detail);
  }
}
export async function runScene(sceneId: string, homeId: string): Promise<void> {
  if (!demoMode) return native('run_scene', { sceneId, homeId });
  if (!snapshot.scenes.some((scene) => scene.id === sceneId && scene.homeId === homeId))
    throw new Error('场景不存在');
  const on = sceneId === 'demo-arrive' || sceneId === 'demo-work';
  for (const device of snapshot.devices.filter(
    (item) => item.homeId === homeId && item.online && item.power !== null,
  )) {
    device.power = on;
    const detail = details.get(device.did);
    const prop = detail?.properties.find((item) => item.name === 'on');
    if (prop) prop.value = on;
  }
  if (sceneId === 'demo-movie') {
    snapshot.devices.find((item) => item.did === 'demo-light')!.power = false;
  }
}
export async function sendVoice(did: string, text: string, silent: boolean): Promise<void> {
  if (!demoMode) return native('send_voice', { did, text, silent });
  const device = demoDevice(did);
  if (!device.online || device.category !== 'speaker') throw new Error('请选择在线小爱音箱');
  if (!text.trim() || text.length > 500) throw new Error('请输入 1–500 字的指令');
  // Explicitly a simulation: no request is sent to real speakers.
}
export async function getSettings(): Promise<Settings> {
  return demoMode ? structuredClone(demoSettings) : native('get_settings');
}
export async function saveSettings(settings: Settings): Promise<Settings> {
  validateSettings(settings);
  if (!demoMode) return native('save_settings', { settings });
  demoSettings = structuredClone(settings);
  try {
    globalThis.localStorage?.setItem('mihome.demo.settings.v1', JSON.stringify(demoSettings));
  } catch {
    /* Demo remains usable without browser storage. */
  }
  return structuredClone(demoSettings);
}
export async function getAppInfo(): Promise<AppInfo> {
  return isDesktop
    ? native('get_app_info')
    : { version: '0.1.0', dataDir: '浏览器演示 · 不读取本地凭据', platform: 'browser' };
}
