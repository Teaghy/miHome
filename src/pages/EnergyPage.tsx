import { useState } from 'react';
import { AirVent, ArrowDownRight, Lamp, Leaf, Plug, Zap } from 'lucide-react';
import { useHousehold } from '@/app/HouseholdContext';
import { Panel, PageHeading, ServiceEmpty } from '@/components/ui/Panel';
import { PeriodTabs, TrendChart } from '@/components/charts/TrendChart';
import { energySeries } from '@/mocks/household';
import type { Period } from '@/types/household';

export function EnergyPage() {
  const { household } = useHousehold();
  const [period, setPeriod] = useState<Period>('day');
  const total = period === 'day' ? 8.4 : period === 'week' ? 58 : 126.7;
  return (
    <>
      <PageHeading
        title="能耗统计"
        description="看见每一度电，让节能成为生活习惯。"
        action={<PeriodTabs value={period} onChange={setPeriod} />}
      />
      {!household ? (
        <ServiceEmpty
          title="等待能耗设备接入"
          description="接入支持计量的设备后，这里将展示家庭用电趋势。"
        />
      ) : (
        <>
          <div className="energy-stat-grid">
            {[
              {
                label: period === 'day' ? '今日用电' : period === 'week' ? '本周用电' : '本月用电',
                value: total.toFixed(1),
                unit: 'kWh',
                detail: '较上期节省 8.2%',
                icon: Zap,
                color: 'mint',
              },
              {
                label: '预估电费',
                value: (total * 0.56).toFixed(2),
                unit: '元',
                detail: '按 0.56 元 / kWh 估算',
                icon: Plug,
                color: 'orange',
              },
              {
                label: '节能减排',
                value: (total * 0.57).toFixed(2),
                unit: 'kg',
                detail: '示例碳排放系数 0.57 kg / kWh',
                icon: Leaf,
                color: 'blue',
              },
            ].map(({ icon: Icon, ...item }) => (
              <section className="panel energy-stat" key={item.label}>
                <span className={`metric-icon ${item.color}`}>
                  <Icon size={24} />
                </span>
                <div>
                  <span>{item.label}</span>
                  <strong>
                    {item.value}
                    <small>{item.unit}</small>
                  </strong>
                  <p>{item.detail}</p>
                </div>
              </section>
            ))}
          </div>
          <Panel
            title="家庭用电趋势"
            action={
              <span className="legend-dot">
                <i />
                用电量
              </span>
            }
            className="energy-large-chart"
          >
            <div className="chart-summary">
              <strong>
                {total.toFixed(1)}
                <small>kWh</small>
              </strong>
              <span className="trend-good">
                <ArrowDownRight size={15} />
                较上期下降 8.2%
              </span>
            </div>
            <TrendChart
              values={energySeries[period]}
              variant="line"
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
            <Panel title="设备用电分布">
              <div className="energy-distribution">
                <div className="donut-chart">
                  <span>
                    <strong>{total.toFixed(1)}</strong>
                    <small>kWh</small>
                  </span>
                </div>
                <div>
                  {[
                    { name: '空调', ratio: 48, color: 'mint' },
                    { name: '照明', ratio: 22, color: 'orange' },
                    { name: '其他电器', ratio: 30, color: 'blue' },
                  ].map((item) => (
                    <div className="distribution-legend" key={item.name}>
                      <i className={item.color} />
                      <span>{item.name}</span>
                      <strong>{((total * item.ratio) / 100).toFixed(1)} kWh</strong>
                      <small>{item.ratio}%</small>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>
            <Panel title="用电设备">
              <div className="energy-device-list">
                {[
                  { icon: AirVent, name: '客厅空调', ratio: 48, color: 'mint' },
                  { icon: Lamp, name: '全屋灯光', ratio: 22, color: 'orange' },
                  { icon: Plug, name: '其他电器', ratio: 30, color: 'blue' },
                ].map(({ icon: Icon, ...item }) => (
                  <div key={item.name}>
                    <span className={`metric-icon ${item.color}`}>
                      <Icon size={20} />
                    </span>
                    <div>
                      <strong>{item.name}</strong>
                      <span className="progress-track">
                        <i style={{ width: `${item.ratio}%` }} />
                      </span>
                    </div>
                    <span>
                      {((total * item.ratio) / 100).toFixed(1)}
                      <small> kWh</small>
                    </span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
          <p className="data-footnote">
            当前展示本地家庭示例。预估电费和减排仅用于体验，实际以设备计量及当地费率为准。
          </p>
        </>
      )}
    </>
  );
}
