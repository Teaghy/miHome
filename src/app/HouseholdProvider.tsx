import { useState, type ReactNode } from 'react';
import { loadHousehold, saveHousehold } from '@/api/household';
import { useMiHomeContext } from './MiHomeContext';
import { HouseholdContext } from './HouseholdContext';
import { errorMessage } from '@/utils/errors';
import type { Household } from '@/types/household';

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { currentHomeId, demo, notify } = useMiHomeContext();
  const [household, setHousehold] = useState(() => loadHousehold(currentHomeId, demo));
  const update = (change: (current: Household) => Household) => {
    if (!household) {
      notify('当前家庭尚未接入此服务', true);
      return false;
    }
    try {
      const next = change(household);
      saveHousehold(next, demo);
      setHousehold(next);
      return true;
    } catch (error) {
      notify(errorMessage(error), true);
      return false;
    }
  };
  return (
    <HouseholdContext
      value={{ household, update, unread: household?.messages.filter((m) => !m.read).length || 0 }}
    >
      {children}
    </HouseholdContext>
  );
}
