import { createContext, useContext } from 'react';
import type { MiHomeController } from '@/hooks/useMiHome';

export const MiHomeContext = createContext<MiHomeController | null>(null);

export function useMiHomeContext() {
  const controller = useContext(MiHomeContext);
  if (!controller) throw new Error('米家页面需要放在 MiHomeContext 中');
  return controller;
}
