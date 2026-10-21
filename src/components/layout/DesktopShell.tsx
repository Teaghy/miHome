import type { ReactNode } from 'react';
import {
  AudioLines,
  Bell,
  Camera,
  ChevronDown,
  ChevronRight,
  Clock3,
  Heart,
  House,
  LayoutGrid,
  Leaf,
  LogIn,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
  Users,
  Wind,
  Workflow,
  Zap,
} from 'lucide-react';
import { useMiHomeContext } from '@/app/MiHomeContext';
import { useHousehold } from '@/app/HouseholdContext';
import type { Page } from '@/types';

const items = [
  { id: 'home', label: '首页', icon: House },
  { id: 'devices', label: '设备管理', icon: LayoutGrid },
  { id: 'scenes', label: '智能场景', icon: Sparkles },
  { id: 'automation', label: '自动化', icon: Workflow },
  { id: 'cameras', label: '摄像头', icon: Camera },
  { id: 'security', label: '家庭安防', icon: ShieldCheck },
  { id: 'environment', label: '环境监测', icon: Wind },
  { id: 'energy', label: '能耗统计', icon: Zap },
] as const;
const secondary = [
  { id: 'family', label: '家庭管理', icon: Users },
  { id: 'messages', label: '消息中心', icon: Bell },
  { id: 'settings', label: '设置', icon: Settings2 },
] as const;

export function DesktopShell({ children }: { children: ReactNode }) {
  const {
    page,
    navigate,
    settings,
    connected,
    currentHomeId,
    currentHome,
    snapshot,
    changeHome,
    searchRef,
    search,
    setSearch,
    refreshing,
    refresh,
    setAccountOpen,
    setLoginOpen,
    setSettingsOpen,
    setVoiceOpen,
    onlineCount,
    homeDevices,
    demo,
  } = useMiHomeContext();
  const { unread } = useHousehold();
  const renderItem = ({
    id,
    label,
    icon: Icon,
  }:
    | (typeof items)[number]
    | (typeof secondary)[number]
    | { id: Page; label: string; icon: typeof Heart }) => (
    <button
      key={id}
      className={`nav-item ${page === id || (id === 'devices' && page === 'device-detail') || (id === 'family' && page === 'rooms') ? 'active' : ''}`}
      aria-current={page === id ? 'page' : undefined}
      onClick={() => navigate(id)}
    >
      <Icon size={19} strokeWidth={1.7} />
      <span>{label}</span>
      {id === 'messages' && unread > 0 && <small className="nav-badge">{unread}</small>}
    </button>
  );
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        跳转到主要内容
      </a>
      <aside className="app-navigation">
        <a
          className="brand"
          href="#/home"
          aria-label="MiHome 我的家庭"
          onClick={(event) => {
            event.preventDefault();
            navigate('home');
          }}
        >
          <span className="brand-symbol">
            <House size={24} />
            <Leaf size={10} />
          </span>
          <span className="brand-wordmark">
            米家<span>全屋智能 · 桌面端</span>
          </span>
        </a>
        <div className="sidebar-label">让生活，自然发生</div>
        <nav className="primary-nav" aria-label="主导航">
          {items.filter((item) => item.id !== 'scenes' || settings.showScenes).map(renderItem)}
          <div className="nav-divider" />
          {secondary.map(renderItem)}
          <div className="sidebar-shortcuts">
            {renderItem({ id: 'favorites', label: '收藏设备', icon: Heart })}
            {renderItem({ id: 'activity', label: '最近活动', icon: Clock3 })}
          </div>
        </nav>
        <div className="sidebar-family">
          <span className="family-mark">
            <House size={18} />
          </span>
          <div>
            <strong>{currentHome?.name || '我的家庭'}</strong>
            <span>
              {onlineCount} / {homeDevices.length} 台设备在线
            </span>
          </div>
          <button aria-label="管理当前家庭" onClick={() => navigate('family')}>
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="sidebar-foot">
          <span>
            <i />
            {demo ? '本地体验空间' : '设备状态云端同步'}
          </span>
          <small>非官方米家客户端</small>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="home-selector">
            <House size={18} />
            <select
              aria-label="选择家庭"
              value={currentHomeId}
              disabled={!connected || !snapshot.homes.length}
              onChange={(event) => changeHome(event.target.value)}
            >
              {!snapshot.homes.length ? (
                <option value="">我的家庭</option>
              ) : (
                <>
                  <option value="">全部家庭</option>
                  {snapshot.homes.map((home) => (
                    <option value={home.id} key={home.id}>
                      {home.name}
                    </option>
                  ))}
                </>
              )}
            </select>
            <ChevronDown size={13} />
            <span className="home-private">私人空间</span>
          </div>
          <div className="topbar-tools">
            <label className="search-box">
              <Search size={17} />
              <input
                ref={searchRef}
                type="search"
                aria-label="搜索设备或场景"
                placeholder="搜索设备、场景与家庭动态"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <kbd>⌘ K</kbd>
            </label>
            <button
              className="icon-button"
              title="刷新设备"
              aria-label="刷新设备"
              disabled={!connected || refreshing}
              onClick={() => void refresh()}
            >
              <RefreshCw size={18} className={refreshing ? 'spin' : ''} />
            </button>
            <button
              className="icon-button notification-button"
              aria-label="打开消息中心"
              onClick={() => navigate('messages')}
            >
              <Bell size={19} />
              {unread > 0 && <i />}
            </button>
            <button
              className="icon-button preferences-shortcut"
              aria-label="偏好设置"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings2 size={19} />
            </button>
            <span className="topbar-separator" />
            <button
              className="avatar"
              aria-label={connected ? '账号信息' : '登录账号'}
              onClick={() => (connected ? setAccountOpen(true) : setLoginOpen(true))}
            >
              <span>米</span>
            </button>
            <button className="profile-shortcut" onClick={() => navigate('profile')}>
              我的账号
              <ChevronDown size={12} />
            </button>
          </div>
        </header>
        <main id="main-content" data-page={page} className={`main-content page-${page}`}>
          {demo && (
            <div className="demo-banner">
              <span>
                <i />
                你正在探索演示家庭
              </span>
              <span>设备及家庭数据为本地示例</span>
              <button onClick={() => setLoginOpen(true)}>
                <LogIn size={13} />
                连接我的家庭
                <ChevronRight size={12} />
              </button>
            </div>
          )}
          {children}
        </main>
        <footer className="workspace-footer">
          <span>
            <Sun size={13} />
            每一份连接，都为更好的生活
          </span>
          <div>
            <button aria-label="添加新设备" onClick={() => navigate('add-device')}>
              <Plus size={14} />
              添加设备
            </button>
            <button onClick={() => setVoiceOpen(true)}>
              <AudioLines size={15} />
              小爱语音
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
