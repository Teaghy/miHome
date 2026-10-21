import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1040 },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:1420');
  await page.getByText('你正在探索演示家庭').waitFor();
  await page.locator('.device-card').first().waitFor();
  await mkdir('docs/images', { recursive: true });
  await page.screenshot({ path: 'docs/images/preview.png', fullPage: true });
  console.log(
    JSON.stringify({
      errors,
      devices: await page.locator('.device-card').count(),
      width: await page.evaluate(() => document.documentElement.scrollWidth),
    }),
  );
} finally {
  await browser.close();
}
