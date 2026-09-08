import { createHash, randomUUID } from 'node:crypto';
import { chmod, lstat, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import lockfile from 'proper-lockfile';
import { providerUsageSchema } from './models.js';
export const CACHE_TTL_MS = 300_000;
export function cacheKey(parts) {
    return createHash('sha256').update(JSON.stringify(parts)).digest('hex');
}
export class UsageCache {
    directory;
    now;
    memory = new Map();
    pending = new Map();
    warnings = new Set();
    constructor(directory, now = Date.now) {
        this.directory = directory;
        this.now = now;
    }
    async getOrFetch(key, load, fresh = false) {
        if (!/^[a-f0-9]{64}$/.test(key))
            throw new Error('Invalid cache key');
        const pending = this.pending.get(key);
        if (pending)
            return structuredClone(await pending);
        const startedAt = this.now();
        const current = this.memory.get(key);
        if (!fresh && current && this.valid(current))
            return { ...structuredClone(current), cached: true };
        const work = this.load(key, load, fresh, startedAt);
        this.pending.set(key, work);
        try {
            const result = await work;
            this.memory.set(key, structuredClone(result));
            return structuredClone(result);
        }
        finally {
            this.pending.delete(key);
        }
    }
    valid(data) {
        return Date.parse(data.fetchedAt) <= this.now() && Date.parse(data.expiresAt) > this.now()
            && Date.parse(data.expiresAt) - Date.parse(data.fetchedAt) <= CACHE_TTL_MS;
    }
    async read(path, fresh, startedAt) {
        try {
            const stat = await lstat(path);
            if (!stat.isFile() || stat.size > 1_048_576)
                return null;
            const result = providerUsageSchema.safeParse(JSON.parse(await readFile(path, 'utf8')));
            if (!result.success || !this.valid(result.data))
                return null;
            if (fresh && Date.parse(result.data.fetchedAt) < startedAt)
                return null;
            return { ...result.data, cached: true };
        }
        catch {
            return null;
        }
    }
    async load(key, load, fresh, startedAt) {
        if (!this.directory)
            return load();
        const path = join(this.directory, `${key}.json`);
        let release;
        let compromised = false;
        try {
            await mkdir(this.directory, { recursive: true, mode: 0o700 });
            const stat = await lstat(this.directory);
            if (!stat.isDirectory() || (process.getuid && stat.uid !== process.getuid()))
                throw new Error();
            if (process.platform !== 'win32')
                await chmod(this.directory, 0o700);
            const cached = await this.read(path, fresh, startedAt);
            if (cached)
                return cached;
            release = await lockfile.lock(path, { realpath: false, stale: 30_000, update: 5_000,
                retries: { retries: 160, factor: 1, minTimeout: 200, maxTimeout: 200 },
                onCompromised: () => { compromised = true; this.warnings.add('Cache lock was lost; this result was not saved.'); },
            });
        }
        catch {
            this.warnings.add('Persistent cache unavailable; results may require fresh provider requests.');
            return load();
        }
        try {
            // A different invocation may have filled the cache while we waited for its lock.
            const cached = await this.read(path, fresh, startedAt);
            if (cached)
                return cached;
            const result = await load();
            if (!compromised) {
                const temporary = `${path}.${randomUUID()}.tmp`;
                try {
                    await writeFile(temporary, JSON.stringify(providerUsageSchema.parse(result)), { mode: 0o600, flag: 'wx' });
                    await rename(temporary, path);
                }
                catch {
                    this.warnings.add('Could not save the usage cache.');
                }
                finally {
                    await unlink(temporary).catch(() => { });
                }
            }
            return result;
        }
        finally {
            await release?.().catch(() => { });
        }
    }
}
//# sourceMappingURL=cache.js.map