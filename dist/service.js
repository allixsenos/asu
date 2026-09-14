import { UsageCache, CACHE_TTL_MS, cacheKey } from './cache.js';
import { UsageError, safeReason } from './errors.js';
import { emptyUsage, providerUsageSchema, usageDataSchema } from './models.js';
import { createLocalContext } from './local.js';
import { createTransport } from './transport.js';
import { accountLabel, accountMatches, mergeLogins } from './accounts.js';
import { builtInSources } from './registry.js';
import { version } from './version.js';
export async function deadline(work, timeoutMs) {
    const controller = new AbortController();
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new UsageError('timeout')); }, timeoutMs);
    });
    try {
        return await Promise.race([Promise.resolve().then(() => work(controller.signal)), timeout]);
    }
    finally {
        clearTimeout(timer);
    }
}
function assertCredentials(credentials, now) {
    if (!credentials || typeof credentials.token !== 'string' || !credentials.token.trim()
        || /[\r\n]/.test(credentials.token) || credentials.token.length > 65_536)
        throw new UsageError('invalid_credentials');
    if (credentials.expiresAt !== undefined && !Number.isFinite(credentials.expiresAt))
        throw new UsageError('invalid_credentials');
    if (credentials.expiresAt !== undefined && credentials.expiresAt <= now)
        throw new UsageError('token_expired');
    // Inspect expiry only. Never refresh.
    const parts = credentials.token.split('.');
    if (parts.length === 3) {
        try {
            const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
            if (claims && typeof claims === 'object' && 'exp' in claims && typeof claims.exp === 'number' && claims.exp * 1000 <= now)
                throw new UsageError('token_expired');
        }
        catch (error) {
            if (error instanceof UsageError)
                throw error;
        }
    }
}
const unavailableCodes = new Set(['missing_credentials', 'invalid_credentials', 'credential_read_error', 'token_expired', 'unauthorized']);
async function ownLogins(provider, local) {
    if (provider.listLogins)
        return provider.listLogins(local);
    const credentials = await provider.resolveCredentials?.(local);
    return credentials ? [{ credentials, source: provider.displayName }] : [];
}
export class UsageService {
    providers;
    local;
    request;
    cache;
    now;
    timeoutMs;
    sources;
    constructor(providers, options = {}) {
        this.providers = providers;
        this.local = options.local ?? createLocalContext();
        this.request = options.request ?? createTransport();
        this.now = options.now ?? Date.now;
        this.cache = options.cache ?? new UsageCache(undefined, this.now);
        this.timeoutMs = options.timeoutMs ?? 12_000;
        this.sources = options.sources ?? builtInSources;
    }
    async collect(options = {}) {
        const selected = options.providerIds?.length ? this.providers.filter(p => options.providerIds.includes(p.id)) : this.providers;
        const warnings = new Set();
        const shared = await this.sharedLogins(warnings);
        const results = await Promise.all(selected.map(provider => this.collectProvider(provider, shared.get(provider.id) ?? [], options)));
        for (const warning of this.cache.warnings)
            warnings.add(warning);
        return { schemaVersion: 2, asuVersion: version, generatedAt: new Date(this.now()).toISOString(), warnings: [...warnings], providers: results.flat() };
    }
    /** Read each shared store once. A store that fails becomes a warning, so it hides no other login. */
    async sharedLogins(warnings) {
        const byProvider = new Map();
        const settled = await Promise.allSettled(this.sources.map(source => deadline(() => source.list(this.local), this.timeoutMs)));
        settled.forEach((outcome, index) => {
            if (outcome.status === 'rejected') {
                warnings.add(`Could not read the ${this.sources[index].id} credential store. Check its permissions and format.`);
                return;
            }
            for (const { providerId, login } of outcome.value)
                byProvider.set(providerId, [...(byProvider.get(providerId) ?? []), login]);
        });
        return byProvider;
    }
    result(provider, installed, credentialsPresent, account, error) {
        const reason = error ? safeReason(error) : null;
        const unavailable = reason !== null && unavailableCodes.has(reason.code);
        const now = this.now();
        return { ...emptyUsage(), providerId: provider.id, displayName: provider.displayName,
            experimental: provider.experimental ?? false, installed, credentialsPresent,
            authenticated: reason ? unavailable ? false : null : true,
            availability: reason ? unavailable ? 'unavailable' : 'error' : 'available', reason, account,
            fetchedAt: new Date(now).toISOString(), expiresAt: new Date(now + CACHE_TTL_MS).toISOString(), cached: false };
    }
    async collectProvider(provider, shared, options) {
        let installed = null;
        let own = [];
        let failure;
        try {
            // Re-read local credentials on every invocation so account and token changes bypass stale entries.
            const discovery = await deadline(async () => Promise.allSettled([
                provider.detect(this.local), ownLogins(provider, this.local),
            ]), this.timeoutMs);
            installed = discovery[0].status === 'fulfilled' ? discovery[0].value : null;
            if (discovery[1].status === 'rejected')
                failure = discovery[1].reason;
            else
                own = discovery[1].value;
        }
        catch (error) {
            failure = error;
        }
        let accounts = mergeLogins(provider.id, [...own, ...shared]);
        if (options.account !== undefined)
            accounts = accounts.filter(account => accountMatches(account, options.account));
        if (!accounts.length) {
            if (options.account !== undefined)
                return [];
            return [this.result(provider, installed, false, null, failure ?? new UsageError('missing_credentials'))];
        }
        return Promise.all(accounts.map(account => this.collectAccount(provider, installed, account, options)));
    }
    async collectAccount(provider, installed, merged, options) {
        const email = options.showEmail ? merged.email : undefined;
        const account = { id: merged.id, label: email ?? accountLabel(merged), ...(email ? { email } : {}), sources: merged.sources };
        const resolved = merged.credentials;
        try {
            assertCredentials(resolved, this.now());
            const key = cacheKey([2, provider.id, provider.version, this.local.home, resolved.token, resolved.accountId, resolved.metadata]);
            // The cached value carries no account. The account, and any email in it, is attached per run.
            const result = await this.cache.getOrFetch(key, async () => {
                try {
                    const raw = await deadline(signal => provider.fetchUsage({ ...this.local, request: this.request, signal, now: this.now }, resolved), this.timeoutMs);
                    const parsed = usageDataSchema.safeParse(raw);
                    if (!parsed.success)
                        throw new UsageError('invalid_response');
                    // Extra adapter properties are stripped before persistence. Scrub credential and identity echoes too.
                    const serialized = JSON.stringify(parsed.data, (_, value) => {
                        if (typeof value !== 'string')
                            return value;
                        for (const secret of [resolved.token, resolved.accountId, merged.email, merged.handle]) {
                            if (secret)
                                value = value.replaceAll(secret, '[redacted]');
                        }
                        return value;
                    });
                    const data = usageDataSchema.parse(JSON.parse(serialized));
                    return providerUsageSchema.parse({ ...this.result(provider, installed, true, null), ...data });
                }
                catch (error) {
                    return this.result(provider, installed, true, null, error);
                }
            }, options.fresh ?? false);
            return { ...result, installed, credentialsPresent: true, account };
        }
        catch (error) {
            return this.result(provider, installed, true, account, error);
        }
    }
}
//# sourceMappingURL=service.js.map