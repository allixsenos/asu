import type { Credentials, Login } from './providers/base.js';
/** One account, merged from every login that belongs to it. Private to the backend: it carries credentials and can hold an email. */
export interface MergedAccount {
    /** `<provider>:<8 hex>`, a hash of the account identity or, without one, of the first login's token. */
    id: string;
    /** The credentials that stay valid longest. */
    credentials: Credentials;
    sources: Array<{
        name: string;
        inUse: boolean;
    }>;
    inUse: boolean;
    email?: string;
    handle?: string;
    alias?: string;
}
/**
 * `jane@example.org` becomes `j***@e***.org`. Every domain label except the last is masked too,
 * because a personal domain identifies someone as well as the name does. A one-letter label stays as is.
 */
export declare function maskEmail(email: string): string;
export declare function maskHandle(handle: string): string;
/** The label shown for an account: the alias the user gave it, else the masked email, else the masked handle. */
export declare function accountLabel(account: Pick<MergedAccount, 'alias' | 'email' | 'handle'>): string | null;
/**
 * Merge one provider's logins into accounts. Two logins merge when they share an account identity or the
 * same token. A login with neither stays its own account and carries only where it came from.
 * Accounts that some tool uses right now come first.
 */
export declare function mergeLogins(providerId: string, logins: Login[]): MergedAccount[];
/** Whether --account selects this account: its ID, alias, label, email, handle, or a source name, ignoring case. */
export declare function accountMatches(account: MergedAccount, selector: string): boolean;
