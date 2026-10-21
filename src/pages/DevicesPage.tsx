import { useState } from 'react';
import { Heart, LayoutGrid } from 'lucide-react';
import { useMiHomeContext } from '@/app/MiHomeContext';
import { DeviceCollection } from '@/components/devices/DeviceCollection';
import { PageHeading, AddButton } from '@/components/ui/Panel';
import { QuickScenes } from '@/components/scenes/QuickScenes';

export function DevicesPage() {
  const { navigate, page, homeDevices } = useMiHomeContext();
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  return (
    <>
      <PageHeading
        title={page === 'favorites' ? '收藏设备' : '设备管理'}
        description="每一个连接，让家更懂你。"
        action={<AddButton onClick={() => navigate('add-device')}>添加设备</AddButton>}
      />
      <div className="device-management-tools">
        <div className="view-tabs">
          <button
            className={page === 'devices' ? 'selected' : ''}
            onClick={() => navigate('devices')}
          >
            <LayoutGrid size={16} />
            全部设备<span>{homeDevices.length}</span>
          </button>
          <button
            className={page === 'favorites' ? 'selected' : ''}
            onClick={() => navigate('favorites')}
          >
            <Heart size={16} />
            我的收藏
          </button>
        </div>
        <div className="filter-selects">
          <select
            aria-label="设备类型"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all">全部类型</option>
            <option value="air-conditioner">空调</option>
            <option value="light">灯光</option>
            <option value="vacuum">扫地机器人</option>
            <option value="purifier">空气净化器</option>
            <option value="camera">摄像头</option>
            <option value="lock">门锁</option>
            <option value="outlet">插座</option>
            <option value="sensor">传感器</option>
            <option value="heater">热水器</option>
            <option value="curtain">窗帘</option>
            <option value="speaker">智能音箱</option>
          </select>
          <select aria-label="设备状态" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">全部状态</option>
            <option value="online">在线</option>
            <option value="offline">离线</option>
            <option value="fault">异常</option>
          </select>
        </div>
      </div>
      <QuickScenes />
      <DeviceCollection
        category={category}
        status={status}
        onReset={() => {
          setCategory('all');
          setStatus('all');
        }}
      />
    </>
  );
}
