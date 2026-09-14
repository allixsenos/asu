import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLocalContext } from '../dist/local.js';
import { opencodeAuthPath, opencodeSource } from '../dist/sources/opencode.js';
import { UsageService } from '../dist/service.js';
import { UsageCache } from '../dist/cache.js';
import { claude } from '../dist/providers/claude.js';
import { codex } from '../dist/providers/codex.js';

const AUTH = '/fake/.local/share/opencode/auth.json';
const context = (files, env = {}) => createLocalContext({ home: '/fake', env, platform: 'linux',
  readText: async path => files[path] === undefined ? null : typeof files[path] === 'string' ? files[path] : JSON.stringify(files[path]),
  sqliteToken: async () => null, keychain: async () => null });
const expires = 1_900_000_000_000;
const jwt = claims => ['e30', Buffer.from(JSON.stringify(claims)).toString('base64url'), 'signature'].join('.');

test('opencode auth.json lives under XDG_DATA_HOME, else ~/.local/share, on every platform', () => {
  assert.equal(opencodeAuthPath(context({})), AUTH);
  assert.equal(opencodeAuthPath(context({}, { XDG_DATA_HOME: '/data' })), '/data/opencode/auth.json');
});

test('opencode reports every subscription login it stores, each one in use by opencode', async () => {
  const found = await opencodeSource.list(context({ [AUTH]: {
    anthropic: { type: 'oauth', access: 'claude-access', refresh: 'claude-refresh', expires },
    openai: { type: 'oauth', access: 'openai-access', refresh: 'openai-refresh', expires, accountId: 'account-1' },
    'github-copilot': { type: 'oauth', access: 'github-token', refresh: 'github-token', expires: 0 },
    'zai-coding-plan': { type: 'api', key: 'zai-key' },
    'kimi-for-coding': { type: 'api', key: 'kimi-key' },
    'minimax-coding-plan': { type: 'api', key: 'minimax-key' },
    'minimax-cn-coding-plan': { type: 'api', key: 'minimax-cn-key' },
    xai: { type: 'oauth', access: 'xai-access', refresh: 'xai-refresh', expires },
  } }));
  assert.deepEqual(found.map(item => item.providerId), ['claude', 'codex', 'copilot', 'zai', 'kimi', 'minimax', 'minimax', 'grok']);
  assert.ok(found.every(item => item.login.source === 'opencode' && item.login.inUse === true));
  assert.deepEqual(found[0].login.credentials, { token: 'claude-access', expiresAt: expires });
  assert.equal(found[1].login.credentials.accountId, 'account-1');
  assert.equal(found[1].login.accountKey, 'account-1');
  // Copilot's token never expires in opencode, so no expiry is set.
  assert.deepEqual(found[2].login.credentials, { token: 'github-token' });
  assert.equal(found[3].login.credentials.token, 'zai-key');
  assert.equal(found[4].login.credentials.token, 'kimi-key');
  assert.equal(found[5].login.credentials.metadata.baseUrl, 'https://api.minimax.io');
  assert.equal(found[6].login.credentials.metadata.baseUrl, 'https://api.minimaxi.com');
  assert.deepEqual(found[7].login.credentials, { token: 'xai-access', expiresAt: expires });
});

test('opencode entries without subscription usage, and malformed ones, are skipped', async () => {
  const found = await opencodeSource.list(context({ [AUTH]: {
    openai: { type: 'api', key: 'sk-platform' },
    'github-copilot': { type: 'oauth', access: 'enterprise-token', refresh: 'enterprise-token', expires: 0, enterpriseUrl: 'ghe.example.com' },
    zai: { type: 'api', key: 'payg' },
    moonshotai: { type: 'api', key: 'platform' },
    anthropic: { type: 'oauth' },
    xai: 'garbage',
  } }));
  assert.deepEqual(found, []);
  assert.deepEqual(await opencodeSource.list(context({})), []);
  await assert.rejects(opencodeSource.list(context({ [AUTH]: '{not json' })), { code: 'invalid_credentials' });
});

test('Claude Code and opencode on different subscriptions are two accounts, the same Codex account is one', async () => {
  const files = {
    '/fake/.claude/.credentials.json': { claudeAiOauth: { accessToken: 'cc-token', subscriptionType: 'max' } },
    '/fake/.claude.json': { oauthAccount: { accountUuid: 'u1', organizationUuid: 'o1', emailAddress: 'jane@example.org' } },
    '/fake/.codex/auth.json': { tokens: { access_token: 'codex-cli-token', account_id: 'account-1', id_token: jwt({ email: 'sam@x.io' }) } },
    [AUTH]: {
      anthropic: { type: 'oauth', access: 'opencode-claude', refresh: 'r', expires },
      openai: { type: 'oauth', access: 'opencode-openai', refresh: 'r', expires, accountId: 'account-1' },
    },
  };
  const seen = [];
  const request = async (url, init) => {
    seen.push(init.headers.Authorization);
    return url.includes('anthropic') ? { five_hour: { utilization: 5 } } : { plan_type: 'plus', rate_limit: { primary_window: { used_percent: 1 } } };
  };
  const report = await new UsageService([claude, codex], { local: context(files), request, cache: new UsageCache() }).collect();

  const claudes = report.providers.filter(item => item.providerId === 'claude');
  assert.equal(claudes.length, 2);
  assert.deepEqual(claudes.map(item => item.account.sources), [[{ name: 'Claude Code', inUse: true }], [{ name: 'opencode', inUse: true }]]);
  assert.equal(claudes[0].account.label, 'j***@e***.org');
  assert.equal(claudes[1].account.label, null);
  assert.ok(seen.includes('Bearer cc-token') && seen.includes('Bearer opencode-claude'));

  const codexes = report.providers.filter(item => item.providerId === 'codex');
  assert.equal(codexes.length, 1);
  assert.deepEqual(codexes[0].account.sources, [{ name: 'Codex CLI', inUse: true }, { name: 'opencode', inUse: true }]);
  assert.equal(codexes[0].account.label, 's***@x.io');
  // Codex CLI's token has no expiry, so it outlasts opencode's and is the one used.
  assert.ok(seen.includes('Bearer codex-cli-token') && !seen.includes('Bearer opencode-openai'));
  assert.ok(!JSON.stringify(report).includes('jane@example.org') && !JSON.stringify(report).includes('sam@x.io'));
});
