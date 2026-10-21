import { describe, expect, it } from 'vitest';
import { createDemoDetail, createDemoSnapshot } from '@/mocks/devices';
import {
  defaultSettings,
  filterDevices,
  roomsForHome,
  validateProperty,
  validateSettings,
} from './device';
describe('device filtering', () => {
  const snapshot = createDemoSnapshot();
  it('separates homes without matching room names across homes', () => {
    expect(filterDevices(snapshot.devices, { homeId: 'demo-home' })).toHaveLength(12);
    expect(filterDevices(snapshot.devices, { homeId: 'demo-studio' }).map((d) => d.name)).toEqual([
      '工作室阅读灯',
    ]);
  });
  it('combines room, search, offline, favorite and unsupported filters', () => {
    expect(filterDevices(snapshot.devices, { room: '客厅', search: '净化' })[0]?.did).toBe(
      'demo-purifier',
    );
    expect(filterDevices(snapshot.devices, { search: ' YEELINK ' })).toHaveLength(3);
    expect(filterDevices(snapshot.devices, { onlineOnly: true })).toHaveLength(12);
    expect(filterDevices(snapshot.devices, { favorites: [] })).toHaveLength(0);
    expect(filterDevices(snapshot.devices, { favorites: ['demo-light'] })).toHaveLength(1);
    expect(filterDevices(snapshot.devices, { hideUnsupported: true })).toHaveLength(12);
  });
  it('returns deduplicated rooms in the selected home', () => {
    expect(roomsForHome(snapshot.homes, 'demo-studio')).toEqual(['办公室']);
    expect(roomsForHome(snapshot.homes, 'missing')).toEqual([]);
  });
});
describe('settings validation', () => {
  it('clones defaults so callers cannot mutate shared values', () => {
    const settings = validateSettings(defaultSettings);
    settings.favorites.push('x');
    expect(defaultSettings.favorites).toEqual([]);
  });
  it('rejects invalid zoom and unsafe refresh intervals', () => {
    for (const scale of [0.49, 2.01, NaN, Infinity])
      expect(() => validateSettings({ ...defaultSettings, scale })).toThrow();
    for (const refreshInterval of [-1, 14, 3601, 60.1])
      expect(() => validateSettings({ ...defaultSettings, refreshInterval })).toThrow();
    expect(validateSettings({ ...defaultSettings, refreshInterval: 0 }).refreshInterval).toBe(0);
  });
});
describe('MIoT property controls', () => {
  const snapshot = createDemoSnapshot();
  const lamp = createDemoDetail(snapshot.devices[0]);
  it('accepts valid booleans and rejects coercion', () => {
    expect(() => validateProperty(lamp.properties[0], true)).not.toThrow();
    expect(() => validateProperty(lamp.properties[0], 'true')).toThrow();
  });
  it('enforces range, step, integer type and finite values', () => {
    const brightness = lamp.properties[1];
    for (const value of [0, 101, 2.5, NaN, Infinity, '50'])
      expect(() => validateProperty(brightness, value)).toThrow();
    expect(() => validateProperty(brightness, 50)).not.toThrow();
    const kelvin = lamp.properties[2];
    expect(() => validateProperty(kelvin, 2750)).toThrow();
    expect(() => validateProperty(kelvin, 2800)).not.toThrow();
  });
  it('rejects writing read-only values and unknown enum choices', () => {
    const sensor = createDemoDetail(snapshot.devices.find((d) => d.category === 'sensor')!);
    expect(() => validateProperty(sensor.properties[0], 26)).toThrow('只读');
    const ac = createDemoDetail(snapshot.devices.find((d) => d.category === 'air-conditioner')!);
    expect(() => validateProperty(ac.properties[2], 99)).toThrow('选项');
    expect(() => validateProperty(ac.properties[2], 2)).not.toThrow();
  });
});
