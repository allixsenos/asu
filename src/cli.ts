#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { UsageCache } from './cache.js';
import { createLocalContext, homePath } from './local.js';
import { loadProviders } from './registry.js';
import { UsageService } from './service.js';
import { render } from './output.js';
import type { OutputFormat } from './output.js';

export const help = `asu — agent subscription usage

Usage: asu [usage] [options]

  --format plain|table|json   Output format (table in a terminal, plain when piped)
  --json                     Shortcut for --format json
  --plain                    Shortcut for --format plain
  --table                    Shortcut for --format table
  --provider <id>             Select provider; repeat or use comma-separated IDs
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
  let format: OutputFormat = process.stdout.isTTY ? 'table' : 'plain';
  try {
    const { values, positionals } = parseArgs({ args, allowPositionals: true, strict: true, options: {
      format: { type: 'string' }, json: { type: 'boolean' }, plain: { type: 'boolean' }, table: { type: 'boolean' },
      provider: { type: 'string', multiple: true }, all: { type: 'boolean' }, fresh: { type: 'boolean' },
      'no-cache': { type: 'boolean' }, 'cache-dir': { type: 'string' }, plugin: { type: 'string', multiple: true },
      help: { type: 'boolean', short: 'h' }, version: { type: 'boolean', short: 'v' },
    } });
    if (values.help) { process.stdout.write(help); return 0; }
    if (values.version) { process.stdout.write('0.1.0\n'); return 0; }
    if (positionals.length > 1 || positionals.length === 1 && positionals[0] !== 'usage') throw new Error('Expected asu [usage]. See --help.');
    const formats = [values.format, values.json ? 'json' : undefined, values.plain ? 'plain' : undefined, values.table ? 'table' : undefined].filter(Boolean);
    if (formats.length > 1 || formats.some(value => !['plain', 'table', 'json'].includes(value!))) throw new Error('Choose one output format: plain, table, or json.');
    format = formats[0] as OutputFormat ?? format;
    const providers = await loadProviders(values.plugin);
    const providerIds = values.provider?.flatMap(value => value.split(',')).map(value => value.trim());
    if (providerIds?.some(id => !providers.some(provider => provider.id === id))) throw new Error('Unknown provider ID. See --help for built-ins.');
    const local = createLocalContext();
    const cacheRoot = homePath(local, local.env.XDG_CACHE_HOME, '.cache');
    const directory = homePath(local, values['cache-dir'] ?? local.env.ASU_CACHE_DIR, `${cacheRoot}/asu`);
    const service = new UsageService(providers, { local, cache: new UsageCache(values['no-cache'] ? undefined : directory) });
    const report = await service.collect({ providerIds, fresh: values.fresh });
    if (!values.all && !providerIds?.length) report.providers = report.providers.filter(provider =>
      provider.installed || provider.credentialsPresent || provider.reason?.code !== 'missing_credentials');
    process.stdout.write(render(report, format, process.stdout.columns));
    return report.providers.some(provider => provider.availability === 'available') ? 0 : 1;
  } catch (error) {
    // All errors exposed here are ours; do not print plugin/import/runtime exception messages.
    const messages = ['Expected asu [usage]. See --help.', 'Choose one output format: plain, table, or json.',
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
