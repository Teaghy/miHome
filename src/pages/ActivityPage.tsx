import { useMiHomeContext } from '@/app/MiHomeContext';
import { Activity as ActivityIcon, ArrowRight, Check, Search, X } from 'lucide-react';
import { Notice } from '@/components/ui';
import { timeLabel } from '@/utils/presentation';
export function ActivityPage() {
  const { activity, setActivity, visibleActivity, setSearch, demo, navigate } = useMiHomeContext();
  return (
    <section className="activity-section">
      <div className="section-heading">
        <div>
          <h2>
            本次会话<span>{activity.length}</span>
          </h2>
          <span className="muted-note">记录只在当前页面会话中保留，最多 100 条</span>
        </div>
        {activity.length > 0 && (
          <button className="button secondary small" onClick={() => setActivity([])}>
            清空记录
          </button>
        )}
      </div>
      {activity.length ? (
        <ol className="activity-list">
          {visibleActivity.length === 0 && (
            <li>
              <Search size={20} />
              <div>
                <strong>没有找到匹配的活动</strong>
                <span>试试其他关键词，或清除搜索。</span>
              </div>
              <button className="button secondary small" onClick={() => setSearch('')}>
                清除搜索
              </button>
            </li>
          )}
          {visibleActivity.map((item) => (
            <li key={item.id}>
              <span className={`activity-result ${item.success ? '' : 'failed'}`}>
                {item.success ? <Check size={17} /> : <X size={17} />}
              </span>
              <div>
                <strong>{item.label}</strong>
                <span>
                  {item.success ? '操作已确认' : '操作未完成'} ·{' '}
                  {demo ? '本地演示' : '真实设备请求'}
                </span>
              </div>
              <time dateTime={item.time}>{timeLabel(item.time)}</time>
            </li>
          ))}
        </ol>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">
            <ActivityIcon size={31} strokeWidth={1.3} />
          </div>
          <h3>还没有新的活动</h3>
          <p>
            控制设备、运行场景或发送语音后，
            <br />
            真实发生的操作会记录在这里。
          </p>
          <button className="button secondary" onClick={() => navigate('home')}>
            回到我的家庭
            <ArrowRight size={15} />
          </button>
        </div>
      )}
      <Notice>此处并非米家云端历史记录。重新打开应用后，当前会话活动不会保留。</Notice>
    </section>
  );
}
