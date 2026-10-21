import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ExternalLink, QrCode, RefreshCw, ScanLine, ShieldCheck } from 'lucide-react';
import * as api from '@/api/mihome';
import type { LoginTicket, Session } from '@/types';
import { Modal, Notice, Spinner } from '@/components/ui';
import { errorMessage } from '@/utils/errors';

export function LoginDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (session: Session) => void;
}) {
  const [ticket, setTicket] = useState<LoginTicket | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const successRef = useRef(onSuccess);
  successRef.current = onSuccess;
  useEffect(() => {
    if (!open || !api.isDesktop) return;
    let alive = true;
    let ticketId: string | null = null;
    let timer: ReturnType<typeof setInterval> | undefined;
    let expired = false;
    setLoading(true);
    setTicket(null);
    setError('');
    void (async () => {
      try {
        const next = await api.beginLogin();
        ticketId = next.ticketId;
        if (!alive) {
          void api.cancelLogin(next.ticketId).catch(() => {});
          return;
        }
        setTicket(next);
        setRemaining(next.expiresIn);
        setLoading(false);
        const deadline = Date.now() + next.expiresIn * 1000;
        timer = setInterval(() => {
          const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
          if (alive) setRemaining(seconds);
          if (seconds === 0 && !expired) {
            expired = true;
            if (alive) setError('二维码已过期，请刷新后重新扫码。');
            if (timer) clearInterval(timer);
            void api.cancelLogin(next.ticketId).catch(() => {});
          }
        }, 1000);
        const session = await api.waitLogin(next.ticketId);
        if (alive && !expired) {
          if (!session.authenticated) throw new Error('登录尚未完成，请重新扫码。');
          ticketId = null;
          successRef.current(session);
        }
      } catch (error) {
        if (alive && !expired) setError(errorMessage(error));
      } finally {
        if (timer) clearInterval(timer);
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
      if (timer) clearInterval(timer);
      if (ticketId) void api.cancelLogin(ticketId).catch(() => {});
    };
  }, [open, attempt]);
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="把你的家，连接进来"
      description="使用小米账号扫码登录，同步你的家庭与设备。"
      className="login-dialog"
    >
      <div className="login-emblem">
        <QrCode size={26} />
      </div>
      {!api.isDesktop ? (
        <div className="browser-login">
          <Notice>
            真实账号登录仅在 Tauri 桌面版中可用。浏览器演示不会访问你的小米账号或设备。
          </Notice>
          <p>你仍然可以在演示模式中体验设备控制、智能场景与界面设置。</p>
          <button className="button primary" onClick={() => onOpenChange(false)}>
            继续体验演示
          </button>
        </div>
      ) : (
        <>
          <div className={`qr-frame ${error ? 'has-error' : ''}`}>
            {loading ? (
              <Spinner label="正在生成二维码…" />
            ) : ticket && !error ? (
              <QRCodeSVG
                value={ticket.loginUrl}
                size={192}
                level="M"
                marginSize={2}
                title="小米账号登录二维码"
              />
            ) : (
              <div className="qr-error">
                <ScanLine size={45} />
                <span>{error ? '二维码暂不可用' : '等待生成二维码'}</span>
              </div>
            )}
          </div>
          {error ? (
            <Notice danger>{error}</Notice>
          ) : (
            ticket && (
              <p className="qr-countdown">
                <span className="live-dot" />
                等待扫码 · {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}{' '}
                后过期
              </p>
            )
          )}
          <div className="login-instructions">
            <span>1</span>
            <p>打开米家 App 或小米账号扫码功能</p>
            <span>2</span>
            <p>扫描二维码，并在手机上确认登录</p>
          </div>
          <div className="login-actions">
            <button
              className="button secondary"
              onClick={() => setAttempt((value) => value + 1)}
              disabled={loading}
            >
              <RefreshCw size={15} />
              刷新二维码
            </button>
            {ticket && !error && (
              <a className="text-link" href={ticket.loginUrl} target="_blank" rel="noreferrer">
                在浏览器中登录
                <ExternalLink size={13} />
              </a>
            )}
          </div>
        </>
      )}
      <p className="privacy-note">
        <ShieldCheck size={15} />
        登录仅在你主动扫码后完成，凭据由桌面端本地保存。
      </p>
      <p className="unofficial-note">MiHome 是独立开发的非官方客户端。</p>
    </Modal>
  );
}
