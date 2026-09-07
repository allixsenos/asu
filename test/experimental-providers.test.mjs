import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cursor, normalizeCursor } from '../dist/providers/cursor.js';
import { zai, normalizeZaiPlan, normalizeZaiQuota } from '../dist/providers/zai.js';
import { grok, normalizeGrok } from '../dist/providers/grok.js';
import { kimi, normalizeKimi } from '../dist/providers/kimi.js';
import { minimax, normalizeMiniMax } from '../dist/providers/minimax.js';
import { createLocalContext } from '../dist/local.js';
import { UsageError } from '../dist/errors.js';

const reset = '2026-09-08T12:00:00.000Z';
const context = overrides => createLocalContext({ home: '/fake', env: {}, platform: 'linux',
  readText: async () => null, sqliteToken: async () => null, ...overrides });

test('Cursor converts cents and timestamps without assuming a limit', () => {
  const data = normalizeCursor({ planUsage: { totalSpend: '1200', remaining: 800, limit: 2000 }, billingCycleEnd: '1788868800000' });
  assert.equal(data.balances[0].used, 12);
  assert.equal(data.balances[0].remaining, 8);
  assert.equal(data.windows[0].percentUsed, 60);
  assert.equal(data.windows[0].resetsAt, reset);
  assert.equal(normalizeCursor({ planUsage: { totalSpend: 0 } }).windows[0].percentUsed, null);
});
test('Cursor credential precedence includes modern, legacy, and headless stores', async () => {
  assert.equal((await cursor.resolveCredentials(context({ env: { CURSOR_TOKEN: 'env' } }))).token, 'env');
  assert.equal((await cursor.resolveCredentials(context({ sqliteToken: async (_, key) => key === 'cursorAuth/accessToken' ? 'modern' : null }))).token, 'modern');
  assert.equal((await cursor.resolveCredentials(context({ sqliteToken: async (_, key) => key === 'cursorAuthStatus' ? '{"accessToken":"legacy"}' : null }))).token, 'legacy');
  assert.equal((await cursor.resolveCredentials(context({ sqliteToken: async () => { throw new Error(); },
    readJson: async () => ({ accessToken: 'headless' }) }))).token, 'headless');
});
test('Cursor sends the Connect JSON POST request', async () => {
  await cursor.fetchUsage({ signal: new AbortController().signal, request: async (url, init) => {
    assert.ok(url.endsWith('/GetCurrentPeriodUsage'));
    assert.equal(init.method, 'POST');
    assert.deepEqual(init.body, {});
    assert.equal(init.headers['Connect-Protocol-Version'], '1');
    return { planUsage: { totalSpend: 0, limit: 2000 } };
  } }, { token: 'secret' });
});
test('Z.ai quota fetch survives a plan metadata failure', async () => {
  const plan = normalizeZaiPlan({ success: true, data: [{ productName: 'GLM Coding Pro', status: 'active' }] });
  assert.deepEqual(plan.windows, []);
  const quotas = { success: true, data: { limits: [
    { type: 'TOKENS_LIMIT', percentage: 30, nextResetTime: 1788868800000 },
    { type: 'TIME_LIMIT', percentage: 5, currentValue: 5, usage: 100 },
  ] } };
  assert.equal(normalizeZaiQuota(quotas).windows[0].resetsAt, reset);
  const partial = await zai.fetchUsage({ signal: new AbortController().signal, request: async (url, options) => {
    if (url.includes('/subscription/')) throw new UsageError('http_error');
    assert.equal(options.headers.Authorization, 'secret');
    return quotas;
  } }, { token: 'secret' });
  assert.equal(partial.windows.length, 2);
  assert.equal(partial.planLabel, null);
});
test('Grok supports percentage-only billing and protobuf cents including zero', () => {
  const data = normalizeGrok({ subscription_tier: 'SuperGrok', config: {
    creditUsagePercent: 12.5, currentPeriod: { type: 'USAGE_PERIOD_TYPE_WEEKLY', end: reset }, isUnifiedBillingUser: true,
  } });
  assert.equal(data.windows[0].percentUsed, 12.5);
  assert.equal(data.balances.length, 0);
  const legacy = normalizeGrok({ config: { monthlyLimit: { val: 1000 }, used: {}, prepaidBalance: { val: 200 } } });
  assert.equal(legacy.balances[0].limit, 10);
  assert.equal(legacy.balances[0].used, 0);
  assert.equal(legacy.balances[1].remaining, 2);
});
test('Grok only selects credentials belonging to the xAI issuer', async () => {
  const result = await grok.resolveCredentials(context({ readJson: async () => ({
    unrelated: { key: 'wrong' }, 'https://auth.x.ai::client': { key: 'correct' },
  }) }));
  assert.equal(result.token, 'correct');
});
test('Kimi normalizes numeric strings and arbitrary duration windows', () => {
  const result = normalizeKimi({ usage: { used: '40', limit: '1000', resetTime: reset }, limits: [
    { window: { duration: 300, timeUnit: 'TIME_UNIT_MINUTE' }, detail: { used: '1', limit: '100' } },
    { window: { duration: 2, timeUnit: 'TIME_UNIT_DAY' }, detail: { remaining: '90', limit: '100' } },
  ] });
  assert.equal(result.windows.length, 3);
  assert.equal(result.windows[0].percentUsed, 4);
  assert.equal(result.windows[1].label, '5 hours');
  assert.equal(result.windows[2].percentUsed, 10);
});
test('Kimi reads configured home and expiry without retaining refresh tokens', async () => {
  const result = await kimi.resolveCredentials(context({ env: { KIMI_CODE_HOME: '/configured' }, readJson: async path => {
    assert.equal(path, '/configured/credentials/kimi-code.json');
    return { access_token: 'secret', refresh_token: 'never-used', expires_at: 1700000000 };
  } }));
  assert.equal(result.expiresAt, 1700000000000);
  assert.equal(result.refreshToken, undefined);
});
test('MiniMax prefers remaining percentages and handles weekly counts and API errors', () => {
  const result = normalizeMiniMax({ base_resp: { status_code: 0 }, model_remains: [{ model_name: 'MiniMax-M2.7',
    current_interval_remaining_percent: 80, current_interval_total_count: 100, current_interval_usage_count: 70,
    current_weekly_total_count: 1000, current_weekly_usage_count: 100, end_time: 1788868800000,
  }] });
  assert.equal(result.windows[0].percentUsed, 20);
  assert.equal(result.windows[1].percentUsed, 10);
  assert.equal(result.windows[0].resetsAt, reset);
  assert.throws(() => normalizeMiniMax({ base_resp: { status_code: 1004 } }), { code: 'unauthorized' });
});
test('MiniMax respects region and refuses arbitrary credential destinations', async () => {
  assert.equal((await minimax.resolveCredentials(context({ env: { MINIMAX_API_KEY: 'secret', MINIMAX_REGION: 'cn' } }))).metadata.baseUrl,
    'https://api.minimaxi.com');
  await assert.rejects(minimax.resolveCredentials(context({ env: { MINIMAX_API_KEY: 'secret', MINIMAX_BASE_URL: 'https://evil.example' } })),
    { code: 'invalid_credentials' });
  const local = await minimax.resolveCredentials(context({ readJson: async path => path.endsWith('/config.json') ?
    { api_key: 'secret', region: 'cn' } : null }));
  assert.equal(local.metadata.baseUrl, 'https://api.minimaxi.com');
});
for (const provider of [cursor, zai, grok, kimi, minimax]) {
  test(`${provider.id} is experimental and handles missing credentials`, async () => {
    assert.equal(provider.experimental, true);
    assert.equal(await provider.resolveCredentials(context()), null);
  });
}
for (const normalize of [normalizeCursor, normalizeZaiPlan, normalizeZaiQuota, normalizeGrok, normalizeKimi, normalizeMiniMax]) {
  test(`${normalize.name} rejects empty/malformed payloads`, () => {
    for (const value of [null, [], {}, 'garbage']) assert.throws(() => normalize(value));
  });
}
