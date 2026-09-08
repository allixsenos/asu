import { join } from 'node:path';
import { UsageError } from '../errors.js';
import { detectCommands } from '../local.js';
import { emptyUsage } from '../models.js';
import { credentialObject, list, nonnegative, object, optionalObject, percent, ratio, requireUsage, slug, string, timestamp } from './parse.js';
function baseUrl(value, region) {
    if (!value)
        return region === 'cn' ? 'https://api.minimaxi.com' : 'https://api.minimax.io';
    try {
        const url = new URL(value);
        if (url.protocol !== 'https:' || url.username || url.password || url.port)
            throw new Error();
        if (['api.minimaxi.com', 'www.minimaxi.com'].includes(url.hostname))
            return url.origin;
        if (['api.minimax.io', 'www.minimax.io'].includes(url.hostname))
            return url.origin;
    }
    catch { /* Never forward a subscription key to an arbitrary configured host. */ }
    throw new UsageError('invalid_credentials');
}
function auth(token, url, region, expiry) {
    const expiresAt = timestamp(expiry);
    return { token, metadata: { baseUrl: baseUrl(url, region) }, expiresAt: expiresAt ? Date.parse(expiresAt) : undefined };
}
export function normalizeMiniMax(payload) {
    const raw = object(payload), data = emptyUsage(), status = optionalObject(raw.base_resp);
    if (status.status_code != null && status.status_code !== 0 && status.status_code !== '0')
        throw new UsageError(status.status_code === 1004 ? 'unauthorized' : 'provider_error');
    for (const [index, value] of list(raw.model_remains).entries()) {
        const model = object(value), name = string(model.model_name) ?? 'Token plan';
        for (const [prefix, label, reset] of [['current_interval', '5 hours', model.end_time], ['current_weekly', 'Weekly', model.weekly_end_time]]) {
            const remaining = nonnegative(model[`${prefix}_remaining_percent`]);
            if (remaining !== undefined && remaining > 100)
                throw new UsageError('invalid_response');
            const used = nonnegative(model[`${prefix}_usage_count`]), limit = nonnegative(model[`${prefix}_total_count`]);
            const percentUsed = remaining === undefined ? ratio(used, limit) : percent(100 - remaining);
            if (percentUsed === null)
                continue;
            data.windows.push({ id: `${slug(name).slice(0, 50)}-${index}-${prefix}`, label: `${name} · ${label}`,
                percentUsed, resetsAt: timestamp(reset), scope: { model: name } });
        }
    }
    return requireUsage(data);
}
export const minimax = {
    id: 'minimax', displayName: 'MiniMax', version: 1, experimental: true,
    detect: context => detectCommands(context, ['mmx', 'minimax']),
    async resolveCredentials(context) {
        const token = string(context.env.MINIMAX_API_KEY);
        if (token)
            return auth(token, string(context.env.MINIMAX_BASE_URL), string(context.env.MINIMAX_REGION));
        const raw = await context.readJson(join(context.home, '.mmx', 'credentials.json'));
        if (raw != null) {
            const credentials = credentialObject(raw), token = string(credentials.access_token);
            if (token)
                return auth(token, string(credentials.resource_url), undefined, credentials.expires_at);
        }
        const configRaw = await context.readJson(join(context.home, '.mmx', 'config.json'));
        if (configRaw == null)
            return null;
        const config = credentialObject(configRaw), apiKey = string(config.api_key);
        if (apiKey)
            return auth(apiKey, string(config.base_url), string(config.region));
        const oauth = config.oauth == null ? {} : credentialObject(config.oauth), accessToken = string(oauth.access_token);
        return accessToken ? auth(accessToken, string(oauth.resource_url) ?? string(config.base_url), string(config.region), oauth.expires_at) : null;
    },
    async fetchUsage(context, credentials) {
        return normalizeMiniMax(await context.request(`${credentials.metadata?.baseUrl ?? 'https://api.minimax.io'}/v1/token_plan/remains`, {
            signal: context.signal, headers: { Authorization: `Bearer ${credentials.token}`, 'Content-Type': 'application/json' },
        }));
    },
};
//# sourceMappingURL=minimax.js.map