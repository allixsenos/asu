import type { LoginSource, Provider } from './providers/base.js';
export declare const builtInProviders: readonly Provider[];
/** Credential stores shared by several tools. Each one is read on every run, next to the providers' own stores. */
export declare const builtInSources: readonly LoginSource[];
export declare function validateProvider(value: unknown): Provider;
export declare function loadProviders(plugins?: string[], cwd?: string): Promise<Provider[]>;
