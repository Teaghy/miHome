import { createContext, useContext } from 'react';
import type { Household } from '@/types/household';

export interface HouseholdController {
  household: Household | null;
  update: (change: (current: Household) => Household) => boolean;
  unread: number;
}
export const HouseholdContext = createContext<HouseholdController | null>(null);
export function useHousehold() {
  const value = useContext(HouseholdContext);
  if (!value) throw new Error('家庭页面需要 HouseholdProvider');
  return value;
}
