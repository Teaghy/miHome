import { useMiHomeContext } from '@/app/MiHomeContext';
import { ArrowRight, House, Leaf, LogIn, Monitor, ShieldCheck, Zap } from 'lucide-react';
import { Notice } from '@/components/ui';
export function WelcomePage() {
  const { error, setLoginOpen, enterDemo } = useMiHomeContext();
  return (
    <div className="welcome-page">
      <div className="welcome-art">
        <div className="welcome-halo" />
        <House size={136} strokeWidth={0.75} />
        <Leaf className="welcome-leaf" size={54} strokeWidth={1.1} />
        <span className="welcome-art-dot" />
      </div>
      <span className="eyebrow">YOUR HOME, A LITTLE CLOSER</span>
      <h1>
        每一个日常，
        <br />
        都与家相连<span>。</span>
      </h1>
      <p>
        在桌面上轻松管理你的米家设备。
        <br />
        一处掌握家的状态，让生活自然发生。
      </p>
      {error && <Notice danger>{error}</Notice>}
      <div className="welcome-actions">
        <button className="button primary" onClick={() => setLoginOpen(true)}>
          <LogIn size={17} />
          登录小米账号
          <ArrowRight size={17} />
        </button>
        <button className="button secondary" onClick={() => void enterDemo()}>
          先体验演示家庭
        </button>
      </div>
      <div className="welcome-privacy">
        <ShieldCheck size={15} />
        只有在你主动登录后，才会连接真实家庭。
      </div>
      <div className="welcome-features">
        <span>
          <Monitor size={17} />
          原生桌面体验
        </span>
        <span>
          <Zap size={17} />
          MIoT 设备控制
        </span>
        <span>
          <ShieldCheck size={17} />
          凭据本地保存
        </span>
      </div>
      <p className="unofficial-note">独立开发的非官方客户端 · 与小米公司无隶属关系</p>
    </div>
  );
}
