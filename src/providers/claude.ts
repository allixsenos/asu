import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { UsageError } from '../errors.js';
import { detectCommands, homePath } from '../local.js';
import { emptyUsage } from '../models.js';
import type { UsageData } from '../models.js';
import type { Credentials, Login, Provider } from './base.js';
import { firstCredentials } from './base.js';
import type { LocalContext } from '../local.js';
import { credentialObject, nonnegative, object, optionalObject, percent, requireUsage, slug, string, timestamp, title } from './parse.js';

interface Scope { model?: { id?: string; name: string }; surface?: { id?: string; name: string } }
interface ScopedWindow { scope: Scope; percent: number | null; reset: string | null }
function sameScope(a: Scope, b: Scope): boolean {
  return (['model', 'surface'] as const).every(dimension => {
    const x = a[dimension], y = b[dimension];
    if (!x || !y) return x === y;
    return x.id && y.id ? x.id === y.id : slug(x.name) === slug(y.name);
  });
}
function scopeId(scope: Scope): string {
  return (['model', 'surface'] as const).flatMap(dimension => {
    const entry = scope[dimension];
    if (!entry) return [];
    // Hash API identities without folding punctuation or case together.
    const identity = entry.id ? createHash('sha256').update(entry.id).digest('hex').slice(0, 12) : slug(entry.name).slice(0, 35);
    return [`${dimension}-${identity}`];
  }).join('-');
}
export function normalizeClaude(payload: unknown, metadata: Record<string, string> = {}): UsageData {
  const raw = object(payload), data = emptyUsage();
  for (const [key, label] of [['five_hour', '5 hours'], ['seven_day', 'Weekly']] as const) {
    if (raw[key] == null) continue;
    const window = object(raw[key]);
    data.windows.push({ id: key, label, percentUsed: percent(window.utilization), resetsAt: timestamp(window.resets_at) });
  }
  const scoped: ScopedWindow[] = [];
  let skipped = 0;
  for (const [key, value] of Object.entries(raw)) {
    if (!key.startsWith('seven_day_') || value == null) continue;
    try {
      const window = object(value), name = title(key.slice(10));
      const scope = key === 'seven_day_oauth_apps' ? { surface: { name } } : { model: { name } };
      scoped.push({ scope, percent: percent(window.utilization), reset: timestamp(window.resets_at) });
    } catch { skipped++; }
  }
  for (const section of [raw.limits, raw.model_scoped]) {
    if (section == null) continue;
    if (!Array.isArray(section)) { skipped++; continue; }
    for (const value of section) {
      try {
        const entry = object(value);
        if (entry.kind !== 'weekly_scoped') continue;
        const rawScope = object(entry.scope), scope: Scope = {};
        for (const dimension of ['model', 'surface'] as const) {
          const part = optionalObject(rawScope[dimension]);
          const id = string(part.id), name = string(part.display_name) ?? id;
          if (name) scope[dimension] = { id, name };
        }
        if (!scope.model && !scope.surface) { skipped++; continue; }
        const next = { scope, percent: entry.percent == null ? null : percent(entry.percent), reset: timestamp(entry.resets_at) };
        const index = scoped.findIndex(item => sameScope(item.scope, scope));
        if (index < 0) scoped.push(next);
        else scoped[index] = { ...next, percent: next.percent ?? scoped[index]!.percent, reset: next.reset ?? scoped[index]!.reset };
      } catch { skipped++; }
    }
  }
  const ids = new Set<string>();
  for (const item of scoped) {
    const baseId = `weekly-${scopeId(item.scope)}`;
    let id = baseId, suffix = 2;
    while (ids.has(id)) id = `${baseId}-${suffix++}`;
    ids.add(id);
    data.windows.push({ id, label: `Weekly · ${[item.scope.model?.name, item.scope.surface?.name].filter(Boolean).join(' / ')}`,
      percentUsed: item.percent, resetsAt: item.reset,
      scope: { model: item.scope.model?.name, surface: item.scope.surface?.name } });
  }
  const extra = optionalObject(raw.extra_usage);
  if (typeof extra.is_enabled === 'boolean') data.details.push({ label: 'Extra usage', value: extra.is_enabled ? 'Enabled' : 'Disabled' });
  requireUsage(data); // A locally known plan must not make an empty API response appear valid.
  if (skipped) data.details.push({ label: 'Response warning', value: `${skipped} unrecognized scoped limits omitted` });
  const plan = metadata.subscriptionType;
  if (plan) {
    const multiplier = metadata.rateLimitTier?.match(/(?:^|_)(\d+x)(?:_|$)/)?.[1];
    data.planLabel = `${title(plan)}${multiplier ? ` ${multiplier}` : ''}`;
  }
  return data;
}
/** Claude Code's credential file shape. Exported for the ccswap source, whose backups are copies of it. */
export function parseCredentials(raw: unknown): Credentials | null {
  const root = credentialObject(raw);
  if (root.claudeAiOauth == null) return null;
  const oauth = credentialObject(root.claudeAiOauth), token = string(oauth.accessToken);
  if (!token) return null;
  const metadata: Record<string, string> = {};
  for (const field of ['subscriptionType', 'rateLimitTier']) {
    const value = string(oauth[field]);
    if (value) metadata[field] = value;
  }
  return { token, metadata, expiresAt: nonnegative(oauth.expiresAt) };
}
/** Claude Code keeps the account identity beside its settings, not with the token. A missing or unreadable file leaves the login unidentified. */
async function claudeIdentity(context: LocalContext): Promise<Pick<Login, 'accountKey' | 'email'>> {
  try {
    const dir = context.env.CLAUDE_CONFIG_DIR;
    const raw = await context.readJson(dir ? join(homePath(context, dir, '.claude'), '.claude.json') : join(context.home, '.claude.json'));
    const account = optionalObject(optionalObject(raw).oauthAccount);
    const uuid = string(account.accountUuid);
    return { accountKey: uuid ? `${uuid}:${string(account.organizationUuid) ?? ''}` : undefined, email: string(account.emailAddress) };
  } catch { return {}; }
}
export const claude: Provider = {
  id: 'claude', displayName: 'Claude', version: 1,
  detect: context => detectCommands(context, ['claude']),
  async listLogins(context) {
    let failure: unknown;
    let credentials: Credentials | null = null;
    try {
      const home = homePath(context, context.env.CLAUDE_CONFIG_DIR || context.env.CLAUDE_HOME, '.claude');
      const raw = await context.readJson(join(home, '.credentials.json'));
      credentials = raw == null ? null : parseCredentials(raw);
    } catch (error) { failure = error; }
    if (!credentials && context.platform === 'darwin') {
      const raw = await context.keychain('Claude Code-credentials', value => {
        try { return parseCredentials(JSON.parse(value)) !== null; } catch { return false; }
      });
      if (raw) {
        try { credentials = parseCredentials(JSON.parse(raw)); }
        catch { failure = new UsageError('invalid_credentials'); }
      }
    }
    if (!credentials) { if (failure) throw failure; return []; }
    return [{ credentials, source: 'Claude Code', inUse: true, ...await claudeIdentity(context) }];
  },
  resolveCredentials: context => firstCredentials(claude.listLogins!(context)),
  async fetchUsage(context, credentials) {
    const raw = await context.request('https://api.anthropic.com/api/oauth/usage', {
      signal: context.signal, headers: { Authorization: `Bearer ${credentials.token}`, 'anthropic-beta': 'oauth-2025-04-20' },
    });
    return normalizeClaude(raw, credentials.metadata);
  },
};
