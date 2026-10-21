import { useState } from 'react';
import { Camera, Grid2X2, Maximize2, Shield } from 'lucide-react';
import { useHousehold } from '@/app/HouseholdContext';
import { useMiHomeContext } from '@/app/MiHomeContext';
import { CameraPreview } from '@/components/dashboard/CameraPanel';
import { AddButton, PageHeading, ServiceEmpty } from '@/components/ui/Panel';
import { Toggle } from '@/components/ui';

export function CamerasPage() {
  const { household, update } = useHousehold();
  const { navigate, notify } = useMiHomeContext();
  const [layout, setLayout] = useState('grid');
  const [selected, setSelected] = useState('all');
  const cameras = household?.cameras.filter((c) => selected === 'all' || c.id === selected) || [];
  return (
    <>
      <PageHeading
        title="摄像头监控"
        description="看见熟悉的每一处，安心也近一点。"
        action={<AddButton onClick={() => navigate('add-device')}>添加摄像机</AddButton>}
      />
      <div className="camera-page-toolbar">
        <div className="view-tabs">
          <button className="selected">
            <Camera size={16} />
            全部摄像机 <span>{household?.cameras.length || 0}</span>
          </button>
        </div>
        <div className="filter-selects">
          <select
            aria-label="摄像机筛选"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="all">全部房间</option>
            {household?.cameras.map((c) => (
              <option key={c.id} value={c.id}>
                {c.room}
              </option>
            ))}
          </select>
          <button
            className={`icon-button ${layout === 'grid' ? 'selected' : ''}`}
            aria-label="网格画面"
            onClick={() => setLayout('grid')}
          >
            <Grid2X2 size={18} />
          </button>
          <button
            className={`icon-button ${layout === 'focus' ? 'selected' : ''}`}
            aria-label="大画面"
            onClick={() => setLayout('focus')}
          >
            <Maximize2 size={18} />
          </button>
        </div>
      </div>
      {!cameras.length ? (
        <ServiceEmpty
          title="还没有接入摄像机"
          description="添加家庭摄像机后，在这里查看画面和管理隐私。"
        />
      ) : (
        <div className={`camera-grid ${layout === 'focus' ? 'focus-layout' : ''}`}>
          {cameras.map((camera) => (
            <section className="panel camera-tile" key={camera.id}>
              <CameraPreview camera={camera} />
              <div className="camera-tile-info">
                <div>
                  <strong>{camera.name}</strong>
                  <span>
                    {camera.room} · {camera.online ? '设备在线' : '设备离线'}
                  </span>
                </div>
                <div>
                  <Shield size={15} />
                  <span>隐私模式</span>
                  <Toggle
                    label={`${camera.name}隐私模式`}
                    checked={camera.privacy}
                    onChange={(privacy) => {
                      if (
                        update((current) => ({
                          ...current,
                          cameras: current.cameras.map((c) =>
                            c.id === camera.id ? { ...c, privacy } : c,
                          ),
                        }))
                      )
                        notify(privacy ? '已开启本地隐私预览' : '已关闭本地隐私预览');
                    }}
                  />
                </div>
              </div>
            </section>
          ))}
        </div>
      )}
      <div className="privacy-tip">
        <Shield size={17} />
        <div>
          <strong>你的家，只属于你和家人</strong>
          <p>当前画面为本地示例静帧，不标记为实时直播。真实视频流需另行接入。</p>
        </div>
      </div>
    </>
  );
}
