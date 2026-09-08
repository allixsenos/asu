import { UsageError } from '../errors.js';
export function object(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new UsageError('invalid_response');
    return value;
}
export function optionalObject(value) { return value == null ? {} : object(value); }
export function list(value) {
    if (value == null)
        return [];
    if (!Array.isArray(value))
        throw new UsageError('invalid_response');
    return value;
}
export function string(value) {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
export function number(value) {
    if (typeof value !== 'number' && (typeof value !== 'string' || !/^-?\d+(\.\d+)?$/.test(value)))
        return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
}
export function nonnegative(value) {
    const n = number(value);
    return n !== undefined && n >= 0 ? n : undefined;
}
export function percent(value) {
    const n = nonnegative(value);
    if (n === undefined)
        throw new UsageError('invalid_response');
    return n; // Providers may report overage above 100%; do not hide it.
}
export function timestamp(value) {
    if (value == null || value === '')
        return null;
    const numeric = number(value);
    const ms = numeric === undefined ? (typeof value === 'string' ? Date.parse(value) : NaN)
        : numeric < 100_000_000_000 ? numeric * 1000 : numeric;
    if (!Number.isFinite(ms))
        throw new UsageError('invalid_response');
    // Providers compute reset times relative to the request, so the milliseconds jitter between calls. Whole seconds are stable enough.
    try {
        return new Date(Math.round(ms / 1000) * 1000).toISOString();
    }
    catch {
        throw new UsageError('invalid_response');
    }
}
export function slug(value) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100) || 'scope';
}
export function title(value) {
    return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}
export function ratio(used, limit) {
    const u = nonnegative(used), l = nonnegative(limit);
    return u !== undefined && l !== undefined && l > 0 ? u / l * 100 : null;
}
export function countWindow(id, label, raw, reset, unit = 'requests') {
    const used = nonnegative(raw.used), limit = nonnegative(raw.limit);
    if (used === undefined && limit === undefined)
        throw new UsageError('invalid_response');
    return { id, label, used, limit, unit, percentUsed: ratio(used, limit), resetsAt: timestamp(reset) };
}
export function requireUsage(data) {
    if (!data.planLabel && !data.windows.length && !data.balances.length && !data.details.length)
        throw new UsageError('invalid_response');
    return data;
}
export function credentialObject(value) {
    try {
        return object(value);
    }
    catch {
        throw new UsageError('invalid_credentials');
    }
}
//# sourceMappingURL=parse.js.map