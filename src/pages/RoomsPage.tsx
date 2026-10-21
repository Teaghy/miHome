import { useState } from 'react';
import { BedDouble, CookingPot, DoorOpen, LampDesk, Pencil, Sofa } from 'lucide-react';
import { useMiHomeContext } from '@/app/MiHomeContext';
import { AddButton, PageHeading } from '@/components/ui/Panel';
import { Modal } from '@/components/ui';
import { updateDemoRoom } from '@/api/mihome';
import { errorMessage } from '@/utils/errors';

const icons = [Sofa, BedDouble, LampDesk, CookingPot, DoorOpen];
export function RoomsPage() {
  const { rooms, homeDevices, currentHomeId, demo, notify, refresh, navigate, setRoom } =
    useMiHomeContext();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [previous, setPrevious] = useState<string | null>(null);
  const save = async () => {
    try {
      updateDemoRoom(currentHomeId, previous, name.trim());
      await refresh(true);
      setOpen(false);
      notify(previous ? '房间名称已更新' : '房间已添加');
    } catch (error) {
      notify(errorMessage(error), true);
    }
  };
  return (
    <>
      <PageHeading
        title="房间管理"
        description="给每一处空间，一个熟悉的名字。"
        action={
          <AddButton
            disabled={!demo || !currentHomeId}
            onClick={() => {
              setPrevious(null);
              setName('');
              setOpen(true);
            }}
          >
            添加房间
          </AddButton>
        }
      />
      <div className="room-management-grid">
        {rooms.map((room, index) => {
          const Icon = icons[index % icons.length];
          const devices = homeDevices.filter((d) => d.room === room);
          return (
            <section className="panel room-management-card" key={room}>
              <div className={`room-illustration room-style-${index % 4}`}>
                <Icon size={65} strokeWidth={0.85} />
                <span>{String(index + 1).padStart(2, '0')}</span>
              </div>
              <div className="room-management-copy">
                <div>
                  <h2>{room}</h2>
                  <button
                    className="icon-button"
                    aria-label={`编辑${room}`}
                    disabled={!demo}
                    onClick={() => {
                      setPrevious(room);
                      setName(room);
                      setOpen(true);
                    }}
                  >
                    <Pencil size={16} />
                  </button>
                </div>
                <p>
                  {devices.length} 台设备 · {devices.filter((d) => d.online).length} 台在线
                </p>
                <div className="room-device-dots">
                  {devices.slice(0, 8).map((d) => (
                    <i className={d.online ? 'online' : ''} key={d.did} />
                  ))}
                </div>
                <button
                  className="text-link"
                  onClick={() => {
                    navigate('devices');
                    setRoom(room);
                  }}
                >
                  查看房间设备 →
                </button>
              </div>
            </section>
          );
        })}
      </div>
      {!demo && (
        <p className="data-footnote">
          真实家庭的房间编辑请在米家 App 中完成；这里展示已同步的房间与设备。
        </p>
      )}
      <Modal
        open={open}
        onOpenChange={setOpen}
        title={previous ? '编辑房间' : '添加房间'}
        description="房间将保存在本次本地体验中。"
        footer={
          <>
            <button className="button secondary" onClick={() => setOpen(false)}>
              取消
            </button>
            <button className="button primary" disabled={!name.trim()} onClick={() => void save()}>
              保存房间
            </button>
          </>
        }
      >
        <label className="field-label">
          <span>房间名称</span>
          <input
            maxLength={20}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：阳台"
          />
        </label>
      </Modal>
    </>
  );
}
