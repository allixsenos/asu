import type { LocalContext } from '../local.js';
import type { LoginSource } from '../providers/base.js';
/**
 * opencode keeps every provider login in one JSON file, keyed by opencode's provider ID.
 * Source: anomalyco/opencode v1.18.30, packages/opencode/src/auth/index.ts and packages/core/src/global.ts.
 * The path is the same on every platform: $XDG_DATA_HOME/opencode/auth.json, else ~/.local/share/opencode/auth.json.
 * opencode v2 moves credentials into SQLite. That release is not out yet and is not read here.
 */
export declare function opencodeAuthPath(context: LocalContext): string;
/** Every subscription login opencode stores. opencode uses each of them, so each is in use. */
export declare const opencodeSource: LoginSource;
