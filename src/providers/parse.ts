import { UsageError } from '../errors.js';
import type { UsageData, UsageWindow } from '../models.js';

export type Obj = Record<string, unknown>;
export function object(value: unknown): Obj {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new UsageError('invalid_response');
  return value as Obj;
}
export function optionalObject(value: unknown): Obj { return value == null ? {} : object(value); }
export function list(value: unknown): unknown[] {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new UsageError('invalid_response');
  return value;
}
export function string(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
export function number(value: unknown): number | undefined {
  if (typeof value !== 'number' && (typeof value !== 'string' || !/^-?\d+(\.\d+)?$/.test(value))) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}
export function nonnegative(value: unknown): number | undefined {
  const n = number(value);
  return n !== undefined && n >= 0 ? n : undefined;
}
export function percent(value: unknown): number {
  const n = nonnegative(value);
  if (n === undefined) throw new UsageError('invalid_response');
  return n; // Providers may report overage above 100%; do not hide it.
}
export function timestamp(value: unknown): string | null {
  if (value == null || value === '') return null;
  const numeric = number(value);
  const ms = numeric === undefined ? (typeof value === 'string' ? Date.parse(value) : NaN)
    : numeric < 100_000_000_000 ? numeric * 1000 : numeric;
  if (!Number.isFinite(ms)) throw new UsageError('invalid_response');
  // Providers compute reset times relative to the request, so the milliseconds jitter between calls. Whole seconds are stable enough.
  try { return new Date(Math.round(ms / 1000) * 1000).toISOString(); } catch { throw new UsageError('invalid_response'); }
}
export function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100) || 'scope';
}
export function title(value: string): string {
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}
export function ratio(used: unknown, limit: unknown): number | null {
  const u = nonnegative(used), l = nonnegative(limit);
  return u !== undefined && l !== undefined && l > 0 ? u / l * 100 : null;
}
export function countWindow(id: string, label: string, raw: Obj, reset: unknown, unit = 'requests'): UsageWindow {
  const used = nonnegative(raw.used), limit = nonnegative(raw.limit);
  if (used === undefined && limit === undefined) throw new UsageError('invalid_response');
  return { id, label, used, limit, unit, percentUsed: ratio(used, limit), resetsAt: timestamp(reset) };
}
export function requireUsage(data: UsageData): UsageData {
  if (!data.planLabel && !data.windows.length && !data.balances.length && !data.details.length)
    throw new UsageError('invalid_response');
  return data;
}
export function credentialObject(value: unknown): Obj {
  try { return object(value); } catch { throw new UsageError('invalid_credentials'); }
}
