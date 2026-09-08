import type { ProviderUsage } from './models.js';
export declare const CACHE_TTL_MS = 300000;
export declare function cacheKey(parts: unknown[]): string;
export declare class UsageCache {
    private readonly directory?;
    private readonly now;
    private readonly memory;
    private readonly pending;
    readonly warnings: Set<string>;
    constructor(directory?: string | undefined, now?: () => number);
    getOrFetch(key: string, load: () => Promise<ProviderUsage>, fresh?: boolean): Promise<ProviderUsage>;
    private valid;
    private read;
    private load;
}
