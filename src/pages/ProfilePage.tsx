import {
  ChevronRight,
  Heart,
  House,
  LogIn,
  LogOut,
  Settings2,
  ShieldCheck,
  UserRound,
  Users,
} from 'lucide-react';
import { useMiHomeContext } from '@/app/MiHomeContext';
import { useHousehold } from '@/app/HouseholdContext';
import { PageHeading, Panel } from '@/components/ui/Panel';

export function ProfilePage() {
  const { demo, session, homeDevices, settings, navigate, setLoginOpen, requestLogout } =
    useMiHomeContext();
  const { household } = useHousehold();
  return (
    <>
      <PageHeading title="个人中心" description="你的习惯，让这个家独一无二。" />
      <section className="panel profile-hero">
        <span className="profile-avatar">
          <UserRound size={54} strokeWidth={1.1} />
        </span>
        <div>
          <span className="panel-eyebrow">MY SMART HOME</span>
          <h2>{demo ? '米家体验官' : `小米账号 ${session.userId || ''}`}</h2>
          <p>
            {demo
              ? '在这里，发现家的更多可能。'
              : `账号已连接 · ${session.region.toUpperCase()} 区域`}
          </p>
          <span className="state-tag">
            <ShieldCheck size={13} />
            {demo ? '本地体验空间' : '凭据保存在本机'}
          </span>
        </div>
        <button className="button primary" onClick={() => setLoginOpen(true)}>
          <LogIn size={16} />
          {demo ? '连接小米账号' : '切换账号'}
        </button>
      </section>
      <div className="profile-stats">
        <button className="panel" onClick={() => navigate('family')}>
          <House size={23} />
          <strong>我的家庭</strong>
          <span>{household?.members.length || '—'} 位成员</span>
          <ChevronRight size={17} />
        </button>
        <button className="panel" onClick={() => navigate('devices')}>
          <Users size={23} />
          <strong>我的设备</strong>
          <span>{homeDevices.length} 台设备</span>
          <ChevronRight size={17} />
        </button>
        <button className="panel" onClick={() => navigate('favorites')}>
          <Heart size={23} />
          <strong>我的收藏</strong>
          <span>{settings.favorites.length} 台常用设备</span>
          <ChevronRight size={17} />
        </button>
      </div>
      <div className="two-column-grid">
        <Panel title="账号与隐私">
          <div className="profile-fact">
            <span>登录状态</span>
            <strong>{demo ? '未连接真实账号' : '已登录'}</strong>
          </div>
          <div className="profile-fact">
            <span>账号区域</span>
            <strong>{demo ? '中国大陆 · 示例' : session.region.toUpperCase()}</strong>
          </div>
          <div className="profile-fact">
            <span>设备访问</span>
            <strong>仅当前家庭</strong>
          </div>
          <p className="data-footnote">
            家庭凭据由桌面客户端保存；浏览器体验使用独立的本地示例数据。
          </p>
        </Panel>
        <Panel title="属于你的使用偏好">
          <div className="setting-link-row">
            <span className="metric-icon mint">
              <Settings2 size={21} />
            </span>
            <div>
              <strong>外观与日常使用</strong>
              <p>界面主题、显示比例与刷新频率</p>
            </div>
            <button className="button secondary" onClick={() => navigate('settings')}>
              管理设置
            </button>
          </div>
          <div className="setting-link-row">
            <span className="metric-icon blue">
              <ShieldCheck size={21} />
            </span>
            <div>
              <strong>家庭共享与权限</strong>
              <p>与你信任的人，共享家的美好</p>
            </div>
            <button className="button secondary" onClick={() => navigate('family')}>
              家庭管理
            </button>
          </div>
        </Panel>
      </div>
      {!demo && (
        <button className="button secondary danger-text profile-logout" onClick={requestLogout}>
          <LogOut size={16} />
          退出当前账号
        </button>
      )}
    </>
  );
}
