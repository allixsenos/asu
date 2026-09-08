import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { renderPlain, renderTable, render } from '../dist/output.js';
import { reportSchema } from '../dist/models.js';

const exec = promisify(execFile);
const cli = resolve('dist/cli.js');
const report = { schemaVersion: 1, generatedAt: '2026-09-07T12:00:00.000Z', warnings: [], providers: [{
  providerId: 'example', displayName: 'Example', planLabel: 'Pro', installed: true, credentialsPresent: true,
  authenticated: true, availability: 'available', experimental: false, reason: null, cached: false,
  fetchedAt: '2026-09-07T12:00:00.000Z', expiresAt: '2026-09-07T12:05:00.000Z',
  windows: [{ id: 'session', label: '5 hours', percentUsed: 25, resetsAt: '2026-09-07T16:00:00.000Z' },
    { id: 'weekly', label: 'Weekly', percentUsed: 0, resetsAt: null },
    { id: 'monthly', label: 'Monthly', percentUsed: 50, resetsAt: '2026-09-14T12:00:00.000Z' },
    { id: 'unlimited', label: 'Chat', percentUsed: null, resetsAt: null, unlimited: true }],
  balances: [{ id: 'credits', label: 'Credits', remaining: 4.5, unit: 'credits' }],
  details: [{ label: 'Extra usage', value: 'Disabled' }],
}] };

test('plain, table and JSON present zero, unknown and unlimited without inventing quantities', () => {
  const plain = renderPlain(report, { utc: true });
  assert.ok(plain.includes('25% used; resets 2026-09-07T16:00:00.000Z'));
  assert.ok(plain.includes('Weekly: 0% used; resets unknown'));
  assert.ok(plain.includes('Chat: Unlimited'));
  assert.ok(plain.includes('4.5 credits left'));
  assert.ok(!plain.includes('\x1b'));
  const table = renderTable(report, { utc: true });
  assert.ok(table.includes('┌'));
  assert.ok(table.includes('Resets (UTC)'));
  assert.ok(table.includes('2026-09-07 16:00'));
  assert.ok(table.includes('25% used'));
  assert.ok(table.includes('Unlimited'));
  assert.deepEqual(reportSchema.parse(JSON.parse(render(report, 'json'))), report);
});
test('plain and table show times relative to now unless --utc is passed', () => {
  const now = Date.parse('2026-09-07T13:30:00.000Z');
  const plain = renderPlain(report, { now });
  assert.ok(plain.includes('5 hours: 25% used; resets in 2h30m'));
  assert.ok(plain.includes('Weekly: 0% used; resets unknown'));
  // A reset a day or more away also names the calendar day. Noon UTC keeps the day stable across time zones.
  assert.ok(plain.includes('Monthly: 50% used; resets in 6d22h (Mon 14 Sep)'));
  assert.ok(plain.includes('Fetched 1h30m ago; fresh; expires now'));
  const table = renderTable(report, { now });
  assert.ok(table.includes('Resets in'));
  assert.ok(table.includes('│ 2h30m'));
  assert.ok(table.includes('│ 6d22h (Mon 14 Sep)'));
  assert.ok(table.includes('│ Unknown'));
  assert.ok(table.includes('Fetched 1h30m ago; cache expires now.'));
  const soon = renderPlain(report, { now: Date.parse('2026-09-07T12:00:20.000Z') });
  assert.ok(soon.includes('Fetched <1m ago; fresh; expires in 5m'));
  const late = renderPlain(report, { now: Date.parse('2026-09-04T10:00:00.000Z') });
  assert.match(late, /resets in 3d6h \((Mon 7|Tue 8) Sep\)/);
  assert.ok(!JSON.parse(render(report, 'json', { now })).providers[0].windows[0].resetsAt.includes('in '));
});
test('table wraps rather than dropping values in narrow terminals', () => {
  const table = renderTable(report, { columns: 60 });
  const grid = table.split('\n').filter(line => /^[┌│├└]/.test(line));
  assert.ok(grid.every(line => [...line].length <= 60));
  assert.ok(table.includes('Weekly'));
});
test('CLI emits standalone JSON through an explicitly loaded provider plugin', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'asu-cli-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const plugin = join(directory, 'fixture.mjs');
  await writeFile(plugin, `export default {id:'fixture',displayName:'Fixture',version:1,
    detect:async()=>true,resolveCredentials:async()=>({token:'fixture-private-secret'}),
    fetchUsage:async()=>(${JSON.stringify({ planLabel: 'Test', windows: report.providers[0].windows, balances: [], details: [] })})};`);
  const args = [cli, '--plugin', plugin, '--provider', 'fixture', '--json', '--cache-dir', join(directory, 'cache')];
  const first = await exec(process.execPath, args);
  assert.equal(first.stderr, '');
  const parsed = reportSchema.parse(JSON.parse(first.stdout));
  assert.equal(parsed.providers.length, 1);
  assert.equal(parsed.providers[0].providerId, 'fixture');
  assert.equal(parsed.providers[0].cached, false);
  assert.ok(!first.stdout.includes('fixture-private-secret'));
  const second = await exec(process.execPath, args);
  assert.equal(JSON.parse(second.stdout).providers[0].cached, true);
  const plain = await exec(process.execPath, [cli, '--plugin', plugin, '--provider', 'fixture', '--no-cache']);
  assert.ok(plain.stdout.startsWith('ASU'));
  assert.ok(!plain.stdout.includes('┌'));
  const link = join(directory, 'asu');
  await symlink(cli, link);
  const linked = await exec(process.execPath, [link, '--version']);
  assert.equal(linked.stdout, '0.1.0\n');
});
test('CLI errors stay on stderr with stable exit codes', async () => {
  for (const args of [['--format', 'xml'], ['--json', '--table'], ['--provider', 'does-not-exist'], ['--unknown']]) {
    await assert.rejects(exec(process.execPath, [cli, ...args]), error => {
      assert.equal(error.code, 2);
      assert.equal(error.stdout, '');
      assert.ok(error.stderr.startsWith('asu: '));
      return true;
    });
  }
  const help = await exec(process.execPath, [cli, '--help']);
  assert.ok(help.stdout.includes('plain|table|json'));
});
