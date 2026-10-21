import {
  DoorClosed,
  Eye,
  Flame,
  LockKeyhole,
  ShieldCheck,
  ShieldOff,
  Siren,
  UserRound,
} from 'lucide-react';
import { useHousehold } from '@/app/HouseholdContext';
import { useMiHomeContext } from '@/app/MiHomeContext';
import { PageHeading, Panel, PanelLink, ServiceEmpty } from '@/components/ui/Panel';

export function SecurityPage() {
  const { household, update } = useHousehold();
  const { setConfirmation, navigate, notify } = useMiHomeContext();
  const arm = () =>
    setConfirmation({
      title: household?.armed ? '关闭离家布防？' : '开启离家布防？',
      description: '本地体验仅调整示例安防状态，不会改变真实家庭设备。',
      run: async () => {
        const ok = update((current) => ({ ...current, armed: !current.armed }));
        if (ok) notify('本地安防模式已更新');
        return ok;
      },
    });
  return (
    <>
      <PageHeading title="家庭安防" description="不必时刻牵挂，家自有周全守护。" />
      {!household ? (
        <ServiceEmpty title="等待安防设备接入" />
      ) : (
        <>
          <section className="security-hero panel">
            <div className="large-shield">
              <ShieldCheck size={66} strokeWidth={1.2} />
            </div>
            <div>
              <span className="panel-eyebrow">HOME SECURITY</span>
              <h2>{household.armed ? '离家布防，安心守候' : '一切安好，放心生活'}</h2>
              <p>门窗、烟雾与摄像机协同守护，家的每一刻都有回应。</p>
              <span className="state-tag">
                <i />
                {household.armed ? '离家布防已开启' : '当前为在家模式'}
              </span>
            </div>
            <button className={`button ${household.armed ? 'secondary' : 'primary'}`} onClick={arm}>
              {household.armed ? <ShieldOff size={17} /> : <ShieldCheck size={17} />}
              {household.armed ? '关闭布防' : '开启离家布防'}
            </button>
          </section>
          <div className="security-device-grid">
            {[
              {
                icon: DoorClosed,
                title: '门窗传感器',
                status: '全部关闭',
                detail: '3 个门窗传感器 · 连接正常',
                color: 'mint',
              },
              {
                icon: Flame,
                title: '烟雾报警器',
                status: '无烟雾报警',
                detail: '厨房烟雾报警器 · 电量 96%',
                color: 'orange',
              },
              {
                icon: Eye,
                title: '人形侦测',
                status: '未发现异常',
                detail: '2 台摄像机正在守护',
                color: 'blue',
              },
              {
                icon: LockKeyhole,
                title: '智能门锁',
                status: '大门已上锁',
                detail: '最后开门 · 今天 08:32',
                color: 'lavender',
              },
            ].map(({ icon: Icon, ...item }) => (
              <article className="panel" key={item.title}>
                <span className={`metric-icon ${item.color}`}>
                  <Icon size={24} />
                </span>
                <h2>{item.title}</h2>
                <strong>{item.status}</strong>
                <p>{item.detail}</p>
                <span className="healthy-state">
                  <i />
                  运行正常
                </span>
              </article>
            ))}
          </div>
          <div className="two-column-grid">
            <Panel
              title="最近安防动态"
              action={<PanelLink label="全部动态" onClick={() => navigate('messages')} />}
            >
              <div className="timeline-list">
                {[
                  {
                    icon: UserRound,
                    title: '家人已到家',
                    detail: '智能门锁 · 指纹验证通过',
                    time: '08:32',
                  },
                  {
                    icon: Eye,
                    title: '大门有人经过',
                    detail: '大门摄像机 · 人形侦测',
                    time: '08:28',
                  },
                  {
                    icon: ShieldCheck,
                    title: '夜间守护已完成',
                    detail: '昨晚未发生异常事件',
                    time: '07:00',
                  },
                ].map(({ icon: Icon, ...event }) => (
                  <div key={event.title}>
                    <span className="message-symbol mint">
                      <Icon size={18} />
                    </span>
                    <div>
                      <strong>{event.title}</strong>
                      <p>{event.detail}</p>
                    </div>
                    <time>{event.time}</time>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel title="守护设置">
              <div className="setting-link-row">
                <span className="metric-icon peach">
                  <Siren size={20} />
                </span>
                <div>
                  <strong>安防通知</strong>
                  <p>在重要时刻，第一时间提醒你</p>
                </div>
                <button className="button secondary" onClick={() => navigate('settings')}>
                  去设置
                </button>
              </div>
              <div className="setting-link-row">
                <span className="metric-icon blue">
                  <UserRound size={20} />
                </span>
                <div>
                  <strong>家人共享</strong>
                  <p>与值得信任的人共同守护</p>
                </div>
                <button className="button secondary" onClick={() => navigate('family')}>
                  管理成员
                </button>
              </div>
            </Panel>
          </div>
        </>
      )}
    </>
  );
}
