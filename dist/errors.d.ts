import type { ReasonCode } from './models.js';
/** Only fixed messages reach output; errors may otherwise contain credentials. */
export declare class UsageError extends Error {
    readonly code: ReasonCode;
    constructor(code: ReasonCode);
}
export declare function safeReason(error: unknown): {
    code: ReasonCode;
    message: string;
};
