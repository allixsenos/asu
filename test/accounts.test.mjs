import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { accountLabel, accountMatches, maskEmail, mergeLogins } from '../dist/accounts.js';
import { UsageService } from '../dist/service.js';
import { UsageCache } from '../dist/cache.js';
import { createLocalContext } from '../dist/local.js';
import { renderBars, renderPlain, renderTable } from '../dist/output.js';
import { reportSchema } from '../dist/models.js';
import { copilot } from '../dist/providers/copilot.js';

const data = { planLabel: 'Pro', windows: [{ id: 'w', label: 'W', percentUsed: 10, resetsAt: null }], balances: [], details: [] };
const local = createLocalContext({ home: '/fake', env: {} });
const login = (token, extra = {}) => ({ credentials: { token }, source: 'Tool', ...extra });
const provider = overrides => ({ id: 'example', displayName: 'Example', version: 1, detect: async () => true, fetchUsage: async () => data, ...overrides });

test('emails are masked, domain labels too, except the last label and one-letter labels', () => {
  assert.equal(maskEmail('jane@example.org'), 'j***@e***.org');
  assert.equal(maskEmail('sam@x.io'), 's***@x.io');
  assert.equal(maskEmail('someone@mail.example.co.uk'), 's***@m***.e***.c***.uk');
  assert.equal(accountLabel({ alias: 'work', email: 'jane@example.org' }), 'work');
  assert.equal(accountLabel({ handle: 'allixsenos' }), 'a***');
  assert.equal(accountLabel({}), null);
});

test('logins merge by account identity or a shared token, and the longest-lived token wins', () => {
  const accounts = mergeLogins('claude', [
    // No identity and its own token: a separate account that carries only its source.
    login('opencode-token', { source: 'opencode', inUse: true }),
    login('cc-token', { source: 'Claude Code', inUse: true, accountKey: 'u1:o1', email: 'jane@example.org', credentials: { token: 'cc-token', expiresAt: 100 } }),
    // The same token merges.
    login('cc-token', { source: 'backup', credentials: { token: 'cc-token', expiresAt: 100 } }),
    // The same identity merges, and this token lasts longer.
    login('slot-token', { source: 'ccswap slot 1', accountKey: 'u1:o1', credentials: { token: 'slot-token', expiresAt: 200 } }),
    login('other-token', { source: 'ccswap slot 2', accountKey: 'u2:o2' }),
  ]);
  assert.equal(accounts.length, 3);
  const [opencode, main, other] = accounts;
  assert.deepEqual(opencode.sources, [{ name: 'opencode', inUse: true }]);
  assert.equal(accountLabel(opencode), null);
  assert.equal(main.credentials.token, 'slot-token');
  assert.deepEqual(main.sources, [{ name: 'Claude Code', inUse: true }, { name: 'backup', inUse: false }, { name: 'ccswap slot 1', inUse: false }]);
  assert.equal(accountLabel(main), 'j***@e***.org');
  assert.equal(other.inUse, false);
  assert.match(main.id, /^claude:[a-f0-9]{8}$/);
  assert.notEqual(main.id, other.id);
  // A login that links two separate groups merges them.
  assert.equal(mergeLogins('codex', [login('a', { accountKey: 'k' }), login('b'), login('b', { accountKey: 'k' })]).length, 1);
  assert.ok(accountMatches(main, 'JANE@Example.org'));
  assert.ok(accountMatches(main, 'ccswap slot 1'));
  assert.ok(accountMatches(main, 'j***@e***.org'));
  assert.ok(accountMatches(main, main.id));
  assert.ok(!accountMatches(main, 'someone else'));
});

test('each account is fetched once with its sources, and emails reach neither output nor cache unless asked', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'asu-accounts-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const emails = { 'token-a': 'first.person@private.example', 'token-b': 'second@other.example' };
  const seen = [];
  const example = provider({
    listLogins: async () => [
      { credentials: { token: 'token-a' }, source: 'Example CLI', inUse: true, accountKey: 'acct-a', email: emails['token-a'] },
      { credentials: { token: 'token-b' }, source: 'Example CLI', accountKey: 'acct-b', email: emails['token-b'] },
    ],
    // A provider that echoes the email back must not leak it either.
    fetchUsage: async (_, credentials) => { seen.push(credentials.token); return { ...data, details: [{ label: 'Echo', value: emails[credentials.token] }] }; },
  });
  const shared = { id: 'opencode', list: async () => [{ providerId: 'example', login: { credentials: { token: 'token-a' }, source: 'opencode', inUse: true } }] };
  const make = () => new UsageService([example], { local, sources: [shared], cache: new UsageCache(directory) });

  const report = reportSchema.parse(await make().collect());
  assert.equal(report.schemaVersion, 2);
  assert.deepEqual(seen.sort(), ['token-a', 'token-b']);
  assert.equal(report.providers.length, 2);
  const [first, second] = report.providers;
  assert.equal(first.account.label, 'f***@p***.example');
  assert.deepEqual(first.account.sources, [{ name: 'Example CLI', inUse: true }, { name: 'opencode', inUse: true }]);
  assert.equal(second.account.label, 's***@o***.example');
  assert.equal(first.account.email, undefined);
  for (const text of [JSON.stringify(report), renderPlain(report), renderTable(report), renderBars(report)])
    assert.ok(!text.includes('@private.example') && !text.includes('@other.example'));

  const withEmail = await make().collect({ showEmail: true });
  assert.equal(withEmail.providers[0].account.email, emails['token-a']);
  assert.equal(withEmail.providers[0].account.label, emails['token-a']);
  for (const file of (await readdir(directory)).filter(name => name.endsWith('.json'))) {
    const text = await readFile(join(directory, file), 'utf8');
    assert.ok(!text.includes('@private.example') && !text.includes('@other.example'), file);
  }

  const only = await make().collect({ account: 'second@other.example' });
  assert.equal(only.providers.length, 1);
  assert.equal(only.providers[0].account.label, 's***@o***.example');
  assert.equal((await make().collect({ account: 'opencode' })).providers.length, 1);
  assert.equal((await make().collect({ account: 'nobody' })).providers.length, 0);
});

test('a shared store that fails becomes a warning and hides no other login', async () => {
  const example = provider({ listLogins: async () => [{ credentials: { token: 'own' }, source: 'Example CLI', inUse: true }] });
  const broken = { id: 'opencode', list: async () => { throw new Error('secret-bearing message'); } };
  const report = await new UsageService([example], { local, sources: [broken] }).collect();
  assert.equal(report.providers.length, 1);
  assert.equal(report.providers[0].availability, 'available');
  assert.deepEqual(report.warnings, ['Could not read the opencode credential store. Check its permissions and format.']);
  assert.ok(!JSON.stringify(report).includes('secret-bearing'));
});

test('an expired token stays expired: token_expired, no request, and the account still shows', async () => {
  let calls = 0;
  const example = provider({
    listLogins: async () => [{ credentials: { token: 'stale', expiresAt: 1 }, source: 'ccswap slot 3', email: 'k@example.com' }],
    fetchUsage: async () => { calls++; return data; },
  });
  const report = await new UsageService([example], { local, sources: [] }).collect();
  assert.equal(calls, 0);
  assert.equal(report.providers[0].reason.code, 'token_expired');
  assert.equal(report.providers[0].availability, 'unavailable');
  assert.equal(report.providers[0].account.label, 'k***@e***.com');
  const plain = renderPlain(report);
  assert.ok(plain.includes('\n  token expired\n  Account: k***@e***.com\n  Via: ccswap slot 3\n'));
  assert.ok(renderBars(report).includes('Example · k***@e***.com · token expired\n  via ccswap slot 3\n'));
  assert.match(renderTable(report), /^│ Example\s+│\s+│ Reason\s+│ token_expired\s+│/m);
});

test('a plugin with only resolveCredentials reports one account named after the plugin', async () => {
  const legacy = provider({ displayName: 'Legacy', resolveCredentials: async () => ({ token: 'legacy-token' }) });
  const report = await new UsageService([legacy], { local, sources: [] }).collect();
  assert.equal(report.providers.length, 1);
  assert.deepEqual(report.providers[0].account.sources, [{ name: 'Legacy', inUse: false }]);
  assert.equal(report.providers[0].account.label, null);
});

test('GitHub CLI lists every signed-in account, the active one first and in use', async () => {
  const hosts = 'github.com:\n  user: active\n  oauth_token: active-token\n  users:\n    active:\n      oauth_token: active-token\n    second:\n      oauth_token: second-token\n';
  const logins = await copilot.listLogins(createLocalContext({ home: '/fake', env: {}, readText: async () => hosts }));
  assert.deepEqual(logins.map(item => [item.credentials.token, item.inUse, item.handle]),
    [['active-token', true, 'active'], ['active-token', true, 'active'], ['second-token', false, 'second']]);
  const accounts = mergeLogins('copilot', logins);
  assert.deepEqual(accounts.map(accountLabel), ['a***', 's***']);
});
