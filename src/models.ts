import { stripVTControlCharacters } from 'node:util';
import { z } from 'zod';

export const displayText = z.string().max(1024).transform(value =>
  stripVTControlCharacters(value).replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, ' ').trim());
const id = z.string().regex(/^[a-z0-9][a-z0-9._:-]{0,127}$/);
const quantity = z.number().finite().nonnegative();
const timestamp = z.iso.datetime();

export const windowSchema = z.object({
  id,
  label: displayText,
  percentUsed: quantity.nullable(),
  resetsAt: timestamp.nullable(),
  used: quantity.optional(),
  limit: quantity.optional(),
  unit: displayText.optional(),
  unlimited: z.boolean().optional(),
  scope: z.object({ model: displayText.optional(), surface: displayText.optional() }).optional(),
});
export const balanceSchema = z.object({
  id,
  label: displayText,
  unit: displayText,
  remaining: z.number().finite().optional(),
  used: quantity.optional(),
  limit: quantity.optional(),
  unlimited: z.boolean().optional(),
});
export const usageDataSchema = z.object({
  planLabel: displayText.nullable(),
  windows: z.array(windowSchema).max(100),
  balances: z.array(balanceSchema).max(100),
  details: z.array(z.object({ label: displayText, value: displayText })).max(100),
});
export const reasonCodes = ['missing_credentials', 'invalid_credentials', 'credential_read_error',
  'unauthorized', 'timeout', 'rate_limited', 'http_error', 'invalid_response', 'provider_error'] as const;
export const providerUsageSchema = usageDataSchema.extend({
  providerId: id,
  displayName: displayText,
  experimental: z.boolean(),
  installed: z.boolean().nullable(),
  credentialsPresent: z.boolean(),
  authenticated: z.boolean().nullable(),
  availability: z.enum(['available', 'unavailable', 'error']),
  reason: z.object({ code: z.enum(reasonCodes), message: displayText }).nullable(),
  fetchedAt: timestamp,
  expiresAt: timestamp,
  cached: z.boolean(),
});
export const reportSchema = z.object({
  schemaVersion: z.literal(1),
  generatedAt: timestamp,
  warnings: z.array(displayText),
  providers: z.array(providerUsageSchema),
});
export type UsageWindow = z.infer<typeof windowSchema>;
export type Balance = z.infer<typeof balanceSchema>;
export type UsageData = z.infer<typeof usageDataSchema>;
export type ProviderUsage = z.infer<typeof providerUsageSchema>;
export type UsageReport = z.infer<typeof reportSchema>;
export type ReasonCode = typeof reasonCodes[number];

export function emptyUsage(): UsageData {
  return { planLabel: null, windows: [], balances: [], details: [] };
}
