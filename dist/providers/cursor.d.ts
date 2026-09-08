import type { LocalContext } from '../local.js';
import type { UsageData } from '../models.js';
import type { Provider } from './base.js';
export declare function cursorDatabasePaths(context: LocalContext): string[];
export declare function normalizeCursor(payload: unknown): UsageData;
export declare const cursor: Provider;
