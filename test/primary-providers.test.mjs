import { test } from 'node:test';
import assert from 'node:assert/strict';
import { claude, normalizeClaude } from '../dist/providers/claude.js';
import { codex, normalizeCodex } from '../dist/providers/codex.js';
import { copilot, normalizeCopilot } from '../dist/providers/copilot.js';
import { createLocalContext } from '../dist/local.js';

const reset = '2026-09-08T12:00:00.000Z';
const scoped = (model, value, surface) => ({ kind: 'weekly_scoped', percent: value,
  scope: { model: model ? { display_name: model } : null, surface: surface ? { display_name: surface } : null } });

test('Claude reconciles legacy, nullable, model and surface limits without dropping zero usage', () => {
  const result = normalizeClaude({ five_hour: { utilization: 0, resets_at: reset },
    seven_day: { utilization: '21.5' }, seven_day_opus: { utilization: 12, resets_at: reset },
    seven_day_sonnet: { utilization: 4 }, limits: [scoped('Opus', null), scoped('Sonnet', 0),
      scoped(null, 7, 'Opus'), scoped('Opus', 9, 'Code'), { kind: 'future_kind' }, 'bad'],
  }, { subscriptionType: 'max', rateLimitTier: 'default_claude_max_20x' });
  assert.equal(result.planLabel, 'Max 20x');
  assert.equal(result.windows.length, 6);
  assert.equal(result.windows[0].percentUsed, 0);
  assert.equal(result.windows[1].percentUsed, 21.5);
  assert.equal(result.windows[2].percentUsed, 12);
  assert.equal(result.windows[2].resetsAt, reset);
  assert.equal(result.windows[3].percentUsed, 0);
  assert.deepEqual(result.windows[4].scope, { model: undefined, surface: 'Opus' });
  assert.equal(new Set(result.windows.map(x => x.id)).size, 6);
  assert.equal(result.details[0].value, '1 unrecognized scoped limits omitted');
});
test('Claude preserves distinct provider IDs and rejects empty or malformed core responses', () => {
  const result = normalizeClaude({ limits: ['fable-pro', 'fable_pro'].map(id => ({
    kind: 'weekly_scoped', percent: 0, scope: { model: { id, display_name: 'Fable' } },
  })) });
  assert.equal(result.windows.length, 2);
  assert.notEqual(result.windows[0].id, result.windows[1].id);
  for (const value of [{}, { five_hour: { utilization: 'bad' } }, { five_hour: { utilization: 10, resets_at: 'garbage' } }])
    assert.throws(() => normalizeClaude(value, { subscriptionType: 'max' }), { code: 'invalid_response' });
});
test('Claude respects configured home, then falls back to Keychain on macOS', async () => {
  const paths = [];
  const local = createLocalContext({ home: '/fake', env: { CLAUDE_CONFIG_DIR: '/custom' }, platform: 'darwin',
    readJson: async path => { paths.push(path); return null; },
    keychain: async service => { assert.equal(service, 'Claude Code-credentials'); return JSON.stringify({
      claudeAiOauth: { accessToken: 'secret', subscriptionType: 'pro' },
    }); },
  });
  assert.equal((await claude.resolveCredentials(local)).token, 'secret');
  assert.deepEqual(paths, ['/custom/.credentials.json']);
});
test('Claude request includes the required OAuth beta header', async () => {
  await claude.fetchUsage({ signal: new AbortController().signal, request: async (url, init) => {
    assert.equal(url, 'https://api.anthropic.com/api/oauth/usage');
    assert.equal(init.headers['anthropic-beta'], 'oauth-2025-04-20');
    assert.equal(init.headers.Authorization, 'Bearer secret');
    return { five_hour: { utilization: 3 } };
  } }, { token: 'secret' });
});
test('Codex reports primary, secondary, code review, additional limits and credit balances', () => {
  const result = normalizeCodex({ plan_type: 'pro',
    rate_limit: { primary_window: { used_percent: 25, limit_window_seconds: 18000, reset_at: 1788868800 },
      secondary_window: { used_percent: 110, limit_window_seconds: 604800, reset_after_seconds: 60 } },
    code_review_rate_limit: { primary_window: { used_percent: 2 } },
    additional_rate_limits: [{ limit_name: 'spark', rate_limit: { primary_window: { used_percent: 9 } } }],
    credits: { balance: '13.5', unlimited: false, has_credits: true },
  }, 1788868800000);
  assert.equal(result.planLabel, 'Pro');
  assert.equal(result.windows.length, 4);
  assert.equal(result.windows[0].label, '5 hours');
  assert.equal(result.windows[1].percentUsed, 110);
  assert.equal(result.windows[1].resetsAt, '2026-09-08T12:01:00.000Z');
  assert.equal(result.balances[0].remaining, 13.5);
  assert.throws(() => normalizeCodex({ rate_limit: { primary_window: {} } }), { code: 'invalid_response' });
});
test('Codex discovers OAuth auth files in order and forwards account selection', async () => {
  const paths = [];
  const context = createLocalContext({ home: '/fake', env: { CODEX_HOME: '/custom' },
    readJson: async path => { paths.push(path); return path.endsWith('/.codex/auth.json') ?
      { tokens: { access_token: 'secret', account_id: 'account' } } : { OPENAI_API_KEY: 'api-only' }; },
  });
  const credentials = await codex.resolveCredentials(context);
  assert.deepEqual(paths, ['/custom/auth.json', '/fake/.config/codex/auth.json', '/fake/.codex/auth.json']);
  await codex.fetchUsage({ now: Date.now, signal: new AbortController().signal, request: async (url, options) => {
    assert.equal(url, 'https://chatgpt.com/backend-api/wham/usage');
    assert.equal(options.headers['ChatGPT-Account-Id'], 'account');
    return { plan_type: 'plus' };
  } }, credentials);
});
test('Copilot plan-only responses do not invent usage, quotas preserve unlimited and unknown values', () => {
  const result = normalizeCopilot({ copilot_plan: 'individual', quota_reset_date: '2026-10-01' });
  assert.deepEqual(result.windows, []);
  assert.equal(result.details[0].value, '2026-10-01T00:00:00.000Z');
  const withQuotas = normalizeCopilot({ quota_reset_date: '2026-10-01', quota_snapshots: {
    premium_interactions: { entitlement: 300, percent_remaining: 70 },
    chat: { entitlement: -1, unlimited: true }, incomplete: { reset_date: reset },
  } });
  // With quota windows, the reset date lives on each window and is not repeated as a detail.
  assert.deepEqual(withQuotas.details, []);
  assert.equal(withQuotas.windows[0].resetsAt, '2026-10-01T00:00:00.000Z');
  const quotas = withQuotas.windows;
  assert.equal(quotas.length, 2);
  assert.equal(quotas[0].percentUsed, 30);
  assert.equal(quotas[0].used, undefined);
  assert.equal(quotas[1].percentUsed, null);
  assert.equal(quotas[1].unlimited, true);
});
test('Copilot selects github.com and the active user, never an enterprise or inactive token', async () => {
  const context = createLocalContext({ home: '/fake', env: {}, readText: async () => `enterprise.example:
  oauth_token: wrong
github.com:
  user: active
  users:
    inactive:
      oauth_token: wrong
    active:
      oauth_token: correct
` });
  assert.equal((await copilot.resolveCredentials(context)).token, 'correct');
  const env = { COPILOT_TOKEN: 'preferred', GITHUB_TOKEN: 'fallback' };
  assert.equal((await copilot.resolveCredentials({ ...context, env })).token, 'preferred');
});
for (const provider of [claude, codex, copilot]) {
  test(`${provider.id} missing credentials stay missing`, async () => {
    const context = createLocalContext({ home: '/fake', platform: 'linux', env: {}, readText: async () => null });
    assert.equal(await provider.resolveCredentials(context), null);
  });
}
