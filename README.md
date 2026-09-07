# ASU — agent subscription usage

A local TypeScript CLI for humans and agents. ASU detects supported installations and local credentials, fetches account usage from provider APIs, and reports it as plain text, a table, or versioned JSON. It does not estimate subscription usage from conversation logs.

## Try it

Requires Node.js **22.13 or newer** and npm. This repository and package are private; nothing has been published to npm.

```bash
gh repo clone allixsenos/asu
cd asu
npm ci

node dist/cli.js --table
node dist/cli.js --plain
node dist/cli.js --json
node dist/cli.js --provider claude,codex,copilot --fresh --table
```

`npm ci` builds the CLI through its `prepare` script. After editing TypeScript, run `npm run build` again.

To test the same npm package that `npx` runs, without publishing it:

```bash
npm pack
npx --yes --package ./allixsenos-asu-0.1.0.tgz asu --table
npx --yes --package ./allixsenos-asu-0.1.0.tgz asu --json
```

The default format is a table in an interactive terminal and plain text when piped. For agents and scripts, request `--json` explicitly. Stdout contains only the report; invocation errors go to stderr. No terminal colors are emitted.

## Options

| Option | Behavior |
| --- | --- |
| `--format plain\|table\|json` | Explicit output format; `--plain`, `--table`, and `--json` are shortcuts |
| `--provider claude,codex` | Select providers; the flag may also be repeated |
| `--all` | Include providers without a detected installation or credentials |
| `--fresh` | Bypass cached results; simultaneous fresh requests still share work |
| `--no-cache` | Disable disk cache reads and writes |
| `--cache-dir PATH` | Override the cache directory |
| `--plugin PATH_OR_PACKAGE` | Load an explicitly chosen, trusted provider plugin; repeatable |

Without `--all` or `--provider`, providers with no installation, credentials, or discovery error are omitted. Credentials can be usable even when no CLI executable is on `PATH`. Installation and authentication are reported separately. `null` means unknown, not false.

Exit status is `0` when at least one selected provider reports available data, `1` when none does, and `2` for invocation/plugin configuration errors. One provider failure never discards another provider's report. A successful process exit does not imply every provider succeeded; inspect each JSON result.

```bash
node dist/cli.js --json | jq '.providers[] | {providerId, availability, planLabel, windows}'
```

## Providers and validation

| Provider | Credential sources, in precedence order | Validation |
| --- | --- | --- |
| Claude | `$CLAUDE_CONFIG_DIR` / `$CLAUDE_HOME` / `~/.claude/.credentials.json`; macOS Keychain fallback | Live check passed on Linux |
| Codex | `$CODEX_HOME/auth.json`, `~/.config/codex/auth.json`, `~/.codex/auth.json` | Live check passed on Linux |
| GitHub Copilot | `COPILOT_TOKEN`, `GITHUB_TOKEN`, `GITHUB_PAT`, GitHub CLI `hosts.yml` | Live check passed on Linux |
| Cursor | `CURSOR_ACCESS_TOKEN`, `CURSOR_TOKEN`, desktop SQLite, `~/.config/cursor/auth.json` | Experimental; fixture tests only |
| Z.ai | `ZAI_API_KEY`, `GLM_API_KEY` | Experimental; fixture tests only |
| Grok | `GROK_API_KEY`, `GROK_TOKEN`, `~/.grok/auth.json` | Experimental; fixture tests only |
| Kimi | `KIMI_TOKEN`, `KIMI_API_KEY`, `$KIMI_CODE_HOME/credentials/kimi-code.json`, legacy `~/.kimi/credentials/kimi-code.json` | Experimental; fixture tests only |
| MiniMax | `MINIMAX_API_KEY`, `~/.mmx/credentials.json`, `~/.mmx/config.json` | Experimental; fixture tests only |

Live verification on **2026-09-07** returned usage for Claude Max 20x, Codex Plus, and GitHub Copilot Individual. This confirms the API paths and locally available credentials on the development machine; it does not validate every plan or credential-store variant. The five other adapters always expose `experimental: true` and are marked in human output.

Kimi defaults to `~/.kimi-code`. Copilot honors `GH_CONFIG_DIR` and `XDG_CONFIG_HOME`; Cursor honors `XDG_CONFIG_HOME`, macOS Application Support, and Windows `APPDATA`. MiniMax supports `MINIMAX_REGION=cn` or a recognized `MINIMAX_BASE_URL`; arbitrary credential destinations are rejected.

These are partly undocumented provider endpoints. See [the verified contracts and limitations](docs/provider-contracts.md). CLI-only Copilot credentials held exclusively in another credential store are not currently read; the environment/`hosts.yml` sources above must be available. Codex API-key authentication and OS-keyring-only authentication are not subscription OAuth files and are not supported by this adapter.

## Cache and credential handling

Results are cached for five minutes at `$ASU_CACHE_DIR`, or `$XDG_CACHE_HOME/asu`, or `~/.cache/asu`. Each provider/account has a separate entry. Credential changes invalidate the cache key. The cache contains normalized usage only, with private directory/file permissions on Unix; it never stores tokens, account IDs, raw provider responses, or refresh tokens. The SHA-256 cache filename incorporates credential identity without writing the credential itself.

Concurrent requests share a promise in-process and a filesystem lock across CLI invocations. API failures are cached too. Missing, malformed, and locally expired credentials are rechecked on each invocation without an API request. Use `--fresh` after resolving an authentication failure; use `--no-cache` for a fully uncached run. Expired files are replaced when that account is queried again; ASU does not currently prune unused old account entries.

Requests have an eight-second HTTP deadline, a one-MiB response limit, and no redirects. A provider operation has a twelve-second deadline. Cache lock contention is bounded at approximately 32 seconds; filesystem failures degrade to uncached reads with an explicit warning. Credentials are always read-only: ASU never refreshes tokens, signs in, rewrites another CLI's configuration, or executes that CLI to obtain usage.

Provider requests run in the local Node process. There is no hosted backend, dashboard, telemetry, or HTTP server.

## Plugins and development

Each provider has its own file in `src/providers/`. See [the architecture and plugin contract](docs/architecture.md) for adding an adapter without changing the service or renderers.

```bash
npm run check
npm test
git config core.hooksPath .githooks
git config pull.rebase true
```

Tests use synthetic responses and temporary credential stores; they do not call provider APIs or use real credentials. GitHub Actions runs type checks, tests, and package smoke checks on Node 22 and 24. Conventional Commits are mandatory. Prefer small scoped commits and squash merges; merge commits are disabled in GitHub, and rebase merges are allowed. `CLAUDE.md` links to `AGENTS.md` so both agents share the same rules.
