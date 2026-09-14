import type { LocalContext } from '../local.js';
import type { LoginSource } from '../providers/base.js';
/**
 * ccswap keeps every Claude and Codex account it manages under one backup root.
 * Source: errhythm/cc-swap v0.31.0, src/claude_swap/paths.py `get_backup_root`.
 * Linux: $XDG_DATA_HOME/claude-swap when that path is absolute, else ~/.local/share/claude-swap.
 * macOS and Windows: ~/.claude-swap-backup.
 */
export declare function ccswapRoot(context: LocalContext): string;
/** ccswap's directory-safe slug for a session profile. Source: src/claude_swap/session.py `slugify_email`. */
export declare function slugifyEmail(email: string): string;
/**
 * Every Claude and Codex account ccswap manages. None is marked in use: the account ccswap
 * swapped in is already the live Claude Code or Codex CLI login, and merges with it by identity.
 */
export declare const ccswapSource: LoginSource;
