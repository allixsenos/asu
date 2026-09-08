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
/** True when a cell would wrap at this width. The CLI then prefers plain output unless the table was requested. */
export declare function tableWraps(report: UsageReport, options?: RenderOptions): boolean;
export declare function render(report: UsageReport, format: OutputFormat, options?: RenderOptions): string;
