import { join } from 'node:path';
import { detectCommands, homePath } from '../local.js';
import { emptyUsage } from '../models.js';
import { countWindow, credentialObject, list, nonnegative, object, optionalObject, requireUsage, string, timestamp } from './parse.js';
export function normalizeKimi(payload) {
    const raw = object(payload), data = emptyUsage();
    function add(id, label, value) {
        const row = { ...object(value) }, remaining = nonnegative(row.remaining), limit = nonnegative(row.limit);
        if (row.used == null && remaining !== undefined && limit !== undefined)
            row.used = Math.max(0, limit - remaining);
        data.windows.push(countWindow(id, label, row, row.resetTime ?? row.resetAt ?? row.reset_time ?? row.reset_at));
    }
    if (raw.usage != null)
        add('weekly', 'Weekly', raw.usage);
    for (const [index, value] of list(raw.limits).entries()) {
        const row = object(value), window = optionalObject(row.window);
        const duration = nonnegative(window.duration), unit = string(window.timeUnit)?.replace('TIME_UNIT_', '').toLowerCase();
        const period = duration === 300 && unit === 'minute' ? '5 hours' : duration && unit ? `${duration} ${unit}` : `Limit ${index + 1}`;
        add(`limit-${index}`, string(row.name) ?? period, row.detail ?? row);
    }
    return requireUsage(data);
}
export const kimi = {
    id: 'kimi', displayName: 'Kimi', version: 1, experimental: true,
    detect: context => detectCommands(context, ['kimi']),
    async resolveCredentials(context) {
        const token = string(context.env.KIMI_TOKEN) ?? string(context.env.KIMI_API_KEY);
        if (token)
            return { token };
        const homes = [homePath(context, context.env.KIMI_CODE_HOME, '.kimi-code'), join(context.home, '.kimi')];
        for (const home of homes) {
            const raw = await context.readJson(join(home, 'credentials', 'kimi-code.json'));
            if (raw == null)
                continue;
            const auth = credentialObject(raw), token = string(auth.access_token);
            if (token) {
                const expiry = timestamp(auth.expires_at);
                return { token, expiresAt: expiry ? Date.parse(expiry) : undefined };
            }
        }
        return null;
    },
    async fetchUsage(context, credentials) {
        return normalizeKimi(await context.request('https://api.kimi.com/coding/v1/usages', {
            signal: context.signal, headers: { Authorization: `Bearer ${credentials.token}` },
        }));
    },
};
//# sourceMappingURL=kimi.js.map