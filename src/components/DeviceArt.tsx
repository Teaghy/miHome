import {
  AirVent,
  AudioLines,
  Blinds,
  Bot,
  Droplets,
  Fan,
  LampDesk,
  Plug,
  Radio,
  Thermometer,
  Wind,
  type LucideIcon,
} from 'lucide-react';
import type { Device } from '../types';

export function deviceKind(device: Pick<Device, 'category' | 'model' | 'name'>) {
  const value = `${device.category} ${device.model} ${device.name}`.toLowerCase();
  if (/purifier|净化/.test(value)) return 'purifier';
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

const icons: Record<string, LucideIcon> = {
  'air-conditioner': AirVent,
  purifier: Wind,
  speaker: AudioLines,
  curtain: Blinds,
  vacuum: Bot,
  sensor: Thermometer,
  fan: Fan,
  outlet: Plug,
  humidifier: Droplets,
  light: LampDesk,
  device: Radio,
};

export function DeviceArt({
  device,
  large = false,
}: {
  device: Pick<Device, 'category' | 'model' | 'name'>;
  large?: boolean;
}) {
  const kind = deviceKind(device);
  const Icon = icons[kind];
  return (
    <div aria-hidden="true" className={`device-art art-${kind} ${large ? 'large' : ''}`}>
      <div className="art-orbit" />
      <Icon size={large ? 68 : 45} strokeWidth={1.35} className="appliance-icon" />
      <span className="art-shadow" />
      {kind === 'purifier' && <span className="art-breeze">· · ·</span>}
    </div>
  );
}
