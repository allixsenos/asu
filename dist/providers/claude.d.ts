import type { UsageData } from '../models.js';
import type { Provider } from './base.js';
export declare function normalizeClaude(payload: unknown, metadata?: Record<string, string>): UsageData;
export declare const claude: Provider;
