import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const browser = await chromium.launch();
const port = process.env.MIHOME_E2E_PORT || '1420';
const origin = `http://127.0.0.1:${port}`;
const errors = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    colorScheme: 'light',
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await mkdir('docs/images', { recursive: true });
  await mkdir('docs/images/pages', { recursive: true });
  const open = async (route) => {
    await page.goto(`${origin}/#/${route}`);
    await page.getByText('你正在探索演示家庭', { exact: true }).waitFor();
    await page
      .locator(`main[data-page="${route.split('?')[0]}"] h1`)
      .first()
      .waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.locator('.initial-loading').waitFor({ state: 'hidden' });
  };
  for (const [width, height] of [
    [1366, 768],
    [1920, 1080],
    [2560, 1440],
    [3840, 2160],
  ]) {
    await page.setViewportSize({ width, height });
    await open('home');
    await page.locator('.home-device-grid').waitFor();
    await page.screenshot({
      path: `docs/images/home-${width}x${height}.png`,
      animations: 'disabled',
    });
    if (width === 1920)
      await page.screenshot({ path: 'docs/images/preview.png', animations: 'disabled' });
  }
  await page.setViewportSize({ width: 1920, height: 1080 });
  for (const route of [
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
    'favorites',
    'activity',
  ]) {
    await open(route);
    await page.screenshot({
      path: `docs/images/pages/${route}.png`,
      fullPage: true,
      animations: 'disabled',
    });
  }
  for (const id of ['ac', 'light', 'vacuum', 'camera', 'lock']) {
    await open(`device-detail?device=demo-${id}`);
    await page.locator('.detail-properties .property-row').first().waitFor();
    await page.screenshot({
      path: `docs/images/pages/device-${id}.png`,
      fullPage: true,
      animations: 'disabled',
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await open('home');
  await page.screenshot({ path: 'docs/images/preview-mobile.png', animations: 'disabled' });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await open('settings');
  await page.getByRole('button', { name: '深色', exact: true }).click();
  await page.getByRole('button', { name: '保存设置', exact: true }).click();
  await open('home');
  await page.screenshot({ path: 'docs/images/preview-dark.png', animations: 'disabled' });
  console.log(
    JSON.stringify({
      errors,
      resolutions: 4,
      pages: 21,
      overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    }),
  );
  if (errors.length) process.exitCode = 1;
} finally {
  await browser.close();
}
