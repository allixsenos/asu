import { join } from 'node:path';
import { detectCommands } from '../local.js';
import { emptyUsage } from '../models.js';
import type { UsageData } from '../models.js';
import type { Provider } from './base.js';
import { credentialObject, nonnegative, object, optionalObject, percent, ratio, requireUsage, string, timestamp } from './parse.js';

function cents(raw: unknown): number | undefined {
  if (raw == null) return undefined;
  const amount = object(raw);
  // Protobuf omits zero scalar values: an explicitly present {} Cent means zero.
  return nonnegative(amount.val ?? 0);
}
export function normalizeGrok(payload: unknown): UsageData {
  const raw = object(payload), config = optionalObject(raw.config), data = emptyUsage();
  data.planLabel = string(raw.subscription_tier) ?? string(raw.subscriptionTier) ?? null;
  const used = cents(config.used), limit = cents(config.monthlyLimit), prepaid = cents(config.prepaidBalance);
  const current = optionalObject(config.currentPeriod);
  const resetsAt = timestamp(current.end ?? config.billingPeriodEnd);
  const percentUsed = config.creditUsagePercent == null ? ratio(used, limit) : percent(config.creditUsagePercent);
  if (percentUsed !== null) data.windows.push({ id: 'included', label: string(current.type)?.includes('WEEKLY') ? 'Weekly' : 'Billing period', percentUsed, resetsAt });
  if (used !== undefined || limit !== undefined) data.balances.push({ id: 'included', label: 'Included allowance', unit: 'USD',
    used: used === undefined ? undefined : used / 100, limit: limit === undefined ? undefined : limit / 100,
    remaining: used === undefined || limit === undefined ? undefined : Math.max(0, limit - used) / 100 });
  if (prepaid !== undefined) data.balances.push({ id: 'prepaid', label: 'Prepaid balance', unit: 'USD', remaining: prepaid / 100 });
  if (config.isUnifiedBillingUser === true) data.details.push({ label: 'Billing', value: 'Shared subscription usage' });
  return requireUsage(data);
}
export const grok: Provider = {
  id: 'grok', displayName: 'Grok', version: 1, experimental: true,
  detect: context => detectCommands(context, ['grok']),
  async resolveCredentials(context) {
    const token = string(context.env.GROK_API_KEY) ?? string(context.env.GROK_TOKEN);
    if (token) return { token };
    const raw = await context.readJson(join(context.home, '.grok', 'auth.json'));
    if (raw == null) return null;
    const auth = credentialObject(raw), legacy = string(auth.access_token);
    if (legacy) return { token: legacy };
    for (const [key, value] of Object.entries(auth)) {
      if (!key.startsWith('https://auth.x.ai::')) continue;
      const token = string(credentialObject(value).key);
      if (token) return { token };
    }
    return null;
  },
  async fetchUsage(context, credentials) {
    return normalizeGrok(await context.request('https://cli-chat-proxy.grok.com/v1/billing?format=credits', {
      signal: context.signal, headers: { Authorization: `Bearer ${credentials.token}`, 'X-XAI-Token-Auth': 'xai-grok-cli' },
    }));
  },
};
