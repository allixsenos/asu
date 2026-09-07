import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Provider } from './providers/base.js';
import { claude } from './providers/claude.js';
import { codex } from './providers/codex.js';
import { copilot } from './providers/copilot.js';
import { cursor } from './providers/cursor.js';
import { zai } from './providers/zai.js';
import { grok } from './providers/grok.js';
import { kimi } from './providers/kimi.js';
import { minimax } from './providers/minimax.js';

export const builtInProviders: readonly Provider[] = [claude, codex, copilot, cursor, zai, grok, kimi, minimax];
export function validateProvider(value: unknown): Provider {
  if (!value || typeof value !== 'object') throw new Error('Invalid provider plugin');
  const p = value as Partial<Provider>;
  if (typeof p.id !== 'string' || !/^[a-z0-9][a-z0-9-]{0,47}$/.test(p.id)
    || typeof p.displayName !== 'string' || !/^[\p{L}\p{N} ._-]{1,80}$/u.test(p.displayName)
    || !Number.isSafeInteger(p.version) || (p.version ?? 0) < 1
    || typeof p.detect !== 'function' || typeof p.resolveCredentials !== 'function' || typeof p.fetchUsage !== 'function'
    || (p.experimental !== undefined && typeof p.experimental !== 'boolean')) throw new Error('Invalid provider plugin');
  return value as Provider;
}
export async function loadProviders(plugins: string[] = [], cwd = process.cwd()): Promise<Provider[]> {
  const providers = [...builtInProviders], ids = new Set(providers.map(p => p.id));
  const require = createRequire(resolve(cwd, '__asu_resolve__.cjs'));
  for (const specifier of plugins) {
    try {
      // Explicit local/package imports only. No remote downloads or auto-scanning directories.
      const file = specifier.startsWith('.') || specifier.startsWith('/') ? resolve(cwd, specifier) : require.resolve(specifier);
      const module: { default?: unknown; provider?: unknown } = await import(pathToFileURL(file).href);
      const provider = validateProvider(module.default ?? module.provider);
      if (ids.has(provider.id)) throw new Error('Duplicate provider ID');
      providers.push(provider); ids.add(provider.id);
    } catch { throw new Error('Could not load a provider plugin. Check its path, exports, and unique provider ID.'); }
  }
  return providers;
}
