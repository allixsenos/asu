import type { LocalContext } from '../local.js';
import type { RequestJson } from '../transport.js';
import type { UsageData } from '../models.js';

/** Private to the backend: never serialize this object. */
export interface Credentials {
  token: string;
  accountId?: string;
  expiresAt?: number;
  metadata?: Record<string, string>;
}
export interface ProviderContext extends LocalContext {
  request: RequestJson;
  signal: AbortSignal;
  now: () => number;
}
export interface Provider {
  id: string;
  displayName: string;
  /** Bump when request/normalization semantics change, to invalidate cached data. */
  version: number;
  detect(context: LocalContext): Promise<boolean | null>;
  resolveCredentials(context: LocalContext): Promise<Credentials | null>;
  fetchUsage(context: ProviderContext, credentials: Credentials): Promise<UsageData>;
}
