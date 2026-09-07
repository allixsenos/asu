import { join } from 'node:path';
import { detectCommands, homePath } from '../local.js';
import { emptyUsage } from '../models.js';
import type { UsageData } from '../models.js';
import type { Provider } from './base.js';
import { credentialObject, list, nonnegative, number, object, optionalObject, percent, requireUsage, slug, string, timestamp, title } from './parse.js';

export function normalizeCodex(payload: unknown, now = Date.now()): UsageData {
  const raw = object(payload), data = emptyUsage();
  const plan = string(raw.plan_type);
  data.planLabel = plan ? title(plan) : null;
  function windows(value: unknown, prefix: string, label: string) {
    const limits = optionalObject(value);
    for (const [key, fallback] of [['primary_window', 'Primary'], ['secondary_window', 'Secondary']] as const) {
      if (limits[key] == null) continue;
      const window = object(limits[key]);
      const seconds = nonnegative(window.limit_window_seconds);
      const period = seconds === 18_000 ? '5 hours' : seconds === 604_800 ? 'Weekly'
        : seconds ? `${seconds / 3600} hours` : fallback;
      const resetAfter = nonnegative(window.reset_after_seconds);
      data.windows.push({ id: `${prefix}-${key}`, label: `${label}${period}`,
        percentUsed: percent(window.used_percent),
        resetsAt: timestamp(window.reset_at ?? (resetAfter === undefined ? undefined : now + resetAfter * 1000)) });
    }
  }
  windows(raw.rate_limit, 'usage', '');
  windows(raw.code_review_rate_limit, 'code-review', 'Code review · ');
  for (const [index, value] of list(raw.additional_rate_limits).entries()) {
    const entry = object(value), name = string(entry.limit_name) ?? string(entry.metered_feature) ?? `Additional ${index + 1}`;
    windows(entry.rate_limit, `additional-${index}-${slug(name).slice(0, 45)}`, `${title(name)} · `);
  }
  const credits = optionalObject(raw.credits), balance = number(credits.balance);
  if (balance !== undefined || typeof credits.unlimited === 'boolean')
    data.balances.push({ id: 'credits', label: 'Credits', unit: 'credits', remaining: balance, unlimited: credits.unlimited === true });
  if (typeof credits.has_credits === 'boolean') data.details.push({ label: 'Credits available', value: credits.has_credits ? 'Yes' : 'No' });
  return requireUsage(data);
}
export const codex: Provider = {
  id: 'codex', displayName: 'Codex', version: 1,
  detect: context => detectCommands(context, ['codex']),
  async resolveCredentials(context) {
    const paths = [
      ...(context.env.CODEX_HOME ? [join(homePath(context, context.env.CODEX_HOME, '.codex'), 'auth.json')] : []),
      join(context.home, '.config', 'codex', 'auth.json'), join(context.home, '.codex', 'auth.json'),
    ];
    for (const path of new Set(paths)) {
      const raw = await context.readJson(path);
      if (raw == null) continue;
      const root = credentialObject(raw);
      if (root.tokens == null) continue;
      const tokens = credentialObject(root.tokens), token = string(tokens.access_token);
      if (token) return { token, accountId: string(tokens.account_id) };
    }
    return null;
  },
  async fetchUsage(context, credentials) {
    const headers: Record<string, string> = { Authorization: `Bearer ${credentials.token}` };
    if (credentials.accountId) headers['ChatGPT-Account-Id'] = credentials.accountId;
    const raw = await context.request('https://chatgpt.com/backend-api/wham/usage', { signal: context.signal, headers });
    return normalizeCodex(raw, context.now());
  },
};
