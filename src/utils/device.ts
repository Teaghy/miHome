import type { Device, Home, Property, Settings } from '@/types';
export const defaultSettings: Settings = {
  theme: 'light',
  scale: 1,
  minimizeToTray: true,
  autoStart: false,
  showScenes: true,
  hideUnsupported: false,
  refreshInterval: 60,
  defaultSpeaker: null,
  favorites: [],
};
export function validateSettings(input: Settings): Settings {
  if (!['system', 'light', 'dark'].includes(input.theme)) throw new Error('无效的主题');
  if (!Number.isFinite(input.scale) || input.scale < 0.5 || input.scale > 2)
    throw new Error('界面缩放应为 50%–200%');
  if (
    !Number.isInteger(input.refreshInterval) ||
    (input.refreshInterval !== 0 && (input.refreshInterval < 15 || input.refreshInterval > 3600))
  )
    throw new Error('刷新间隔应为 0（手动）或 15–3600 秒');
  return structuredClone(input);
}
export function validateProperty(property: Property, value: unknown): void {
  if (!property.writable) throw new Error('该属性只读');
  if (property.format === 'bool' && typeof value !== 'boolean') throw new Error('请输入布尔值');
  if (property.format === 'string' && typeof value !== 'string') throw new Error('请输入文本');
  if (/^(u?int\d*|float|double)$/.test(property.format)) {
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('请输入有效数值');
    if (property.format.includes('int') && !Number.isInteger(value)) throw new Error('请输入整数');
    if (property.range) {
      const [min, max, step] = property.range;
      if (value < min || value > max) throw new Error(`数值应介于 ${min}–${max}`);
      if (step > 0 && Math.abs((value - min) / step - Math.round((value - min) / step)) > 1e-6)
        throw new Error(`数值步长应为 ${step}`);
    }
  }
  if (property.valueList.length && !property.valueList.some((option) => option.value === value))
    throw new Error('不支持该选项');
}
export function filterDevices(
  devices: Device[],
  filter: {
    homeId?: string;
    room?: string;
    search?: string;
    onlineOnly?: boolean;
    favorites?: string[];
    hideUnsupported?: boolean;
  },
): Device[] {
  const query = filter.search?.trim().toLocaleLowerCase();
  return devices.filter(
    (device) =>
      (!filter.homeId || filter.homeId === 'all' || device.homeId === filter.homeId) &&
      (!filter.room ||
        filter.room === '全部房间' ||
        filter.room === 'all' ||
        device.room === filter.room) &&
      (!query ||
        `${device.name} ${device.model} ${device.room}`.toLocaleLowerCase().includes(query)) &&
      (!filter.onlineOnly || device.online) &&
      (!filter.favorites || filter.favorites.includes(device.did)) &&
      (!filter.hideUnsupported || !!device.specType),
  );
}
export function roomsForHome(homes: Home[], homeId: string): string[] {
  return [
    ...new Set(
      homes.filter((home) => homeId === 'all' || home.id === homeId).flatMap((home) => home.rooms),
    ),
  ];
}
