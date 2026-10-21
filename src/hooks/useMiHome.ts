import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as api from '@/api/mihome';
import type {
  Action,
  Activity,
  Device,
  Property,
  Scene,
  Session,
  Settings,
  Snapshot,
  Page,
} from '@/types';
import { errorMessage } from '@/utils/errors';
import { useAppNavigation } from './useAppNavigation';
type Confirmation = {
  title: string;
  description: string;
  detail?: string;
  run: () => Promise<boolean>;
};
const emptySnapshot: Snapshot = {
  homes: [],
  devices: [],
  scenes: [],
  updatedAt: '',
  cached: false,
  warnings: [],
};

export function useMiHome() {
  const [settings, setSettings] = useState<Settings>(api.getDefaultSettings);
  const [session, setSession] = useState<Session>({
    authenticated: false,
    userId: null,
    region: 'cn',
  });
  const [demo, setDemo] = useState(api.isDemo);
  const [snapshot, setSnapshot] = useState<Snapshot>(emptySnapshot);
  const [initializing, setInitializing] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const { page, setPage } = useAppNavigation();
  const [homeId, setHomeId] = useState<string | null>(null);
  const [room, setRoom] = useState('');
  const [search, setSearch] = useState('');
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [sort, setSort] = useState('default');
  const [selectedDid, setSelectedDid] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [busyDevices, setBusyDevices] = useState<string[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [toast, setToast] = useState<{ message: string; error: boolean } | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const settingsLock = useRef(false);
  const refreshLock = useRef<number | null>(null);
  const generation = useRef(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const connected = demo || session.authenticated;
  const notify = useCallback((message: string, isError = false) => {
    setToast({ message, error: isError });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), isError ? 7500 : 4200);
  }, []);
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  const refresh = useCallback(
    async (quiet = false) => {
      const currentGeneration = generation.current;
      if (refreshLock.current === currentGeneration) return;
      refreshLock.current = currentGeneration;
      setRefreshing(true);
      try {
        const next = await api.refreshDevices();
        if (currentGeneration === generation.current) {
          setSnapshot(next);
          setError('');
        }
      } catch (error) {
        if (currentGeneration === generation.current) {
          setError(errorMessage(error));
          if (!quiet) notify(errorMessage(error), true);
        }
      } finally {
        if (refreshLock.current === currentGeneration) {
          refreshLock.current = null;
          setRefreshing(false);
        }
      }
    },
    [notify],
  );

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        if (!api.isDesktop) api.setDemoMode(true);
        const [nextSettings, nextSession] = await Promise.all([
          api.getSettings(),
          api.getSession(),
        ]);
        if (!alive) return;
        setSettings(nextSettings);
        setSession(nextSession);
        setDemo(api.isDemo());
        if (api.isDemo() || nextSession.authenticated) {
          const cached = await api.getCachedSnapshot().catch(() => null);
          if (alive && cached) setSnapshot(cached);
          if (alive) await refresh(true);
        }
      } catch (error) {
        if (alive) setError(errorMessage(error));
      } finally {
        if (alive) setInitializing(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [refresh]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      document.documentElement.dataset.theme =
        settings.theme === 'system' ? (media.matches ? 'dark' : 'light') : settings.theme;
    };
    apply();
    media.addEventListener('change', apply);
    document.documentElement.style.setProperty('--ui-scale', String(settings.scale));
    return () => {
      media.removeEventListener('change', apply);
    };
  }, [settings.theme, settings.scale]);
  useEffect(() => {
    if (!connected || settings.refreshInterval <= 0) return;
    const timer = setInterval(
      () => {
        if (document.visibilityState === 'visible') void refresh(true);
      },
      Math.max(15, settings.refreshInterval) * 1000,
    );
    return () => clearInterval(timer);
  }, [connected, settings.refreshInterval, refresh]);
  useEffect(() => {
    if (!settings.showScenes && page === 'scenes') setPage('home');
  }, [settings.showScenes, page, setPage]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const currentHomeId = homeId === null ? snapshot.homes[0]?.id || '' : homeId;
  const currentHome = snapshot.homes.find((home) => home.id === currentHomeId);
  const homeDevices = useMemo(
    () =>
      snapshot.devices.filter(
        (device) =>
          (!currentHomeId || device.homeId === currentHomeId) &&
          (!settings.hideUnsupported || !!device.specType),
      ),
    [snapshot.devices, currentHomeId, settings.hideUnsupported],
  );
  const rooms = currentHome
    ? currentHome.rooms
    : [...new Set(homeDevices.map((device) => device.room).filter(Boolean))];
  const scenes = snapshot.scenes.filter(
    (scene) => !currentHomeId || scene.homeId === currentHomeId,
  );
  const query = search.trim().toLocaleLowerCase();
  const filteredDevices = useMemo(() => {
    const devices = homeDevices.filter(
      (device) =>
        (!room || device.room === room) &&
        (!onlineOnly || device.online) &&
        (page !== 'favorites' || settings.favorites.includes(device.did)) &&
        (!query ||
          `${device.name} ${device.room} ${device.model}`.toLocaleLowerCase().includes(query)),
    );
    if (sort === 'online') return [...devices].sort((a, b) => Number(b.online) - Number(a.online));
    if (sort === 'name') return [...devices].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
    return devices;
  }, [homeDevices, room, onlineOnly, page, settings.favorites, query, sort]);
  const onlineCount = homeDevices.filter((device) => device.online).length;
  const activeCount = homeDevices.filter((device) => device.online && device.power === true).length;
  const selectedDevice = snapshot.devices.find((device) => device.did === selectedDid) || null;
  const visibleScenes = scenes.filter(
    (scene) => !query || scene.name.toLowerCase().includes(query),
  );
  const visibleActivity = activity.filter(
    (item) => !query || item.label.toLowerCase().includes(query),
  );
  const changeHome = (value: string) => {
    setHomeId(value);
    setRoom('');
    setSelectedDid(null);
  };
  const navigate = (value: Page) => {
    setPage(value);
    setRoom('');
    setSearch('');
  };

  const perform = async (label: string, task: () => Promise<unknown>): Promise<boolean> => {
    const operationGeneration = generation.current;
    try {
      await task();
      if (operationGeneration !== generation.current) return false;
      setActivity((current) =>
        [
          {
            id: `${Date.now()}-${Math.random()}`,
            label: `${demo ? '[演示] ' : ''}${label}`,
            time: new Date().toISOString(),
            success: true,
          },
          ...current,
        ].slice(0, 100),
      );
      notify(`${demo ? '演示 · ' : ''}${label}，已完成`);
      return true;
    } catch (error) {
      if (operationGeneration !== generation.current) return false;
      setActivity((current) =>
        [
          {
            id: `${Date.now()}-${Math.random()}`,
            label: `${demo ? '[演示] ' : ''}${label} · ${errorMessage(error)}`,
            time: new Date().toISOString(),
            success: false,
          },
          ...current,
        ].slice(0, 100),
      );
      notify(errorMessage(error), true);
      return false;
    }
  };
  const saveSettings = async (next: Settings) => {
    if (settingsLock.current) {
      notify('正在保存设置，请稍候。');
      return false;
    }
    settingsLock.current = true;
    const settingsGeneration = generation.current;
    try {
      const saved = await api.saveSettings(next);
      if (settingsGeneration !== generation.current) return false;
      setSettings(saved);
      return true;
    } catch (error) {
      notify(errorMessage(error), true);
      return false;
    } finally {
      settingsLock.current = false;
    }
  };
  const toggleFavorite = async (did: string) => {
    const wasFavorite = settings.favorites.includes(did);
    if (
      await saveSettings({
        ...settings,
        favorites: wasFavorite
          ? settings.favorites.filter((id) => id !== did)
          : [...settings.favorites, did],
      })
    )
      notify(wasFavorite ? '已从收藏中移除' : '已加入收藏');
  };
  const writeProperty = async (device: Device, property: Property, value: unknown) => {
    if (!device.online) {
      notify('设备离线，无法控制。', true);
      return false;
    }
    const ok = await perform(`${device.name} · ${property.description || property.name}`, () =>
      api.setProperty(device.did, property.siid, property.piid, value),
    );
    if (ok) await refresh(true);
    return ok;
  };
  const togglePower = async (device: Device) => {
    if (device.fault) {
      notify(device.fault, true);
      return;
    }
    if (!device.online || busyDevices.includes(device.did)) return;
    setBusyDevices((current) => [...current, device.did]);
    const operationGeneration = generation.current;
    try {
      const detail = await api.getDeviceDetail(device.did);
      if (operationGeneration !== generation.current) return;
      const property = detail.properties.find(
        (p) =>
          p.writable &&
          (p.format === 'bool' || p.format === 'boolean') &&
          (p.name === 'on' || p.name === 'power' || /开关|电源/.test(p.description)),
      );
      if (!property) {
        setSelectedDid(device.did);
        notify('该设备没有通用电源开关，请在详情中操作。');
        return;
      }
      if (property.error || typeof property.value !== 'boolean') {
        setSelectedDid(device.did);
        notify('暂时无法读取电源状态，请在详情中检查后重试。', true);
        return;
      }
      await writeProperty(device, property, !property.value);
    } catch (error) {
      notify(errorMessage(error), true);
    } finally {
      setBusyDevices((current) => current.filter((did) => did !== device.did));
    }
  };
  const runScene = (scene: Scene) =>
    setConfirmation({
      title: `运行「${scene.name}」？`,
      description: demo
        ? '当前处于演示模式，操作只会改变本地模拟设备。'
        : '该场景可能同时改变多台设备的状态，确认后将立即运行。',
      detail: `${scene.homeName} · 手动场景`,
      run: async () => {
        const ok = await perform(`运行场景「${scene.name}」`, () =>
          api.runScene(scene.id, scene.homeId),
        );
        if (ok) await refresh(true);
        return ok;
      },
    });
  const runAction = (device: Device, action: Action, inputs: unknown[]) =>
    setConfirmation({
      title: `执行「${action.description || action.name}」？`,
      description: demo
        ? '当前为演示，不会操作真实设备。'
        : '设备将立即执行此操作，请确认设备及参数。',
      detail: `${device.name} · ${action.service}${inputs.length ? `\n参数：${JSON.stringify(inputs)}` : '\n无需输入参数'}`,
      run: async () => {
        if (!snapshot.devices.find((item) => item.did === device.did)?.online) {
          notify('设备已离线，无法执行。', true);
          return false;
        }
        const ok = await perform(`${device.name} · ${action.description || action.name}`, () =>
          api.runAction(device.did, action.siid, action.aiid, inputs),
        );
        if (ok) {
          await refresh(true);
          setSelectedDid(null);
        }
        return ok;
      },
    });
  const enterDemo = async () => {
    generation.current += 1;
    api.setDemoMode(true);
    setDemo(true);
    setSnapshot(api.getDemoSnapshot());
    setError('');
    setHomeId(null);
    setRoom('');
    setActivity([]);
    try {
      setSettings(await api.getSettings());
    } catch (error) {
      notify(errorMessage(error), true);
    }
    await refresh(true);
  };
  const loginSuccess = async (nextSession: Session) => {
    generation.current += 1;
    api.setDemoMode(false);
    setDemo(false);
    setSession(nextSession);
    setLoginOpen(false);
    setAccountOpen(false);
    setSnapshot(emptySnapshot);
    setHomeId(null);
    setRoom('');
    setPage('home');
    setActivity([]);
    try {
      setSettings(await api.getSettings());
    } catch (error) {
      notify(errorMessage(error), true);
    }
    await refresh();
    notify('登录成功，欢迎回家。');
  };
  const requestLogout = () => {
    setAccountOpen(false);
    setConfirmation({
      title: '退出当前账号？',
      description: '本地登录凭据将被清除，设备与场景将不再显示。',
      run: async () => {
        const ok = await perform('退出账号', () => api.logout());
        if (ok) {
          generation.current += 1;
          setSession({ authenticated: false, userId: null, region: 'cn' });
          api.setDemoMode(false);
          setDemo(false);
          setSnapshot(emptySnapshot);
          setSelectedDid(null);
          setHomeId(null);
          setRoom('');
          setActivity([]);
        }
        return ok;
      },
    });
  };

  const exitDemo = async () => {
    generation.current += 1;
    api.setDemoMode(false);
    setDemo(false);
    setAccountOpen(false);
    setSnapshot(emptySnapshot);
    setHomeId(null);
    setRoom('');
    setActivity([]);
    try {
      const next = await api.getSession();
      setSession(next);
      setSettings(await api.getSettings());
      if (next.authenticated) await refresh();
    } catch (error) {
      notify(errorMessage(error), true);
    }
  };
  return {
    settings,
    session,
    demo,
    snapshot,
    initializing,
    refreshing,
    error,
    page,
    room,
    search,
    onlineOnly,
    sort,
    selectedDid,
    loginOpen,
    settingsOpen,
    voiceOpen,
    accountOpen,
    busyDevices,
    activity,
    toast,
    confirmation,
    confirmBusy,
    connected,
    currentHomeId,
    currentHome,
    homeDevices,
    rooms,
    scenes,
    filteredDevices,
    onlineCount,
    activeCount,
    selectedDevice,
    visibleScenes,
    visibleActivity,
    searchRef,
    setSearch,
    setOnlineOnly,
    setSort,
    setSelectedDid,
    setLoginOpen,
    setSettingsOpen,
    setVoiceOpen,
    setAccountOpen,
    setActivity,
    setToast,
    setConfirmation,
    setConfirmBusy,
    setRoom,
    navigate,
    changeHome,
    refresh,
    notify,
    perform,
    saveSettings,
    toggleFavorite,
    writeProperty,
    togglePower,
    runScene,
    runAction,
    enterDemo,
    loginSuccess,
    requestLogout,
    query,
    exitDemo,
  };
}
export type MiHomeController = ReturnType<typeof useMiHome>;
