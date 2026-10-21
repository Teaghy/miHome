import { Camera, Expand, Pause, Play, Shield, VideoOff, Volume2 } from 'lucide-react';
import { useState } from 'react';
import { useHousehold } from '@/app/HouseholdContext';
import { useMiHomeContext } from '@/app/MiHomeContext';
import { Panel, PanelLink, ServiceEmpty } from '@/components/ui/Panel';
import type { Camera as CameraType } from '@/types/household';

export function CameraPreview({
  camera,
  compact = false,
}: {
  camera: CameraType;
  compact?: boolean;
}) {
  const [playing, setPlaying] = useState(false);
  const { notify } = useMiHomeContext();
  const unavailable = !camera.online || camera.privacy;
  return (
    <div
      className={`camera-preview camera-${camera.id} ${compact ? 'compact' : ''} ${unavailable ? 'unavailable' : ''}`}
    >
      {!unavailable && <img src="/images/living-room.jpg" alt={`${camera.room}摄像机示例静帧`} />}
      <div className="camera-topline">
        <span>
          <i />
          {unavailable ? (camera.privacy ? '隐私模式' : '离线') : '示例画面'}
        </span>
        {!compact && <span>2K · 高清</span>}
      </div>
      {unavailable ? (
        <div className="camera-unavailable">
          <VideoOff size={24} />
          <span>{camera.privacy ? '镜头已休眠' : '等待设备连接'}</span>
        </div>
      ) : (
        <button
          className="camera-play"
          aria-label={`${playing ? '暂停' : '播放'}${camera.name}`}
          onClick={() => {
            setPlaying(!playing);
            if (!playing) notify('当前为本地静帧预览；真实视频流尚未接入');
          }}
        >
          {playing ? (
            <Pause size={18} fill="currentColor" />
          ) : (
            <Play size={18} fill="currentColor" />
          )}
        </button>
      )}
      <div className="camera-bottomline">
        <span>
          <Camera size={13} />
          {camera.name}
        </span>
        {!compact && (
          <div>
            <button
              aria-label={`${camera.name}声音`}
              disabled={unavailable}
              onClick={() => notify('示例画面不包含音频')}
            >
              <Volume2 size={14} />
            </button>
            <button
              aria-label={`${camera.name}全屏`}
              onClick={(event) => {
                const target = event.currentTarget.closest('.camera-preview');
                if (document.fullscreenElement)
                  void document.exitFullscreen().catch(() => notify('无法退出全屏，请按 Esc'));
                else if (target?.requestFullscreen)
                  void target.requestFullscreen().catch(() => notify('当前窗口不支持全屏预览'));
                else notify('当前窗口不支持全屏预览');
              }}
            >
              <Expand size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
export function CameraPanel() {
  const { household } = useHousehold();
  const { navigate } = useMiHomeContext();
  const [selected, setSelected] = useState(0);
  return (
    <Panel
      title="摄像头监控"
      action={<PanelLink label="全部画面" onClick={() => navigate('cameras')} />}
      className="camera-panel"
    >
      {household?.cameras.length ? (
        <>
          <CameraPreview
            key={household.cameras[selected]?.id}
            camera={household.cameras[selected] || household.cameras[0]}
          />
          <div className="camera-thumbnails">
            {household.cameras.slice(0, 4).map((camera, index) => (
              <button
                key={camera.id}
                className={index === selected ? 'selected' : ''}
                onClick={() => setSelected(index)}
                aria-label={`切换到${camera.name}`}
              >
                <span>
                  {camera.online ? (
                    <img src="/images/living-room.jpg" alt="" />
                  ) : (
                    <VideoOff size={16} />
                  )}
                </span>
                <small>{camera.room}</small>
              </button>
            ))}
          </div>
          <div className="privacy-footnote">
            <Shield size={12} />
            私密空间，只与你和家人分享
          </div>
        </>
      ) : (
        <ServiceEmpty title="还没有接入摄像机" />
      )}
    </Panel>
  );
}
