import { Select, SelectOption } from '@/components/ui/Select';
import { useState } from 'react';
import { ChevronRight, DoorOpen, Home, Mail, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { useHousehold } from '@/app/HouseholdContext';
import { useMiHomeContext } from '@/app/MiHomeContext';
import { AddButton, PageHeading, ServiceEmpty } from '@/components/ui/Panel';
import { Modal } from '@/components/ui';
import type { Member } from '@/types/household';

export function FamilyPage() {
  const { household, update } = useHousehold();
  const { currentHome, homeDevices, rooms, navigate, notify, setConfirmation } = useMiHomeContext();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState<Member['role']>('家庭成员');
  const [scope, setScope] = useState('全部房间');
  const invite = () => {
    if (!name.trim()) return;
    if (
      update((current) => ({
        ...current,
        members: [
          ...current.members,
          {
            id: crypto.randomUUID(),
            name: name.trim(),
            role,
            rooms: scope,
            color: role === '访客' ? 'blue' : 'lavender',
          },
        ],
      }))
    ) {
      setOpen(false);
      setName('');
      notify('成员已加入本地家庭，未发送外部邀请');
    }
  };
  return (
    <>
      <PageHeading
        title="家庭管理"
        description="家不只是设备的连接，更是家人的陪伴。"
        action={
          <AddButton disabled={!household} onClick={() => setOpen(true)}>
            添加成员
          </AddButton>
        }
      />
      <section className="panel family-overview">
        <span className="large-home-icon">
          <Home size={36} strokeWidth={1.3} />
        </span>
        <div>
          <h2>{currentHome?.name || '全部家庭'}</h2>
          <p>属于你和家人的智能生活空间</p>
        </div>
        <div className="family-counts">
          <span>
            <strong>{household?.members.length || '—'}</strong>位家庭成员
          </span>
          <span>
            <strong>{rooms.length}</strong>个房间
          </span>
          <span>
            <strong>{homeDevices.length}</strong>台设备
          </span>
        </div>
        <button className="button secondary" onClick={() => navigate('rooms')}>
          <DoorOpen size={17} />
          房间管理
          <ChevronRight size={15} />
        </button>
      </section>
      <div className="section-heading">
        <h2>
          家庭成员<span>{household?.members.length || 0}</span>
        </h2>
        <span className="muted-note">共同管理，安心共享</span>
      </div>
      {!household ? (
        <ServiceEmpty
          title="成员管理尚未接入"
          description="真实家庭成员与共享权限请在米家 App 中管理。"
        />
      ) : (
        <div className="member-grid">
          {household.members.map((member) => (
            <section className="panel member-card" key={member.id}>
              <div className="member-card-top">
                <span className={`member-avatar ${member.color}`}>{member.name.slice(0, 1)}</span>
                <span className={`role-badge ${member.role === '管理员' ? 'owner' : ''}`}>
                  {member.role}
                </span>
              </div>
              <h2>
                {member.name}
                {member.id === 'owner' && <small>（我）</small>}
              </h2>
              <p>
                <ShieldCheck size={14} />
                {member.role === '管理员'
                  ? '完整家庭管理权限'
                  : member.role === '访客'
                    ? '仅可查看指定房间设备'
                    : '可查看与控制指定房间设备'}
              </p>
              <div className="member-scope">
                <span>房间范围</span>
                <strong>{member.rooms}</strong>
              </div>
              <div className="member-card-foot">
                <span>
                  <i className="live-dot" />
                  本地成员
                </span>
                {member.id !== 'owner' && (
                  <button
                    onClick={() =>
                      setConfirmation({
                        title: `移除「${member.name}」？`,
                        description: '将撤销该本地成员的家庭访问权限。',
                        run: async () =>
                          update((current) => ({
                            ...current,
                            members: current.members.filter((m) => m.id !== member.id),
                          })),
                      })
                    }
                  >
                    移除成员
                  </button>
                )}
              </div>
            </section>
          ))}
          <button className="add-member-card" onClick={() => setOpen(true)}>
            <UserPlus size={30} />
            <strong>和家人分享智能生活</strong>
            <span>添加一个本地家庭成员</span>
          </button>
        </div>
      )}
      <div className="family-tips">
        <Users size={23} />
        <div>
          <strong>恰当的权限，让共享更安心</strong>
          <p>
            管理员可管理家庭；家庭成员可控制授权设备；访客仅查看指定房间。当前权限配置为本地体验，不会向他人发送消息。
          </p>
        </div>
      </div>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="添加家庭成员"
        description="设置成员称呼、角色和可访问的房间。"
        footer={
          <>
            <button className="button secondary" onClick={() => setOpen(false)}>
              取消
            </button>
            <button className="button primary" disabled={!name.trim()} onClick={invite}>
              <UserPlus size={16} />
              添加成员
            </button>
          </>
        }
      >
        <div className="form-stack">
          <label className="field-label">
            <span>成员称呼</span>
            <input
              maxLength={20}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：家人"
            />
          </label>
          <label className="field-label">
            <span>成员角色</span>
            <Select value={role} onValueChange={(value) => setRole(value as Member['role'])}>
              <SelectOption value="家庭成员">家庭成员</SelectOption>
              <SelectOption value="访客">访客</SelectOption>
            </Select>
          </label>
          <label className="field-label">
            <span>房间权限</span>
            <Select value={scope} onValueChange={(value) => setScope(value)}>
              <SelectOption value="全部房间">全部房间</SelectOption>
              {rooms.map((room) => (
                <SelectOption value={room} key={room}>
                  {room}
                </SelectOption>
              ))}
            </Select>
          </label>
          <p className="form-hint">
            <Mail size={14} />
            仅创建本地成员，不会向外部账号发送邀请。
          </p>
        </div>
      </Modal>
    </>
  );
}
