import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('你正在探索演示家庭')).toBeVisible();
});

test('dashboard is explicit about demo data and has no desktop overflow', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await expect(page.locator('.device-card')).toHaveCount(9);
  await expect(page.getByRole('heading', { name: '我的设备' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1000, height: 720 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('combines search, rooms, home switching and online filtering', async ({ page }) => {
  const search = page.getByRole('searchbox', { name: '搜索设备或场景' });
  await search.fill('净化');
  await expect(page.locator('.device-card')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: '米家空气净化器 4' })).toBeVisible();
  await search.fill('不存在的设备');
  await expect(page.locator('.device-card')).toHaveCount(0);
  await search.clear();
  await page.getByRole('checkbox', { name: '仅在线' }).check();
  await expect(page.locator('.device-card')).toHaveCount(8);
  await page.getByRole('checkbox', { name: '仅在线' }).uncheck();
  await page.locator('.room-chips').getByRole('button', { name: '卧室', exact: true }).click();
  await expect(page.locator('.device-card')).toHaveCount(2);
  await page.getByRole('combobox', { name: '选择家庭' }).selectOption('demo-studio');
  await expect(page.locator('.device-card')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: '工作室阅读灯' })).toBeVisible();
});

test('power controls acknowledge writes, details expose spec-driven keyboard controls', async ({
  page,
}) => {
  await page.getByRole('button', { name: '关闭米家智能吸顶灯', exact: true }).click();
  await expect(page.getByRole('button', { name: '开启米家智能吸顶灯', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '查看米家智能吸顶灯详情', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '设备详情' });
  await expect(dialog.getByRole('switch', { name: '电源开关' })).toHaveAttribute(
    'aria-checked',
    'false',
  );
  const brightness = dialog.getByRole('slider', { name: '亮度', exact: true });
  await expect(brightness).toHaveValue('75');
  await brightness.focus();
  await brightness.press('ArrowRight');
  await expect(brightness).toHaveValue('76');
  await dialog.getByRole('switch', { name: '电源开关' }).click();
  await expect(dialog.getByRole('switch', { name: '电源开关' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('button', { name: '关闭米家智能吸顶灯', exact: true })).toBeVisible();
});

test('offline devices cannot be powered and show a read-only detail state', async ({ page }) => {
  await expect(page.getByRole('button', { name: '开启米家智能插座', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '查看米家智能插座详情', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '设备详情' });
  await expect(
    dialog.getByText('设备当前离线，已停用所有写入操作。状态可能来自缓存。'),
  ).toBeVisible();
  await expect(dialog.getByRole('switch', { name: '电源开关' })).toBeDisabled();
});

test('favorites persist across reload without mutating real settings', async ({ page }) => {
  await page.getByRole('button', { name: '收藏米家智能吸顶灯', exact: true }).click();
  await expect(
    page.getByRole('button', { name: '取消收藏米家智能吸顶灯', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('navigation', { name: '主导航' })
    .getByRole('button', { name: /收藏设备/ })
    .click();
  await expect(page.locator('.device-card')).toHaveCount(1);
  await page.reload();
  await expect(
    page.getByRole('button', { name: '取消收藏米家智能吸顶灯', exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('mihome.demo.settings.v1')!).favorites,
    ),
  ).toEqual(['demo-light']);
});

test('scene actions require confirmation and record only executed operations', async ({ page }) => {
  await page
    .locator('.quick-scenes')
    .getByRole('button', { name: /安心离家/ })
    .click();
  const dialog = page.getByRole('dialog', { name: '运行「安心离家」？' });
  await dialog.getByRole('button', { name: '取消', exact: true }).click();
  await expect(page.getByRole('button', { name: '关闭米家智能吸顶灯', exact: true })).toBeVisible();
  await page
    .locator('.quick-scenes')
    .getByRole('button', { name: /安心离家/ })
    .click();
  await dialog.getByRole('button', { name: '确认执行' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('button', { name: '开启米家智能吸顶灯', exact: true })).toBeVisible();
  await page
    .getByRole('navigation', { name: '主导航' })
    .getByRole('button', { name: '最近活动' })
    .click();
  await expect(page.locator('.activity-list li')).toHaveCount(1);
  await expect(page.locator('.activity-list')).toContainText('[演示]');
});

test('settings persist theme, manual refresh and hiding unsupported devices', async ({ page }) => {
  await page.getByRole('button', { name: /偏好设置/ }).click();
  const dialog = page.getByRole('dialog', { name: '偏好设置' });
  await dialog.getByRole('button', { name: '深色', exact: true }).click();
  await dialog.getByRole('combobox', { name: '自动刷新间隔' }).selectOption('0');
  await dialog.getByRole('switch', { name: '隐藏不支持的设备' }).click();
  await dialog.getByRole('button', { name: '保存设置' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('.device-card')).toHaveCount(8);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: /偏好设置/ }).click();
  await expect(dialog.getByRole('combobox', { name: '自动刷新间隔' })).toHaveValue('0');
});

test('voice requires a target, text and explicit send confirmation', async ({ page }) => {
  await page.getByRole('button', { name: /小爱语音/ }).click();
  const dialog = page.getByRole('dialog', { name: '和小爱说句话' });
  await expect(dialog.getByRole('button', { name: '下一步' })).toBeDisabled();
  await dialog.getByPlaceholder('例如：把客厅的灯光调到 50%').fill('打开客厅灯');
  await dialog.getByRole('switch', { name: '静默执行' }).click();
  await dialog.getByRole('button', { name: '下一步' }).click();
  await expect(dialog.getByText('即将发送至 小爱音箱 Pro')).toBeVisible();
  await expect(dialog.getByText('静默执行，不播报回复')).toBeVisible();
  await dialog.getByRole('button', { name: '确认发送' }).click();
  await expect(dialog).not.toBeVisible();
});

test('device actions require a second confirmation and update only after execution', async ({
  page,
}) => {
  await page.getByRole('button', { name: '查看米家扫拖机器人详情', exact: true }).first().click();
  const sheet = page.getByRole('dialog', { name: '设备详情' });
  await expect(sheet.getByText('剩余电量', { exact: true })).toBeVisible();
  await sheet
    .locator('.action-control')
    .first()
    .getByRole('button', { name: '执行', exact: true })
    .click();
  const confirmation = page.getByRole('dialog', { name: '执行「开始清扫」？' });
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole('button', { name: '取消', exact: true }).click();
  await expect(sheet).toBeVisible();
  await sheet
    .locator('.action-control')
    .first()
    .getByRole('button', { name: '执行', exact: true })
    .click();
  await confirmation.getByRole('button', { name: '确认执行' }).click();
  await expect(confirmation).not.toBeVisible();
  await expect(sheet).not.toBeVisible();
  await expect(page.locator('.device-card').filter({ hasText: '米家扫拖机器人' })).toContainText(
    '清扫中',
  );
});

test('enumeration controls preserve typed MIoT values', async ({ page }) => {
  await page.getByRole('button', { name: '查看米家互联网空调详情', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: '设备详情' });
  const mode = sheet.getByRole('combobox', { name: '运行模式', exact: true });
  await expect(mode).toHaveValue('1');
  await mode.selectOption({ label: '制热' });
  await expect(mode).toHaveValue('2');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '查看米家互联网空调详情', exact: true }).click();
  await expect(mode).toHaveValue('2');
});

test('browser login cannot pretend to authenticate and supports keyboard dismissal', async ({
  page,
}) => {
  await page.getByRole('button', { name: '连接我的家庭', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '把你的家，连接进来' });
  await expect(dialog.getByText(/真实账号登录仅在 Tauri 桌面版中可用/)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(page.getByText('你正在探索演示家庭')).toBeVisible();
});
