import { DoorClosed, Eye, Flame, ShieldCheck } from 'lucide-react';
import { useHousehold } from '@/app/HouseholdContext';
import { useMiHomeContext } from '@/app/MiHomeContext';
import { Panel, PanelLink, ServiceEmpty } from '@/components/ui/Panel';

export function SecurityPanel() {
  const { household } = useHousehold();
  const { navigate } = useMiHomeContext();
  return (
    <Panel
      title="家庭安防"
      action={<PanelLink label="安防中心" onClick={() => navigate('security')} />}
      className="security-panel"
    >
      {household ? (
        <>
          <div className="security-summary">
            <span className="shield-halo">
              <ShieldCheck size={26} strokeWidth={1.4} />
            </span>
            <div>
              <strong>家的安全，时刻在心</strong>
              <p>
                {household.armed ? '离家布防已开启，守护每一个角落' : '设备运行正常，今天也安心'}
              </p>
            </div>
            <span className="state-tag">{household.armed ? '已布防' : '未布防'}</span>
          </div>
          <div className="security-status">
            <span>
              <Eye size={15} />
              人形侦测<b>无异常</b>
            </span>
            <span>
              <DoorClosed size={15} />
              门窗状态<b>全部关闭</b>
            </span>
            <span>
              <Flame size={15} />
              烟雾报警<b>正常</b>
            </span>
          </div>
        </>
      ) : (
        <ServiceEmpty title="等待安防设备接入" />
      )}
    </Panel>
  );
}
