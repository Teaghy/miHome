import { useState } from 'react';
import { Droplets, Leaf, Thermometer, Wind } from 'lucide-react';
import { useHousehold } from '@/app/HouseholdContext';
import { useMiHomeContext } from '@/app/MiHomeContext';
import { Panel, PageHeading, ServiceEmpty } from '@/components/ui/Panel';
import { TrendChart, PeriodTabs } from '@/components/charts/TrendChart';
import type { Period } from '@/types/household';

const metrics = [
  {
    key: 'temperature',
    icon: Thermometer,
    label: '室内温度',
    value: '26',
    unit: '°C',
    status: '温度适宜',
    range: '舒适范围 20–28°C',
    color: 'orange',
    values: [23, 23, 22, 23, 24, 25, 26, 25, 26, 26, 25, 26],
  },
  {
    key: 'humidity',
    icon: Droplets,
    label: '相对湿度',
    value: '60',
    unit: '%',
    status: '湿度舒适',
    range: '舒适范围 40–65%',
    color: 'blue',
    values: [54, 53, 55, 56, 57, 55, 58, 60, 59, 60, 60, 60],
  },
  {
    key: 'pm25',
    icon: Wind,
    label: 'PM2.5',
    value: '12',
    unit: 'μg/m³',
    status: '空气清新',
    range: '建议保持在 35 μg/m³ 以下',
    color: 'mint',
    values: [24, 22, 19, 21, 18, 16, 14, 13, 15, 13, 12, 12],
  },
  {
    key: 'co2',
    icon: Leaf,
    label: 'CO₂',
    value: '528',
    unit: 'ppm',
    status: '通风良好',
    range: '建议保持在 1000 ppm 以下',
    color: 'lavender',
    values: [620, 580, 560, 540, 580, 600, 550, 540, 520, 540, 530, 528],
  },
];
export function EnvironmentPage() {
  const { household } = useHousehold();
  const { rooms, homeDevices, setSelectedDid } = useMiHomeContext();
  const [room, setRoom] = useState('全屋');
  const [metric, setMetric] = useState('temperature');
  const [period, setPeriod] = useState<Period>('day');
  const selected = metrics.find((m) => m.key === metric)!;
  return (
    <>
      <PageHeading title="环境监测" description="让每一口呼吸、每一份温度，都刚刚好。" />
      <div className="room-chips">
        {['全屋', ...rooms].map((value) => (
          <button
            key={value}
            className={room === value ? 'active' : ''}
            onClick={() => setRoom(value)}
          >
            {value}
          </button>
        ))}
      </div>
      {!household ? (
        <ServiceEmpty
          title="等待环境数据"
          description="环境传感器接入后，在这里查看温度、湿度和空气质量。"
        />
      ) : (
        <>
          <div className="environment-overview">
            <div>
              <Leaf size={30} />
              <span>
                <strong>{room}环境舒适</strong>
                <p>{room === '全屋' ? '全屋示例汇总' : `${room}传感器示例`} · 数据更新于 10:00</p>
              </span>
            </div>
            <span className="state-tag">空气质量 · 优</span>
          </div>
          <div className="environment-detail-grid">
            {metrics.map(({ icon: Icon, ...item }) => (
              <button
                className={`panel environment-detail-card ${metric === item.key ? 'selected' : ''}`}
                key={item.key}
                onClick={() => setMetric(item.key)}
              >
                <div>
                  <span className={`metric-icon ${item.color}`}>
                    <Icon size={23} />
                  </span>
                  <span className="state-tag">{item.status}</span>
                </div>
                <strong>
                  {item.value}
                  <small>{item.unit}</small>
                </strong>
                <h2>{item.label}</h2>
                <p>{item.range}</p>
              </button>
            ))}
          </div>
          <Panel
            title={`${room} · ${selected.label}趋势`}
            action={<PeriodTabs value={period} onChange={setPeriod} />}
            className="environment-trend"
          >
            <div className="chart-summary">
              <strong>
                {selected.value}
                <small>{selected.unit}</small>
              </strong>
              <span>
                {period === 'day' ? '今日' : period === 'week' ? '本周' : '本月'}示例 · 状态稳定
              </span>
            </div>
            <TrendChart
              values={selected.values.map((v, i) =>
                period === 'day'
                  ? v
                  : Math.round(v * (period === 'week' ? 0.94 + i * 0.008 : 0.9 + i * 0.015) * 10) /
                    10,
              )}
              variant="line"
              unit={selected.unit}
              labels={
                period === 'day'
                  ? undefined
                  : period === 'week'
                    ? ['周一', '周三', '周五', '周日']
                    : ['1 日', '10 日', '20 日', '30 日']
              }
            />
          </Panel>
          <div className="two-column-grid">
            <Panel title="舒适生活建议">
              <div className="advice-card">
                <span className="metric-icon mint">
                  <Wind size={23} />
                </span>
                <div>
                  <strong>打开窗，让新鲜空气进来</strong>
                  <p>每天通风 2–3 次，给家一点呼吸的时间。</p>
                </div>
              </div>
              <div className="advice-card">
                <span className="metric-icon orange">
                  <Thermometer size={23} />
                </span>
                <div>
                  <strong>温度适宜，舒适也节能</strong>
                  <p>夏季空调设为 26°C，清凉恰到好处。</p>
                </div>
              </div>
            </Panel>
            <Panel title="关联环境设备">
              <div className="linked-devices">
                {homeDevices
                  .filter((d) => /sensor|purifier|air-conditioner/.test(d.category))
                  .filter((d) => room === '全屋' || d.room === room)
                  .map((d) => (
                    <button key={d.did} onClick={() => setSelectedDid(d.did)}>
                      <span>
                        <i className="live-dot" />
                        {d.name}
                      </span>
                      <small>{d.room} · 查看状态</small>
                    </button>
                  ))}
              </div>
            </Panel>
          </div>
        </>
      )}
    </>
  );
}
