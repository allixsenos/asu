import { z } from 'zod';
export declare const displayText: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
export declare const windowSchema: z.ZodObject<{
    id: z.ZodString;
    label: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
    percentUsed: z.ZodNullable<z.ZodNumber>;
    resetsAt: z.ZodNullable<z.ZodISODateTime>;
    used: z.ZodOptional<z.ZodNumber>;
    limit: z.ZodOptional<z.ZodNumber>;
    unit: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>;
    unlimited: z.ZodOptional<z.ZodBoolean>;
    scope: z.ZodOptional<z.ZodObject<{
        model: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>;
        surface: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const balanceSchema: z.ZodObject<{
    id: z.ZodString;
    label: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
    unit: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
    remaining: z.ZodOptional<z.ZodNumber>;
    used: z.ZodOptional<z.ZodNumber>;
    limit: z.ZodOptional<z.ZodNumber>;
    unlimited: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const usageDataSchema: z.ZodObject<{
    planLabel: z.ZodNullable<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>;
    windows: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
        percentUsed: z.ZodNullable<z.ZodNumber>;
        resetsAt: z.ZodNullable<z.ZodISODateTime>;
        used: z.ZodOptional<z.ZodNumber>;
        limit: z.ZodOptional<z.ZodNumber>;
        unit: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>;
        unlimited: z.ZodOptional<z.ZodBoolean>;
        scope: z.ZodOptional<z.ZodObject<{
            model: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>;
            surface: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    balances: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
        unit: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
        remaining: z.ZodOptional<z.ZodNumber>;
        used: z.ZodOptional<z.ZodNumber>;
        limit: z.ZodOptional<z.ZodNumber>;
        unlimited: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>;
    details: z.ZodArray<z.ZodObject<{
        label: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
        value: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const reasonCodes: readonly ['missing_credentials', 'invalid_credentials', 'credential_read_error', 'token_expired', 'unauthorized', 'timeout', 'rate_limited', 'http_error', 'invalid_response', 'provider_error'];
/**
 * One subscription login. `label` is masked unless the caller asked for emails.
 * `email` appears only with --show-email, and never in the cache.
 */
export declare const accountSchema: z.ZodObject<{
    id: z.ZodString;
    label: z.ZodNullable<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>;
    email: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>;
    sources: z.ZodArray<z.ZodObject<{
        name: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
        inUse: z.ZodBoolean;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const providerUsageSchema: z.ZodObject<{
    planLabel: z.ZodNullable<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>;
    windows: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
        percentUsed: z.ZodNullable<z.ZodNumber>;
        resetsAt: z.ZodNullable<z.ZodISODateTime>;
        used: z.ZodOptional<z.ZodNumber>;
        limit: z.ZodOptional<z.ZodNumber>;
        unit: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>;
        unlimited: z.ZodOptional<z.ZodBoolean>;
        scope: z.ZodOptional<z.ZodObject<{
            model: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>;
            surface: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    balances: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
        unit: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
        remaining: z.ZodOptional<z.ZodNumber>;
        used: z.ZodOptional<z.ZodNumber>;
        limit: z.ZodOptional<z.ZodNumber>;
        unlimited: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>;
    details: z.ZodArray<z.ZodObject<{
        label: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
        value: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
    }, z.core.$strip>>;
    providerId: z.ZodString;
    displayName: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
    experimental: z.ZodBoolean;
    installed: z.ZodNullable<z.ZodBoolean>;
    credentialsPresent: z.ZodBoolean;
    authenticated: z.ZodNullable<z.ZodBoolean>;
    availability: z.ZodEnum<{
        available: "available";
        error: "error";
        unavailable: "unavailable";
    }>;
    reason: z.ZodNullable<z.ZodObject<{
        code: z.ZodEnum<{
            credential_read_error: "credential_read_error";
            http_error: "http_error";
            invalid_credentials: "invalid_credentials";
            invalid_response: "invalid_response";
            missing_credentials: "missing_credentials";
            provider_error: "provider_error";
            rate_limited: "rate_limited";
            timeout: "timeout";
            token_expired: "token_expired";
            unauthorized: "unauthorized";
        }>;
        message: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
    }, z.core.$strip>>;
    account: z.ZodNullable<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodNullable<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>;
        email: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>;
        sources: z.ZodArray<z.ZodObject<{
            name: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
            inUse: z.ZodBoolean;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    fetchedAt: z.ZodISODateTime;
    expiresAt: z.ZodISODateTime;
    cached: z.ZodBoolean;
}, z.core.$strip>;
export declare const reportSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<2>;
    asuVersion: z.ZodString;
    generatedAt: z.ZodISODateTime;
    warnings: z.ZodArray<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>;
    providers: z.ZodArray<z.ZodObject<{
        planLabel: z.ZodNullable<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>;
        windows: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            label: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
            percentUsed: z.ZodNullable<z.ZodNumber>;
            resetsAt: z.ZodNullable<z.ZodISODateTime>;
            used: z.ZodOptional<z.ZodNumber>;
            limit: z.ZodOptional<z.ZodNumber>;
            unit: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>;
            unlimited: z.ZodOptional<z.ZodBoolean>;
            scope: z.ZodOptional<z.ZodObject<{
                model: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>;
                surface: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>;
            }, z.core.$strip>>;
        }, z.core.$strip>>;
        balances: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            label: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
            unit: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
            remaining: z.ZodOptional<z.ZodNumber>;
            used: z.ZodOptional<z.ZodNumber>;
            limit: z.ZodOptional<z.ZodNumber>;
            unlimited: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>;
        details: z.ZodArray<z.ZodObject<{
            label: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
            value: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
        }, z.core.$strip>>;
        providerId: z.ZodString;
        displayName: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
        experimental: z.ZodBoolean;
        installed: z.ZodNullable<z.ZodBoolean>;
        credentialsPresent: z.ZodBoolean;
        authenticated: z.ZodNullable<z.ZodBoolean>;
        availability: z.ZodEnum<{
            available: "available";
            error: "error";
            unavailable: "unavailable";
        }>;
        reason: z.ZodNullable<z.ZodObject<{
            code: z.ZodEnum<{
                credential_read_error: "credential_read_error";
                http_error: "http_error";
                invalid_credentials: "invalid_credentials";
                invalid_response: "invalid_response";
                missing_credentials: "missing_credentials";
                provider_error: "provider_error";
                rate_limited: "rate_limited";
                timeout: "timeout";
                token_expired: "token_expired";
                unauthorized: "unauthorized";
            }>;
            message: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
        }, z.core.$strip>>;
        account: z.ZodNullable<z.ZodObject<{
            id: z.ZodString;
            label: z.ZodNullable<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>;
            email: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>;
            sources: z.ZodArray<z.ZodObject<{
                name: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
                inUse: z.ZodBoolean;
            }, z.core.$strip>>;
        }, z.core.$strip>>;
        fetchedAt: z.ZodISODateTime;
        expiresAt: z.ZodISODateTime;
        cached: z.ZodBoolean;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type UsageWindow = z.infer<typeof windowSchema>;
export type Balance = z.infer<typeof balanceSchema>;
export type UsageData = z.infer<typeof usageDataSchema>;
export type Account = z.infer<typeof accountSchema>;
export type ProviderUsage = z.infer<typeof providerUsageSchema>;
export type UsageReport = z.infer<typeof reportSchema>;
export type ReasonCode = typeof reasonCodes[number];
export declare function emptyUsage(): UsageData;
