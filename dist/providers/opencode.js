import { join } from 'node:path';
import { homePath } from '../local.js';
import { credentialObject, nonnegative, string } from './parse.js';
/**
 * opencode keeps every provider login in one JSON file, keyed by opencode's provider ID.
 * Source: anomalyco/opencode v1.18.30, packages/opencode/src/auth/index.ts and packages/core/src/global.ts.
 * The path is the same on every platform: $XDG_DATA_HOME/opencode/auth.json, else ~/.local/share/opencode/auth.json.
 * opencode v2 moves credentials into SQLite. That release is not out yet and is not read here.
 */
export function opencodeAuthPath(context) {
    return join(homePath(context, context.env.XDG_DATA_HOME, join('.local', 'share')), 'opencode', 'auth.json');
}
/** The first usable entry among the given opencode provider IDs, or null. A malformed entry is skipped, as opencode skips it. */
export async function opencodeEntry(context, ids) {
    const raw = await context.readJson(opencodeAuthPath(context));
    if (raw == null)
        return null;
    const root = credentialObject(raw);
    for (const id of ids) {
        const value = root[id];
        if (!value || typeof value !== 'object' || Array.isArray(value))
            continue;
        const item = value;
        if (item.type === 'oauth') {
            const access = string(item.access);
            if (!access)
                continue;
            return { id, entry: { type: 'oauth', access, refresh: string(item.refresh), expires: nonnegative(item.expires),
                    accountId: string(item.accountId), enterpriseUrl: string(item.enterpriseUrl) } };
        }
        if (item.type === 'api') {
            const key = string(item.key);
            if (key)
                return { id, entry: { type: 'api', key } };
        }
    }
    return null;
}
/** An OAuth entry as ASU credentials. opencode writes `expires` in milliseconds, and 0 means no expiry. */
export function oauthCredentials(entry, token = entry.access) {
    return { token, expiresAt: entry.expires ? entry.expires : undefined };
}
//# sourceMappingURL=opencode.js.map