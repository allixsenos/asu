import { join } from 'node:path';
import { UsageError } from '../errors.js';
import { detectCommands } from '../local.js';
import { emptyUsage } from '../models.js';
import type { UsageData } from '../models.js';
import type { Credentials, Login, Provider } from './base.js';
import { firstCredentials } from './base.js';
import { credentialObject, list, nonnegative, object, optionalObject, percent, ratio, requireUsage, slug, string, timestamp } from './parse.js';

function baseUrl(value: string | undefined, region?: string): string {
  if (!value) return region === 'cn' ? 'https://api.minimaxi.com' : 'https://api.minimax.io';
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) throw new Error();
    if (['api.minimaxi.com', 'www.minimaxi.com'].includes(url.hostname)) return url.origin;
    if (['api.minimax.io', 'www.minimax.io'].includes(url.hostname)) return url.origin;
  } catch { /* Never forward a subscription key to an arbitrary configured host. */ }
  throw new UsageError('invalid_credentials');
}
/** MiniMax credentials pinned to a recognized host. Exported for the opencode source. */
export function auth(token: string, url: string | undefined, region?: string, expiry?: unknown): Credentials {
  const expiresAt = timestamp(expiry);
  return { token, metadata: { baseUrl: baseUrl(url, region) }, expiresAt: expiresAt ? Date.parse(expiresAt) : undefined };
}
export function normalizeMiniMax(payload: unknown): UsageData {
  const raw = object(payload), data = emptyUsage(), status = optionalObject(raw.base_resp);
  if (status.status_code != null && status.status_code !== 0 && status.status_code !== '0')
    throw new UsageError(status.status_code === 1004 ? 'unauthorized' : 'provider_error');
  for (const [index, value] of list(raw.model_remains).entries()) {
    const model = object(value), name = string(model.model_name) ?? 'Token plan';
    for (const [prefix, label, reset] of [['current_interval', '5 hours', model.end_time], ['current_weekly', 'Weekly', model.weekly_end_time]] as const) {
      const remaining = nonnegative(model[`${prefix}_remaining_percent`]);
      if (remaining !== undefined && remaining > 100) throw new UsageError('invalid_response');
      const used = nonnegative(model[`${prefix}_usage_count`]), limit = nonnegative(model[`${prefix}_total_count`]);
      const percentUsed = remaining === undefined ? ratio(used, limit) : percent(100 - remaining);
      if (percentUsed === null) continue;
      data.windows.push({ id: `${slug(name).slice(0, 50)}-${index}-${prefix}`, label: `${name} · ${label}`,
        percentUsed, resetsAt: timestamp(reset), scope: { model: name } });
    }
  }
  return requireUsage(data);
}
export const minimax: Provider = {
  id: 'minimax', displayName: 'MiniMax', version: 1, experimental: true,
  detect: context => detectCommands(context, ['mmx', 'minimax']),
  async listLogins(context) {
    const logins: Login[] = [];
    const token = string(context.env.MINIMAX_API_KEY);
    if (token) logins.push({ credentials: auth(token, string(context.env.MINIMAX_BASE_URL), string(context.env.MINIMAX_REGION)), source: 'MINIMAX_API_KEY' });
    const cli = (credentials: Credentials) => logins.push({ credentials, source: 'MiniMax CLI', inUse: !logins.some(login => login.source === 'MiniMax CLI') });
    const raw = await context.readJson(join(context.home, '.mmx', 'credentials.json'));
    if (raw != null) {
      const credentials = credentialObject(raw), access = string(credentials.access_token);
      if (access) cli(auth(access, string(credentials.resource_url), undefined, credentials.expires_at));
    }
    const configRaw = await context.readJson(join(context.home, '.mmx', 'config.json'));
    if (configRaw != null) {
      const config = credentialObject(configRaw), apiKey = string(config.api_key);
      if (apiKey) cli(auth(apiKey, string(config.base_url), string(config.region)));
      const oauth = config.oauth == null ? {} : credentialObject(config.oauth), accessToken = string(oauth.access_token);
      if (accessToken) cli(auth(accessToken, string(oauth.resource_url) ?? string(config.base_url), string(config.region), oauth.expires_at));
    }
    return logins;
  },
  resolveCredentials: context => firstCredentials(minimax.listLogins!(context)),
  async fetchUsage(context, credentials) {
    return normalizeMiniMax(await context.request(`${credentials.metadata?.baseUrl ?? 'https://api.minimax.io'}/v1/token_plan/remains`, {
      signal: context.signal, headers: { Authorization: `Bearer ${credentials.token}`, 'Content-Type': 'application/json' },
    }));
  },
};
