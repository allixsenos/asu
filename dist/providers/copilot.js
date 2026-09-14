import { join } from 'node:path';
import { parse } from 'yaml';
import { UsageError } from '../errors.js';
import { detectCommands, homePath } from '../local.js';
import { emptyUsage } from '../models.js';
import { firstCredentials } from './base.js';
import { credentialObject, nonnegative, object, optionalObject, percent, ratio, requireUsage, slug, string, timestamp, title } from './parse.js';
export function normalizeCopilot(payload) {
    const raw = object(payload), data = emptyUsage();
    const plan = string(raw.copilot_plan);
    data.planLabel = plan ? title(plan) : null;
    const resetsAt = timestamp(raw.quota_reset_date);
    for (const [name, value] of Object.entries(optionalObject(raw.quota_snapshots))) {
        const quota = object(value), unlimited = quota.unlimited === true || quota.entitlement === -1 || quota.entitlement === '-1';
        const remainingPercent = nonnegative(quota.percent_remaining);
        if (remainingPercent !== undefined && remainingPercent > 100)
            throw new UsageError('invalid_response');
        const limit = nonnegative(quota.entitlement), remaining = nonnegative(quota.remaining);
        const used = limit !== undefined && remaining !== undefined ? Math.max(0, limit - remaining) : nonnegative(quota.used);
        const percentUsed = unlimited ? null : remainingPercent === undefined ? ratio(used, limit) : percent(100 - remainingPercent);
        if (percentUsed === null && used === undefined && limit === undefined && !unlimited)
            continue;
        data.windows.push({ id: slug(name), label: title(name), percentUsed, used, limit, unlimited,
            resetsAt: timestamp(quota.reset_date) ?? resetsAt, unit: 'requests' });
    }
    // Each window carries the reset date. The detail only matters for a plan-only response.
    if (resetsAt && !data.windows.length)
        data.details.push({ label: 'Quota reset', value: resetsAt });
    return requireUsage(data);
}
export const copilot = {
    id: 'copilot', displayName: 'GitHub Copilot', version: 2,
    // gh alone is not proof that Copilot is installed.
    detect: context => detectCommands(context, ['copilot', 'github-copilot']),
    async listLogins(context) {
        const logins = [];
        for (const name of ['COPILOT_TOKEN', 'GITHUB_TOKEN', 'GITHUB_PAT']) {
            const token = string(context.env[name]);
            if (token)
                logins.push({ credentials: { token }, source: name });
        }
        const config = homePath(context, context.env.GH_CONFIG_DIR, context.env.XDG_CONFIG_HOME ? join(context.env.XDG_CONFIG_HOME, 'gh') : '.config/gh');
        const text = await context.readText(join(config, 'hosts.yml'));
        if (text === null)
            return logins;
        try {
            const root = credentialObject(parse(text, { maxAliasCount: 0 }));
            if (!root['github.com'])
                return logins;
            const github = credentialObject(root['github.com']);
            const active = string(github.user);
            const users = github.users == null ? {} : credentialObject(github.users);
            // gh keeps every signed-in account under `users`, and the active account's token also at the top level.
            const entries = [[active, github.oauth_token],
                ...Object.entries(users).map(([user, value]) => [user, credentialObject(value).oauth_token])];
            const found = [];
            for (const [user, value] of entries) {
                const token = string(value);
                if (!token)
                    continue;
                found.push({ credentials: { token }, source: 'GitHub CLI', inUse: user === active,
                    accountKey: user ? `github.com/${user}` : undefined, handle: user });
            }
            // The active account first, so a caller that wants one login gets the one gh uses.
            found.sort((a, b) => Number(b.inUse === true) - Number(a.inUse === true));
            return [...logins, ...found];
        }
        catch {
            throw new UsageError('invalid_credentials');
        }
    },
    resolveCredentials: context => firstCredentials(copilot.listLogins(context)),
    async fetchUsage(context, credentials) {
        return normalizeCopilot(await context.request('https://api.github.com/copilot_internal/user', {
            signal: context.signal, headers: { Authorization: `token ${credentials.token}`,
                'Editor-Version': 'vscode/1.96.2', 'Editor-Plugin-Version': 'copilot-chat/0.26.7' },
        }));
    },
};
//# sourceMappingURL=copilot.js.map