import type { UsageReport } from './models.js';
export type OutputFormat = 'plain' | 'table' | 'json';
export declare function renderPlain(report: UsageReport): string;
export declare function renderTable(report: UsageReport, columns?: number): string;
export declare function render(report: UsageReport, format: OutputFormat, columns?: number): string;
