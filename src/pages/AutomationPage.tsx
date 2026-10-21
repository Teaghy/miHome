import { useState } from 'react';
import {
  ArrowRight,
  Clock3,
  DoorOpen,
  MoreHorizontal,
  Plus,
  Thermometer,
  Workflow,
} from 'lucide-react';
import { useHousehold } from '@/app/HouseholdContext';
import { useMiHomeContext } from '@/app/MiHomeContext';
import { AddButton, PageHeading, ServiceEmpty } from '@/components/ui/Panel';
import { Modal, Notice, Toggle } from '@/components/ui';
import type { Automation } from '@/types/household';

export function AutomationPage() {
  const { household, update } = useHousehold();
  const { notify, setConfirmation, homeDevices } = useMiHomeContext();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [condition, setCondition] = useState('室内温度高于 28°C');
  const [target, setTarget] = useState(homeDevices[0]?.did || '');
  const [filter, setFilter] = useState('all');
  const rules =
    household?.automations.filter(
      (rule) =>
        filter === 'all' ||
        (filter === 'enabled' && rule.enabled) ||
        (filter === 'disabled' && !rule.enabled),
    ) || [];
  const addRule = () => {
    const device = homeDevices.find((d) => d.did === target);
    if (!name.trim() || !device) return;
    const rule: Automation = {
      id: crypto.randomUUID(),
      name: name.trim(),
      condition,
      action: `${device.name} · 开启设备`,
      enabled: false,
      icon: condition.includes('温度') ? 'temperature' : 'time',
    };
    if (update((current) => ({ ...current, automations: [...current.automations, rule] }))) {
      setOpen(false);
      setName('');
      notify('自动化规则已保存至本地体验空间');
    }
  };
  return (
    <>
      <PageHeading
        title="自动化"
        description="把重复的小事，交给家的默契。"
        action={
          <AddButton disabled={!household} onClick={() => setOpen(true)}>
            创建自动化
          </AddButton>
        }
      />
      <div className="automation-intro">
        <Workflow size={25} />
        <div>
          <strong>如果发生了什么，就让家做些什么</strong>
          <p>用简单的条件与动作，编排属于你的生活节奏。</p>
        </div>
        <span className="state-tag">
          {household?.automations.filter((a) => a.enabled).length || 0} 条已启用
        </span>
      </div>
      <div className="view-tabs">
        {[
          ['all', '全部规则'],
          ['enabled', '已启用'],
          ['disabled', '已停用'],
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
      {!household ? (
        <ServiceEmpty
          title="自动化服务尚未接入"
          description="请在米家 App 中管理真实家庭的自动化规则。"
        />
      ) : (
        <>
          <div className="automation-grid">
            {rules.map((rule) => {
              const Icon =
                rule.icon === 'temperature'
                  ? Thermometer
                  : rule.icon === 'door'
                    ? DoorOpen
                    : Clock3;
              return (
                <article className="panel automation-card" key={rule.id}>
                  <div className="automation-card-heading">
                    <span
                      className={`metric-icon ${rule.icon === 'temperature' ? 'orange' : 'lavender'}`}
                    >
                      <Icon size={20} />
                    </span>
                    <h2>{rule.name}</h2>
                    <Toggle
                      label={`启用${rule.name}`}
                      checked={rule.enabled}
                      onChange={(enabled) => {
                        if (
                          update((current) => ({
                            ...current,
                            automations: current.automations.map((a) =>
                              a.id === rule.id ? { ...a, enabled } : a,
                            ),
                          }))
                        )
                          notify(enabled ? '本地规则已启用' : '本地规则已停用');
                      }}
                    />
                  </div>
                  <div className="automation-flow">
                    <div>
                      <span>
                        IF <small>如果</small>
                      </span>
                      <p>{rule.condition}</p>
                    </div>
                    <ArrowRight size={19} />
                    <div>
                      <span>
                        THEN <small>就执行</small>
                      </span>
                      <p>{rule.action}</p>
                    </div>
                  </div>
                  <div className="automation-card-foot">
                    <span>
                      <i className={rule.enabled ? 'live-dot' : 'idle-dot'} />
                      {rule.enabled ? '已启用' : '已停用'} · 本地规则
                    </span>
                    <button
                      aria-label={`删除${rule.name}`}
                      onClick={() =>
                        setConfirmation({
                          title: `删除「${rule.name}」？`,
                          description: '此操作将从本地体验空间移除这条规则。',
                          run: async () =>
                            update((current) => ({
                              ...current,
                              automations: current.automations.filter((a) => a.id !== rule.id),
                            })),
                        })
                      }
                    >
                      <MoreHorizontal size={18} />
                    </button>
                  </div>
                </article>
              );
            })}
            <button className="add-automation-card" onClick={() => setOpen(true)}>
              <Plus size={26} />
              <strong>创建新的默契</strong>
              <span>从一个小小的条件开始</span>
            </button>
          </div>
          <Notice>当前为本地规则设计体验，规则不会自动执行或控制真实设备。</Notice>
        </>
      )}
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="创建自动化"
        description="为家庭添加一个条件和执行动作。"
        footer={
          <>
            <button className="button secondary" onClick={() => setOpen(false)}>
              取消
            </button>
            <button className="button primary" disabled={!name.trim() || !target} onClick={addRule}>
              保存规则
            </button>
          </>
        }
      >
        <div className="form-stack">
          <label className="field-label">
            <span>规则名称</span>
            <input
              maxLength={40}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：下班后的舒适时光"
            />
          </label>
          <label className="field-label">
            <span>如果</span>
            <select value={condition} onChange={(e) => setCondition(e.target.value)}>
              <option>室内温度高于 28°C</option>
              <option>每天 18:30</option>
              <option>每天 07:00</option>
              <option>离家模式开启</option>
            </select>
          </label>
          <label className="field-label">
            <span>那么，开启设备</span>
            <select value={target} onChange={(e) => setTarget(e.target.value)}>
              {homeDevices
                .filter((d) => d.online && d.power !== null)
                .map((d) => (
                  <option key={d.did} value={d.did}>
                    {d.name}
                  </option>
                ))}
            </select>
          </label>
        </div>
      </Modal>
    </>
  );
}
