import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { RequestJson } from './transport.js';

export const UPDATE_CHECK_INTERVAL_MS = 86_400_000;

export interface UpdateCheckOptions {
  /** The private cache directory. The daily stamp lives next to the usage cache. */
  directory: string;
  request: RequestJson;
  name: string;
  version: string;
  now?: () => number;
}

interface Stamp { checkedAt: string; latest: string }

/** Compare two plain x.y.z versions by their numeric parts. A prerelease or anything unparsable compares as older. */
function newer(candidate: string, current: string): boolean {
  const parse = (value: string) => /^(\d+)\.(\d+)\.(\d+)$/.exec(value)?.slice(1, 4).map(Number);
  const a = parse(candidate), b = parse(current);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i]! > b[i]!;
  return false;
}

async function readStamp(path: string): Promise<Stamp | null> {
  try {
    const raw: unknown = JSON.parse(await readFile(path, 'utf8'));
    if (raw && typeof raw === 'object' && typeof (raw as Stamp).checkedAt === 'string' && typeof (raw as Stamp).latest === 'string') return raw as Stamp;
  } catch { /* No stamp yet, or an unreadable one. Check again. */ }
  return null;
}

/**
 * Ask the npm registry for the newest version at most once a day.
 * Returns a one-line notice when a newer version exists, otherwise null. Never throws.
 */
export async function checkForUpdate(options: UpdateCheckOptions): Promise<string | null> {
  const now = options.now ?? Date.now;
  const path = join(options.directory, 'update-check.json');
  try {
    let stamp = await readStamp(path);
    if (!stamp || now() - Date.parse(stamp.checkedAt) >= UPDATE_CHECK_INTERVAL_MS || now() < Date.parse(stamp.checkedAt)) {
      const document = await options.request(`https://registry.npmjs.org/${encodeURIComponent(options.name)}/latest`);
      const latest = document && typeof document === 'object' && typeof (document as { version?: unknown }).version === 'string'
        ? (document as { version: string }).version : null;
      if (!latest) return null;
      stamp = { checkedAt: new Date(now()).toISOString(), latest };
      await mkdir(options.directory, { recursive: true, mode: 0o700 });
      await writeFile(path, JSON.stringify(stamp), { mode: 0o600 });
    }
    return newer(stamp.latest, options.version)
      ? `asu: ${stamp.latest} is available, you run ${options.version}. Update: npx --yes ${options.name}@latest`
      : null;
  } catch { return null; }
}
