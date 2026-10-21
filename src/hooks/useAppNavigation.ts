import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Page } from '@/types';

const pages: Page[] = [
  'home',
  'devices',
  'device-detail',
  'scenes',
  'automation',
  'cameras',
  'security',
  'environment',
  'energy',
  'messages',
  'family',
  'rooms',
  'add-device',
  'pairing',
  'profile',
  'settings',
  'favorites',
  'activity',
];

export function useAppNavigation() {
  const { pathname } = useLocation();
  const routerNavigate = useNavigate();
  const candidate = pathname.slice(1) as Page;
  const page: Page = pages.includes(candidate) ? candidate : 'home';
  const setPage = useCallback(
    (next: Page) => {
      void routerNavigate(`/${next}`);
    },
    [routerNavigate],
  );
  return { page, setPage };
}
