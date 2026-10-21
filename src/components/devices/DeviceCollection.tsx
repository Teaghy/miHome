import { Select, SelectOption } from '@/components/ui/Select';
import { useMiHomeContext } from '@/app/MiHomeContext';
import {
  ArrowDownUp,
  ArrowRight,
  Heart,
  House,
  RefreshCw,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { DeviceCard } from '@/components/devices/DeviceCard';
import { deviceKind } from '@/utils/device-kind';
import { Checkbox } from '@/components/ui/Checkbox';

import { timeLabel } from '@/utils/presentation';
export function DeviceCollection({
  compact = false,
  category = 'all',
  status = 'all',
  onReset,
}: {
  compact?: boolean;
  category?: string;
  status?: string;
  onReset?: () => void;
}) {
  const {
    page,
    filteredDevices: baseDevices,
    refreshing,
    snapshot,
    onlineOnly,
    setOnlineOnly,
    sort,
    setSort,
    room,
    setRoom,
    homeDevices,
    settings,
    rooms,
    busyDevices,
    setSelectedDid,
    toggleFavorite,
    togglePower,
    query,
    setSearch,
    navigate,
    refresh,
    demo,
  } = useMiHomeContext();
  const filteredDevices = baseDevices.filter(
    (device) =>
      (category === 'all' || deviceKind(device) === category) &&
      (status === 'all' ||
        (status === 'online' && device.online) ||
        (status === 'offline' && !device.online) ||
        (status === 'fault' && !!device.fault)),
  );
  const hasFilters = !!(query || room || onlineOnly || category !== 'all' || status !== 'all');
  return (
    <>
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
            {compact && (
              <button className="panel-link" onClick={() => navigate('devices')}>
                查看全部设备
                <ArrowRight size={12} />
              </button>
            )}
            <label className={`online-filter ${onlineOnly ? 'selected' : ''}`}>
              <Checkbox
                aria-label="仅在线"
                checked={onlineOnly}
                onCheckedChange={(checked) => setOnlineOnly(checked === true)}
              />
              仅在线
            </label>
            <label className="sort-control">
              <ArrowDownUp size={14} />
              <Select aria-label="设备排序" value={sort} onValueChange={(value) => setSort(value)}>
                <SelectOption value="default">默认排序</SelectOption>
                <SelectOption value="online">在线优先</SelectOption>
                <SelectOption value="name">按名称</SelectOption>
              </Select>
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
                ? homeDevices.filter((device) => settings.favorites.includes(device.did)).length
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
          <div className={`device-grid ${compact ? 'home-device-grid' : ''}`}>
            {(compact && !query && !room && !onlineOnly
              ? filteredDevices
                  .filter(
                    (device) =>
                      !['speaker', 'curtain', 'sensor'].includes(device.category) &&
                      device.did !== 'demo-desk',
                  )
                  .slice(0, 8)
              : filteredDevices
            ).map((device) => (
              <DeviceCard
                key={device.did}
                device={device}
                favorite={settings.favorites.includes(device.did)}
                busy={busyDevices.includes(device.did)}
                onOpen={() => setSelectedDid(device.did)}
                onFavorite={() => void toggleFavorite(device.did)}
                onPower={() => void togglePower(device)}
              />
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
                : hasFilters
                  ? '没有符合条件的设备'
                  : page === 'favorites'
                    ? '把喜欢的设备，收藏在这里'
                    : '这个空间还没有设备'}
            </h3>
            <p>
              {hasFilters
                ? '试试其他关键词，或调整房间与在线筛选。'
                : page === 'favorites'
                  ? '点击设备卡片右上角的爱心，下次更快找到它。'
                  : '在米家 App 中添加设备后，回到这里同步。'}
            </p>
            {hasFilters ? (
              <button
                className="button secondary"
                onClick={() => {
                  setSearch('');
                  setRoom('');
                  setOnlineOnly(false);
                  onReset?.();
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
    </>
  );
}
