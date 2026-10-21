import { Select, SelectOption } from '@/components/ui/Select';
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
          <Select
            aria-label="设备类型"
            value={category}
            onValueChange={(value) => setCategory(value)}
          >
            <SelectOption value="all">全部类型</SelectOption>
            <SelectOption value="air-conditioner">空调</SelectOption>
            <SelectOption value="light">灯光</SelectOption>
            <SelectOption value="vacuum">扫地机器人</SelectOption>
            <SelectOption value="purifier">空气净化器</SelectOption>
            <SelectOption value="camera">摄像头</SelectOption>
            <SelectOption value="lock">门锁</SelectOption>
            <SelectOption value="outlet">插座</SelectOption>
            <SelectOption value="sensor">传感器</SelectOption>
            <SelectOption value="heater">热水器</SelectOption>
            <SelectOption value="curtain">窗帘</SelectOption>
            <SelectOption value="speaker">智能音箱</SelectOption>
          </Select>
          <Select aria-label="设备状态" value={status} onValueChange={(value) => setStatus(value)}>
            <SelectOption value="all">全部状态</SelectOption>
            <SelectOption value="online">在线</SelectOption>
            <SelectOption value="offline">离线</SelectOption>
            <SelectOption value="fault">异常</SelectOption>
          </Select>
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
