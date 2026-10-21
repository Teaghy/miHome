import { existsSync } from 'node:fs';
import { delimiter, dirname, resolve } from 'node:path';

export function normalizePathEnvironment(input, prefixes = []) {
  const env = { ...input };
  // process.env is case-insensitive on Windows, but spreading it into a plain
  // object is not. Avoid dropping Path or passing conflicting PATH/Path keys.
  const keys = Object.keys(env).filter((key) => key.toLowerCase() === 'path');
  const inherited = keys.flatMap((key) => (env[key] ?? '').split(delimiter));
  for (const key of keys) delete env[key];
  env.PATH = [...new Set([...prefixes, ...inherited].filter(Boolean))].join(delimiter);
  return env;
}

export function createToolEnvironment() {
  const env = normalizePathEnvironment(process.env, [dirname(process.execPath)]);
  const localCargo = resolve('.tools/cargo');
  // Optional, isolated Rust install. A standard system Rust installation works
  // on an ordinary checkout with no .tools directory.
  if (!env.CARGO_HOME && existsSync(resolve(localCargo, 'bin/cargo.exe'))) {
    env.CARGO_HOME = localCargo;
    env.RUSTUP_HOME = resolve('.tools/rustup');
    env.PATH = `${resolve(localCargo, 'bin')}${delimiter}${env.PATH}`;
  }
  return env;
}
