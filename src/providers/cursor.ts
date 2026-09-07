import { join } from 'node:path';
import { UsageError } from '../errors.js';
import { detectCommands, homePath } from '../local.js';
import type { LocalContext } from '../local.js';
import { emptyUsage } from '../models.js';
import type { UsageData } from '../models.js';
import type { Provider } from './base.js';
import { credentialObject, nonnegative, object, optionalObject, ratio, requireUsage, string, timestamp } from './parse.js';

export function cursorDatabasePaths(context: LocalContext): string[] {
  const suffix = ['Cursor', 'User', 'globalStorage', 'state.vscdb'];
  if (context.platform === 'win32') return context.env.APPDATA ? [join(context.env.APPDATA, ...suffix)] : [];
  if (context.platform === 'darwin') return [join(context.home, 'Library', 'Application Support', ...suffix)];
  return [join(homePath(context, context.env.XDG_CONFIG_HOME, '.config'), ...suffix)];
}
export function normalizeCursor(payload: unknown): UsageData {
  const raw = object(payload), data = emptyUsage(), plan = optionalObject(raw.planUsage);
  const used = nonnegative(plan.totalSpend), limit = nonnegative(plan.limit), remaining = nonnegative(plan.remaining);
  if (used !== undefined || remaining !== undefined || limit !== undefined) {
    data.balances.push({ id: 'plan', label: 'Plan usage', unit: 'USD',
      used: used === undefined ? undefined : used / 100,
      remaining: remaining === undefined ? undefined : remaining / 100,
      limit: limit === undefined ? undefined : limit / 100 });
    data.windows.push({ id: 'billing-period', label: 'Billing period',
      percentUsed: ratio(used, limit), resetsAt: timestamp(raw.billingCycleEnd) });
  }
  return requireUsage(data);
}
export const cursor: Provider = {
  id: 'cursor', displayName: 'Cursor', version: 1, experimental: true,
  detect: context => detectCommands(context, ['cursor', 'cursor-agent'],
    context.platform === 'darwin' ? ['/Applications/Cursor.app', join(context.home, 'Applications', 'Cursor.app')] : []),
  async resolveCredentials(context) {
    const token = string(context.env.CURSOR_ACCESS_TOKEN) ?? string(context.env.CURSOR_TOKEN);
    if (token) return { token };
    let failure: unknown;
    for (const path of cursorDatabasePaths(context)) {
      try {
        const modern = await context.sqliteToken(path, 'cursorAuth/accessToken');
        if (modern) return { token: modern };
        const legacy = await context.sqliteToken(path, 'cursorAuthStatus');
        if (legacy) {
          const token = string(credentialObject(JSON.parse(legacy)).accessToken);
          if (token) return { token };
        }
      } catch { failure = new UsageError('credential_read_error'); }
    }
    const config = homePath(context, context.env.XDG_CONFIG_HOME, '.config');
    const raw = await context.readJson(join(config, 'cursor', 'auth.json'));
    if (raw != null) { const token = string(credentialObject(raw).accessToken); if (token) return { token }; }
    if (failure) throw failure;
    return null;
  },
  async fetchUsage(context, credentials) {
    return normalizeCursor(await context.request('https://api2.cursor.sh/aiserver.v1.DashboardService/GetCurrentPeriodUsage', {
      method: 'POST', body: {}, signal: context.signal,
      headers: { Authorization: `Bearer ${credentials.token}`, 'Connect-Protocol-Version': '1' },
    }));
  },
};
