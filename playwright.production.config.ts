import { defineConfig } from '@playwright/test';
import base from './playwright.config';
const port = process.env.MIHOME_E2E_PORT || '1420';

// Never reuse a development server here: this suite verifies the generated
// production bundle that is embedded into the desktop application.
export default defineConfig({
  ...base,
  outputDir: 'test-results/production',
  webServer: {
    command: `npx vite preview --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 30000,
  },
});
