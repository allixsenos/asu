import { UsageCache } from './cache.js';
import type { UsageReport } from './models.js';
import type { LocalContext } from './local.js';
import type { RequestJson } from './transport.js';
import type { Provider } from './providers/base.js';
export interface ServiceOptions {
    local?: LocalContext;
    request?: RequestJson;
    cache?: UsageCache;
    now?: () => number;
    timeoutMs?: number;
}
export declare function deadline<T>(work: (signal: AbortSignal) => Promise<T>, timeoutMs: number): Promise<T>;
export declare class UsageService {
    private readonly providers;
    private readonly local;
    private readonly request;
    private readonly cache;
    private readonly now;
    private readonly timeoutMs;
    constructor(providers: readonly Provider[], options?: ServiceOptions);
    collect(options?: {
        providerIds?: string[];
        fresh?: boolean;
    }): Promise<UsageReport>;
    private result;
    private collectProvider;
}
