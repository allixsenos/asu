import { createHash } from 'node:crypto';
/**
 * `jane@example.org` becomes `j***@e***.org`. Every domain label except the last is masked too,
 * because a personal domain identifies someone as well as the name does. A one-letter label stays as is.
 */
export function maskEmail(email) {
    const at = email.lastIndexOf('@');
    if (at < 1)
        return maskHandle(email);
    const labels = email.slice(at + 1).split('.');
    const domain = labels.map((label, i) => i === labels.length - 1 || label.length <= 1 ? label : `${label[0]}***`).join('.');
    return `${email[0]}***@${domain}`;
}
export function maskHandle(handle) {
    return `${handle[0] ?? ''}***`;
}
/** The label shown for an account: the alias the user gave it, else the masked email, else the masked handle. */
export function accountLabel(account) {
    return account.alias ?? (account.email ? maskEmail(account.email) : account.handle ? maskHandle(account.handle) : null);
}
/**
 * Merge one provider's logins into accounts. Two logins merge when they share an account identity or the
 * same token. A login with neither stays its own account and carries only where it came from.
 * Accounts that some tool uses right now come first.
 */
export function mergeLogins(providerId, logins) {
    const groups = [];
    for (const login of logins) {
        const key = login.accountKey ? `account:${login.accountKey}` : undefined;
        const matches = groups.filter(group => (key !== undefined && group.keys.has(key)) || group.tokens.has(login.credentials.token));
        const target = matches[0] ?? { keys: new Set(), tokens: new Set(), logins: [] };
        if (!matches.length)
            groups.push(target);
        // This login can join groups that looked separate until now.
        for (const other of matches.slice(1)) {
            for (const value of other.keys)
                target.keys.add(value);
            for (const value of other.tokens)
                target.tokens.add(value);
            target.logins.push(...other.logins);
            groups.splice(groups.indexOf(other), 1);
        }
        if (key)
            target.keys.add(key);
        target.tokens.add(login.credentials.token);
        target.logins.push(login);
    }
    const lasting = (login) => login.credentials.expiresAt ?? Number.POSITIVE_INFINITY;
    return groups.map(group => {
        const best = group.logins.reduce((kept, login) => lasting(login) > lasting(kept) ? login : kept);
        const identity = [...group.keys].sort()[0] ?? `token:${group.logins[0].credentials.token}`;
        const sources = new Map();
        for (const login of group.logins)
            sources.set(login.source, (sources.get(login.source) ?? false) || login.inUse === true);
        const first = (field) => group.logins.find(login => login[field])?.[field];
        return {
            id: `${providerId}:${createHash('sha256').update(identity).digest('hex').slice(0, 8)}`,
            credentials: best.credentials,
            sources: [...sources].map(([name, inUse]) => ({ name, inUse })),
            inUse: group.logins.some(login => login.inUse === true),
            email: first('email'), handle: first('handle'), alias: first('alias'),
        };
    }).sort((a, b) => Number(b.inUse) - Number(a.inUse));
}
/** Whether --account selects this account: its ID, alias, label, email, handle, or a source name, ignoring case. */
export function accountMatches(account, selector) {
    const wanted = selector.trim().toLowerCase();
    return [account.id, account.alias, account.email, account.handle, accountLabel(account), ...account.sources.map(source => source.name)]
        .some(value => value !== undefined && value !== null && value.toLowerCase() === wanted);
}
//# sourceMappingURL=accounts.js.map