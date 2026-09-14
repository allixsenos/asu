export interface LocalContext {
    home: string;
    env: Readonly<Record<string, string | undefined>>;
    platform: NodeJS.Platform;
    readText(path: string): Promise<string | null>;
    readJson(path: string): Promise<unknown | null>;
    /** A macOS Keychain generic password. With `account`, only that exact item is read, with no service-only fallback. */
    keychain(service: string, validate?: (value: string) => boolean, account?: string): Promise<string | null>;
    sqliteToken(path: string, key: string): Promise<string | null>;
}
export declare function readText(path: string): Promise<string | null>;
export declare function readKeychainEntry(service: string, account: string | undefined, run: (args: string[]) => Promise<string>, validate?: (_value: string) => boolean, fallback?: boolean): Promise<string | null>;
export declare function createLocalContext(overrides?: Partial<LocalContext>): LocalContext;
export declare function homePath(context: LocalContext, setting: string | undefined, fallback: string): string;
export declare function detectCommands(context: LocalContext, names: string[], appPaths?: string[]): Promise<boolean>;
