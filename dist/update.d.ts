import type { RequestJson } from './transport.js';
export declare const UPDATE_CHECK_INTERVAL_MS = 86400000;
export interface UpdateCheckOptions {
    /** The private cache directory. The daily stamp lives next to the usage cache. */
    directory: string;
    request: RequestJson;
    name: string;
    version: string;
    now?: () => number;
}
/**
 * Ask the npm registry for the newest version at most once a day.
 * Returns a one-line notice when a newer version exists, otherwise null. Never throws.
 */
export declare function checkForUpdate(options: UpdateCheckOptions): Promise<string | null>;
