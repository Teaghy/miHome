import { expect, test } from '@playwright/test';

test('device type, room and state filters compose without losing the room tabs', async ({
  page,
}) => {
  await page.goto('/#/devices');
  await page.locator('.room-chips').getByRole('button', { name: '厨房', exact: true }).click();
  await page.getByRole('combobox', { name: '设备类型', exact: true }).click();
  await page.getByRole('option', { name: '热水器', exact: true }).click();
  await page.getByRole('combobox', { name: '设备状态', exact: true }).click();
  await page.getByRole('option', { name: '异常', exact: true }).click();
  await expect(page.locator('.device-card')).toHaveCount(1);
  await expect(page.locator('.device-card')).toContainText('米家电热水器');
  await expect(page.locator('.room-chips')).toBeVisible();
  await page.getByRole('combobox', { name: '设备状态', exact: true }).click();
  await page.getByRole('option', { name: '离线', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '没有符合条件的设备', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: '清除筛选', exact: true }).click();
  await expect(page.locator('.device-card')).toHaveCount(12);
});

test('home includes every required module at the desktop baseline', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/#/home');
  await expect(page.getByRole('region', { name: '家庭 Hero' })).toBeVisible();
  await expect(page.getByRole('region', { name: '天气', exact: true })).toBeVisible();
  for (const name of ['我的设备', '家庭安防', '摄像头监控', '能耗统计', '环境监测', '消息中心']) {
    await expect(page.getByRole('heading', { name: new RegExp(`^${name}`) })).toBeVisible();
  }
  await expect(page.getByRole('region', { name: '快捷场景' })).toBeVisible();
  await expect(page.locator('.room-chips')).toBeVisible();
  await expect(page.locator('.device-card')).toHaveCount(8);
  await expect(page.locator('.device-card[data-state="offline"]')).toHaveCount(1);
  await expect(page.locator('.device-card[data-state="fault"]')).toHaveCount(1);
  expect(
    await page
      .locator('.dashboard-bottom')
      .evaluate((element) => element.getBoundingClientRect().bottom),
  ).toBeLessThanOrEqual(1080);
});

test('home fits all requested display sizes without horizontal overflow', async ({ page }) => {
  await page.goto('/#/home');
  await expect(page.locator('.home-device-grid')).toBeVisible();
  for (const [width, height] of [
    [1366, 768],
    [1920, 1080],
    [2560, 1440],
    [3840, 2160],
  ]) {
    await page.setViewportSize({ width, height });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `${width}×${height}`,
    ).toBe(true);
    await expect(page.getByRole('heading', { name: /^我的设备/ })).toBeVisible();
    expect(
      await page
        .locator('.app-navigation')
        .evaluate((element) => getComputedStyle(element).backgroundColor),
    ).toBe('rgb(255, 255, 255)');
  }
});

test('all product pages and the five device detail variants are navigable', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1366, height: 768 });
  const routes = [
    'devices',
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
    'activity',
  ];
  for (const route of routes) {
    await page.goto(`/#/${route}`);
    await expect(page.locator(`main[data-page="${route}"] h1`).first()).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      route,
    ).toBe(true);
  }
  for (const id of ['demo-ac', 'demo-light', 'demo-vacuum', 'demo-camera', 'demo-lock']) {
    await page.goto(`/#/device-detail?device=${id}`);
    await expect(page.getByRole('heading', { name: '参数设置', exact: true })).toBeVisible();
    await expect(
      page.locator(`.device-detail-grid[data-device-id="${id}"] .property-row`).first(),
    ).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), id).toBe(
      true,
    );
  }
  expect(errors).toEqual([]);
});

test('automation rules are editable and persist locally', async ({ page }) => {
  await page.goto('/#/automation');
  await page.getByRole('button', { name: '创建自动化', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '创建自动化', exact: true });
  await dialog.getByRole('textbox', { name: '规则名称' }).fill('午后的舒适时光');
  await dialog.getByRole('button', { name: '保存规则' }).click();
  const toggle = page.getByRole('switch', { name: '启用午后的舒适时光', exact: true });
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await toggle.click();
  await page.reload();
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
});

test('message read state and camera privacy respond to user actions', async ({ page }) => {
  await page.goto('/#/messages');
  await page.getByRole('button', { name: '全部已读', exact: true }).click();
  await expect(page.locator('.full-message.unread')).toHaveCount(0);
  await page.goto('/#/cameras');
  await page.getByRole('switch', { name: '客厅摄像机隐私模式', exact: true }).click();
  await expect(page.locator('.camera-tile').first().getByText('镜头已休眠')).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('switch', { name: '客厅摄像机隐私模式', exact: true }),
  ).toHaveAttribute('aria-checked', 'true');
});

test('room edits update the actual local device placement', async ({ page }) => {
  await page.goto('/#/rooms');
  await page.getByRole('button', { name: '编辑卧室', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '编辑房间', exact: true });
  await dialog.getByRole('textbox', { name: '房间名称', exact: true }).fill('主卧');
  await dialog.getByRole('button', { name: '保存房间', exact: true }).click();
  await expect(page.getByRole('heading', { name: '主卧', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '查看房间设备 →', exact: true }).nth(1).click();
  await expect(page.locator('.device-card')).toHaveCount(2);
  await expect(page.locator('.device-card').first()).toContainText('主卧');
});

test('pairing completes a local device flow without collecting credentials', async ({ page }) => {
  await page.goto('/#/pairing?category=light&name=新阅读灯');
  await page.getByRole('button', { name: '指示灯已闪烁，下一步', exact: true }).click();
  await page.getByRole('textbox', { name: 'Wi-Fi 名称', exact: true }).fill('MyHome_2.4G');
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  await page.getByRole('button', { name: '连接设备', exact: true }).click();
  await expect(page.getByRole('button', { name: '设置设备', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '设置设备', exact: true }).click();
  await page.getByRole('button', { name: '完成添加', exact: true }).click();
  await page.getByRole('button', { name: '开始使用设备', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '设备详情', exact: true })).toContainText(
    '新阅读灯',
  );
});
