import type { UsageReport } from './models.js';
export type OutputFormat = 'plain' | 'table' | 'bars' | 'json';
export interface RenderOptions {
    columns?: number;
    /** Emit ANSI colors in the bars view. The CLI turns this on for a terminal without NO_COLOR. */
    color?: boolean;
    /** Print full UTC timestamps instead of times relative to now. */
    utc?: boolean;
    now?: number;
}
export declare function renderPlain(report: UsageReport, options?: RenderOptions): string;
export declare function renderTable(report: UsageReport, options?: RenderOptions): string;
/** True when a cell would wrap at this width. The CLI then prefers plain output unless the table was requested. */
export declare function tableWraps(report: UsageReport, options?: RenderOptions): boolean;
export declare function renderBars(report: UsageReport, options?: RenderOptions): string;
/** True when even the narrowest bar layout exceeds the width. The CLI then prefers plain output unless bars were requested. */
export declare function barsOverflow(report: UsageReport, options?: RenderOptions): boolean;
export declare function render(report: UsageReport, format: OutputFormat, options?: RenderOptions): string;
