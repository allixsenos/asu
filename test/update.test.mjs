import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { checkForUpdate, UPDATE_CHECK_INTERVAL_MS } from '../dist/update.js';

const tempDir = async t => {
  const directory = await mkdtemp(join(tmpdir(), 'asu-update-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
};

test('update check asks the registry once a day and reports a newer version on stderr text', async t => {
  const directory = await tempDir(t);
  let now = 1_800_000_000_000, calls = 0, latest = '0.8.0';
  const request = async url => { calls++; assert.equal(url, 'https://registry.npmjs.org/%40allixsenos%2Fasu/latest'); return { version: latest }; };
  const options = { directory: join(directory, 'asu'), request, name: '@allixsenos/asu', version: '0.4.0', now: () => now };
  assert.equal(await checkForUpdate(options), 'asu: 0.8.0 is available, you run 0.4.0. Update: npx --yes @allixsenos/asu@latest');
  assert.equal(calls, 1);
  const stamp = JSON.parse(await readFile(join(directory, 'asu', 'update-check.json'), 'utf8'));
  assert.equal(stamp.latest, '0.8.0');
  // Within a day the stamp answers, without a request.
  now += UPDATE_CHECK_INTERVAL_MS - 1;
  assert.ok(await checkForUpdate(options));
  assert.equal(calls, 1);
  // After a day it asks again.
  now += 1;
  latest = '0.9.0';
  assert.equal(await checkForUpdate(options), 'asu: 0.9.0 is available, you run 0.4.0. Update: npx --yes @allixsenos/asu@latest');
  assert.equal(calls, 2);
});
test('update check stays silent when current, when the registry fails, and when the answer is malformed', async t => {
  const directory = await tempDir(t);
  const base = { directory, name: '@allixsenos/asu', version: '0.8.0', now: () => 1_800_000_000_000 };
  assert.equal(await checkForUpdate({ ...base, request: async () => ({ version: '0.8.0' }) }), null);
  assert.equal(await checkForUpdate({ ...base, directory: join(directory, 'b'), request: async () => ({ version: '0.8.1-beta.1' }) }), null);
  assert.equal(await checkForUpdate({ ...base, directory: join(directory, 'c'), request: async () => { throw new Error('offline'); } }), null);
  assert.equal(await checkForUpdate({ ...base, directory: join(directory, 'd'), request: async () => 'garbage' }), null);
  assert.equal(await checkForUpdate({ ...base, directory: join(directory, 'e'), version: '1.0.0', request: async () => ({ version: '0.9.9' }) }), null);
});
