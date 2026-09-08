import type { UsageData } from '../models.js';
import type { Provider } from './base.js';
export declare function normalizeZaiPlan(payload: unknown): UsageData;
export declare function normalizeZaiQuota(payload: unknown): UsageData;
export declare const zai: Provider;
