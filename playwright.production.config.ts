import { defineConfig } from '@playwright/test';
import base from './playwright.config';

// Never reuse a development server here: this suite verifies the generated
// production bundle that is embedded into the desktop application.
export default defineConfig({
  ...base,
  webServer: {
    command: 'npm run preview',
    url: 'http://127.0.0.1:1420',
    reuseExistingServer: false,
    timeout: 30000,
  },
});
