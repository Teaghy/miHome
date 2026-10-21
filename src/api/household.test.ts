import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadHousehold, saveHousehold } from './household';
import { energySeries } from '@/mocks/household';

const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
  });
});
describe('household experience isolation', () => {
  it('keeps energy chart samples consistent with displayed period totals', () => {
    for (const [period, total] of [
      ['day', 8.4],
      ['week', 58],
      ['month', 126.7],
    ] as const) {
      expect(energySeries[period].reduce((sum, value) => sum + value, 0)).toBeCloseTo(total, 2);
    }
  });
  it('does not expose or write demo household data for a real session', () => {
    const sample = loadHousehold('demo-home', true)!;
    saveHousehold(sample, true);
    expect(loadHousehold('demo-home', false)).toBeNull();
    expect(() => saveHousehold(sample, false)).toThrow('尚未开放');
  });
  it('persists read state separately for each household', () => {
    const sample = loadHousehold('demo-home', true)!;
    sample.messages.forEach((message) => {
      message.read = true;
    });
    saveHousehold(sample, true);
    expect(loadHousehold('demo-home', true)?.messages.every((message) => message.read)).toBe(true);
    expect(loadHousehold('demo-studio', true)?.messages.some((message) => !message.read)).toBe(
      true,
    );
  });
  it('recovers from corrupt, mismatched or incomplete saved content', () => {
    const key = 'mihome.demo.household.v1.demo-home';
    for (const value of [
      '{broken',
      '{}',
      JSON.stringify({ ...loadHousehold('demo-studio', true) }),
      JSON.stringify({ ...loadHousehold('demo-home', true), notificationPreferences: null }),
    ]) {
      store.set(key, value);
      const restored = loadHousehold('demo-home', true)!;
      expect(restored.homeId).toBe('demo-home');
      expect(restored.notificationPreferences.security).toBe(true);
      expect(restored.members).toHaveLength(3);
    }
  });
  it('reports unavailable storage rather than pretending to save', () => {
    const sample = loadHousehold('demo-home', true)!;
    vi.stubGlobal('localStorage', {
      setItem: () => {
        throw new Error('Storage full');
      },
    });
    expect(() => saveHousehold(sample, true)).toThrow('Storage full');
  });
});
