import { useEffect, useState } from 'react';
import { ArrowLeft, AudioLines, MessageSquareText, Send, Volume2, VolumeX } from 'lucide-react';
import type { Device } from '../types';
import { deviceKind } from './DeviceArt';
import { Modal, Notice, Spinner, Toggle } from './ui';

export function VoiceDialog({
  open,
  onOpenChange,
  devices,
  defaultSpeaker,
  demo,
  onSend,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  devices: Device[];
  defaultSpeaker: string | null;
  demo: boolean;
  onSend: (did: string, text: string, silent: boolean) => Promise<boolean>;
}) {
  const speakers = devices.filter((device) => device.online && deviceKind(device) === 'speaker');
  const [did, setDid] = useState('');
  const [text, setText] = useState('');
  const [silent, setSilent] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setDid(
        speakers.some((speaker) => speaker.did === defaultSpeaker)
          ? defaultSpeaker!
          : speakers[0]?.did || '',
      );
      setText('');
      setSilent(false);
      setConfirm(false);
    }
  }, [open, defaultSpeaker]);
  const valid =
    speakers.some((speaker) => speaker.did === did) && text.trim().length > 0 && text.length <= 500;
  return (
    <Modal
      open={open}
      onOpenChange={(value) => {
        if (!busy) onOpenChange(value);
      }}
      title="和小爱说句话"
      description="通过在线小爱音箱执行文字指令，无需打开麦克风。"
      className="voice-dialog"
      footer={
        <>
          <span className="footer-note">
            {demo ? '演示模式 · 不会发送到真实设备' : '发送前请确认音箱与指令'}
          </span>
          {confirm ? (
            <>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => setConfirm(false)}
              >
                <ArrowLeft size={15} />
                返回
              </button>
              <button
                className="button primary"
                disabled={busy || !valid}
                onClick={async () => {
                  setBusy(true);
                  const ok = await onSend(did, text.trim(), silent);
                  setBusy(false);
                  if (ok) onOpenChange(false);
                }}
              >
                {busy ? (
                  <Spinner label="发送中" />
                ) : (
                  <>
                    <Send size={15} />
                    确认发送
                  </>
                )}
              </button>
            </>
          ) : (
            <button className="button primary" disabled={!valid} onClick={() => setConfirm(true)}>
              <Send size={15} />
              下一步
            </button>
          )}
        </>
      }
    >
      <div className="voice-orb">
        <AudioLines size={37} strokeWidth={1.5} />
      </div>
      {speakers.length === 0 ? (
        <Notice>还没有在线的小爱音箱。请检查音箱网络，刷新设备后重试。</Notice>
      ) : confirm ? (
        <div className="voice-confirm">
          <span className="eyebrow">
            即将发送至 {speakers.find((speaker) => speaker.did === did)?.name}
          </span>
          <blockquote>“{text.trim()}”</blockquote>
          <p>
            {silent ? <VolumeX size={16} /> : <Volume2 size={16} />}
            {silent ? '静默执行，不播报回复' : '音箱可能播放语音回复'}
          </p>
          <Notice>
            这条指令可能控制家中的设备。
            {demo ? '当前为演示，不会产生真实操作。' : '确认后才会发送。'}
          </Notice>
        </div>
      ) : (
        <div className="voice-fields">
          <label className="field-label">
            <span>选择音箱</span>
            <select value={did} onChange={(event) => setDid(event.target.value)}>
              {speakers.map((speaker) => (
                <option value={speaker.did} key={speaker.did}>
                  {speaker.name} · {speaker.room || speaker.homeName}
                </option>
              ))}
            </select>
          </label>
          <label className="field-label">
            <span>
              <MessageSquareText size={15} />
              你想让小爱做什么？<small>{text.length}/500</small>
            </span>
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              maxLength={500}
              rows={4}
              placeholder="例如：把客厅的灯光调到 50%"
              autoFocus
            />
          </label>
          <div className="settings-row">
            <div>
              <strong>静默执行</strong>
              <small>不播放音箱的语音回复</small>
            </div>
            <Toggle label="静默执行" checked={silent} onChange={setSilent} />
          </div>
          <p className="muted-note">指令由你的音箱处理，支持范围以设备实际能力为准。</p>
        </div>
      )}
    </Modal>
  );
}
