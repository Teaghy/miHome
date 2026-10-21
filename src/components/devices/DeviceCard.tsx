import { AlertCircle, Heart, LoaderCircle, Power, ChevronRight } from 'lucide-react';
import type { Device } from '@/types';
import { DeviceArt } from './DeviceArt';
interface DeviceCardProps {
  device: Device;
  favorite: boolean;
  busy: boolean;
  onOpen: () => void;
  onFavorite: () => void;
  onPower: () => void;
}
export function DeviceCard({
  device,
  favorite,
  busy,
  onOpen,
  onFavorite,
  onPower,
}: DeviceCardProps) {
  return (
    <article
      className={`device-card ${!device.online ? 'is-offline' : ''} ${device.fault ? 'is-fault' : ''} ${device.online && device.power === true ? 'is-on' : ''}`}
      data-state={!device.online ? 'offline' : device.fault ? 'fault' : device.power ? 'on' : 'off'}
    >
      <div className="device-card-top">
        <span className={`status-label ${device.online ? '' : 'offline'}`}>
          <i />
          {device.fault ? '异常' : device.online ? '在线' : '离线'}
        </span>
        <button
          className={`card-favorite ${favorite ? 'is-favorite' : ''}`}
          aria-label={`${favorite ? '取消收藏' : '收藏'}${device.name}`}
          onClick={onFavorite}
        >
          <Heart size={15} strokeWidth={1.7} fill={favorite ? 'currentColor' : 'none'} />
        </button>
      </div>
      <button className="device-card-body" onClick={onOpen} aria-label={`查看${device.name}详情`}>
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
          {device.fault ? (
            <>
              <AlertCircle size={12} />
              {device.fault}
            </>
          ) : device.online ? (
            device.metrics ||
            (device.power === true ? '运行中' : device.power === false ? '待机中' : '查看设备状态')
          ) : (
            '等待重新连接'
          )}
        </span>
        {device.power !== null ? (
          <button
            className={`power-button ${device.online && device.power ? 'is-on' : ''}`}
            aria-label={`${device.power ? '关闭' : '开启'}${device.name}`}
            title={!device.online ? '设备离线，无法控制' : device.power ? '关闭设备' : '开启设备'}
            disabled={!device.online || !!device.fault || busy}
            onClick={onPower}
          >
            {busy ? (
              <LoaderCircle size={17} className="spin" />
            ) : (
              <Power size={18} strokeWidth={1.8} />
            )}
          </button>
        ) : (
          <button className="detail-button" aria-label={`查看${device.name}详情`} onClick={onOpen}>
            <ChevronRight size={18} />
          </button>
        )}
      </div>
    </article>
  );
}
