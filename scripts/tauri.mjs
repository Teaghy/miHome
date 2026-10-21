import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createToolEnvironment } from './environment.mjs';
const env = createToolEnvironment();
const result = spawnSync(
  process.execPath,
  [resolve('node_modules/@tauri-apps/cli/tauri.js'), ...process.argv.slice(2)],
  { stdio: 'inherit', env },
);
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
