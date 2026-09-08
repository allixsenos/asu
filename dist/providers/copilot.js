import { join } from 'node:path';
import { parse } from 'yaml';
import { UsageError } from '../errors.js';
import { detectCommands, homePath } from '../local.js';
import { emptyUsage } from '../models.js';
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
    async resolveCredentials(context) {
        const envToken = string(context.env.COPILOT_TOKEN) ?? string(context.env.GITHUB_TOKEN) ?? string(context.env.GITHUB_PAT);
        if (envToken)
            return { token: envToken };
        const config = homePath(context, context.env.GH_CONFIG_DIR, context.env.XDG_CONFIG_HOME ? join(context.env.XDG_CONFIG_HOME, 'gh') : '.config/gh');
        const text = await context.readText(join(config, 'hosts.yml'));
        if (text === null)
            return null;
        try {
            const root = credentialObject(parse(text, { maxAliasCount: 0 }));
            if (!root['github.com'])
                return null;
            const github = credentialObject(root['github.com']);
            const user = string(github.user);
            const users = github.users == null ? {} : credentialObject(github.users);
            const current = user && users[user] ? credentialObject(users[user]) : {};
            const token = string(github.oauth_token) ?? string(current.oauth_token);
            return token ? { token } : null;
        }
        catch {
            throw new UsageError('invalid_credentials');
        }
    },
    async fetchUsage(context, credentials) {
        return normalizeCopilot(await context.request('https://api.github.com/copilot_internal/user', {
            signal: context.signal, headers: { Authorization: `token ${credentials.token}`,
                'Editor-Version': 'vscode/1.96.2', 'Editor-Plugin-Version': 'copilot-chat/0.26.7' },
        }));
    },
};
//# sourceMappingURL=copilot.js.map