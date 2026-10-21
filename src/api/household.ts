import { createHousehold } from '@/mocks/household';
import type { Household } from '@/types/household';

const key = (homeId: string) => `mihome.demo.household.v1.${homeId}`;

export function loadHousehold(homeId: string, demo: boolean): Household | null {
  if (!demo || !homeId) return null;
  const initial = createHousehold(homeId);
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key(homeId)) || 'null');
    if (!value || typeof value !== 'object' || !('homeId' in value) || value.homeId !== homeId)
      return initial;
    const saved = value as Partial<Household>;
    if (
      !Array.isArray(saved.members) ||
      !saved.members.every(
        (m) => m && typeof m.name === 'string' && ['管理员', '家庭成员', '访客'].includes(m.role),
      ) ||
      !Array.isArray(saved.automations) ||
      !saved.automations.every(
        (a) =>
          a &&
          typeof a.name === 'string' &&
          typeof a.condition === 'string' &&
          typeof a.enabled === 'boolean',
      ) ||
      !Array.isArray(saved.messages) ||
      !saved.messages.every(
        (m) => m && typeof m.title === 'string' && typeof m.read === 'boolean',
      ) ||
      !Array.isArray(saved.cameras) ||
      !saved.cameras.every(
        (c) =>
          c &&
          typeof c.name === 'string' &&
          typeof c.online === 'boolean' &&
          typeof c.privacy === 'boolean',
      ) ||
      typeof saved.armed !== 'boolean' ||
      !saved.notificationPreferences ||
      !['device', 'security', 'system'].every(
        (type) =>
          typeof saved.notificationPreferences?.[
            type as keyof Household['notificationPreferences']
          ] === 'boolean',
      )
    )
      return initial;
    return { ...initial, ...saved };
  } catch {
    return initial;
  }
}

export function saveHousehold(value: Household, demo: boolean): void {
  if (!demo) throw new Error('当前家庭尚未开放此管理接口');
  localStorage.setItem(key(value.homeId), JSON.stringify(value));
}
