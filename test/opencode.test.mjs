import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLocalContext } from '../dist/local.js';
import { opencodeAuthPath } from '../dist/providers/opencode.js';
import { claude } from '../dist/providers/claude.js';
import { codex } from '../dist/providers/codex.js';
import { copilot } from '../dist/providers/copilot.js';
import { cursor } from '../dist/providers/cursor.js';
import { zai } from '../dist/providers/zai.js';
import { kimi } from '../dist/providers/kimi.js';
import { minimax } from '../dist/providers/minimax.js';
import { grok } from '../dist/providers/grok.js';

const AUTH = '/fake/.local/share/opencode/auth.json';
const context = (files, env = {}) => createLocalContext({ home: '/fake', env, platform: 'linux',
  readText: async path => files[path] === undefined ? null : typeof files[path] === 'string' ? files[path] : JSON.stringify(files[path]),
  sqliteToken: async () => null, keychain: async () => null });
const opencode = (entries, extra = {}, env = {}) => context({ [AUTH]: entries, ...extra }, env);
const expires = 1_900_000_000_000;

test('opencode auth.json lives under XDG_DATA_HOME, else ~/.local/share, on every platform', () => {
  assert.equal(opencodeAuthPath(context({})), AUTH);
  assert.equal(opencodeAuthPath(context({}, { XDG_DATA_HOME: '/data' })), '/data/opencode/auth.json');
});

test('each adapter falls back to its opencode login', async () => {
  const local = opencode({
    anthropic: { type: 'oauth', access: 'claude-access', refresh: 'claude-refresh', expires },
    openai: { type: 'oauth', access: 'openai-access', refresh: 'openai-refresh', expires, accountId: 'account-1' },
    'github-copilot': { type: 'oauth', access: 'github-token', refresh: 'github-token', expires: 0 },
    'zai-coding-plan': { type: 'api', key: 'zai-key' },
    'kimi-for-coding': { type: 'api', key: 'kimi-key' },
    'minimax-cn-coding-plan': { type: 'api', key: 'minimax-key' },
    xai: { type: 'oauth', access: 'xai-access', refresh: 'xai-refresh', expires },
  });
  assert.deepEqual(await claude.resolveCredentials(local), { token: 'claude-access', expiresAt: expires });
  assert.deepEqual(await codex.resolveCredentials(local), { token: 'openai-access', expiresAt: expires, accountId: 'account-1' });
  // Copilot's token never expires in opencode, so no expiry is set.
  assert.deepEqual(await copilot.resolveCredentials(local), { token: 'github-token' });
  assert.deepEqual(await zai.resolveCredentials(local), { token: 'zai-key' });
  assert.deepEqual(await kimi.resolveCredentials(local), { token: 'kimi-key' });
  const mm = await minimax.resolveCredentials(local);
  assert.equal(mm.token, 'minimax-key');
  assert.equal(mm.metadata.baseUrl, 'https://api.minimaxi.com');
  assert.deepEqual(await grok.resolveCredentials(local), { token: 'xai-access', expiresAt: expires });
  // opencode has no Cursor login.
  assert.equal(await cursor.resolveCredentials(local), null);
});

test('the provider’s own credential store wins over opencode', async () => {
  const entries = { anthropic: { type: 'oauth', access: 'from-opencode', expires }, openai: { type: 'oauth', access: 'from-opencode', expires },
    'zai-coding-plan': { type: 'api', key: 'from-opencode' } };
  const local = opencode(entries, {
    '/fake/.claude/.credentials.json': { claudeAiOauth: { accessToken: 'from-claude-code' } },
    '/fake/.codex/auth.json': { tokens: { access_token: 'from-codex' } },
  }, { ZAI_API_KEY: 'from-env' });
  assert.equal((await claude.resolveCredentials(local)).token, 'from-claude-code');
  assert.equal((await codex.resolveCredentials(local)).token, 'from-codex');
  assert.equal((await zai.resolveCredentials(local)).token, 'from-env');
});

test('opencode entries that cannot report usage are skipped', async () => {
  const local = opencode({
    // An OpenAI platform API key is not a ChatGPT login.
    openai: { type: 'api', key: 'sk-platform' },
    // A GitHub Enterprise login targets another host.
    'github-copilot': { type: 'oauth', access: 'enterprise-token', refresh: 'enterprise-token', expires: 0, enterpriseUrl: 'ghe.example.com' },
    // Pay-as-you-go Z.ai and Moonshot platform keys have no coding plan quota.
    zai: { type: 'api', key: 'payg' },
    moonshotai: { type: 'api', key: 'platform' },
    // Malformed entries are ignored, as opencode ignores them.
    anthropic: { type: 'oauth' },
    xai: 'garbage',
  });
  for (const provider of [codex, copilot, zai, kimi, claude, grok]) assert.equal(await provider.resolveCredentials(local), null, provider.id);
});

test('an expired opencode token is passed on with its expiry, so ASU reports it instead of refreshing', async () => {
  const past = 1_700_000_000_000;
  const local = opencode({ anthropic: { type: 'oauth', access: 'stale', refresh: 'still-valid', expires: past } });
  assert.deepEqual(await claude.resolveCredentials(local), { token: 'stale', expiresAt: past });
});

test('an unreadable opencode auth.json is a credential error, not a silent miss', async () => {
  const local = context({ [AUTH]: '{not json' });
  await assert.rejects(zai.resolveCredentials(local), { code: 'invalid_credentials' });
});
