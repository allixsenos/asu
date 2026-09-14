import { join } from 'node:path';
import { homePath } from '../local.js';
import { auth as minimaxCredentials } from '../providers/minimax.js';
import { credentialObject, nonnegative, string } from '../providers/parse.js';
/**
 * opencode keeps every provider login in one JSON file, keyed by opencode's provider ID.
 * Source: anomalyco/opencode v1.18.30, packages/opencode/src/auth/index.ts and packages/core/src/global.ts.
 * The path is the same on every platform: $XDG_DATA_HOME/opencode/auth.json, else ~/.local/share/opencode/auth.json.
 * opencode v2 moves credentials into SQLite. That release is not out yet and is not read here.
 */
export function opencodeAuthPath(context) {
    return join(homePath(context, context.env.XDG_DATA_HOME, join('.local', 'share')), 'opencode', 'auth.json');
}
/** An OAuth entry's token. opencode writes `expires` in milliseconds, and 0 means no expiry. */
function oauth(entry) {
    const access = string(entry.access);
    if (entry.type !== 'oauth' || !access)
        return null;
    const expires = nonnegative(entry.expires);
    return { token: access, expiresAt: expires ? expires : undefined };
}
function apiKey(entry) {
    const key = entry.type === 'api' ? string(entry.key) : undefined;
    return key ? { credentials: { token: key } } : null;
}
/**
 * Which opencode keys hold a subscription login, and how each maps to an ASU provider.
 * A pay-as-you-go `zai` key, a `moonshotai` platform key, and an `openai` API key have no
 * subscription usage, so they are not listed.
 */
const mappings = [
    { key: 'anthropic', providerId: 'claude', read: entry => { const credentials = oauth(entry); return credentials && { credentials }; } },
    { key: 'openai', providerId: 'codex', read: entry => {
            const credentials = oauth(entry), accountId = string(entry.accountId);
            return credentials && { credentials: { ...credentials, accountId }, accountKey: accountId };
        } },
    // The GitHub device-flow token sits in both `refresh` and `access`. An `enterpriseUrl` means another host.
    { key: 'github-copilot', providerId: 'copilot', read: entry => {
            if (entry.type !== 'oauth' || string(entry.enterpriseUrl))
                return null;
            const token = string(entry.refresh) ?? string(entry.access);
            return token ? { credentials: { token } } : null;
        } },
    { key: 'zai-coding-plan', providerId: 'zai', read: apiKey },
    { key: 'kimi-for-coding', providerId: 'kimi', read: apiKey },
    { key: 'minimax-coding-plan', providerId: 'minimax', read: entry => {
            const found = apiKey(entry);
            return found && { credentials: minimaxCredentials(found.credentials.token, undefined) };
        } },
    { key: 'minimax-cn-coding-plan', providerId: 'minimax', read: entry => {
            const found = apiKey(entry);
            return found && { credentials: minimaxCredentials(found.credentials.token, undefined, 'cn') };
        } },
    { key: 'xai', providerId: 'grok', read: entry => { const credentials = oauth(entry); return credentials ? { credentials } : apiKey(entry); } },
];
/** Every subscription login opencode stores. opencode uses each of them, so each is in use. */
export const opencodeSource = {
    id: 'opencode',
    async list(context) {
        const raw = await context.readJson(opencodeAuthPath(context));
        if (raw == null)
            return [];
        const root = credentialObject(raw);
        const found = [];
        for (const { key, providerId, read } of mappings) {
            const value = root[key];
            // A malformed entry is skipped, as opencode skips it.
            if (!value || typeof value !== 'object' || Array.isArray(value))
                continue;
            const login = read(value);
            if (login)
                found.push({ providerId, login: { ...login, source: 'opencode', inUse: true } });
        }
        return found;
    },
};
//# sourceMappingURL=opencode.js.map