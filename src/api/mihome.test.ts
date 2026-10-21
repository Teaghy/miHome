import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: mocks.invoke }));
beforeEach(() => {
  vi.resetModules();
  mocks.invoke.mockReset();
  vi.unstubAllGlobals();
});
describe('browser demo adapter', () => {
  it('never invokes native commands for demo data and writes', async () => {
    const api = await import('./mihome');
    expect(api.isDemo()).toBe(true);
    expect(api.isDesktop).toBe(false);
    await api.setProperty('demo-light', 2, 1, false);
    expect((await api.refreshDevices()).devices[0].power).toBe(false);
    expect((await api.getDeviceDetail('demo-light')).properties[0].value).toBe(false);
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it('fails real login in browser rather than simulating authentication', async () => {
    const api = await import('./mihome');
    await expect(api.beginLogin()).rejects.toThrow('桌面版');
    expect((await api.getSession()).authenticated).toBe(false);
  });
  it('rejects offline writes, invalid values and invalid action inputs', async () => {
    const api = await import('./mihome');
    await expect(api.setProperty('demo-outlet', 2, 1, true)).rejects.toThrow('离线');
    await expect(api.setProperty('demo-light', 2, 2, 101)).rejects.toThrow();
    await expect(api.runAction('demo-vacuum', 2, 1, ['extra'])).rejects.toThrow('参数');
    await expect(api.runAction('demo-vacuum', 2, 1, [])).resolves.toBeUndefined();
    expect((await api.refreshDevices()).devices.find((d) => d.did === 'demo-vacuum')?.metrics).toBe(
      '清扫中',
    );
  });
  it('limits scene execution to its own home', async () => {
    const api = await import('./mihome');
    await expect(api.runScene('demo-away', 'demo-studio')).rejects.toThrow('不存在');
    await api.runScene('demo-away', 'demo-home');
    const snapshot = await api.refreshDevices();
    expect(
      snapshot.devices
        .filter((d) => d.homeId === 'demo-home' && d.power !== null && d.online)
        .every((d) => !d.power),
    ).toBe(true);
    expect(snapshot.devices.find((d) => d.homeId === 'demo-studio')?.power).toBe(true);
  });
  it('rejects voice sent to non-speakers and empty text', async () => {
    const api = await import('./mihome');
    await expect(api.sendVoice('demo-light', '开灯', false)).rejects.toThrow('音箱');
    await expect(api.sendVoice('demo-speaker', ' ', false)).rejects.toThrow('指令');
  });
  it('returns snapshots by value', async () => {
    const api = await import('./mihome');
    const snapshot = api.getDemoSnapshot();
    snapshot.devices.length = 0;
    expect((await api.refreshDevices()).devices).toHaveLength(13);
  });
});
describe('native adapter', () => {
  it('starts outside demo mode and invokes typed Tauri commands', async () => {
    vi.stubGlobal('window', { __TAURI_INTERNALS__: {} });
    const api = await import('./mihome');
    expect(api.isDemo()).toBe(false);
    mocks.invoke.mockResolvedValue(undefined);
    await api.setProperty('real-did', 2, 3, 50);
    expect(mocks.invoke).toHaveBeenCalledWith('set_property', {
      did: 'real-did',
      siid: 2,
      piid: 3,
      value: 50,
    });
    await api.runAction('real-did', 2, 1, []);
    expect(mocks.invoke).toHaveBeenCalledWith('run_action', {
      did: 'real-did',
      siid: 2,
      aiid: 1,
      inputs: [],
    });
  });
  it('propagates backend failures without fake success', async () => {
    vi.stubGlobal('window', { __TAURI_INTERNALS__: {} });
    const api = await import('./mihome');
    mocks.invoke.mockRejectedValue('登录已失效');
    await expect(api.refreshDevices()).rejects.toThrow('登录已失效');
  });
  it('keeps simulated writes fully isolated on desktop', async () => {
    vi.stubGlobal('window', { __TAURI_INTERNALS__: {} });
    const api = await import('./mihome');
    api.setDemoMode(true);
    await api.runScene('demo-away', 'demo-home');
    await api.saveSettings(api.getDefaultSettings());
    expect(mocks.invoke).not.toHaveBeenCalled();
    api.setDemoMode(false);
    mocks.invoke.mockResolvedValue({ authenticated: true, userId: '123', region: 'cn' });
    expect((await api.getSession()).authenticated).toBe(true);
  });
});
