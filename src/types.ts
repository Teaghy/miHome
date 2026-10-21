export type Theme = 'system' | 'light' | 'dark';
export interface Settings {
  theme: Theme;
  scale: number;
  minimizeToTray: boolean;
  autoStart: boolean;
  showScenes: boolean;
  hideUnsupported: boolean;
  refreshInterval: number;
  defaultSpeaker: string | null;
  favorites: string[];
}
export interface Session {
  authenticated: boolean;
  userId: string | null;
  region: string;
}
export interface Home {
  id: string;
  name: string;
  rooms: string[];
}
export interface Device {
  did: string;
  name: string;
  model: string;
  homeId: string;
  homeName: string;
  room: string;
  online: boolean;
  specType: string;
  power: boolean | null;
  category: string;
  metrics: string | null;
}
export interface Scene {
  id: string;
  name: string;
  homeId: string;
  homeName: string;
}
export interface Snapshot {
  homes: Home[];
  devices: Device[];
  scenes: Scene[];
  updatedAt: string;
  cached: boolean;
  warnings: string[];
}
export interface ValueOption {
  value: string | number | boolean;
  description: string;
}
export interface Property {
  siid: number;
  piid: number;
  name: string;
  description: string;
  service: string;
  format: string;
  readable: boolean;
  writable: boolean;
  unit: string | null;
  range: number[] | null;
  valueList: ValueOption[];
  value: unknown;
  error: string | null;
}
export interface Action {
  siid: number;
  aiid: number;
  name: string;
  description: string;
  service: string;
  inputs: number[];
}
export interface DeviceDetail {
  did: string;
  properties: Property[];
  actions: Action[];
}
export interface LoginTicket {
  loginUrl: string;
  expiresIn: number;
  ticketId: string;
}
export interface AppInfo {
  version: string;
  dataDir: string;
  platform: string;
}
export interface Activity {
  id: string;
  label: string;
  time: string;
  success: boolean;
}
