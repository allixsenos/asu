import { UsageCache, CACHE_TTL_MS, cacheKey } from './cache.js';
import { UsageError, safeReason } from './errors.js';
import { emptyUsage, providerUsageSchema, usageDataSchema } from './models.js';
import { createLocalContext } from './local.js';
import { createTransport } from './transport.js';
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
    if (credentials.expiresAt !== undefined && (!Number.isFinite(credentials.expiresAt) || credentials.expiresAt <= now))
        throw new UsageError('invalid_credentials');
    // Inspect expiry only, never refresh or infer identity from JWT claims.
    const parts = credentials.token.split('.');
    if (parts.length === 3) {
        try {
            const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
            if (claims && typeof claims === 'object' && 'exp' in claims && typeof claims.exp === 'number' && claims.exp * 1000 <= now)
                throw new UsageError('invalid_credentials');
        }
        catch (error) {
            if (error instanceof UsageError)
                throw error;
        }
    }
}
export class UsageService {
    providers;
    local;
    request;
    cache;
    now;
    timeoutMs;
    constructor(providers, options = {}) {
        this.providers = providers;
        this.local = options.local ?? createLocalContext();
        this.request = options.request ?? createTransport();
        this.now = options.now ?? Date.now;
        this.cache = options.cache ?? new UsageCache(undefined, this.now);
        this.timeoutMs = options.timeoutMs ?? 12_000;
    }
    async collect(options = {}) {
        const selected = options.providerIds?.length ? this.providers.filter(p => options.providerIds.includes(p.id)) : this.providers;
        const providers = await Promise.all(selected.map(provider => this.collectProvider(provider, options.fresh ?? false)));
        return { schemaVersion: 1, generatedAt: new Date(this.now()).toISOString(), warnings: [...this.cache.warnings], providers };
    }
    result(provider, installed, credentialsPresent, error) {
        const reason = error ? safeReason(error) : null;
        const unavailable = reason && ['missing_credentials', 'invalid_credentials', 'credential_read_error', 'unauthorized'].includes(reason.code);
        const now = this.now();
        return { ...emptyUsage(), providerId: provider.id, displayName: provider.displayName,
            experimental: provider.experimental ?? false, installed, credentialsPresent,
            authenticated: reason ? unavailable ? false : null : true,
            availability: reason ? unavailable ? 'unavailable' : 'error' : 'available', reason,
            fetchedAt: new Date(now).toISOString(), expiresAt: new Date(now + CACHE_TTL_MS).toISOString(), cached: false };
    }
    async collectProvider(provider, fresh) {
        let installed = null;
        let credentials = null;
        try {
            // Re-read local credentials on every invocation so account/token changes bypass stale entries.
            const discovery = await deadline(async () => Promise.allSettled([
                provider.detect(this.local), provider.resolveCredentials(this.local),
            ]), this.timeoutMs);
            installed = discovery[0].status === 'fulfilled' ? discovery[0].value : null;
            if (discovery[1].status === 'rejected')
                throw discovery[1].reason;
            credentials = discovery[1].value;
            if (!credentials)
                return this.result(provider, installed, false, new UsageError('missing_credentials'));
            assertCredentials(credentials, this.now());
            const resolved = credentials;
            const key = cacheKey([1, provider.id, provider.version, this.local.home,
                resolved.token, resolved.accountId, resolved.metadata]);
            const result = await this.cache.getOrFetch(key, async () => {
                try {
                    const raw = await deadline(signal => provider.fetchUsage({ ...this.local, request: this.request, signal, now: this.now }, resolved), this.timeoutMs);
                    const parsed = usageDataSchema.safeParse(raw);
                    if (!parsed.success)
                        throw new UsageError('invalid_response');
                    // Extra adapter properties are stripped before persistence; scrub credential echoes too.
                    const serialized = JSON.stringify(parsed.data, (_, value) => {
                        if (typeof value !== 'string')
                            return value;
                        for (const secret of [resolved.token, resolved.accountId]) {
                            if (secret)
                                value = value.replaceAll(secret, '[redacted]');
                        }
                        return value;
                    });
                    const data = usageDataSchema.parse(JSON.parse(serialized));
                    return providerUsageSchema.parse({ ...this.result(provider, installed, true), ...data });
                }
                catch (error) {
                    return this.result(provider, installed, true, error);
                }
            }, fresh);
            return { ...result, installed, credentialsPresent: true };
        }
        catch (error) {
            return this.result(provider, installed, credentials !== null, error);
        }
    }
}
//# sourceMappingURL=service.js.map