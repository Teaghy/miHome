import { useState } from 'react';
import { Bluetooth, ChevronRight, Search, Smartphone, Wifi } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeading, Panel } from '@/components/ui/Panel';
import { DeviceArt } from '@/components/devices/DeviceArt';
import { useMiHomeContext } from '@/app/MiHomeContext';

const catalog = [
  { name: '米家空调 Pro', category: 'air-conditioner', group: '环境电器' },
  { name: '米家智能吸顶灯', category: 'light', group: '照明' },
  { name: '米家扫拖机器人', category: 'vacuum', group: '清洁电器' },
  { name: '米家智能摄像机', category: 'camera', group: '安防' },
  { name: '米家空气净化器', category: 'purifier', group: '环境电器' },
  { name: '米家智能插座', category: 'outlet', group: '其他' },
  { name: '米家电热水器', category: 'heater', group: '环境电器' },
  { name: '米家智能门锁', category: 'lock', group: '安防' },
];
export function AddDevicePage() {
  const navigate = useNavigate();
  const { demo, notify } = useMiHomeContext();
  const [group, setGroup] = useState('全部设备');
  const [query, setQuery] = useState('');
  return (
    <>
      <PageHeading title="添加设备" description="从一个小小的连接，开始更舒适的生活。" />
      <div className="pairing-discovery panel">
        <span className="discovery-glyph">
          <Bluetooth size={31} />
        </span>
        <div>
          <h2>发现身边的新设备</h2>
          <p>让设备接通电源，并进入配网模式。</p>
        </div>
        <button
          className="button primary"
          onClick={() =>
            demo
              ? void navigate('/pairing?category=light&name=米家智能吸顶灯')
              : notify('请在米家 App 中完成真实设备发现与配网')
          }
        >
          查找附近设备
          <ChevronRight size={16} />
        </button>
      </div>
      <Panel
        title="按设备类型添加"
        action={
          <label className="catalog-search">
            <Search size={16} />
            <input
              aria-label="搜索可添加设备"
              placeholder="搜索设备名称"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        }
      >
        <div className="room-chips catalog-tabs">
          {['全部设备', '照明', '环境电器', '清洁电器', '安防', '其他'].map((value) => (
            <button
              key={value}
              className={group === value ? 'active' : ''}
              onClick={() => setGroup(value)}
            >
              {value}
            </button>
          ))}
        </div>
        <div className="catalog-grid">
          {catalog
            .filter(
              (device) =>
                (group === '全部设备' || device.group === group) && device.name.includes(query),
            )
            .map((device) => (
              <button
                key={device.name}
                className="catalog-card"
                onClick={() =>
                  void navigate(
                    `/pairing?category=${device.category}&name=${encodeURIComponent(device.name)}`,
                  )
                }
              >
                <DeviceArt
                  device={{ name: device.name, category: device.category, model: '' }}
                  large
                />
                <strong>{device.name}</strong>
                <span>
                  {device.group}
                  <ChevronRight size={13} />
                </span>
              </button>
            ))}
        </div>
        {catalog.filter(
          (d) => (group === '全部设备' || d.group === group) && d.name.includes(query),
        ).length === 0 && (
          <div className="service-empty">
            <Search size={28} />
            <h3>未找到对应设备</h3>
            <p>尝试更简短的名称，或选择其他类型。</p>
          </div>
        )}
      </Panel>
      <div className="two-column-grid add-device-guides">
        <div className="panel">
          <Wifi size={24} />
          <h2>准备好家庭 Wi-Fi</h2>
          <p>多数设备需要 2.4 GHz 网络，配网前请确认网络连接正常。</p>
        </div>
        <div className="panel">
          <Smartphone size={24} />
          <h2>真实设备，使用米家 App 添加</h2>
          <p>桌面端提供完整的本地配网流程体验，真实设备添加后可以在这里刷新同步。</p>
        </div>
      </div>
    </>
  );
}
