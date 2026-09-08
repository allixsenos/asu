import type { Provider } from './providers/base.js';
export declare const builtInProviders: readonly Provider[];
export declare function validateProvider(value: unknown): Provider;
export declare function loadProviders(plugins?: string[], cwd?: string): Promise<Provider[]>;
