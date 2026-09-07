import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { UsageService } from '../dist/service.js';
import { UsageCache, cacheKey } from '../dist/cache.js';
import { createLocalContext } from '../dist/local.js';
import { UsageError } from '../dist/errors.js';
import { loadProviders } from '../dist/registry.js';

const local = createLocalContext({ home: '/fake', env: {} });
const data = { planLabel: 'Pro', windows: [{ id: 'session', label: 'Session', percentUsed: 25, resetsAt: null }], balances: [], details: [] };
const provider = (id, overrides = {}) => ({ id, displayName: id, version: 1, detect: async () => true,
  resolveCredentials: async () => ({ token: 'test-secret-token' }), fetchUsage: async () => data, ...overrides });
const tempCache = async t => {
  const directory = await mkdtemp(join(tmpdir(), 'asu-cache-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
};

test('providers run concurrently and isolate thrown exceptions, including secret-bearing errors', async () => {
  let started = 0, release;
  const barrier = new Promise(resolve => { release = resolve; });
  const providers = ['one', 'two'].map(id => provider(id, { fetchUsage: async () => {
    if (++started === 2) release();
    await barrier;
    if (id === 'two') throw new Error('test-secret-token');
    return data;
  } }));
  const report = await new UsageService(providers, { local, timeoutMs: 500 }).collect();
  assert.equal(report.providers[0].availability, 'available');
  assert.equal(report.providers[1].availability, 'error');
  assert.equal(report.providers[1].reason.code, 'provider_error');
  assert.ok(!JSON.stringify(report).includes('test-secret-token'));
});
test('missing, expired and malformed credentials never trigger a usage request', async () => {
  let calls = 0;
  const providers = [
    provider('missing', { resolveCredentials: async () => null }),
    provider('expired', { resolveCredentials: async () => ({ token: 'test-secret-token', expiresAt: 1 }) }),
    provider('malformed', { resolveCredentials: async () => { throw new UsageError('invalid_credentials'); } }),
    provider('bad-header', { resolveCredentials: async () => ({ token: 'test\r\nsecret' }) }),
  ].map(p => ({ ...p, fetchUsage: async () => { calls++; return data; } }));
  const report = await new UsageService(providers, { local }).collect();
  assert.equal(calls, 0);
  assert.ok(report.providers.every(p => p.availability === 'unavailable'));
  assert.equal(report.providers[0].credentialsPresent, false);
  assert.equal(report.providers[1].credentialsPresent, true);
  assert.equal(report.providers[2].installed, true);
});
test('HTTP auth failures remain unavailable and malformed adapter output is rejected', async () => {
  const report = await new UsageService([
    provider('unauthorized', { fetchUsage: async () => { throw new UsageError('unauthorized'); } }),
    provider('malformed', { fetchUsage: async () => ({ ...data, windows: [{ percentUsed: NaN }] }) }),
  ], { local }).collect();
  assert.equal(report.providers[0].availability, 'unavailable');
  assert.equal(report.providers[0].authenticated, false);
  assert.equal(report.providers[1].reason.code, 'invalid_response');
});
test('non-cooperating asynchronous plugins are bounded by a deadline', async () => {
  const report = await new UsageService([provider('hung', { fetchUsage: async () => new Promise(() => {}) })],
    { local, timeoutMs: 10 }).collect();
  assert.equal(report.providers[0].reason.code, 'timeout');
});
test('cache coalesces concurrent calls, expires at five minutes, and tracks credential changes', async () => {
  let now = 1_800_000_000_000, calls = 0, token = 'test-secret-token';
  const p = provider('example', { resolveCredentials: async () => ({ token }), fetchUsage: async () => { calls++; return data; } });
  const service = new UsageService([p], { local, now: () => now });
  await Promise.all(Array.from({ length: 8 }, () => service.collect()));
  assert.equal(calls, 1);
  now += 299_999;
  assert.equal((await service.collect()).providers[0].cached, true);
  assert.equal(calls, 1);
  now++;
  assert.equal((await service.collect()).providers[0].cached, false);
  assert.equal(calls, 2);
  token = 'a-different-token';
  await service.collect();
  assert.equal(calls, 3);
  now++;
  await service.collect({ fresh: true });
  assert.equal(calls, 4);
});
test('persistent cache deduplicates separate service instances and stores only sanitized data', async t => {
  const directory = await tempCache(t);
  let calls = 0;
  const p = provider('example', { fetchUsage: async () => {
    calls++;
    await new Promise(resolve => setTimeout(resolve, 30));
    return { ...data, token: 'test-secret-token', details: [{ label: 'Echo', value: 'test-secret-token' }] };
  } });
  const makeService = () => new UsageService([p], { local, cache: new UsageCache(directory) });
  const reports = await Promise.all([makeService().collect(), makeService().collect()]);
  assert.equal(calls, 1);
  assert.equal(reports.filter(r => r.providers[0].cached).length, 1);
  const files = await readdir(directory);
  assert.equal(files.length, 1);
  const text = await readFile(join(directory, files[0]), 'utf8');
  assert.ok(!text.includes('test-secret-token'));
  assert.ok(text.includes('[redacted]'));
  if (process.platform !== 'win32') assert.equal((await stat(join(directory, files[0]))).mode & 0o777, 0o600);
  const cached = await makeService().collect();
  assert.equal(cached.providers[0].cached, true);
  assert.equal(calls, 1);
});
test('corrupt disk cache recovers and unwritable cache degrades without losing results', async t => {
  const directory = await tempCache(t);
  let calls = 0;
  const p = provider('example', { fetchUsage: async () => { calls++; return data; } });
  const service = () => new UsageService([p], { local, cache: new UsageCache(directory) });
  await service().collect();
  const [file] = await readdir(directory);
  await writeFile(join(directory, file), 'malformed');
  await service().collect();
  assert.equal(calls, 2);
  const report = await new UsageService([p], { local, cache: new UsageCache(join(directory, file, 'not-a-directory')) }).collect();
  assert.equal(report.providers[0].availability, 'available');
  assert.equal(report.warnings.length, 1);
});
test('failures are cached without caching a rejected promise', async () => {
  let calls = 0;
  const service = new UsageService([provider('example', { fetchUsage: async () => {
    calls++; throw new UsageError('http_error');
  } })], { local });
  await service.collect();
  const again = await service.collect();
  assert.equal(again.providers[0].cached, true);
  assert.equal(calls, 1);
});
test('plugin loader accepts explicit modules and rejects duplicates or invalid interfaces', async t => {
  const directory = await tempCache(t);
  const path = join(directory, 'plugin.mjs');
  await writeFile(path, `export default {id:'test-plugin',displayName:'Test plugin',version:1,
    detect:async()=>false,resolveCredentials:async()=>null,fetchUsage:async()=>({})};`);
  assert.equal((await loadProviders([path])).at(-1).id, 'test-plugin');
  await assert.rejects(loadProviders([path, path]));
  await assert.rejects(loadProviders(['https://example.com/plugin.mjs']));
  assert.notEqual(cacheKey(['token-a']), cacheKey(['token-b']));
});
