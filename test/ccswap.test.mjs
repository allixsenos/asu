import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLocalContext, readKeychainEntry } from '../dist/local.js';
import { ccswapRoot, ccswapSource, slugifyEmail } from '../dist/sources/ccswap.js';
import { UsageService } from '../dist/service.js';
import { UsageCache } from '../dist/cache.js';
import { claude } from '../dist/providers/claude.js';
import { codex } from '../dist/providers/codex.js';

const ROOT = '/fake/.local/share/claude-swap';
const context = (files, { platform = 'linux', env = {}, keychain = async () => null } = {}) => createLocalContext({ home: '/fake', env, platform,
  readText: async path => files[path] === undefined ? null : typeof files[path] === 'string' ? files[path] : JSON.stringify(files[path]),
  sqliteToken: async () => null, keychain });
const b64 = value => Buffer.from(JSON.stringify(value)).toString('base64');
const later = 1_900_000_000_000, earlier = 1_850_000_000_000, past = 1_600_000_000_000;
const claudeFile = (token, expiresAt) => ({ claudeAiOauth: { accessToken: token, expiresAt, subscriptionType: 'max', rateLimitTier: 'default_claude_max_20x' } });
const store = {
  [`${ROOT}/sequence.json`]: { activeAccountNumber: 1, sequence: [1, 2], accounts: {
    1: { email: 'jane@example.org', uuid: 'u1', organizationUuid: 'o1', organizationName: 'Jane', added: '2026-09-01' },
    2: { email: 'work@corp.example', uuid: 'u2', organizationUuid: 'o2', alias: 'work', added: '2026-09-01' },
  } },
  [`${ROOT}/credentials/.creds-1-jane@example.org.enc`]: b64(claudeFile('slot1-backup', earlier)),
  [`${ROOT}/sessions/1-jane_example.org/.credentials.json`]: claudeFile('slot1-session', later),
  [`${ROOT}/credentials/.creds-2-work@corp.example.enc`]: b64(claudeFile('slot2-backup', past)),
  [`${ROOT}/codex/sequence.json`]: { activeAccountNumber: 1, accounts: { 1: { email: 'sam@x.io', accountId: 'account-1', planType: 'plus' } } },
  [`${ROOT}/codex/credentials/account-1.json`]: { tokens: { access_token: 'codex-slot1', account_id: 'account-1' } },
};

test('ccswap root and profile slug follow ccswap’s own rules', () => {
  assert.equal(ccswapRoot(context({})), ROOT);
  assert.equal(ccswapRoot(context({}, { env: { XDG_DATA_HOME: '/data' } })), '/data/claude-swap');
  assert.equal(ccswapRoot(context({}, { env: { XDG_DATA_HOME: '~/data' } })), '/fake/data/claude-swap');
  // A relative XDG_DATA_HOME is ignored, as the XDG spec says.
  assert.equal(ccswapRoot(context({}, { env: { XDG_DATA_HOME: 'relative' } })), ROOT);
  assert.equal(ccswapRoot(context({}, { platform: 'darwin' })), '/fake/.claude-swap-backup');
  assert.equal(ccswapRoot(context({}, { platform: 'win32' })), '/fake/.claude-swap-backup');
  assert.equal(slugifyEmail('jane+x@example.org'), 'jane_x_example.org');
});

test('ccswap lists every Claude and Codex slot, with each ccswap run profile beside its backup', async () => {
  const found = await ccswapSource.list(context(store));
  assert.deepEqual(found.map(({ providerId, login }) => [providerId, login.source, login.credentials.token, login.alias ?? null]), [
    ['claude', 'ccswap slot 1', 'slot1-backup', null],
    ['claude', 'ccswap slot 1', 'slot1-session', null],
    ['claude', 'ccswap slot 2', 'slot2-backup', 'work'],
    ['codex', 'ccswap slot 1', 'codex-slot1', null],
  ]);
  assert.equal(found[0].login.accountKey, 'u1:o1');
  assert.equal(found[0].login.email, 'jane@example.org');
  assert.equal(found[0].login.credentials.metadata.subscriptionType, 'max');
  assert.equal(found[3].login.accountKey, 'account-1');
  // The swapped-in account is already the live login, so no ccswap slot is marked in use.
  assert.ok(found.every(({ login }) => login.inUse !== true));
});

test('on macOS a slot without a backup file reads only its own Keychain item', async () => {
  const asked = [];
  const keychain = async (service, _validate, account) => { asked.push([service, account]); return JSON.stringify(claudeFile('from-keychain', later)); };
  const files = { '/fake/.claude-swap-backup/sequence.json': { accounts: { 3: { email: 'kc@example.org', uuid: 'u3', organizationUuid: 'o3' } } } };
  const found = await ccswapSource.list(context(files, { platform: 'darwin', keychain }));
  assert.deepEqual(asked, [['claude-swap', 'account-3-kc@example.org']]);
  assert.equal(found[0].login.credentials.token, 'from-keychain');
  // The exact lookup never falls back to a service-only query, which could return another slot.
  const calls = [];
  const none = await readKeychainEntry('claude-swap', 'account-3-kc@example.org', async args => { calls.push(args); throw new Error('absent'); }, undefined, false);
  assert.equal(none, null);
  assert.deepEqual(calls, [['find-generic-password', '-s', 'claude-swap', '-a', 'account-3-kc@example.org', '-w']]);
});

test('an unreadable slot is skipped and hides no other slot, and a path in an email is never followed', async () => {
  const broken = { ...store, [`${ROOT}/credentials/.creds-1-jane@example.org.enc`]: '!!!not base64 json', [`${ROOT}/sessions/1-jane_example.org/.credentials.json`]: undefined };
  const found = await ccswapSource.list(context(broken));
  assert.deepEqual(found.map(({ login }) => login.credentials.token), ['slot2-backup', 'codex-slot1']);
  const escaping = { [`${ROOT}/sequence.json`]: { accounts: { 1: { email: '../../etc/passwd' } } } };
  assert.deepEqual(await ccswapSource.list(context(escaping)), []);
  assert.deepEqual(await ccswapSource.list(context({})), []);
});

test('Claude Code, ccswap, and Codex CLI merge into accounts, and an expired slot stays expired', async () => {
  const files = { ...store,
    '/fake/.claude/.credentials.json': claudeFile('live-token', later),
    '/fake/.claude.json': { oauthAccount: { accountUuid: 'u1', organizationUuid: 'o1', emailAddress: 'jane@example.org' } },
    '/fake/.codex/auth.json': { tokens: { access_token: 'codex-cli', account_id: 'account-1' } },
  };
  const seen = [];
  const request = async (url, init) => {
    seen.push(init.headers.Authorization);
    return url.includes('anthropic') ? { five_hour: { utilization: 5 } } : { plan_type: 'plus', rate_limit: { primary_window: { used_percent: 1 } } };
  };
  const report = await new UsageService([claude, codex], { local: context(files), request, cache: new UsageCache(), sources: [ccswapSource] }).collect();

  const claudes = report.providers.filter(item => item.providerId === 'claude');
  assert.equal(claudes.length, 2);
  assert.deepEqual(claudes[0].account.sources, [{ name: 'Claude Code', inUse: true }, { name: 'ccswap slot 1', inUse: false }]);
  assert.equal(claudes[0].account.label, 'j***@e***.org');
  assert.equal(claudes[0].availability, 'available');
  assert.equal(claudes[1].account.label, 'work');
  assert.equal(claudes[1].reason.code, 'token_expired');
  assert.ok(!seen.includes('Bearer slot2-backup'));

  const codexes = report.providers.filter(item => item.providerId === 'codex');
  assert.equal(codexes.length, 1);
  assert.deepEqual(codexes[0].account.sources, [{ name: 'Codex CLI', inUse: true }, { name: 'ccswap slot 1', inUse: false }]);
  assert.ok(!JSON.stringify(report).includes('@example.org') && !JSON.stringify(report).includes('@corp.example'));
});
