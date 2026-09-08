import { UsageError } from '../errors.js';
import { emptyUsage } from '../models.js';
import { list, nonnegative, object, percent, requireUsage, slug, string, timestamp } from './parse.js';
function envelope(payload) {
    const raw = object(payload);
    if (raw.success === false || (raw.code !== undefined && ![0, 200, '0', '200'].includes(raw.code)))
        throw new UsageError(raw.code === 401 || raw.code === 403 ? 'unauthorized' : 'provider_error');
    return raw.data;
}
export function normalizeZaiPlan(payload) {
    const data = emptyUsage();
    const subscriptions = list(envelope(payload)).map(object);
    const names = subscriptions.map(sub => string(sub.productName)).filter((name) => Boolean(name));
    data.planLabel = [...new Set(names)].join(' / ') || null;
    for (const sub of subscriptions) {
        for (const field of ['status', 'valid', 'purchaseTime']) {
            const value = string(sub[field]);
            if (value)
                data.details.push({ label: `${string(sub.productName) ?? 'Subscription'} ${field}`, value });
        }
    }
    return requireUsage(data);
}
export function normalizeZaiQuota(payload) {
    const raw = object(envelope(payload)), data = emptyUsage();
    for (const [index, value] of list(raw.limits).entries()) {
        const quota = object(value), type = string(quota.type) ?? 'Quota';
        const label = type === 'TOKENS_LIMIT' ? '5 hours' : type === 'TIME_LIMIT' ? 'MCP monthly' : type;
        if (quota.percentage == null)
            continue;
        data.windows.push({ id: `${slug(type)}-${index}`, label, percentUsed: percent(quota.percentage),
            resetsAt: timestamp(quota.nextResetTime),
            used: type === 'TIME_LIMIT' ? nonnegative(quota.currentValue) : undefined,
            limit: type === 'TIME_LIMIT' ? nonnegative(quota.usage) : undefined });
    }
    return requireUsage(data);
}
export const zai = {
    id: 'zai', displayName: 'Z.ai', version: 1, experimental: true,
    // A subscription provider used through other CLIs; no distinct installation to prove.
    detect: async () => null,
    async resolveCredentials(context) {
        const token = string(context.env.ZAI_API_KEY) ?? string(context.env.GLM_API_KEY);
        return token ? { token } : null;
    },
    async fetchUsage(context, credentials) {
        const [plan, quota] = await Promise.allSettled([
            context.request('https://api.z.ai/api/biz/subscription/list', {
                signal: context.signal, headers: { Authorization: `Bearer ${credentials.token}` },
            }).then(normalizeZaiPlan),
            context.request('https://api.z.ai/api/monitor/usage/quota/limit', {
                signal: context.signal, headers: { Authorization: credentials.token, 'Accept-Language': 'en-US,en' },
            }).then(normalizeZaiQuota),
        ]);
        if (plan.status === 'rejected' && quota.status === 'rejected')
            throw quota.reason;
        const data = plan.status === 'fulfilled' ? plan.value : emptyUsage();
        if (quota.status === 'fulfilled')
            data.windows = quota.value.windows;
        else
            data.details.push({ label: 'Quota', value: 'Usage figures could not be retrieved' });
        if (plan.status === 'rejected')
            data.details.push({ label: 'Plan', value: 'Plan metadata could not be retrieved' });
        return data;
    },
};
//# sourceMappingURL=zai.js.map