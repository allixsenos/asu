import { UsageCache } from './cache.js';
import type { UsageReport } from './models.js';
import type { LocalContext } from './local.js';
import type { RequestJson } from './transport.js';
import type { LoginSource, Provider } from './providers/base.js';
export interface ServiceOptions {
    local?: LocalContext;
    request?: RequestJson;
    cache?: UsageCache;
    now?: () => number;
    timeoutMs?: number;
    /** Stores shared by several tools, such as opencode. Defaults to the built-in sources. */
    sources?: readonly LoginSource[];
}
export interface CollectOptions {
    providerIds?: string[];
    fresh?: boolean;
    /** Keep only accounts whose ID, alias, label, email, handle, or source name matches, ignoring case. */
    account?: string;
    /** Put full email addresses in the report. They never reach the cache. */
    showEmail?: boolean;
}
export declare function deadline<T>(work: (signal: AbortSignal) => Promise<T>, timeoutMs: number): Promise<T>;
export declare class UsageService {
    private readonly providers;
    private readonly local;
    private readonly request;
    private readonly cache;
    private readonly now;
    private readonly timeoutMs;
    private readonly sources;
    constructor(providers: readonly Provider[], options?: ServiceOptions);
    collect(options?: CollectOptions): Promise<UsageReport>;
    /** Read each shared store once. A store that fails becomes a warning, so it hides no other login. */
    private sharedLogins;
    private result;
    private collectProvider;
    private collectAccount;
}
