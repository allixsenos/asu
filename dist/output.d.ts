import type { UsageReport } from './models.js';
export type OutputFormat = 'plain' | 'table' | 'json';
export interface RenderOptions {
    columns?: number;
    /** Print full UTC timestamps instead of times relative to now. */
    utc?: boolean;
    now?: number;
}
export declare function renderPlain(report: UsageReport, options?: RenderOptions): string;
export declare function renderTable(report: UsageReport, options?: RenderOptions): string;
export declare function render(report: UsageReport, format: OutputFormat, options?: RenderOptions): string;
