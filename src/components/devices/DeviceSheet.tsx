import { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  CircleHelp,
  Code2,
  Heart,
  LoaderCircle,
  Radio,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import * as api from '@/api/mihome';
import type { Action, Device, DeviceDetail, Property } from '@/types';
import { DeviceArt } from './DeviceArt';
import { Modal, Notice, Spinner, Toggle } from '@/components/ui';
import { errorMessage } from '@/utils/errors';

type Props = {
  device: Device | null;
  onClose: () => void;
  favorite: boolean;
  onFavorite: () => void;
  onWrite: (device: Device, property: Property, value: unknown) => Promise<boolean>;
  onAction: (device: Device, action: Action, inputs: unknown[]) => void;
  onExpand?: () => void;
};

function formatValue(value: unknown) {
  if (value === null || value === undefined) return '暂无数据';
  if (typeof value === 'boolean') return value ? '开启' : '关闭';
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

export function PropertyControl({
  property: p,
  online,
  onWrite,
}: {
  property: Property;
  online: boolean;
  onWrite: (value: unknown) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState(formatValue(p.value));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    setDraft(formatValue(p.value));
  }, [p.value]);
  const numeric = /^(u?int\d*|float|double|number)$/.test(p.format);
  const commit = async (value: unknown) => {
    if (!online || !p.writable || busy) return;
    setBusy(true);
    setError('');
    try {
      if (!(await onWrite(value))) {
        setDraft(formatValue(p.value));
        setError('写入未完成，请重试');
      }
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={`property-row ${p.writable ? '' : 'readonly'}`}>
      <div className="property-label">
        <span>{p.description || p.name}</span>
        <small>
          {p.service}
          {!p.writable && ' · 只读'}
        </small>
      </div>
      <div className="property-control">
        {busy && <LoaderCircle size={15} className="spin" />}
        {!p.writable ? (
          <output>
            {p.error
              ? '读取失败'
              : p.valueList.find((option) => option.value === p.value)?.description ||
                formatValue(p.value)}
            {!p.error && p.value != null && p.unit && p.unit !== 'none' && <small> {p.unit}</small>}
          </output>
        ) : p.format === 'bool' || p.format === 'boolean' ? (
          <Toggle
            label={p.description || p.name}
            checked={p.value === true}
            disabled={!online || busy}
            onChange={(value) => void commit(value)}
          />
        ) : p.valueList.length > 0 ? (
          <select
            aria-label={p.description || p.name}
            disabled={!online || busy}
            value={p.valueList.findIndex((option) => option.value === p.value)}
            onChange={(event) => void commit(p.valueList[Number(event.target.value)].value)}
          >
            <option value={-1} disabled>
              请选择
            </option>
            {p.valueList.map((option, index) => (
              <option key={index} value={index}>
                {option.description}
              </option>
            ))}
          </select>
        ) : numeric && p.range && p.range.length >= 2 ? (
          <div className="range-control">
            <div>
              <output>
                {draft}
                {p.unit && p.unit !== 'none' ? ` ${p.unit}` : ''}
              </output>
              <small>
                {p.range[0]} — {p.range[1]}
              </small>
            </div>
            <input
              aria-label={p.description || p.name}
              type="range"
              min={p.range[0]}
              max={p.range[1]}
              step={p.range[2] || 1}
              disabled={!online || busy}
              value={Number.isFinite(Number(draft)) ? Number(draft) : p.range[0]}
              onChange={(event) => setDraft(event.target.value)}
              onPointerUp={(event) => {
                if (Number(event.currentTarget.value) !== p.value)
                  void commit(Number(event.currentTarget.value));
              }}
              onKeyUp={(event) => {
                if (
                  [
                    'ArrowLeft',
                    'ArrowRight',
                    'ArrowUp',
                    'ArrowDown',
                    'Home',
                    'End',
                    'PageUp',
                    'PageDown',
                  ].includes(event.key) &&
                  Number(event.currentTarget.value) !== p.value
                )
                  void commit(Number(event.currentTarget.value));
              }}
            />
          </div>
        ) : (
          <form
            className="value-form"
            onSubmit={(event) => {
              event.preventDefault();
              void commit(numeric ? Number(draft) : draft);
            }}
          >
            <input
              aria-label={p.description || p.name}
              type={numeric ? 'number' : 'text'}
              disabled={!online || busy}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              required
            />
            <button
              className="button small secondary"
              disabled={!online || busy || (numeric && !Number.isFinite(Number(draft)))}
            >
              设置
            </button>
          </form>
        )}
      </div>
      {(error || p.error) && <small className="property-error">{error || p.error}</small>}
    </div>
  );
}

function ActionControl({
  action,
  online,
  onRun,
}: {
  action: Action;
  online: boolean;
  onRun: (inputs: unknown[]) => void;
}) {
  const [input, setInput] = useState('[]');
  const [error, setError] = useState('');
  return (
    <form
      className="action-control"
      onSubmit={(event) => {
        event.preventDefault();
        try {
          const values: unknown = JSON.parse(input);
          if (!Array.isArray(values) || values.length !== action.inputs.length)
            throw new Error(`请输入包含 ${action.inputs.length} 个参数的 JSON 数组`);
          setError('');
          onRun(values);
        } catch (error) {
          setError(errorMessage(error));
        }
      }}
    >
      <div className="action-title">
        <div>
          <strong>{action.description || action.name}</strong>
          <small>{action.service}</small>
        </div>
        <button className="button secondary small" disabled={!online}>
          执行
          <ArrowUpRight size={14} />
        </button>
      </div>
      {action.inputs.length > 0 && (
        <label className="field-label">
          <span>
            <Code2 size={13} />
            参数 JSON · PIID {action.inputs.join(', ')}
          </span>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            disabled={!online}
            rows={2}
            spellCheck={false}
            aria-label={`${action.description}的 JSON 参数`}
          />
        </label>
      )}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

export function DeviceSheet({
  device,
  onClose,
  favorite,
  onFavorite,
  onWrite,
  onAction,
  onExpand,
}: Props) {
  const [detail, setDetail] = useState<DeviceDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const did = device?.did;
  useEffect(() => {
    if (!did) return;
    let alive = true;
    setDetail(null);
    setError('');
    setLoading(true);
    api
      .getDeviceDetail(did)
      .then((value) => {
        if (alive) setDetail(value);
      })
      .catch((error) => {
        if (alive) setError(errorMessage(error));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [did, retry]);
  return (
    <Modal
      open={!!device}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="设备详情"
      description="基于设备 MIoT 规格展示可用控制与状态"
      className="device-sheet"
    >
      {device && (
        <>
          <div className="device-profile">
            <DeviceArt device={device} large />
            <div>
              <span className={`status-label ${device.online ? '' : 'offline'}`}>
                <i />
                {device.online ? '设备在线' : '设备离线'}
              </span>
              <h2>{device.name}</h2>
              <p>
                {device.homeName} <span>/</span> {device.room || '未分配房间'}
              </p>
            </div>
            <button
              className={`icon-button favorite-button ${favorite ? 'is-favorite' : ''}`}
              onClick={onFavorite}
              aria-label={favorite ? '取消收藏设备' : '收藏设备'}
            >
              <Heart size={20} fill={favorite ? 'currentColor' : 'none'} />
            </button>
          </div>
          {!device.online && <Notice>设备当前离线，已停用所有写入操作。状态可能来自缓存。</Notice>}
          {device.fault && <Notice danger>{device.fault}。请检查设备后再试。</Notice>}
          {onExpand && (
            <button className="text-link detail-expand" onClick={onExpand}>
              打开完整控制面板
              <ArrowUpRight size={15} />
            </button>
          )}
          {loading ? (
            <div className="sheet-loading">
              <Spinner label="正在读取设备规格…" />
            </div>
          ) : error ? (
            <>
              <Notice danger>{error}</Notice>
              <button className="button secondary" onClick={() => setRetry((value) => value + 1)}>
                <RefreshCw size={16} />
                重新读取
              </button>
            </>
          ) : (
            detail && (
              <>
                <div className="section-label">
                  <Radio size={15} />
                  <h3>设备控制</h3>
                  <span>{detail.properties.length} 项属性</span>
                </div>
                {detail.properties.length === 0 ? (
                  <div className="mini-empty">
                    <CircleHelp size={24} />
                    <p>该设备尚未提供可用属性</p>
                    <small>我们只展示设备实际支持的能力。</small>
                  </div>
                ) : (
                  <div className="properties">
                    {detail.properties.map((property) => (
                      <PropertyControl
                        key={`${property.siid}-${property.piid}`}
                        property={property}
                        online={device.online && !device.fault}
                        onWrite={async (value) => {
                          const ok = await onWrite(device, property, value);
                          if (ok) {
                            try {
                              setDetail(await api.getDeviceDetail(device.did));
                            } catch (error) {
                              setError(`命令已发送，但刷新详情失败：${errorMessage(error)}`);
                            }
                          }
                          return ok;
                        }}
                      />
                    ))}
                  </div>
                )}
                {detail.actions.length > 0 && (
                  <>
                    <div className="section-label">
                      <ArrowUpRight size={15} />
                      <h3>可用操作</h3>
                      <span>执行前将再次确认</span>
                    </div>
                    {detail.actions.map((action) => (
                      <ActionControl
                        key={`${action.siid}-${action.aiid}`}
                        action={action}
                        online={device.online}
                        onRun={(values) => onAction(device, action, values)}
                      />
                    ))}
                  </>
                )}
              </>
            )
          )}
          <div className="device-meta">
            <ShieldCheck size={15} />
            <span>
              {api.isDemo()
                ? '演示控件仅改变虚构设备状态，不发送真实请求'
                : '所有控制均通过设备真实规格调用'}
            </span>
            <dl>
              <dt>设备型号</dt>
              <dd>{device.model}</dd>
              <dt>设备 ID</dt>
              <dd>{device.did}</dd>
            </dl>
          </div>
        </>
      )}
    </Modal>
  );
}
