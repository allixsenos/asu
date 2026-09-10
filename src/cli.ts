#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { UsageCache } from './cache.js';
import { createLocalContext, homePath } from './local.js';
import { loadProviders } from './registry.js';
import { UsageService } from './service.js';
import { barsOverflow, render, tableWraps } from './output.js';
import type { OutputFormat } from './output.js';
import { name, version } from './version.js';
import { checkForUpdate } from './update.js';
import { createTransport } from './transport.js';

export const help = `asu — agent subscription usage

Usage: asu [usage] [provider...] [options]

  asu                        Every detected provider
  asu claude                 One provider, by its bare name
  asu claude codex --plain   Several providers, with options anywhere

  --format plain|table|bars|json
                             Output format (bars in a terminal, plain when piped or when a line would wrap)
  --bars                     Shortcut for --format bars: one bar per window, colored in a terminal
  --table                    Shortcut for --format table
  --plain                    Shortcut for --format plain
  --json                     Shortcut for --format json
  --utc                      Print full UTC timestamps instead of times relative to now
  --provider <id>             Select provider; same as a bare name, repeat or use comma-separated IDs
  --all                      Include providers with no detected install or credentials
  --fresh                    Fetch again, bypassing the five-minute cache
  --no-cache                 Do not read or write the persistent cache
  --cache-dir <path>          Override the private usage cache directory
  --plugin <path-or-package>  Load a trusted provider plugin; repeatable
  --help, -h                 Show this help
  --version, -v              Show version

Providers: claude, codex, copilot, cursor, zai, grok, kimi, minimax
Credentials are read-only. Sign in and refresh tokens through the provider CLI.
JSON has schemaVersion: 1. Diagnostics go to stderr; stdout contains only the report.
Exit codes: 0 at least one available provider; 1 none available; 2 invocation error.
`;

export async function run(args = process.argv.slice(2)): Promise<number> {
  let format: OutputFormat = process.stdout.isTTY ? 'bars' : 'plain';
  try {
    const { values, positionals } = parseArgs({ args, allowPositionals: true, strict: true, options: {
      format: { type: 'string' }, json: { type: 'boolean' }, plain: { type: 'boolean' }, table: { type: 'boolean' }, bars: { type: 'boolean' }, utc: { type: 'boolean' },
      provider: { type: 'string', multiple: true }, all: { type: 'boolean' }, fresh: { type: 'boolean' },
      'no-cache': { type: 'boolean' }, 'cache-dir': { type: 'string' }, plugin: { type: 'string', multiple: true },
      help: { type: 'boolean', short: 'h' }, version: { type: 'boolean', short: 'v' },
    } });
    if (values.help) { process.stdout.write(help); return 0; }
    if (values.version) { process.stdout.write(`${version}\n`); return 0; }
    // Bare words are provider names. A leading "usage" stays accepted for compatibility.
    const names = positionals[0] === 'usage' ? positionals.slice(1) : positionals;
    const formats = [values.format, values.json ? 'json' : undefined, values.plain ? 'plain' : undefined, values.table ? 'table' : undefined, values.bars ? 'bars' : undefined].filter(Boolean);
    if (formats.length > 1 || formats.some(value => !['plain', 'table', 'bars', 'json'].includes(value!))) throw new Error('Choose one output format: plain, table, bars, or json.');
    const explicit = formats.length > 0;
    format = formats[0] as OutputFormat ?? format;
    const providers = await loadProviders(values.plugin);
    const selected = [...(values.provider ?? []), ...names].flatMap(value => value.split(',')).map(value => value.trim()).filter(Boolean);
    const providerIds = selected.length ? selected : undefined;
    if (providerIds?.some(id => !providers.some(provider => provider.id === id))) throw new Error('Unknown provider ID. See --help for built-ins.');
    const local = createLocalContext();
    const cacheRoot = homePath(local, local.env.XDG_CACHE_HOME, '.cache');
    const directory = homePath(local, values['cache-dir'] ?? local.env.ASU_CACHE_DIR, `${cacheRoot}/asu`);
    const service = new UsageService(providers, { local, cache: new UsageCache(values['no-cache'] ? undefined : directory) });
    const report = await service.collect({ providerIds, fresh: values.fresh });
    if (!values.all && !providerIds?.length) report.providers = report.providers.filter(provider =>
      provider.installed || provider.credentialsPresent || provider.reason?.code !== 'missing_credentials');
    const options = { columns: process.stdout.columns, utc: values.utc, color: Boolean(process.stdout.isTTY && !process.env.NO_COLOR) };
    // A view that must wrap in a narrow terminal is harder to read than plain text.
    if (format === 'table' && !explicit && tableWraps(report, options)) format = 'plain';
    if (format === 'bars' && !explicit && barsOverflow(report, options)) format = 'plain';
    process.stdout.write(render(report, format, options));
    // Once a day, after the report, ask npm for a newer version. One line on stderr, never on stdout.
    const env = local.env;
    if (!values['no-cache'] && !env.ASU_NO_UPDATE_CHECK && !env.NO_UPDATE_NOTIFIER && !env.CI) {
      const notice = await checkForUpdate({ directory, request: createTransport(fetch, 2_000, 65_536), name, version });
      if (notice) process.stderr.write(`${notice}\n`);
    }
    return report.providers.some(provider => provider.availability === 'available') ? 0 : 1;
  } catch (error) {
    // All errors exposed here are ours; do not print plugin/import/runtime exception messages.
    const messages = ['Choose one output format: plain, table, bars, or json.',
      'Unknown provider ID. See --help for built-ins.', 'Could not load a provider plugin. Check its path, exports, and unique provider ID.'];
    const message = error instanceof Error && messages.includes(error.message) ? error.message : 'Could not run ASU. Check arguments and plugin configuration; see --help.';
    process.stderr.write(`asu: ${message}\n`);
    return 2;
  }
}
if (process.argv[1] && realpathSync(resolve(process.argv[1])) === fileURLToPath(import.meta.url)) {
  process.stdout.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EPIPE') process.exit(0);
    process.stderr.write('asu: Could not write output.\n'); process.exit(2);
  });
  process.exitCode = await run();
}
