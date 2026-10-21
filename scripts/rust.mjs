import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createToolEnvironment } from './environment.mjs';
const env = createToolEnvironment();
const result = spawnSync('cargo', process.argv.slice(2), {
  env,
  stdio: 'inherit',
  cwd: resolve('src-tauri'),
});
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
