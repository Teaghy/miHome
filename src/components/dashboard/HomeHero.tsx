import {
  ArrowUpRight,
  CloudSun,
  Droplets,
  Leaf,
  ShieldCheck,
  Thermometer,
  Wind,
} from 'lucide-react';
import { useMiHomeContext } from '@/app/MiHomeContext';
import { useHousehold } from '@/app/HouseholdContext';

export function HomeHero() {
  const { navigate, currentHome, onlineCount, demo, homeDevices } = useMiHomeContext();
  const { household } = useHousehold();
  const hour = Number(
    new Intl.DateTimeFormat('en', {
      timeZone: 'Asia/Shanghai',
      hour: 'numeric',
      hourCycle: 'h23',
    }).format(new Date()),
  );
  const greeting = hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好';
  return (
    <div className="home-hero-row">
      <section className="family-hero" aria-label="家庭 Hero">
        <img src="/images/living-room.jpg" alt="阳光洒入温暖明亮的客厅" />
        <div className="hero-shade" />
        <div className="hero-content">
          <span className="hero-eyebrow">
            <Leaf size={14} />
            全屋智能 · 生活自有默契
          </span>
          <h1>
            {greeting}，<br />
            享受在家的每一刻<span>。</span>
          </h1>
          <p>
            {currentHome?.name || '我的家'} · {onlineCount} 台设备在线，家的美好已就绪
          </p>
          <div className="hero-metrics">
            <div>
              <Thermometer size={15} />
              <strong>
                {household ? '26' : '—'}
                <small>°C</small>
              </strong>
              <span>室内温度</span>
            </div>
            <div>
              <Droplets size={15} />
              <strong>
                {household ? '60' : '—'}
                <small>%</small>
              </strong>
              <span>室内湿度</span>
            </div>
            <div>
              <Wind size={15} />
              <strong>{household ? '优' : '—'}</strong>
              <span>空气质量</span>
            </div>
          </div>
        </div>
        <button
          className="hero-corner"
          aria-label="查看环境监测"
          onClick={() => navigate('environment')}
        >
          <ArrowUpRight size={20} />
        </button>
      </section>
      <section className="weather-card" aria-label="天气">
        <div className="weather-top">
          <span>{demo ? '北京 · 朝阳区' : '家庭天气'}</span>
          <span>{demo ? '晴间多云' : '待设置位置'}</span>
        </div>
        <CloudSun className="weather-sun" size={74} strokeWidth={1.1} />
        <div className="weather-temperature">
          {demo ? '26' : '—'}
          <span>°C</span>
        </div>
        <p>{demo ? '18° / 28° · 东南风 2 级' : '尚未接入天气服务'}</p>
        <div className="weather-footer">
          <span>
            <Leaf size={13} />
            {demo ? '空气优 · AQI 28' : `${homeDevices.length} 台家庭设备`}
          </span>
          <button onClick={() => navigate('security')}>
            <ShieldCheck size={14} />
            {household ? (household.armed ? '家庭已布防' : '家庭守护中') : '查看家庭安防'}
          </button>
        </div>
      </section>
    </div>
  );
}
