import { isAbsolute, join } from 'node:path';
import { parseCredentials } from '../providers/claude.js';
import { credentialObject, jwtClaims, optionalObject, string } from '../providers/parse.js';
/**
 * ccswap keeps every Claude and Codex account it manages under one backup root.
 * Source: errhythm/cc-swap v0.31.0, src/claude_swap/paths.py `get_backup_root`.
 * Linux: $XDG_DATA_HOME/claude-swap when that path is absolute, else ~/.local/share/claude-swap.
 * macOS and Windows: ~/.claude-swap-backup.
 */
export function ccswapRoot(context) {
    if (context.platform === 'linux') {
        const raw = context.env.XDG_DATA_HOME;
        const xdg = raw === '~' ? context.home : raw?.startsWith('~/') ? join(context.home, raw.slice(2)) : raw;
        return xdg && isAbsolute(xdg) ? join(xdg, 'claude-swap') : join(context.home, '.local', 'share', 'claude-swap');
    }
    return join(context.home, '.claude-swap-backup');
}
/** ccswap's directory-safe slug for a session profile. Source: src/claude_swap/session.py `slugify_email`. */
export function slugifyEmail(email) {
    return [...email.normalize('NFC')].map(char => /^[A-Za-z0-9._-]$/.test(char) ? char : '_').join('');
}
/** The numbered slots of a ccswap `sequence.json`. */
function slots(raw) {
    return Object.entries(optionalObject(credentialObject(raw).accounts))
        .filter((pair) => /^\d+$/.test(pair[0]) && !!pair[1] && typeof pair[1] === 'object' && !Array.isArray(pair[1]));
}
/** One Claude slot: its backup, and the profile `ccswap run` made for it, which usually holds a fresher token. */
async function claudeSlot(context, root, number, record) {
    const email = string(record.email);
    // ccswap builds file names from the email. One with a path separator is not ccswap's and is not followed.
    if (!email || /[/\\]/.test(email))
        return [];
    const uuid = string(record.uuid);
    const identity = { accountKey: uuid ? `${uuid}:${string(record.organizationUuid) ?? ''}` : undefined, email, alias: string(record.alias) };
    const logins = [];
    const add = (credentials) => { if (credentials)
        logins.push({ credentials, source: `ccswap slot ${number}`, ...identity }); };
    // A base64 `.enc` backup file wins over the macOS Keychain, as it does in ccswap.
    const encoded = await context.readText(join(root, 'credentials', `.creds-${number}-${email}.enc`));
    if (encoded !== null)
        add(parseCredentials(JSON.parse(Buffer.from(encoded.trim(), 'base64').toString('utf8'))));
    else if (context.platform === 'darwin') {
        const raw = await context.keychain('claude-swap', undefined, `account-${number}-${email}`);
        if (raw)
            add(parseCredentials(JSON.parse(raw)));
    }
    const profile = await context.readJson(join(root, 'sessions', `${number}-${slugifyEmail(email)}`, '.credentials.json'));
    if (profile != null)
        add(parseCredentials(profile));
    return logins;
}
/** One Codex slot: a verbatim copy of Codex CLI's auth.json. */
async function codexSlot(context, root, number, record) {
    const raw = await context.readJson(join(root, 'codex', 'credentials', `account-${number}.json`));
    if (raw == null)
        return [];
    const tokens = credentialObject(credentialObject(raw).tokens), token = string(tokens.access_token);
    if (!token)
        return [];
    const accountId = string(tokens.account_id) ?? string(record.accountId);
    return [{ credentials: { token, accountId }, source: `ccswap slot ${number}`, accountKey: accountId,
            email: string(record.email) ?? string(jwtClaims(tokens.id_token)?.email) }];
}
/**
 * Every Claude and Codex account ccswap manages. None is marked in use: the account ccswap
 * swapped in is already the live Claude Code or Codex CLI login, and merges with it by identity.
 */
export const ccswapSource = {
    id: 'ccswap',
    async list(context) {
        const root = ccswapRoot(context);
        const found = [];
        const read = async (providerId, sequence, slot) => {
            const raw = await context.readJson(sequence);
            if (raw == null)
                return;
            for (const [number, record] of slots(raw)) {
                // One unreadable slot must not hide the others.
                try {
                    for (const login of await slot(number, record))
                        found.push({ providerId, login });
                }
                catch { /* Skip this slot. */ }
            }
        };
        await read('claude', join(root, 'sequence.json'), (number, record) => claudeSlot(context, root, number, record));
        await read('codex', join(root, 'codex', 'sequence.json'), (number, record) => codexSlot(context, root, number, record));
        return found;
    },
};
//# sourceMappingURL=ccswap.js.map