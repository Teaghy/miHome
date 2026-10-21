import type { Device } from '@/types';
import { deviceKind } from '@/utils/device-kind';
import { ApplianceGlyph } from './ApplianceGlyph';

export function DeviceArt({
  device,
  large = false,
}: {
  device: Pick<Device, 'category' | 'model' | 'name'>;
  large?: boolean;
}) {
  const kind = deviceKind(device);
  return (
    <div aria-hidden="true" className={`device-art art-${kind} ${large ? 'large' : ''}`}>
      <ApplianceGlyph kind={kind} ceiling={/吸顶|ceiling/.test(device.name)} />
    </div>
  );
}
