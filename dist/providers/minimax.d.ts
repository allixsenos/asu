import type { UsageData } from '../models.js';
import type { Credentials, Provider } from './base.js';
/** MiniMax credentials pinned to a recognized host. Exported for the opencode source. */
export declare function auth(token: string, url: string | undefined, region?: string, expiry?: unknown): Credentials;
export declare function normalizeMiniMax(payload: unknown): UsageData;
export declare const minimax: Provider;
