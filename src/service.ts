import { UsageCache, CACHE_TTL_MS, cacheKey } from './cache.js';
import { UsageError, safeReason } from './errors.js';
import { emptyUsage, providerUsageSchema, usageDataSchema } from './models.js';
import type { Account, ProviderUsage, UsageReport } from './models.js';
import { createLocalContext } from './local.js';
import type { LocalContext } from './local.js';
import { createTransport } from './transport.js';
import type { RequestJson } from './transport.js';
import type { Credentials, Login, LoginSource, Provider } from './providers/base.js';
import { accountLabel, accountMatches, mergeLogins } from './accounts.js';
import type { MergedAccount } from './accounts.js';
import { builtInSources } from './registry.js';
import { version } from './version.js';

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
export async function deadline<T>(work: (signal: AbortSignal) => Promise<T>, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(new UsageError('timeout')); }, timeoutMs);
  });
  try { return await Promise.race([Promise.resolve().then(() => work(controller.signal)), timeout]); }
  finally { clearTimeout(timer); }
}
function assertCredentials(credentials: Credentials, now: number): void {
  if (!credentials || typeof credentials.token !== 'string' || !credentials.token.trim()
    || /[\r\n]/.test(credentials.token) || credentials.token.length > 65_536)
    throw new UsageError('invalid_credentials');
  if (credentials.expiresAt !== undefined && !Number.isFinite(credentials.expiresAt)) throw new UsageError('invalid_credentials');
  if (credentials.expiresAt !== undefined && credentials.expiresAt <= now) throw new UsageError('token_expired');
  // Inspect expiry only. Never refresh.
  const parts = credentials.token.split('.');
  if (parts.length === 3) {
    try {
      const claims: unknown = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString('utf8'));
      if (claims && typeof claims === 'object' && 'exp' in claims && typeof claims.exp === 'number' && claims.exp * 1000 <= now)
        throw new UsageError('token_expired');
    } catch (error) { if (error instanceof UsageError) throw error; }
  }
}
const unavailableCodes: ReadonlySet<string> = new Set(['missing_credentials', 'invalid_credentials', 'credential_read_error', 'token_expired', 'unauthorized']);
async function ownLogins(provider: Provider, local: LocalContext): Promise<Login[]> {
  if (provider.listLogins) return provider.listLogins(local);
  const credentials = await provider.resolveCredentials?.(local);
  return credentials ? [{ credentials, source: provider.displayName }] : [];
}
export class UsageService {
  private readonly local: LocalContext;
  private readonly request: RequestJson;
  private readonly cache: UsageCache;
  private readonly now: () => number;
  private readonly timeoutMs: number;
  private readonly sources: readonly LoginSource[];
  constructor(private readonly providers: readonly Provider[], options: ServiceOptions = {}) {
    this.local = options.local ?? createLocalContext();
    this.request = options.request ?? createTransport();
    this.now = options.now ?? Date.now;
    this.cache = options.cache ?? new UsageCache(undefined, this.now);
    this.timeoutMs = options.timeoutMs ?? 12_000;
    this.sources = options.sources ?? builtInSources;
  }
  async collect(options: CollectOptions = {}): Promise<UsageReport> {
    const selected = options.providerIds?.length ? this.providers.filter(p => options.providerIds!.includes(p.id)) : this.providers;
    const warnings = new Set<string>();
    const shared = await this.sharedLogins(warnings);
    const results = await Promise.all(selected.map(provider => this.collectProvider(provider, shared.get(provider.id) ?? [], options)));
    for (const warning of this.cache.warnings) warnings.add(warning);
    return { schemaVersion: 2, asuVersion: version, generatedAt: new Date(this.now()).toISOString(), warnings: [...warnings], providers: results.flat() };
  }
  /** Read each shared store once. A store that fails becomes a warning, so it hides no other login. */
  private async sharedLogins(warnings: Set<string>): Promise<Map<string, Login[]>> {
    const byProvider = new Map<string, Login[]>();
    const settled = await Promise.allSettled(this.sources.map(source => deadline(() => source.list(this.local), this.timeoutMs)));
    settled.forEach((outcome, index) => {
      if (outcome.status === 'rejected') {
        warnings.add(`Could not read the ${this.sources[index]!.id} credential store. Check its permissions and format.`);
        return;
      }
      for (const { providerId, login } of outcome.value) byProvider.set(providerId, [...(byProvider.get(providerId) ?? []), login]);
    });
    return byProvider;
  }
  private result(provider: Provider, installed: boolean | null, credentialsPresent: boolean, account: Account | null, error?: unknown): ProviderUsage {
    const reason = error ? safeReason(error) : null;
    const unavailable = reason !== null && unavailableCodes.has(reason.code);
    const now = this.now();
    return { ...emptyUsage(), providerId: provider.id, displayName: provider.displayName,
      experimental: provider.experimental ?? false, installed, credentialsPresent,
      authenticated: reason ? unavailable ? false : null : true,
      availability: reason ? unavailable ? 'unavailable' : 'error' : 'available', reason, account,
      fetchedAt: new Date(now).toISOString(), expiresAt: new Date(now + CACHE_TTL_MS).toISOString(), cached: false };
  }
  private async collectProvider(provider: Provider, shared: Login[], options: CollectOptions): Promise<ProviderUsage[]> {
    let installed: boolean | null = null;
    let own: Login[] = [];
    let failure: unknown;
    try {
      // Re-read local credentials on every invocation so account and token changes bypass stale entries.
      const discovery = await deadline(async () => Promise.allSettled([
        provider.detect(this.local), ownLogins(provider, this.local),
      ] as const), this.timeoutMs);
      installed = discovery[0].status === 'fulfilled' ? discovery[0].value : null;
      if (discovery[1].status === 'rejected') failure = discovery[1].reason;
      else own = discovery[1].value;
    } catch (error) { failure = error; }
    let accounts = mergeLogins(provider.id, [...own, ...shared]);
    if (options.account !== undefined) accounts = accounts.filter(account => accountMatches(account, options.account!));
    if (!accounts.length) {
      if (options.account !== undefined) return [];
      return [this.result(provider, installed, false, null, failure ?? new UsageError('missing_credentials'))];
    }
    return Promise.all(accounts.map(account => this.collectAccount(provider, installed, account, options)));
  }
  private async collectAccount(provider: Provider, installed: boolean | null, merged: MergedAccount, options: CollectOptions): Promise<ProviderUsage> {
    const email = options.showEmail ? merged.email : undefined;
    const account: Account = { id: merged.id, label: email ?? accountLabel(merged), ...(email ? { email } : {}), sources: merged.sources };
    const resolved = merged.credentials;
    try {
      assertCredentials(resolved, this.now());
      const key = cacheKey([2, provider.id, provider.version, this.local.home, resolved.token, resolved.accountId, resolved.metadata]);
      // The cached value carries no account. The account, and any email in it, is attached per run.
      const result = await this.cache.getOrFetch(key, async () => {
        try {
          const raw = await deadline(signal => provider.fetchUsage({ ...this.local, request: this.request, signal, now: this.now }, resolved), this.timeoutMs);
          const parsed = usageDataSchema.safeParse(raw);
          if (!parsed.success) throw new UsageError('invalid_response');
          // Extra adapter properties are stripped before persistence. Scrub credential and identity echoes too.
          const serialized = JSON.stringify(parsed.data, (_, value: unknown) => {
            if (typeof value !== 'string') return value;
            for (const secret of [resolved.token, resolved.accountId, merged.email, merged.handle]) {
              if (secret) value = (value as string).replaceAll(secret, '[redacted]');
            }
            return value;
          });
          const data = usageDataSchema.parse(JSON.parse(serialized));
          return providerUsageSchema.parse({ ...this.result(provider, installed, true, null), ...data });
        } catch (error) { return this.result(provider, installed, true, null, error); }
      }, options.fresh ?? false);
      return { ...result, installed, credentialsPresent: true, account };
    } catch (error) { return this.result(provider, installed, true, account, error); }
  }
}
