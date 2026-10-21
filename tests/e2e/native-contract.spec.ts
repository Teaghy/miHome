import { expect, test, type Page } from '@playwright/test';
import { createDemoDetail, createDemoSnapshot } from '../../src/mocks/devices';
import { defaultSettings } from '../../src/utils/device';

async function mockNative(page: Page, authenticated: boolean, unknownPower = false) {
  const snapshot = createDemoSnapshot();
  const details = Object.fromEntries(
    snapshot.devices.map((device) => [device.did, createDemoDetail(device)]),
  );
  if (unknownPower) {
    details['demo-light'].properties[0].value = null;
    details['demo-light'].properties[0].error = '读取失败';
  }
  await page.addInitScript(
    ({ authenticated, snapshot, details, settings }) => {
      const calls: { command: string; args: Record<string, unknown> }[] = [];
      const target = window as unknown as {
        __TAURI_INTERNALS__: unknown;
        __nativeCalls: typeof calls;
      };
      target.__nativeCalls = calls;
      let rejectLogin: ((error: Error) => void) | undefined;
      target.__TAURI_INTERNALS__ = {
        invoke: async (command: string, args: Record<string, unknown> = {}) => {
          calls.push({ command, args });
          switch (command) {
            case 'get_session':
              return {
                authenticated,
                userId: authenticated ? 'test-only-user' : null,
                region: 'cn',
              };
            case 'get_settings':
              return settings;
            case 'get_cached_snapshot':
              return authenticated ? snapshot : null;
            case 'refresh_devices':
              return snapshot;
            case 'get_device_detail':
              return details[String(args.did)];
            case 'get_app_info':
              return { version: '0.1.0', dataDir: 'test-only', platform: 'windows' };
            case 'save_settings':
              return args.settings;
            case 'begin_login':
              return {
                ticketId: 'test-ticket',
                loginUrl: 'https://account.xiaomi.com/test-only',
                expiresIn: 120,
              };
            case 'wait_login':
              return new Promise((_, reject) => {
                rejectLogin = reject;
              });
            case 'cancel_login':
              rejectLogin?.(new Error('登录已取消'));
              return null;
            case 'set_property':
              throw new Error('设备拒绝写入（测试注入）');
            default:
              throw new Error(`Unexpected command: ${command}`);
          }
        },
      };
    },
    { authenticated, snapshot, details, settings: defaultSettings },
  );
}
async function nativeCalls(page: Page) {
  return page.evaluate(
    () =>
      (window as unknown as { __nativeCalls: { command: string; args: Record<string, unknown> }[] })
        .__nativeCalls,
  );
}

test('unauthenticated desktop shows no demo household and never starts login automatically', async ({
  page,
}) => {
  await mockNative(page, false);
  await page.goto('/');
  await expect(page.getByRole('button', { name: '登录小米账号', exact: true })).toBeVisible();
  await expect(page.locator('.device-card')).toHaveCount(0);
  await expect(page.getByText('你正在探索演示家庭')).not.toBeVisible();
  expect(
    (await nativeCalls(page)).some(
      (c) => c.command === 'begin_login' || c.command === 'refresh_devices',
    ),
  ).toBe(false);
  await page.getByRole('button', { name: '登录小米账号', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '把你的家，连接进来' });
  await expect(dialog.getByText(/等待扫码/)).toBeVisible();
  await expect(dialog.locator('svg title')).toHaveText('小米账号登录二维码');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect
    .poll(async () =>
      (await nativeCalls(page)).some(
        (c) => c.command === 'cancel_login' && c.args.ticketId === 'test-ticket',
      ),
    )
    .toBe(true);
  await expect(page.getByRole('button', { name: '登录小米账号', exact: true })).toBeVisible();
});

test('rejected native writes stay unchanged and are never recorded as success', async ({
  page,
}) => {
  await mockNative(page, true);
  await page.goto('/');
  await page.getByRole('button', { name: '关闭米家智能吸顶灯', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: '设备拒绝写入' })).toBeVisible();
  await expect(page.getByRole('button', { name: '关闭米家智能吸顶灯', exact: true })).toBeEnabled();
  await expect(
    page.getByRole('button', { name: '开启米家智能吸顶灯', exact: true }),
  ).not.toBeVisible();
  await page
    .getByRole('navigation', { name: '主导航' })
    .getByRole('button', { name: '最近活动' })
    .click();
  await expect(page.locator('.activity-list')).toContainText('操作未完成');
  await expect(page.locator('.activity-list')).not.toContainText('操作已确认');
});

test('unknown real power states never cause guessed writes', async ({ page }) => {
  await mockNative(page, true, true);
  await page.goto('/');
  await page.getByRole('button', { name: '关闭米家智能吸顶灯', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '设备详情' })).toBeVisible();
  expect((await nativeCalls(page)).some((c) => c.command === 'set_property')).toBe(false);
});

test('desktop demo is opt-in and does not send simulated writes to native commands', async ({
  page,
}) => {
  await mockNative(page, false);
  await page.goto('/');
  await page.getByRole('button', { name: '先体验演示家庭', exact: true }).click();
  await expect(page.getByText('你正在探索演示家庭')).toBeVisible();
  await page.getByRole('button', { name: '关闭米家智能吸顶灯', exact: true }).click();
  await expect(page.getByRole('button', { name: '开启米家智能吸顶灯', exact: true })).toBeVisible();
  expect(
    (await nativeCalls(page)).some(
      (c) =>
        c.command === 'set_property' ||
        c.command === 'refresh_devices' ||
        c.command === 'save_settings',
    ),
  ).toBe(false);
});
