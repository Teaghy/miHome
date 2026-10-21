import { test } from 'node:test';
import assert from 'node:assert/strict';
import { delimiter } from 'node:path';
import { normalizePathEnvironment } from './environment.mjs';

test('retains Windows Path when adding the local Rust prefix', () => {
  const result = normalizePathEnvironment({ Path: 'node-bin', KEEP: 'value' }, ['cargo-bin']);
  assert.equal(result.PATH, ['cargo-bin', 'node-bin'].join(delimiter));
  assert.equal(result.Path, undefined);
  assert.equal(result.KEEP, 'value');
});
test('combines conflicting PATH/Path keys exactly once', () => {
  const result = normalizePathEnvironment({
    PATH: `node-bin${delimiter}system-bin`,
    Path: 'node-bin',
  });
  assert.equal(result.PATH, ['node-bin', 'system-bin'].join(delimiter));
  assert.deepEqual(Object.keys(result), ['PATH']);
});
test('handles absent path without inserting undefined or empty segments', () => {
  assert.equal(normalizePathEnvironment({}, ['node-bin']).PATH, 'node-bin');
});
test('does not mutate the parent process environment object', () => {
  const original = { Path: 'system-bin' };
  normalizePathEnvironment(original, ['cargo-bin']);
  assert.deepEqual(original, { Path: 'system-bin' });
});
