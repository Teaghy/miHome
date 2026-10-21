import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/#/devices');
  await expect(page.getByText('你正在探索演示家庭')).toBeVisible();
});

test('select uses a themed popup with keyboard selection and focus return', async ({ page }) => {
  const select = page.getByRole('combobox', { name: '设备状态', exact: true });
  await expect(select).toHaveJSProperty('tagName', 'BUTTON');
  await select.focus();
  await select.press('ArrowDown');
  await expect(page.getByRole('listbox')).toBeVisible();
  await expect(page.getByRole('option', { name: '全部状态', exact: true })).toBeFocused();
  await page.keyboard.press('End');
  await expect(page.getByRole('option', { name: '异常', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(select).toContainText('异常');
  await expect(page.locator('.device-card')).toHaveCount(1);
  await expect(select).toBeFocused();
  await select.click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await expect(select).toBeFocused();
});

test('checkbox supports label clicks and Space without native chrome', async ({ page }) => {
  const checkbox = page.getByRole('checkbox', { name: '仅在线' });
  await expect(checkbox).toHaveJSProperty('tagName', 'BUTTON');
  await page.getByText('仅在线', { exact: true }).click();
  await expect(checkbox).toBeChecked();
  await expect(page.locator('.device-card')).toHaveCount(11);
  await checkbox.focus();
  await checkbox.press('Space');
  await expect(checkbox).not.toBeChecked();
  await expect(page.locator('.device-card')).toHaveCount(12);
});

test('search has one focus treatment on its container', async ({ page }) => {
  const search = page.getByRole('searchbox', { name: '搜索设备或场景' });
  await search.focus();
  await expect(search).toHaveCSS('outline-style', 'none');
  await expect(search).toHaveCSS('box-shadow', 'none');
  await expect(page.locator('.search-box')).not.toHaveCSS('box-shadow', 'none');
});

test('dialog select preserves empty choices and Escape only closes the popup', async ({ page }) => {
  await page.getByRole('button', { name: '偏好设置', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '偏好设置' });
  const select = dialog.getByRole('combobox', { name: '默认语音音箱' });
  await expect(select).toHaveJSProperty('tagName', 'BUTTON');
  await select.click();
  await page.getByRole('option', { name: '小爱音箱 Pro', exact: true }).click();
  await select.click();
  await page.getByRole('option', { name: '每次选择', exact: true }).click();
  await select.click();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();
  await expect(select).toBeFocused();
  await dialog.getByRole('button', { name: '保存设置', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: '偏好设置', exact: true }).click();
  await expect(select).toContainText('每次选择');
});

for (const theme of ['light', 'dark']) {
  test(`form controls fit all supported viewports in ${theme} theme`, async ({
    page,
  }, testInfo) => {
    await page.getByRole('button', { name: '偏好设置', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: '偏好设置' });
    if (theme === 'dark') await dialog.getByRole('button', { name: '深色', exact: true }).click();
    await dialog.getByRole('button', { name: '保存设置', exact: true }).click();
    await page.goto('/#/home');
    for (const [width, height] of [
      [1920, 1080],
      [1366, 768],
      [2560, 1440],
      [3840, 2160],
      [390, 844],
    ]) {
      await page.setViewportSize({ width, height });
      await page.getByRole('combobox', { name: '设备排序' }).click();
      const popup = page.getByRole('listbox');
      await expect(popup).toBeVisible();
      const bounds = await popup.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.y).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(height);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({ path: testInfo.outputPath(`${theme}-${width}x${height}.png`) });
      await page.getByRole('option', { name: '在线优先', exact: true }).click();
      await expect(page.getByRole('combobox', { name: '设备排序' })).toContainText('在线优先');
    }
  });
}

test('dialog select stays usable with 200 percent display scale', async ({ page }) => {
  await page.getByRole('button', { name: '偏好设置', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '偏好设置' });
  await dialog.getByRole('combobox', { name: '界面缩放' }).click();
  await page.getByRole('option', { name: '200%', exact: true }).click();
  await dialog.getByRole('button', { name: '保存设置', exact: true }).click();
  await page.getByRole('button', { name: '偏好设置', exact: true }).click();
  await dialog.getByRole('combobox', { name: '自动刷新间隔' }).click();
  await expect(page.getByRole('listbox')).toBeInViewport();
  await page.getByRole('option', { name: '手动刷新', exact: true }).click();
  await expect(dialog.getByRole('combobox', { name: '自动刷新间隔' })).toContainText('手动刷新');
});
