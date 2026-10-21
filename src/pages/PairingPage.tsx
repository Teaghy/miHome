import { Select, SelectOption } from '@/components/ui/Select';
import { useEffect, useState } from 'react';
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  LoaderCircle,
  Radio,
  RotateCw,
  Wifi,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useMiHomeContext } from '@/app/MiHomeContext';
import { addDemoDevice } from '@/api/mihome';
import { errorMessage } from '@/utils/errors';
import { PageHeading } from '@/components/ui/Panel';
import { DeviceArt } from '@/components/devices/DeviceArt';

export function PairingPage() {
  const [params] = useSearchParams();
  const category = params.get('category') || 'light';
  const initialName = params.get('name') || '米家智能吸顶灯';
  const { rooms, currentHomeId, demo, refresh, navigate, notify, setSelectedDid } =
    useMiHomeContext();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(initialName);
  const [ssid, setSsid] = useState('');
  const [room, setRoom] = useState(rooms[0] || '');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [did, setDid] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (step !== 2) return;
    const timer = setInterval(
      () =>
        setProgress((value) => {
          if (value >= 100) {
            clearInterval(timer);
            return 100;
          }
          return value + 20;
        }),
      300,
    );
    return () => clearInterval(timer);
  }, [step]);
  const finish = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const id = addDemoDevice(currentHomeId, name, room, category);
      setDid(id);
      await refresh(true);
      setStep(4);
      notify('设备已加入本地体验家庭');
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <PageHeading title="设备配网" description="简单几步，让新的智能伙伴加入你的家。" />
      <div className="pairing-steps">
        {['准备设备', '连接网络', '正在连接', '设置设备'].map((label, i) => (
          <div key={label} className={step >= i ? 'active' : ''}>
            <span>{step > i ? <Check size={15} /> : i + 1}</span>
            {label}
            {i < 3 && <i />}
          </div>
        ))}
      </div>
      <section className="panel pairing-workspace">
        <div className="pairing-product">
          <DeviceArt device={{ category, name, model: '' }} large />
          <h2>{name}</h2>
          <span className="state-tag">{demo ? '本地配网体验' : '真实设备请使用米家 App'}</span>
          <p>连接新的设备，也连接新的生活可能。</p>
        </div>
        <div className="pairing-content">
          {step === 0 ? (
            <>
              <span className="metric-icon mint">
                <Radio size={25} />
              </span>
              <h2>让设备进入配网模式</h2>
              <p>接通设备电源，按设备说明长按重置键，直到指示灯闪烁。</p>
              <div className="pairing-note">
                <Wifi size={18} />
                <span>
                  {demo
                    ? '接下来的步骤只模拟配网，不会访问网络凭据或连接真实硬件。'
                    : '当前桌面端尚不支持真实设备配网。请在米家 App 中添加后刷新设备列表。'}
                </span>
              </div>
              <button
                className="button primary"
                disabled={!demo || !currentHomeId}
                onClick={() => setStep(1)}
              >
                指示灯已闪烁，下一步
              </button>
            </>
          ) : step === 1 ? (
            <>
              <h2>选择家庭网络</h2>
              <p>填写一个网络名称，体验设备连接过程。</p>
              <label className="field-label">
                <span>Wi-Fi 名称</span>
                <input
                  value={ssid}
                  onChange={(e) => setSsid(e.target.value)}
                  placeholder="例如：MyHome_2.4G"
                  maxLength={32}
                />
              </label>
              <div className="pairing-note">
                <Wifi size={17} />
                <span>本地体验无需输入 Wi-Fi 密码，也不会发起真实联网。</span>
              </div>
              <div className="pairing-actions">
                <button className="button secondary" onClick={() => setStep(0)}>
                  <ChevronLeft size={15} />
                  上一步
                </button>
                <button
                  className="button primary"
                  disabled={!ssid.trim()}
                  onClick={() => {
                    setProgress(0);
                    setStep(2);
                  }}
                >
                  连接设备
                </button>
              </div>
            </>
          ) : step === 2 ? (
            <>
              <div className="pairing-orbit">
                <Radio size={38} />
                <span />
              </div>
              <h2>{progress === 100 ? '设备已连接' : '正在连接设备…'}</h2>
              <p>{progress === 100 ? '现在为它选择一个熟悉的房间。' : `正在模拟连接到 ${ssid}`}</p>
              <div className="progress-track">
                <i style={{ width: `${progress}%` }} />
              </div>
              <span className="pairing-percent">{progress}%</span>
              <button
                className="button primary"
                disabled={progress < 100}
                onClick={() => setStep(3)}
              >
                设置设备
              </button>
            </>
          ) : step === 3 ? (
            <>
              <h2>欢迎新伙伴，给它一个名字</h2>
              <label className="field-label">
                <span>设备名称</span>
                <input maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label className="field-label">
                <span>所属房间</span>
                <Select value={room} onValueChange={(value) => setRoom(value)}>
                  {rooms.map((value) => (
                    <SelectOption value={value} key={value}>
                      {value}
                    </SelectOption>
                  ))}
                </Select>
              </label>
              {error && (
                <div role="alert" className="field-error">
                  {error}
                </div>
              )}
              <button
                className="button primary"
                disabled={!name.trim() || !room || saving}
                onClick={() => void finish()}
              >
                {saving && <LoaderCircle size={16} className="spin" />}完成添加
              </button>
            </>
          ) : (
            <>
              <CheckCircle2 size={58} className="pairing-success" strokeWidth={1.2} />
              <h2>已经准备好，和家一起生活</h2>
              <p>
                {name}已加入{room}，本次体验有效。
              </p>
              <button
                className="button primary"
                onClick={() => {
                  navigate('devices');
                  setSelectedDid(did);
                }}
              >
                开始使用设备
              </button>
              <button className="text-link" onClick={() => navigate('add-device')}>
                <RotateCw size={15} />
                继续添加其他设备
              </button>
            </>
          )}
        </div>
      </section>
    </>
  );
}
