import { join } from 'node:path';
import { UsageError } from '../errors.js';
import { detectCommands, homePath } from '../local.js';
import { emptyUsage } from '../models.js';
import { firstCredentials } from './base.js';
import { credentialObject, nonnegative, object, optionalObject, ratio, requireUsage, string, timestamp } from './parse.js';
export function cursorDatabasePaths(context) {
    const suffix = ['Cursor', 'User', 'globalStorage', 'state.vscdb'];
    if (context.platform === 'win32')
        return context.env.APPDATA ? [join(context.env.APPDATA, ...suffix)] : [];
    if (context.platform === 'darwin')
        return [join(context.home, 'Library', 'Application Support', ...suffix)];
    return [join(homePath(context, context.env.XDG_CONFIG_HOME, '.config'), ...suffix)];
}
export function normalizeCursor(payload) {
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
export const cursor = {
    id: 'cursor', displayName: 'Cursor', version: 1, experimental: true,
    detect: context => detectCommands(context, ['cursor', 'cursor-agent'], context.platform === 'darwin' ? ['/Applications/Cursor.app', join(context.home, 'Applications', 'Cursor.app')] : []),
    async listLogins(context) {
        const logins = [];
        for (const name of ['CURSOR_ACCESS_TOKEN', 'CURSOR_TOKEN']) {
            const token = string(context.env[name]);
            if (token)
                logins.push({ credentials: { token }, source: name });
        }
        let failure;
        for (const path of cursorDatabasePaths(context)) {
            try {
                const modern = await context.sqliteToken(path, 'cursorAuth/accessToken');
                const legacy = modern ? null : await context.sqliteToken(path, 'cursorAuthStatus');
                const token = modern ?? (legacy ? string(credentialObject(JSON.parse(legacy)).accessToken) : undefined);
                if (token)
                    logins.push({ credentials: { token }, source: 'Cursor', inUse: true });
            }
            catch {
                failure = new UsageError('credential_read_error');
            }
        }
        const config = homePath(context, context.env.XDG_CONFIG_HOME, '.config');
        const raw = await context.readJson(join(config, 'cursor', 'auth.json'));
        if (raw != null) {
            const token = string(credentialObject(raw).accessToken);
            if (token)
                logins.push({ credentials: { token }, source: 'Cursor CLI', inUse: true });
        }
        if (!logins.length && failure)
            throw failure;
        return logins;
    },
    resolveCredentials: context => firstCredentials(cursor.listLogins(context)),
    async fetchUsage(context, credentials) {
        return normalizeCursor(await context.request('https://api2.cursor.sh/aiserver.v1.DashboardService/GetCurrentPeriodUsage', {
            method: 'POST', body: {}, signal: context.signal,
            headers: { Authorization: `Bearer ${credentials.token}`, 'Connect-Protocol-Version': '1' },
        }));
    },
};
//# sourceMappingURL=cursor.js.map