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
/**
 * One login found in one place. Private to the backend: it carries credentials, and its identity
 * fields can hold an email address. Only a masked label reaches output, and nothing here is cached.
 */
export interface Login {
  credentials: Credentials;
  /** Where the login was found, as the user knows it: "Claude Code", "opencode", "GITHUB_TOKEN". */
  source: string;
  /** The tool behind `source` uses this login right now. */
  inUse?: boolean;
  /** A stable identity that merges one account's logins across sources, such as an account UUID. Never an email or a token. */
  accountKey?: string;
  /** The account's email, for the masked label or --show-email. */
  email?: string;
  /** A non-email account name, such as a GitHub username. Shown masked. */
  handle?: string;
  /** A name the user gave this login. Shown as is. */
  alias?: string;
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
  experimental?: boolean;
  detect(context: LocalContext): Promise<boolean | null>;
  /** Every login this provider's own tools store. Built-in adapters implement it. */
  listLogins?(context: LocalContext): Promise<Login[]>;
  /** One login. The service calls it only when `listLogins` is absent, so plugins written for the first contract keep working. */
  resolveCredentials?(context: LocalContext): Promise<Credentials | null>;
  fetchUsage(context: ProviderContext, credentials: Credentials): Promise<UsageData>;
}
/** A credential store shared by several tools, such as opencode, that holds logins for several providers. */
export interface LoginSource {
  id: string;
  list(context: LocalContext): Promise<Array<{ providerId: string; login: Login }>>;
}
/** The first login's credentials, for a caller that wants a single login. */
export async function firstCredentials(logins: Promise<Login[]>): Promise<Credentials | null> {
  return (await logins)[0]?.credentials ?? null;
}
