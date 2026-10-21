import type { Device } from '@/types';

export function deviceKind(device: Pick<Device, 'category' | 'model' | 'name'>) {
  const value = `${device.category} ${device.model} ${device.name}`.toLowerCase();
  if (/purifier|净化/.test(value)) return 'purifier';
  if (/camera|摄像/.test(value)) return 'camera';
  if (/lock|门锁/.test(value)) return 'lock';
  if (/heater|热水/.test(value)) return 'heater';
  if (/air-conditioner|aircondition|空调/.test(value)) return 'air-conditioner';
  if (/speaker|音箱|小爱/.test(value)) return 'speaker';
  if (/curtain|窗帘/.test(value)) return 'curtain';
  if (/vacuum|扫地|清洁|robot/.test(value)) return 'vacuum';
  if (/sensor|温湿|传感/.test(value)) return 'sensor';
  if (/fan|风扇/.test(value)) return 'fan';
  if (/outlet|plug|插座/.test(value)) return 'outlet';
  if (/humidifier|加湿/.test(value)) return 'humidifier';
  if (/light|lamp|灯/.test(value)) return 'light';
  return 'device';
}
