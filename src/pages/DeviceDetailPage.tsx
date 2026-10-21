import { Select, SelectOption } from '@/components/ui/Select';
import { useEffect, useState } from 'react';
import {
  AirVent,
  ChevronLeft,
  Heart,
  LockKeyhole,
  Minus,
  Plus,
  Power,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Wind,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useMiHomeContext } from '@/app/MiHomeContext';
import { useHousehold } from '@/app/HouseholdContext';
import { getDeviceDetail } from '@/api/mihome';
import type { DeviceDetail, Property } from '@/types';
import { deviceKind } from '@/utils/device-kind';
import { errorMessage } from '@/utils/errors';
import { DeviceArt } from '@/components/devices/DeviceArt';
import { PropertyControl } from '@/components/devices/DeviceSheet';
import { PageHeading, Panel, ServiceEmpty } from '@/components/ui/Panel';
import { Notice, Spinner } from '@/components/ui';
import { CameraPreview } from '@/components/dashboard/CameraPanel';

export function DeviceDetailPage() {
  const {
    homeDevices,
    settings,
    toggleFavorite,
    writeProperty,
    runAction,
    navigate,
    demo,
    busyDevices,
    togglePower,
    setSelectedDid,
  } = useMiHomeContext();
  const { household } = useHousehold();
  const [params, setParams] = useSearchParams();
  const [storedDetail, setDetail] = useState<DeviceDetail | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const device =
    homeDevices.find((d) => d.did === params.get('device')) ||
    homeDevices.find((d) => d.category === 'air-conditioner') ||
    homeDevices[0];
  const did = device?.did;
  const detail = storedDetail?.did === did ? storedDetail : null;
  useEffect(() => {
    if (!did) return;
    let alive = true;
    setDetail(null);
    setError('');
    void getDeviceDetail(did)
      .then((next) => {
        if (alive) setDetail(next);
      })
      .catch((error) => {
        if (alive) setError(errorMessage(error));
      });
    return () => {
      alive = false;
    };
  }, [did, retry]);
  if (!device) return <ServiceEmpty title="还没有设备可查看" />;
  const kind = deviceKind(device);
  const temperature = detail?.properties.find((p) => p.name === 'target-temperature');
  const brightness = detail?.properties.find((p) => p.name === 'brightness');
  const primary =
    kind === 'air-conditioner' || kind === 'heater'
      ? temperature
      : kind === 'light'
        ? brightness
        : null;
  const commit = async (property: Property, value: unknown) => {
    const ok = await writeProperty(device, property, value);
    if (ok) setRetry((current) => current + 1);
    return ok;
  };
  const adjust = (delta: number) => {
    if (!primary || typeof primary.value !== 'number' || !primary.range) return;
    void commit(
      primary,
      Math.max(primary.range[0], Math.min(primary.range[1], primary.value + delta)),
    );
  };
  return (
    <>
      <button className="back-link" onClick={() => navigate('devices')}>
        <ChevronLeft size={16} />
        返回设备管理
      </button>
      <PageHeading
        title={device.name}
        description={`${device.homeName} / ${device.room} · ${device.online ? '设备在线' : '设备离线'}`}
        action={
          <div className="detail-page-actions">
            <Select
              aria-label="切换设备详情"
              value={device.did}
              onValueChange={(value) => {
                void setParams({ device: value });
              }}
            >
              {homeDevices.map((d) => (
                <SelectOption key={d.did} value={d.did}>
                  {d.name}
                </SelectOption>
              ))}
            </Select>
            <button
              className={`icon-button ${settings.favorites.includes(device.did) ? 'selected' : ''}`}
              aria-label="收藏当前设备"
              onClick={() => void toggleFavorite(device.did)}
            >
              <Heart
                size={20}
                fill={settings.favorites.includes(device.did) ? 'currentColor' : 'none'}
              />
            </button>
          </div>
        }
      />
      {!device.online && <Notice>设备当前离线，已停用所有写入操作。状态可能来自缓存。</Notice>}
      {device.fault && <Notice danger>{device.fault}。请检查设备后再尝试控制。</Notice>}
      {error ? (
        <>
          <Notice danger>{error}</Notice>
          <button className="button secondary" onClick={() => setRetry((value) => value + 1)}>
            <RefreshCw size={16} />
            重新读取
          </button>
        </>
      ) : !detail ? (
        <div className="initial-loading">
          <Spinner label="正在读取设备状态…" />
        </div>
      ) : (
        <>
          <div className="device-detail-grid" data-device-id={did}>
            <Panel
              title="设备控制"
              action={
                <span className={`state-tag ${device.online ? '' : 'muted'}`}>
                  {device.online ? (device.power === false ? '待机中' : '运行正常') : '离线'}
                </span>
              }
              className={`main-device-control control-${kind}`}
            >
              {kind === 'camera' && household?.cameras[0] ? (
                <CameraPreview camera={household.cameras[0]} />
              ) : kind === 'lock' ? (
                <div className="lock-control">
                  <span className="large-shield">
                    <LockKeyhole size={68} strokeWidth={1.1} />
                  </span>
                  <h2>
                    {detail.properties.find((p) => p.name === 'locked')?.value === true
                      ? '大门已上锁'
                      : detail.properties.find((p) => p.name === 'locked')?.value === false
                        ? '大门未上锁'
                        : '门锁状态待同步'}
                  </h2>
                  <p>门锁安全状态只读，守护保持在线</p>
                  <span className="state-tag">
                    <ShieldCheck size={14} />
                    电量{' '}
                    {String(
                      detail.properties.find((p) => p.name === 'battery-level')?.value ?? '—',
                    )}
                    % · {device.online ? '连接正常' : '离线'}
                  </span>
                </div>
              ) : kind === 'vacuum' ? (
                <div className="vacuum-control">
                  <div className="floor-plan">
                    <span>客厅</span>
                    <span>卧室</span>
                    <span>厨房</span>
                    <span>书房</span>
                    <i className="robot-dot" />
                  </div>
                  <div className="vacuum-status">
                    <DeviceArt device={device} />
                    <div>
                      <strong>{device.metrics || '设备就绪'}</strong>
                      <p>
                        {String(
                          detail.properties.find((p) => p.name === 'battery-level')?.value ?? '—',
                        )}
                        % 电量 · 本地户型示意
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="temperature-control">
                  <DeviceArt device={device} />
                  <div className={`control-dial ${device.power === false ? 'is-off' : ''}`}>
                    <div>
                      <span>
                        {kind === 'light'
                          ? '灯光亮度'
                          : kind === 'air-conditioner'
                            ? '目标温度'
                            : kind === 'heater'
                              ? '目标水温'
                              : '设备状态'}
                      </span>
                      <strong>
                        {primary
                          ? String(primary.value ?? '—')
                          : device.power === false
                            ? '关'
                            : device.power === true
                              ? '开'
                              : device.online
                                ? '在线'
                                : '离线'}
                        <small>{primary ? (kind === 'light' ? '%' : '°C') : ''}</small>
                      </strong>
                      <p>
                        {kind === 'light'
                          ? '温暖柔和的光，为生活留白'
                          : kind === 'air-conditioner'
                            ? '清凉，刚刚好'
                            : '家的舒适，自有节奏'}
                      </p>
                    </div>
                  </div>
                  {primary && (
                    <div className="dial-adjust">
                      <button
                        aria-label="减小设定值"
                        disabled={!device.online || !!device.fault}
                        onClick={() => adjust(-(primary.range?.[2] || 1))}
                      >
                        <Minus size={20} />
                      </button>
                      <span>调节{kind === 'light' ? '亮度' : '温度'}</span>
                      <button
                        aria-label="增加设定值"
                        disabled={!device.online || !!device.fault}
                        onClick={() => adjust(primary.range?.[2] || 1)}
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                  )}
                </div>
              )}
              <div className="detail-quick-controls">
                {device.power !== null && (
                  <button
                    className={device.power ? 'selected' : ''}
                    disabled={!device.online || !!device.fault || busyDevices.includes(device.did)}
                    onClick={async () => {
                      await togglePower(device);
                      setRetry((value) => value + 1);
                    }}
                  >
                    <Power size={21} />
                    <span>{device.power ? '关闭设备' : '开启设备'}</span>
                  </button>
                )}
                <button onClick={() => setRetry((value) => value + 1)}>
                  <RefreshCw size={20} />
                  <span>刷新状态</span>
                </button>
                {detail.actions.map((action) => (
                  <button
                    key={action.aiid}
                    disabled={!device.online || !!device.fault}
                    onClick={() =>
                      action.inputs.length
                        ? setSelectedDid(device.did)
                        : runAction(device, action, [])
                    }
                  >
                    <Sparkles size={20} />
                    <span>{action.description}</span>
                  </button>
                ))}
              </div>
            </Panel>
            <Panel title="参数设置" action={<Wind size={19} />}>
              <div className="properties detail-properties">
                {detail.properties.map((property) => (
                  <PropertyControl
                    key={`${property.siid}-${property.piid}`}
                    property={property}
                    online={device.online && !device.fault}
                    onWrite={(value) => commit(property, value)}
                  />
                ))}
              </div>
              <div className="device-info-card">
                <span className="metric-icon mint">
                  <AirVent size={22} />
                </span>
                <div>
                  <strong>{device.name}</strong>
                  <p>{device.model}</p>
                  <span>设备状态来自 MIoT 规格读取</span>
                </div>
              </div>
            </Panel>
          </div>
          <div className="two-column-grid">
            <Panel title="设备信息">
              <div className="profile-fact">
                <span>所属家庭</span>
                <strong>{device.homeName}</strong>
              </div>
              <div className="profile-fact">
                <span>所在房间</span>
                <strong>{device.room}</strong>
              </div>
              <div className="profile-fact">
                <span>连接状态</span>
                <strong>{device.online ? '在线' : '离线'}</strong>
              </div>
            </Panel>
            <Panel title="使用贴士">
              <div className="advice-card">
                <span className="metric-icon orange">
                  <Sparkles size={23} />
                </span>
                <div>
                  <strong>
                    {kind === 'light'
                      ? '柔和一点，舒适一点'
                      : kind === 'air-conditioner'
                        ? '夏季 26°C，舒适也节能'
                        : '让设备保持良好的连接'}
                  </strong>
                  <p>
                    {demo
                      ? '当前控制作用于本地示例；设备实时状态可在真实家庭接入后同步。'
                      : '实际可用参数由设备规格决定，设置完成后请核实设备响应。'}
                  </p>
                </div>
              </div>
            </Panel>
          </div>
        </>
      )}
    </>
  );
}
