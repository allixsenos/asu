import { access, open } from 'node:fs/promises';
import { constants } from 'node:fs';
import { delimiter, join, resolve } from 'node:path';
import { homedir, userInfo } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { UsageError } from './errors.js';

const exec = promisify(execFile);
export interface LocalContext {
  home: string;
  env: Readonly<Record<string, string | undefined>>;
  platform: NodeJS.Platform;
  readText(path: string): Promise<string | null>;
  readJson(path: string): Promise<unknown | null>;
  keychain(service: string, validate?: (value: string) => boolean): Promise<string | null>;
  sqliteToken(path: string, key: string): Promise<string | null>;
}
export async function readText(path: string): Promise<string | null> {
  let file;
  try {
    file = await open(path, constants.O_RDONLY | (constants.O_NONBLOCK ?? 0));
    const stat = await file.stat();
    if (!stat.isFile() || stat.size > 1_048_576) throw new UsageError('credential_read_error');
    const buffer = Buffer.alloc(1_048_577);
    let size = 0;
    while (size < buffer.length) {
      const { bytesRead } = await file.read(buffer, size, buffer.length - size, null);
      if (!bytesRead) break;
      size += bytesRead;
    }
    if (size > 1_048_576) throw new UsageError('credential_read_error');
    return buffer.subarray(0, size).toString('utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw new UsageError('credential_read_error');
  } finally { await file?.close(); }
}
export async function readKeychainEntry(service: string, account: string | undefined,
  run: (args: string[]) => Promise<string>, validate = (_value: string) => true): Promise<string | null> {
  for (const args of [...(account ? [['-a', account]] : []), []]) {
    try {
      const raw = (await run(['find-generic-password', '-s', service, ...args, '-w'])).trim();
      if (raw && validate(raw)) return raw;
    } catch { /* Try the legacy service-only lookup after an unavailable or invalid entry. */ }
  }
  return null;
}
async function keychain(service: string, validate?: (value: string) => boolean): Promise<string | null> {
  if (process.platform !== 'darwin') return null;
  let account: string | undefined;
  try { account = userInfo().username; } catch { /* Try legacy lookup below. */ }
  return readKeychainEntry(service, account, async args => {
    const { stdout } = await exec('/usr/bin/security', args, { timeout: 2_000, maxBuffer: 1_048_576 });
    return stdout;
  }, validate);
}
async function sqliteToken(path: string, key: string): Promise<string | null> {
  try { await access(path); } catch { return null; }
  // A subprocess contains node:sqlite's experimental warning on Node 22 and bounds a busy database.
  // No token is passed in argv, and child output is never logged.
  const script = `const {DatabaseSync}=require('node:sqlite');
    const db=new DatabaseSync(process.argv[1],{readOnly:true});
    try { const r=db.prepare('SELECT value FROM ItemTable WHERE key = ?').get(process.argv[2]);
      if(typeof r?.value==='string') process.stdout.write(r.value); } finally {db.close();}`;
  try {
    const { stdout } = await exec(process.execPath, ['--no-warnings', '-e', script, path, key],
      { timeout: 2_000, maxBuffer: 65_536 });
    return stdout.trim() || null;
  } catch { throw new UsageError('credential_read_error'); }
}
export function createLocalContext(overrides: Partial<LocalContext> = {}): LocalContext {
  const local = { home: homedir(), env: process.env, platform: process.platform,
    readText, keychain, sqliteToken, ...overrides };
  return { ...local, readJson: overrides.readJson ?? (async path => {
    const text = await local.readText(path);
    if (text === null) return null;
    try { return JSON.parse(text) as unknown; }
    catch { throw new UsageError('invalid_credentials'); }
  }) };
}
export function homePath(context: LocalContext, setting: string | undefined, fallback: string): string {
  const path = setting || join(context.home, fallback);
  return path.startsWith('~/') ? join(context.home, path.slice(2)) : resolve(path);
}
export async function detectCommands(context: LocalContext, names: string[], appPaths: string[] = []): Promise<boolean> {
  const suffixes = context.platform === 'win32' ? ['', '.exe', '.cmd', '.bat'] : [''];
  const paths = (context.env.PATH ?? '').split(delimiter).filter(Boolean)
    .flatMap(dir => names.flatMap(name => suffixes.map(suffix => join(dir, name + suffix))));
  for (const path of paths) {
    try { await access(path, context.platform === 'win32' ? constants.F_OK : constants.X_OK); return true; } catch { /* next */ }
  }
  for (const path of appPaths) { try { await access(path); return true; } catch { /* next */ } }
  return false;
}
