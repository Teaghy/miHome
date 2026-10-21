import { useState } from 'react';
import {
  ArrowDownRight,
  Bell,
  Check,
  Droplets,
  Leaf,
  ShieldCheck,
  Thermometer,
  Wind,
  Zap,
} from 'lucide-react';
import { useMiHomeContext } from '@/app/MiHomeContext';
import { useHousehold } from '@/app/HouseholdContext';
import { Panel, PanelLink, ServiceEmpty } from '@/components/ui/Panel';
import { PeriodTabs, TrendChart } from '@/components/charts/TrendChart';
import { energySeries } from '@/mocks/household';
import type { Period } from '@/types/household';

export function EnergyPanel() {
  const [period, setPeriod] = useState<Period>('day');
  const { household } = useHousehold();
  const { navigate } = useMiHomeContext();
  return (
    <Panel
      title="能耗统计"
      action={<PeriodTabs value={period} onChange={setPeriod} />}
      className="energy-panel"
    >
      {household ? (
        <>
          <div className="energy-summary">
            <div>
              <span>
                {period === 'day' ? '今日用电' : period === 'week' ? '本周用电' : '本月用电'}
              </span>
              <strong>
                {period === 'day' ? '8.4' : period === 'week' ? '58.0' : '126.7'}
                <small>kWh</small>
              </strong>
            </div>
            <span className="trend-good">
              <ArrowDownRight size={15} />
              较上期节省 8.2%
            </span>
          </div>
          <TrendChart
            values={energySeries[period]}
            labels={
              period === 'day'
                ? undefined
                : period === 'week'
                  ? ['周一', '周三', '周五', '周日']
                  : ['1 日', '10 日', '20 日', '30 日']
            }
          />
          <div className="panel-bottom">
            <span>让每一度电，都用得刚刚好</span>
            <PanelLink label="用电详情" onClick={() => navigate('energy')} />
          </div>
        </>
      ) : (
        <ServiceEmpty title="等待能耗数据" />
      )}
    </Panel>
  );
}
export function EnvironmentPanel() {
  const { household } = useHousehold();
  const { navigate } = useMiHomeContext();
  return (
    <Panel
      title="环境监测"
      action={<PanelLink label="环境详情" onClick={() => navigate('environment')} />}
      className="environment-panel"
    >
      {household ? (
        <>
          <div className="environment-status">
            <span>
              <Leaf size={16} />
              室内环境舒适
            </span>
            <small>刚刚更新</small>
          </div>
          <div className="environment-metrics">
            {[
              { icon: Thermometer, value: '26', unit: '°C', label: '室内温度', color: 'orange' },
              { icon: Droplets, value: '60', unit: '%', label: '相对湿度', color: 'blue' },
              { icon: Wind, value: '12', unit: 'μg/m³', label: 'PM2.5', color: 'mint' },
              { icon: Leaf, value: '优', unit: '', label: '空气质量', color: 'mint' },
            ].map(({ icon: Icon, ...item }) => (
              <div key={item.label}>
                <span className={`metric-icon ${item.color}`}>
                  <Icon size={18} />
                </span>
                <strong>
                  {item.value}
                  <small>{item.unit}</small>
                </strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
          <div className="environment-track">
            <span>空气清新</span>
            <i />
            <span>适宜居住</span>
            <Check size={13} />
          </div>
        </>
      ) : (
        <ServiceEmpty title="等待环境传感器接入" />
      )}
    </Panel>
  );
}
export function MessagesPanel() {
  const { household, unread } = useHousehold();
  const { navigate } = useMiHomeContext();
  return (
    <Panel
      title="消息中心"
      action={
        <PanelLink
          label={`${unread ? `${unread} 条未读 · ` : ''}全部`}
          onClick={() => navigate('messages')}
        />
      }
      className="messages-panel"
    >
      {household ? (
        <div className="message-preview-list">
          {household.messages.slice(0, 3).map((message) => (
            <button key={message.id} onClick={() => navigate('messages')}>
              <span className={`message-symbol ${message.type === 'security' ? 'blue' : 'mint'}`}>
                {message.type === 'security' ? (
                  <ShieldCheck size={17} />
                ) : message.type === 'device' ? (
                  <Zap size={17} />
                ) : (
                  <Bell size={17} />
                )}
              </span>
              <span>
                <strong>{message.title}</strong>
                <small>{message.description}</small>
              </span>
              <time>{message.time}</time>
              {!message.read && <i />}
            </button>
          ))}
        </div>
      ) : (
        <ServiceEmpty title="暂无家庭消息" />
      )}
    </Panel>
  );
}
