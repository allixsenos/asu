import type { UsageData } from '../models.js';
import type { Credentials, Provider } from './base.js';
export declare function normalizeClaude(payload: unknown, metadata?: Record<string, string>): UsageData;
/** Claude Code's credential file shape. Exported for the ccswap source, whose backups are copies of it. */
export declare function parseCredentials(raw: unknown): Credentials | null;
export declare const claude: Provider;
