import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createTransport } from '../dist/transport.js';
import { createLocalContext, readText, detectCommands, readKeychainEntry } from '../dist/local.js';
import { usageDataSchema } from '../dist/models.js';
import { safeReason, UsageError } from '../dist/errors.js';

test('transport uses bounded JSON requests and prevents credential-bearing redirects', async () => {
  const request = createTransport(async (url, init) => {
    assert.equal(url, 'https://example.com/usage');
    assert.equal(init.redirect, 'error');
    assert.equal(init.headers.Authorization, 'Bearer test-secret');
    assert.equal(init.method, 'POST');
    assert.equal(init.body, '{}');
    assert.ok(init.signal);
    return Response.json({ used: 5 });
  });
  assert.deepEqual(await request('https://example.com/usage', {
    method: 'POST', headers: { Authorization: 'Bearer test-secret' }, body: {},
  }), { used: 5 });
  await assert.rejects(request('http://example.com/usage'), { code: 'provider_error' });
});

for (const [status, code] of [[401, 'unauthorized'], [403, 'unauthorized'], [429, 'rate_limited'], [500, 'http_error']]) {
  test(`HTTP ${status} is sanitized`, async () => {
    const request = createTransport(async () => new Response('secret-token', { status }));
    await assert.rejects(request('https://example.com'), error => error.code === code && !error.message.includes('secret-token'));
  });
}
test('transport rejects malformed and oversized responses', async () => {
  for (const body of ['not json', 'x'.repeat(21)]) {
    const request = createTransport(async () => new Response(body), 100, 20);
    await assert.rejects(request('https://example.com'), { code: 'invalid_response' });
  }
});
test('timeout covers response body reads, not only headers', async () => {
  const request = createTransport(async (_, { signal }) => new Response(new ReadableStream({
    start(controller) { signal.addEventListener('abort', () => controller.error(new Error('secret')), { once: true }); },
  })), 10);
  await assert.rejects(request('https://example.com'), { code: 'timeout' });
});
test('normalization strips unknown fields and terminal controls', () => {
  const output = usageDataSchema.parse({ planLabel: '\x1b[31mPro\x1b[0m\n', windows: [], balances: [], details: [], token: 'secret' });
  assert.equal(output.planLabel, 'Pro');
  assert.ok(!('token' in output));
  assert.equal(safeReason(new Error('secret')).code, 'provider_error');
  assert.equal(safeReason(new UsageError('unauthorized')).code, 'unauthorized');
});
test('credential reads are bounded, read-only, and distinguish malformed files', async t => {
  const home = await mkdtemp(join(tmpdir(), 'asu-local-'));
  t.after(() => rm(home, { recursive: true, force: true }));
  const context = createLocalContext({ home, env: {} });
  assert.equal(await context.readJson(join(home, 'absent.json')), null);
  const path = join(home, 'auth.json');
  await writeFile(path, '{invalid');
  await assert.rejects(context.readJson(path), { code: 'invalid_credentials' });
  assert.equal(await readFile(path, 'utf8'), '{invalid');
  await writeFile(path, 'x'.repeat(1_048_577));
  await assert.rejects(readText(path), { code: 'credential_read_error' });
  await mkdir(join(home, 'directory'));
  await assert.rejects(readText(join(home, 'directory')), { code: 'credential_read_error' });
  assert.equal(await detectCommands(context, ['nonexistent']), false);
});
test('Keychain tries the current account before the legacy lookup, including malformed entries', async () => {
  const calls = [];
  const result = await readKeychainEntry('Claude Code-credentials', 'alice', async args => {
    calls.push(args);
    return args.includes('-a') ? 'malformed' : '{"valid":true}';
  }, value => { try { return JSON.parse(value).valid === true; } catch { return false; } });
  assert.equal(result, '{"valid":true}');
  assert.deepEqual(calls, [
    ['find-generic-password', '-s', 'Claude Code-credentials', '-a', 'alice', '-w'],
    ['find-generic-password', '-s', 'Claude Code-credentials', '-w'],
  ]);
});
