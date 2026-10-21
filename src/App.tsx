import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity as ActivityIcon,
  ArrowDownUp,
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  DoorOpen,
  Grid2X2,
  Heart,
  House,
  Layers3,
  Leaf,
  LoaderCircle,
  LogIn,
  LogOut,
  Menu,
  Monitor,
  Moon,
  Play,
  Power,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
  Wifi,
  X,
  Zap,
} from 'lucide-react';
import * as api from './bridge';
import type {
  Action,
  Activity,
  Device,
  Property,
  Scene,
  Session,
  Settings,
  Snapshot,
} from './types';
import { DeviceArt } from './components/DeviceArt';
import { DeviceSheet } from './components/DeviceSheet';
import { LoginDialog } from './components/LoginDialog';
import { SettingsDialog } from './components/SettingsDialog';
import { VoiceDialog } from './components/VoiceDialog';
import { Modal, Notice, Spinner, Toast, errorMessage } from './components/ui';
import './styles.css';

type Page = 'home' | 'scenes' | 'favorites' | 'activity';
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
const navItems = [
  { id: 'home', label: '我的家庭', icon: House },
  { id: 'scenes', label: '智能场景', icon: Layers3 },
  { id: 'favorites', label: '收藏设备', icon: Heart },
  { id: 'activity', label: '最近活动', icon: Clock3 },
] as const;

function Brand() {
  return (
    <>
      <div className="brand-symbol" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="brand-wordmark">
        MiHome<small>米家 · 桌面版</small>
      </div>
    </>
  );
}
function scenePresentation(scene: Scene) {
  const name = scene.name.toLowerCase();
  if (/回家|arrive|home/.test(name))
    return { icon: DoorOpen, color: 'peach', subtitle: '把舒适的家，提前准备好' };
  if (/睡|晚安|sleep/.test(name))
    return { icon: Moon, color: 'lavender', subtitle: '卸下一天的忙碌，安心入眠' };
  if (/电影|movie|观影/.test(name))
    return { icon: Play, color: 'blue', subtitle: '灯光就绪，进入你的影院' };
  if (/离家|away/.test(name))
    return { icon: ShieldCheck, color: 'sage', subtitle: '出门在外，也让家井然有序' };
  return { icon: Sparkles, color: 'sage', subtitle: '让设备默契配合，一触即达' };
}
function timeLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '尚未同步'
    : date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

export default function App() {
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
  const [page, setPage] = useState<Page>('home');
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
  const [mobileNav, setMobileNav] = useState(false);
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
  }, [settings.showScenes, page]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === 'Escape') setMobileNav(false);
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
  const favoritesCount = snapshot.devices.filter((device) =>
    settings.favorites.includes(device.did),
  ).length;
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
    setMobileNav(false);
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

  return (
    <div className="app-shell">
      {mobileNav && (
        <button
          className="sidebar-scrim"
          aria-label="关闭导航"
          onClick={() => setMobileNav(false)}
        />
      )}
      <aside className={`sidebar ${mobileNav ? 'is-open' : ''}`}>
        <a
          className="brand"
          href="#"
          aria-label="MiHome 我的家庭"
          onClick={(event) => {
            event.preventDefault();
            navigate('home');
          }}
        >
          <Brand />
        </a>
        <div className="workspace-label">家的每一面</div>
        <nav className="primary-nav" aria-label="主导航">
          {navItems
            .filter((item) => item.id !== 'scenes' || settings.showScenes)
            .map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={`nav-item ${page === id ? 'active' : ''}`}
                aria-current={page === id ? 'page' : undefined}
                onClick={() => navigate(id)}
              >
                <Icon size={19} strokeWidth={page === id ? 1.9 : 1.65} />
                <span>{label}</span>
                {id === 'favorites' && favoritesCount > 0 && <small>{favoritesCount}</small>}
                {id === 'home' && <span className="active-nav-dot" />}
              </button>
            ))}
        </nav>
        {connected && rooms.length > 0 && (
          <div className="sidebar-rooms">
            <div className="sidebar-section-heading">
              我的房间 <span>{rooms.length}</span>
            </div>
            <button
              className={`room-nav ${!room && page === 'home' ? 'selected' : ''}`}
              onClick={() => {
                setPage('home');
                setRoom('');
                setMobileNav(false);
              }}
            >
              <Grid2X2 size={15} />
              <span>全部房间</span>
              <small>{homeDevices.length}</small>
            </button>
            {rooms.map((name, index) => (
              <button
                key={name}
                className={`room-nav ${room === name && page === 'home' ? 'selected' : ''}`}
                onClick={() => {
                  setPage('home');
                  setRoom(name);
                  setMobileNav(false);
                }}
              >
                <i className={`room-dot room-color-${index % 4}`} />
                <span>{name}</span>
                <small>{homeDevices.filter((device) => device.room === name).length}</small>
              </button>
            ))}
          </div>
        )}
        <div className="sidebar-bottom">
          <div className="home-note">
            <div className="note-illustration">
              <House size={32} strokeWidth={1.2} />
              <Leaf size={16} />
            </div>
            <strong>家的美好，触手可及</strong>
            <p>
              每一个小小的连接
              <br />
              都让生活多一分从容
            </p>
          </div>
          <button className="nav-item settings-nav" onClick={() => setSettingsOpen(true)}>
            <Settings2 size={18} strokeWidth={1.7} />
            <span>偏好设置</span>
            <ChevronRight className="settings-chevron" size={13} />
          </button>
          <button
            className="sidebar-account"
            onClick={() => (connected ? setAccountOpen(true) : setLoginOpen(true))}
          >
            <span className="avatar">
              <Leaf size={18} />
            </span>
            <span>
              <strong>
                {demo ? '体验官' : session.authenticated ? '我的账号' : '欢迎使用 MiHome'}
              </strong>
              <small>
                {demo
                  ? '演示家庭 · 本地体验'
                  : session.authenticated
                    ? `小米账号 · ${session.region.toUpperCase()}`
                    : '登录后连接你的家'}
              </small>
            </span>
            <ChevronRight size={15} />
          </button>
          <p className="sidebar-disclaimer">
            非官方米家客户端 <span>·</span> 为热爱而造
          </p>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            aria-label="打开导航"
            onClick={() => setMobileNav(true)}
          >
            <Menu size={20} />
          </button>
          <div className="breadcrumb">
            <House size={17} strokeWidth={1.6} />
            <span className="breadcrumb-slash">/</span>
            <div className="home-selector">
              <select
                aria-label="选择家庭"
                value={currentHomeId}
                disabled={!connected || snapshot.homes.length === 0}
                onChange={(event) => changeHome(event.target.value)}
              >
                {snapshot.homes.length === 0 ? (
                  <option value="">我的家庭</option>
                ) : (
                  <>
                    <option value="">全部家庭</option>
                    {snapshot.homes.map((home) => (
                      <option key={home.id} value={home.id}>
                        {home.name}
                      </option>
                    ))}
                  </>
                )}
              </select>
              <ChevronDown size={13} />
            </div>
            <span className="breadcrumb-current">
              {navItems.find((item) => item.id === page)?.label}
            </span>
          </div>
          <div className="topbar-tools">
            <label className="search-box">
              <Search size={16} />
              <input
                ref={searchRef}
                type="search"
                aria-label="搜索设备或场景"
                placeholder={
                  page === 'scenes'
                    ? '搜索智能场景…'
                    : page === 'activity'
                      ? '搜索当前会话…'
                      : '搜索你的设备…'
                }
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <kbd>Ctrl K</kbd>
            </label>
            <button
              className={`icon-button refresh-button ${refreshing ? 'refreshing' : ''}`}
              title="刷新设备"
              aria-label="刷新设备"
              disabled={!connected || refreshing}
              onClick={() => void refresh()}
            >
              <RefreshCw size={18} className={refreshing ? 'spin' : ''} />
            </button>
            <span className="topbar-divider" />
            <button
              className="avatar topbar-avatar"
              aria-label={connected ? '账号信息' : '登录账号'}
              onClick={() => (connected ? setAccountOpen(true) : setLoginOpen(true))}
            >
              <Leaf size={18} />
            </button>
          </div>
        </header>
        <main className="main-content" id="main-content">
          {initializing ? (
            <div className="initial-loading">
              <div className="brand-symbol">
                <span />
                <span />
                <span />
              </div>
              <Spinner label="正在为你准备家的空间…" />
            </div>
          ) : !connected ? (
            <div className="welcome-page">
              <div className="welcome-art">
                <div className="welcome-halo" />
                <House size={136} strokeWidth={0.75} />
                <Leaf className="welcome-leaf" size={54} strokeWidth={1.1} />
                <span className="welcome-art-dot" />
              </div>
              <span className="eyebrow">YOUR HOME, A LITTLE CLOSER</span>
              <h1>
                每一个日常，
                <br />
                都与家相连<span>。</span>
              </h1>
              <p>
                在桌面上轻松管理你的米家设备。
                <br />
                一处掌握家的状态，让生活自然发生。
              </p>
              {error && <Notice danger>{error}</Notice>}
              <div className="welcome-actions">
                <button className="button primary" onClick={() => setLoginOpen(true)}>
                  <LogIn size={17} />
                  登录小米账号
                  <ArrowRight size={17} />
                </button>
                <button className="button secondary" onClick={() => void enterDemo()}>
                  先体验演示家庭
                </button>
              </div>
              <div className="welcome-privacy">
                <ShieldCheck size={15} />
                只有在你主动登录后，才会连接真实家庭。
              </div>
              <div className="welcome-features">
                <span>
                  <Monitor size={17} />
                  原生桌面体验
                </span>
                <span>
                  <Zap size={17} />
                  MIoT 设备控制
                </span>
                <span>
                  <ShieldCheck size={17} />
                  凭据本地保存
                </span>
              </div>
              <p className="unofficial-note">独立开发的非官方客户端 · 与小米公司无隶属关系</p>
            </div>
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <div className="heading-eyebrow">
                    <span className="tiny-sun">
                      <Sun size={13} />
                    </span>
                    {new Intl.DateTimeFormat('zh-CN', {
                      month: 'long',
                      day: 'numeric',
                      weekday: 'long',
                    }).format(new Date())}
                    <span>·</span>
                    {currentHome?.name || '所有家庭'}
                  </div>
                  <h1>
                    {page === 'home' ? (
                      <>
                        欢迎回家<span className="heading-comma">，</span>让生活慢下来
                        <Leaf size={25} strokeWidth={1.5} />
                      </>
                    ) : page === 'scenes' ? (
                      '刚刚好的生活，一触即达'
                    ) : page === 'favorites' ? (
                      '把常用的，留在手边'
                    ) : (
                      '家的每一次回应'
                    )}
                  </h1>
                  <p>
                    {page === 'home'
                      ? '一眼看见家的状态，轻松掌控每一个舒适瞬间。'
                      : page === 'scenes'
                        ? '你的家庭场景已同步，确认后即可运行。'
                        : page === 'favorites'
                          ? '属于你的设备快捷收藏，常用的总能更快找到。'
                          : '只记录当前会话中实际发起的操作，不推测设备历史。'}
                  </p>
                </div>
                <button
                  className="button secondary voice-launch"
                  onClick={() => setVoiceOpen(true)}
                >
                  <AudioLines size={17} />
                  小爱语音
                  <ArrowUpRight size={14} />
                </button>
              </div>
              {demo && (
                <div className="demo-banner">
                  <span className="demo-icon">
                    <Sparkles size={15} />
                  </span>
                  <strong>你正在探索演示家庭</strong>
                  <p>这里的设备和数据均为模拟，操作不会影响真实设备。</p>
                  <button onClick={() => setLoginOpen(true)}>
                    连接我的家庭
                    <ArrowRight size={14} />
                  </button>
                </div>
              )}
              {error && (
                <div className="error-banner">
                  <Notice danger>
                    {error} {snapshot.devices.length > 0 && '当前保留上次成功同步的数据。'}
                  </Notice>
                  <button
                    className="button secondary small"
                    disabled={refreshing}
                    onClick={() => void refresh()}
                  >
                    重新同步
                  </button>
                </div>
              )}
              {snapshot.warnings.map((warning, index) => (
                <Notice key={index}>{warning}</Notice>
              ))}
              {snapshot.cached && (
                <Notice>
                  当前显示本地缓存，设备状态可能不是最新。上次更新 {timeLabel(snapshot.updatedAt)}。
                </Notice>
              )}
              {(page === 'home' || page === 'favorites') && (
                <>
                  <div className="overview-grid">
                    <div className="overview-card">
                      <span className="stat-icon sage">
                        <Wifi size={19} />
                      </span>
                      <div>
                        <span className="stat-label">在线设备</span>
                        <div className="stat-number">
                          {onlineCount}
                          <span>/ {homeDevices.length} 台</span>
                        </div>
                      </div>
                      <div className="stat-side">
                        <span className="status-label">
                          <i />
                          {homeDevices.length
                            ? `${Math.round((onlineCount / homeDevices.length) * 100)}% 在线`
                            : '等待连接'}
                        </span>
                        <div className="mini-device-dots">
                          {homeDevices.slice(0, 12).map((device) => (
                            <i key={device.did} className={device.online ? 'online' : ''} />
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="overview-card">
                      <span className="stat-icon peach">
                        <Zap size={19} />
                      </span>
                      <div>
                        <span className="stat-label">正在运行</span>
                        <div className="stat-number">
                          {activeCount}
                          <span>台设备</span>
                        </div>
                      </div>
                      <span className="stat-footnote">
                        {activeCount ? '让舒适，恰到好处' : '家正在安静休息'}
                      </span>
                    </div>
                    <div className="overview-card">
                      <span className="stat-icon lavender">
                        {settings.showScenes ? <Layers3 size={19} /> : <House size={19} />}
                      </span>
                      <div>
                        <span className="stat-label">
                          {settings.showScenes ? '智能场景' : '家庭房间'}
                        </span>
                        <div className="stat-number">
                          {settings.showScenes ? scenes.length : rooms.length}
                          <span>{settings.showScenes ? '个场景' : '个房间'}</span>
                        </div>
                      </div>
                      {settings.showScenes ? (
                        <button
                          className="stat-link"
                          aria-label="查看全部智能场景"
                          onClick={() => navigate('scenes')}
                        >
                          <ArrowUpRight size={18} />
                        </button>
                      ) : (
                        <span className="stat-footnote">每个空间，各有温度</span>
                      )}
                    </div>
                  </div>
                  <div className={`dashboard-layout ${!settings.showScenes ? 'without-rail' : ''}`}>
                    <section className="devices-section" aria-label="设备列表">
                      <div className="section-heading">
                        <div>
                          <h2>
                            {page === 'favorites' ? '我的收藏' : '我的设备'}
                            <span>{filteredDevices.length}</span>
                          </h2>
                          <span className="sync-info">
                            <span className={`live-dot ${refreshing ? 'syncing' : ''}`} />
                            {refreshing ? '正在同步…' : `${timeLabel(snapshot.updatedAt)} 已同步`}
                          </span>
                        </div>
                        <div className="list-tools">
                          <label className={`online-filter ${onlineOnly ? 'selected' : ''}`}>
                            <input
                              type="checkbox"
                              checked={onlineOnly}
                              onChange={(event) => setOnlineOnly(event.target.checked)}
                            />
                            <span className="checkbox-art">
                              {onlineOnly && <Check size={10} />}
                            </span>
                            仅在线
                          </label>
                          <label className="sort-control">
                            <ArrowDownUp size={14} />
                            <select
                              aria-label="设备排序"
                              value={sort}
                              onChange={(event) => setSort(event.target.value)}
                            >
                              <option value="default">默认排序</option>
                              <option value="online">在线优先</option>
                              <option value="name">按名称</option>
                            </select>
                          </label>
                        </div>
                      </div>
                      <div className="room-chips" aria-label="按房间筛选">
                        <button
                          className={!room ? 'active' : ''}
                          aria-pressed={!room}
                          onClick={() => setRoom('')}
                        >
                          全部设备
                          <span>
                            {page === 'favorites'
                              ? homeDevices.filter((device) =>
                                  settings.favorites.includes(device.did),
                                ).length
                              : homeDevices.length}
                          </span>
                        </button>
                        {rooms.map((name) => (
                          <button
                            key={name}
                            className={room === name ? 'active' : ''}
                            aria-pressed={room === name}
                            onClick={() => setRoom(name)}
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                      {filteredDevices.length > 0 ? (
                        <div className="device-grid">
                          {filteredDevices.map((device) => (
                            <article
                              className={`device-card ${!device.online ? 'is-offline' : ''}`}
                              key={device.did}
                            >
                              <div className="device-card-top">
                                <span className={`status-label ${device.online ? '' : 'offline'}`}>
                                  <i />
                                  {device.online ? '在线' : '离线'}
                                </span>
                                <button
                                  className={`card-favorite ${settings.favorites.includes(device.did) ? 'is-favorite' : ''}`}
                                  aria-label={`${settings.favorites.includes(device.did) ? '取消收藏' : '收藏'}${device.name}`}
                                  onClick={() => void toggleFavorite(device.did)}
                                >
                                  <Heart
                                    size={15}
                                    strokeWidth={1.7}
                                    fill={
                                      settings.favorites.includes(device.did)
                                        ? 'currentColor'
                                        : 'none'
                                    }
                                  />
                                </button>
                              </div>
                              <button
                                className="device-card-body"
                                onClick={() => setSelectedDid(device.did)}
                                aria-label={`查看${device.name}详情`}
                              >
                                <DeviceArt device={device} />
                                <div className="device-text">
                                  <h3>{device.name}</h3>
                                  <span>
                                    {device.room || '未分配房间'}
                                    <i>·</i>
                                    {device.online
                                      ? device.power === null
                                        ? '状态已同步'
                                        : device.power
                                          ? '已开启'
                                          : '已关闭'
                                      : '设备未连接'}
                                  </span>
                                </div>
                              </button>
                              <div className="device-card-footer">
                                <span className="device-metric">
                                  {device.online
                                    ? device.metrics ||
                                      (device.power === true
                                        ? '运行中'
                                        : device.power === false
                                          ? '待机中'
                                          : '查看设备状态')
                                    : '等待重新连接'}
                                </span>
                                {device.power !== null ? (
                                  <button
                                    className={`power-button ${device.online && device.power ? 'is-on' : ''}`}
                                    aria-label={`${device.power ? '关闭' : '开启'}${device.name}`}
                                    title={
                                      !device.online
                                        ? '设备离线，无法控制'
                                        : device.power
                                          ? '关闭设备'
                                          : '开启设备'
                                    }
                                    disabled={!device.online || busyDevices.includes(device.did)}
                                    onClick={() => void togglePower(device)}
                                  >
                                    {busyDevices.includes(device.did) ? (
                                      <LoaderCircle size={17} className="spin" />
                                    ) : (
                                      <Power size={18} strokeWidth={1.8} />
                                    )}
                                  </button>
                                ) : (
                                  <button
                                    className="detail-button"
                                    aria-label={`查看${device.name}详情`}
                                    onClick={() => setSelectedDid(device.did)}
                                  >
                                    <ChevronRight size={18} />
                                  </button>
                                )}
                              </div>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <div className="empty-state">
                          <div className="empty-icon">
                            {page === 'favorites' ? (
                              <Heart size={30} strokeWidth={1.3} />
                            ) : query ? (
                              <Search size={30} strokeWidth={1.3} />
                            ) : (
                              <House size={30} strokeWidth={1.3} />
                            )}
                          </div>
                          <h3>
                            {query
                              ? '没有找到相符的设备'
                              : page === 'favorites'
                                ? '把喜欢的设备，收藏在这里'
                                : '这个空间还没有设备'}
                          </h3>
                          <p>
                            {query || room || onlineOnly
                              ? '试试其他关键词，或调整房间与在线筛选。'
                              : page === 'favorites'
                                ? '点击设备卡片右上角的爱心，下次更快找到它。'
                                : '在米家 App 中添加设备后，回到这里同步。'}
                          </p>
                          {query || room || onlineOnly ? (
                            <button
                              className="button secondary"
                              onClick={() => {
                                setSearch('');
                                setRoom('');
                                setOnlineOnly(false);
                              }}
                            >
                              清除筛选
                            </button>
                          ) : page === 'favorites' ? (
                            <button className="button secondary" onClick={() => navigate('home')}>
                              去看看我的设备
                              <ArrowRight size={15} />
                            </button>
                          ) : (
                            <button
                              className="button secondary"
                              onClick={() => void refresh()}
                              disabled={refreshing}
                            >
                              <RefreshCw size={15} />
                              同步设备
                            </button>
                          )}
                        </div>
                      )}
                      <div className="devices-endnote">
                        <ShieldCheck size={13} />
                        {demo ? '演示数据 · 不连接真实设备' : '设备状态由米家云端同步'}
                        <span>·</span>共 {filteredDevices.length} 台设备
                      </div>
                    </section>
                    {settings.showScenes && (
                      <aside className="dashboard-rail">
                        <div className="rail-section">
                          <div className="rail-heading">
                            <h2>快捷场景</h2>
                            <button
                              className="icon-button"
                              aria-label="查看全部场景"
                              onClick={() => navigate('scenes')}
                            >
                              <ArrowUpRight size={17} />
                            </button>
                          </div>
                          <p className="rail-subtitle">把生活，调成喜欢的模样</p>
                          <div className="quick-scenes">
                            {scenes.length ? (
                              scenes.slice(0, 3).map((scene) => {
                                const { icon: Icon, color } = scenePresentation(scene);
                                return (
                                  <button
                                    key={scene.id}
                                    className={`quick-scene ${color}`}
                                    onClick={() => runScene(scene)}
                                  >
                                    <span className="scene-icon">
                                      <Icon size={19} strokeWidth={1.5} />
                                    </span>
                                    <span>
                                      <strong>{scene.name}</strong>
                                      <small>点击运行</small>
                                    </span>
                                    <span className="scene-play">
                                      <Play size={11} fill="currentColor" />
                                    </span>
                                  </button>
                                );
                              })
                            ) : (
                              <div className="mini-empty">
                                <Layers3 size={24} />
                                <p>还没有手动场景</p>
                                <small>在米家 App 中创建后同步。</small>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="rail-section room-overview">
                          <div className="rail-heading">
                            <h2>房间一览</h2>
                            <House size={16} />
                          </div>
                          {rooms.map((name, index) => {
                            const devices = homeDevices.filter((device) => device.room === name);
                            const online = devices.filter((device) => device.online).length;
                            return (
                              <button
                                key={name}
                                className="room-overview-item"
                                onClick={() => {
                                  setPage('home');
                                  setRoom(name);
                                }}
                              >
                                <span className={`room-overview-icon room-bg-${index % 4}`}>
                                  <House size={16} strokeWidth={1.5} />
                                </span>
                                <span>
                                  <strong>{name}</strong>
                                  <small>
                                    {devices.length} 台设备
                                    {devices.length - online > 0
                                      ? ` · ${devices.length - online} 台离线`
                                      : ' · 连接正常'}
                                  </small>
                                </span>
                                <ChevronRight size={13} />
                              </button>
                            );
                          })}
                        </div>
                        <div className="quiet-card">
                          <Leaf size={24} strokeWidth={1.2} />
                          <span className="quiet-line" />
                          <h3>
                            让科技轻一点
                            <br />
                            让生活暖一点
                          </h3>
                          <p>
                            不必时刻掌控
                            <br />
                            美好也能如期发生
                          </p>
                          <span className="quiet-signature">MiHome · 在家，自在</span>
                        </div>
                      </aside>
                    )}
                  </div>
                </>
              )}
              {page === 'scenes' && (
                <section className="scenes-section">
                  <div className="section-heading">
                    <div>
                      <h2>
                        我的智能场景<span>{visibleScenes.length}</span>
                      </h2>
                      <span className="muted-note">场景来自你的米家家庭，执行前需要确认</span>
                    </div>
                    <button
                      className="button secondary small"
                      disabled={refreshing}
                      onClick={() => void refresh()}
                    >
                      <RefreshCw size={15} />
                      同步场景
                    </button>
                  </div>
                  <div className="scene-grid">
                    {visibleScenes.map((scene) => {
                      const { icon: Icon, color, subtitle } = scenePresentation(scene);
                      return (
                        <article className={`scene-card ${color}`} key={scene.id}>
                          <span className="large-scene-icon">
                            <Icon size={29} strokeWidth={1.4} />
                          </span>
                          <span className="scene-home">{scene.homeName}</span>
                          <h3>{scene.name}</h3>
                          <p>{subtitle}</p>
                          <button
                            className="button scene-run-button"
                            onClick={() => runScene(scene)}
                          >
                            <Play size={14} fill="currentColor" />
                            运行场景
                            <ArrowUpRight size={15} />
                          </button>
                        </article>
                      );
                    })}
                  </div>
                  {!visibleScenes.length && (
                    <div className="empty-state">
                      <Layers3 size={36} strokeWidth={1.3} />
                      <h3>{query ? '没有找到这个场景' : '让生活多一点默契'}</h3>
                      <p>
                        {query
                          ? '请尝试其他关键词。'
                          : '在米家 App 中创建手动场景，再回到这里同步。'}
                      </p>
                      {query && (
                        <button className="button secondary" onClick={() => setSearch('')}>
                          清除搜索
                        </button>
                      )}
                    </div>
                  )}
                  <div className="scene-info">
                    <CircleHelp size={17} />
                    <div>
                      <strong>关于智能场景</strong>
                      <p>
                        这里只显示当前家庭可手动运行的场景。场景的创建、编辑与自动化条件请在米家 App
                        中管理。
                      </p>
                    </div>
                  </div>
                </section>
              )}
              {page === 'activity' && (
                <section className="activity-section">
                  <div className="section-heading">
                    <div>
                      <h2>
                        本次会话<span>{activity.length}</span>
                      </h2>
                      <span className="muted-note">记录只在当前页面会话中保留，最多 100 条</span>
                    </div>
                    {activity.length > 0 && (
                      <button className="button secondary small" onClick={() => setActivity([])}>
                        清空记录
                      </button>
                    )}
                  </div>
                  {activity.length ? (
                    <ol className="activity-list">
                      {visibleActivity.length === 0 && (
                        <li>
                          <Search size={20} />
                          <div>
                            <strong>没有找到匹配的活动</strong>
                            <span>试试其他关键词，或清除搜索。</span>
                          </div>
                          <button className="button secondary small" onClick={() => setSearch('')}>
                            清除搜索
                          </button>
                        </li>
                      )}
                      {visibleActivity.map((item) => (
                        <li key={item.id}>
                          <span className={`activity-result ${item.success ? '' : 'failed'}`}>
                            {item.success ? <Check size={17} /> : <X size={17} />}
                          </span>
                          <div>
                            <strong>{item.label}</strong>
                            <span>
                              {item.success ? '操作已确认' : '操作未完成'} ·{' '}
                              {demo ? '本地演示' : '真实设备请求'}
                            </span>
                          </div>
                          <time dateTime={item.time}>{timeLabel(item.time)}</time>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <div className="empty-state">
                      <div className="empty-icon">
                        <ActivityIcon size={31} strokeWidth={1.3} />
                      </div>
                      <h3>还没有新的活动</h3>
                      <p>
                        控制设备、运行场景或发送语音后，
                        <br />
                        真实发生的操作会记录在这里。
                      </p>
                      <button className="button secondary" onClick={() => navigate('home')}>
                        回到我的家庭
                        <ArrowRight size={15} />
                      </button>
                    </div>
                  )}
                  <Notice>此处并非米家云端历史记录。重新打开应用后，当前会话活动不会保留。</Notice>
                </section>
              )}
            </>
          )}
          <footer className="page-footer">
            <span>
              MiHome <i>·</i> 每一份连接，都为更好的生活
            </span>
            <span>
              {demo ? '本地演示' : '独立开发 · 非官方客户端'}
              <span className="footer-dot" />
            </span>
          </footer>
        </main>
      </div>
      <DeviceSheet
        device={selectedDevice}
        onClose={() => setSelectedDid(null)}
        favorite={!!selectedDid && settings.favorites.includes(selectedDid)}
        onFavorite={() => {
          if (selectedDid) void toggleFavorite(selectedDid);
        }}
        onWrite={writeProperty}
        onAction={runAction}
      />
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        devices={snapshot.devices}
        onSave={async (next) => {
          const ok = await saveSettings(next);
          if (ok) notify('偏好设置已保存');
          return ok;
        }}
      />
      <LoginDialog
        open={loginOpen}
        onOpenChange={setLoginOpen}
        onSuccess={(next) => void loginSuccess(next)}
      />
      <VoiceDialog
        open={voiceOpen}
        onOpenChange={setVoiceOpen}
        devices={snapshot.devices}
        defaultSpeaker={settings.defaultSpeaker}
        demo={demo}
        onSend={async (did, text, silent) =>
          perform(`向音箱发送${silent ? '静默' : '语音'}指令`, () =>
            api.sendVoice(did, text, silent),
          )
        }
      />
      <Modal
        open={accountOpen}
        onOpenChange={setAccountOpen}
        title={demo ? '你的演示空间' : '我的账号'}
        description={
          demo
            ? '所有设备与场景均为模拟，操作不会影响真实家庭。'
            : '你的登录凭据由桌面客户端保存在本机。'
        }
        className="account-dialog"
      >
        <div className="account-profile">
          <span className="avatar">
            <Leaf size={30} />
          </span>
          <h3>{demo ? 'MiHome 体验官' : `小米账号 ${session.userId || ''}`}</h3>
          <p>{demo ? '无需登录，安心探索' : `当前区域 · ${session.region.toUpperCase()}`}</p>
        </div>
        {demo ? (
          <>
            <Notice>演示模式不会向真实设备发送任何控制请求。</Notice>
            <button
              className="button primary full-width"
              onClick={() => {
                setAccountOpen(false);
                setLoginOpen(true);
              }}
            >
              <LogIn size={16} />
              连接我的小米账号
            </button>
            {api.isDesktop && (
              <button
                className="button secondary full-width"
                onClick={async () => {
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
                }}
              >
                退出演示模式
              </button>
            )}
          </>
        ) : (
          <>
            <div className="account-facts">
              <span>
                登录状态
                <strong>
                  <i className="live-dot" />
                  已登录
                </strong>
              </span>
              <span>
                凭据保存<strong>本机安全存储</strong>
              </span>
            </div>
            <button className="button secondary full-width danger-text" onClick={requestLogout}>
              <LogOut size={16} />
              退出当前账号
            </button>
          </>
        )}
        <p className="unofficial-note">非官方客户端 · 请勿在不受信任的设备上登录</p>
      </Modal>
      <Modal
        open={!!confirmation}
        onOpenChange={(value) => {
          if (!value && !confirmBusy) setConfirmation(null);
        }}
        title={confirmation?.title || '确认操作'}
        description={confirmation?.description}
        className="confirm-dialog"
        footer={
          <>
            <button
              className="button secondary"
              disabled={confirmBusy}
              onClick={() => setConfirmation(null)}
            >
              取消
            </button>
            <button
              className="button primary"
              disabled={confirmBusy}
              onClick={async () => {
                if (!confirmation) return;
                setConfirmBusy(true);
                try {
                  if (await confirmation.run()) setConfirmation(null);
                } finally {
                  setConfirmBusy(false);
                }
              }}
            >
              {confirmBusy ? <Spinner label="执行中" /> : '确认执行'}
            </button>
          </>
        }
      >
        {confirmation?.detail && <div className="confirmation-detail">{confirmation.detail}</div>}
        <div className="confirmation-note">
          <ShieldCheck size={17} />
          {demo ? '模拟操作 · 不影响真实设备' : '此操作将在确认后发送至米家云端'}
        </div>
      </Modal>
      {toast && (
        <Toast message={toast.message} error={toast.error} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
