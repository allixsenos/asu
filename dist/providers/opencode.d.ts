import type { LocalContext } from '../local.js';
import type { Credentials } from './base.js';
/**
 * opencode keeps every provider login in one JSON file, keyed by opencode's provider ID.
 * Source: anomalyco/opencode v1.18.30, packages/opencode/src/auth/index.ts and packages/core/src/global.ts.
 * The path is the same on every platform: $XDG_DATA_HOME/opencode/auth.json, else ~/.local/share/opencode/auth.json.
 * opencode v2 moves credentials into SQLite. That release is not out yet and is not read here.
 */
export declare function opencodeAuthPath(context: LocalContext): string;
export type OpencodeEntry = {
    type: 'oauth';
    access: string;
    refresh?: string;
    expires?: number;
    accountId?: string;
    enterpriseUrl?: string;
} | {
    type: 'api';
    key: string;
};
/** The first usable entry among the given opencode provider IDs, or null. A malformed entry is skipped, as opencode skips it. */
export declare function opencodeEntry(context: LocalContext, ids: string[]): Promise<{
    id: string;
    entry: OpencodeEntry;
} | null>;
/** An OAuth entry as ASU credentials. opencode writes `expires` in milliseconds, and 0 means no expiry. */
export declare function oauthCredentials(entry: Extract<OpencodeEntry, {
    type: 'oauth';
}>, token?: string): Credentials;
