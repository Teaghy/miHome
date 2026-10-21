import { useState } from 'react';
import { Bell, CheckCheck, ChevronRight, ShieldCheck, Trash2, Zap } from 'lucide-react';
import { useHousehold } from '@/app/HouseholdContext';
import { useMiHomeContext } from '@/app/MiHomeContext';
import { PageHeading, ServiceEmpty } from '@/components/ui/Panel';
import { Modal } from '@/components/ui';
import type { HomeMessage } from '@/types/household';

export function MessagesPage() {
  const { household, update, unread } = useHousehold();
  const { search, notify, navigate, setConfirmation } = useMiHomeContext();
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<HomeMessage | null>(null);
  const messages =
    household?.messages.filter(
      (message) =>
        (filter === 'all' || (filter === 'unread' && !message.read) || message.type === filter) &&
        (!search || `${message.title} ${message.description}`.includes(search)),
    ) || [];
  const readAll = () => {
    if (
      update((current) => ({
        ...current,
        messages: current.messages.map((message) => ({ ...message, read: true })),
      }))
    )
      notify('所有消息已标为已读');
  };
  return (
    <>
      <PageHeading
        title="消息中心"
        description={`家的每一次回应，都在这里。${unread ? ` 你有 ${unread} 条未读消息。` : ''}`}
        action={
          <button className="button secondary" disabled={!unread} onClick={readAll}>
            <CheckCheck size={17} />
            全部已读
          </button>
        }
      />
      <div className="messages-toolbar">
        <div className="view-tabs">
          {[
            ['all', '全部消息'],
            ['unread', '未读'],
            ['security', '家庭安防'],
            ['device', '设备动态'],
            ['system', '系统消息'],
          ].map(([id, label]) => (
            <button
              key={id}
              className={filter === id ? 'selected' : ''}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <button className="text-link" onClick={() => navigate('activity')}>
          查看本次操作记录
          <ChevronRight size={14} />
        </button>
      </div>
      {!household ? (
        <ServiceEmpty
          title="家庭消息服务尚未接入"
          description="当前会话实际发起的设备操作，可在操作记录中查看。"
        />
      ) : !messages.length ? (
        <ServiceEmpty title="消息都看完了" description="新的家庭动态，会及时送达这里。" />
      ) : (
        <div className="full-message-list">
          {messages.map((message) => (
            <article
              className={`panel full-message ${message.read ? '' : 'unread'}`}
              key={message.id}
            >
              <span
                className={`message-symbol ${message.type === 'security' ? 'blue' : message.type === 'device' ? 'mint' : 'lavender'}`}
              >
                {message.type === 'security' ? (
                  <ShieldCheck size={22} />
                ) : message.type === 'device' ? (
                  <Zap size={22} />
                ) : (
                  <Bell size={22} />
                )}
              </span>
              <button
                className="message-open"
                onClick={() => {
                  update((current) => ({
                    ...current,
                    messages: current.messages.map((m) =>
                      m.id === message.id ? { ...m, read: true } : m,
                    ),
                  }));
                  setSelected(message);
                }}
              >
                <strong>
                  {message.title}
                  {!message.read && <i />}
                </strong>
                <p>{message.description}</p>
                <span>
                  {message.type === 'security'
                    ? '家庭安防'
                    : message.type === 'device'
                      ? '设备动态'
                      : '系统消息'}{' '}
                  · 今天 {message.time}
                </span>
              </button>
              <button
                className="icon-button"
                aria-label={`删除${message.title}`}
                onClick={() =>
                  setConfirmation({
                    title: '删除这条消息？',
                    description: message.title,
                    run: async () =>
                      update((current) => ({
                        ...current,
                        messages: current.messages.filter((m) => m.id !== message.id),
                      })),
                  })
                }
              >
                <Trash2 size={16} />
              </button>
            </article>
          ))}
        </div>
      )}
      <Modal
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title={selected?.title || '消息详情'}
        description={selected ? `今天 ${selected.time} · 本地家庭示例` : undefined}
        footer={
          <button className="button primary" onClick={() => setSelected(null)}>
            我知道了
          </button>
        }
      >
        <p className="message-detail-copy">{selected?.description}</p>
        {selected?.type === 'security' && (
          <button
            className="button secondary"
            onClick={() => {
              setSelected(null);
              navigate('cameras');
            }}
          >
            查看摄像头画面
            <ChevronRight size={15} />
          </button>
        )}
      </Modal>
    </>
  );
}
