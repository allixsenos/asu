# ASU — agent subscription usage

See how much of your coding-agent subscription you have used, straight from the provider's account APIs.

ASU is a local TypeScript CLI for humans and agents. It discovers supported installations and credentials, fetches providers concurrently, and returns a pretty table, plain text, or versioned JSON. Each provider has its own adapter; a failed provider does not hide the others' results.

## Quick start

Requires **Node.js 22.13 or newer**, npm, and Git. Sign in through your provider's own CLI first.

```bash
npx --yes github:allixsenos/asu --table
```

This repository is currently **private**. Your Git credentials must grant access to `allixsenos/asu`; ASU has not been published to the npm registry. GitHub access installs ASU, while your separate provider credentials let it retrieve usage.

```bash
# Plain text for terminals, logs, and pipes
npx --yes github:allixsenos/asu --plain

# Structured output for agents and scripts
npx --yes github:allixsenos/asu --json

# Select accounts and bypass the five-minute usage cache
npx --yes github:allixsenos/asu --provider claude,codex,copilot --fresh --table

# Include every built-in provider, even if no credentials are found
npx --yes github:allixsenos/asu --all --table
```

Git installs build the TypeScript package through its `prepare` script. They need access to the dependency registry and permission to run that script. A GitHub URL requires no npm publication.

If you use SSH for private repositories, specify it explicitly:

```bash
npx --yes --package='git+ssh://git@github.com/allixsenos/asu.git#main' asu --table
```

For reproducible automation, replace `#main` with a reviewed commit SHA or tag. ASU's `--fresh` flag refreshes provider usage; it does not select a newer package revision.

## Real account output

The following snapshot was fetched on **2026-09-07 at 12:18 UTC** from the maintainer's authenticated Claude, Codex, and GitHub Copilot accounts on Linux. These are real provider-reported figures, not fixtures or estimates, and will become stale as usage changes.

The capture used the local checkout:

```bash
node dist/cli.js --provider claude,codex,copilot --fresh --no-cache --json
```

The table and plain text below were generated from that same JSON snapshot using ASU's own renderers, so all three examples show identical data. No credentials or account identifiers are included. All reset times are UTC.

### Pretty table

Use `--table` for this view. It is also the default in an interactive terminal.

```text
ASU · 2026-09-07T12:18:06.253Z
┌──────────────────┬────────────────────┬───────────────────────┬───────────────────────┬────────────────────┐
│ Provider         │ Plan / status      │ Window / balance      │ Usage                 │ Resets (UTC)       │
├──────────────────┼────────────────────┼───────────────────────┼───────────────────────┼────────────────────┤
│ Claude           │ Max 20x            │ 5 hours               │ 45% used              │ 2026-09-07 14:29   │
│                  │ available          │                       │                       │                    │
│                  │ fresh              │                       │                       │                    │
│                  │                    │ Weekly                │ 78% used              │ 2026-09-08 04:59   │
│                  │                    │ Weekly · Fable        │ 45% used              │ 2026-09-08 04:59   │
├──────────────────┼────────────────────┼───────────────────────┼───────────────────────┼────────────────────┤
│ Codex            │ Plus               │ 5 hours               │ 41% used              │ 2026-09-07 16:48   │
│                  │ available          │                       │                       │                    │
│                  │ fresh              │                       │                       │                    │
│                  │                    │ Weekly                │ 6% used               │ 2026-09-14 11:48   │
│                  │                    │ Gpt Reserve · Weekly  │ 0% used               │ 2026-09-14 12:18   │
│                  │                    │ Credits               │ 0 credits left        │ —                  │
├──────────────────┼────────────────────┼───────────────────────┼───────────────────────┼────────────────────┤
│ GitHub Copilot   │ Individual         │ Chat                  │ 0% used               │ 2026-10-01 00:00   │
│                  │ available          │                       │ 0 / 200 requests      │                    │
│                  │ fresh              │                       │                       │                    │
│                  │                    │ Completions           │ 0% used               │ 2026-10-01 00:00   │
│                  │                    │                       │ 0 / 2,000 requests    │                    │
│                  │                    │ Premium Interactions  │ 100% used             │ 2026-10-01 00:00   │
│                  │                    │                       │ 0 / 0 requests        │                    │
└──────────────────┴────────────────────┴───────────────────────┴───────────────────────┴────────────────────┘
Claude: installed: yes, authenticated: yes. Fetched 2026-09-07T12:18:06.042Z; cache expires 2026-09-07T12:23:06.042Z.
  Extra usage: Disabled
Codex: installed: yes, authenticated: yes. Fetched 2026-09-07T12:18:06.217Z; cache expires 2026-09-07T12:23:06.217Z.
  Credits available: No
GitHub Copilot: installed: yes, authenticated: yes. Fetched 2026-09-07T12:18:06.252Z; cache expires 2026-09-07T12:23:06.252Z.
  Quota reset: 2026-10-01T00:00:00.000Z
```

Copilot's premium row needs care: the endpoint returned zero entitlement, zero remaining requests, and zero percent remaining. ASU therefore displays `100% used` alongside `0 / 0 requests`. This does **not** establish that any premium requests were consumed. The internal endpoint may expose legacy quota information; treat its quantities as the provider's reported snapshot, not a complete billing statement.

### Plain text

Use `--plain` for readable output in logs and pipes. This is the default when stdout is not a terminal.

<details>
<summary>Show the complete plain-text output</summary>

```text
ASU · 2026-09-07T12:18:06.253Z

Claude (claude)
  available; installed: yes, authenticated: yes
  Plan: Max 20x
  5 hours: 45% used; resets 2026-09-07T14:29:59.895Z
  Weekly: 78% used; resets 2026-09-08T04:59:59.895Z
  Weekly · Fable: 45% used; resets 2026-09-08T04:59:59.895Z
  Extra usage: Disabled
  Fetched 2026-09-07T12:18:06.042Z; fresh; expires 2026-09-07T12:23:06.042Z

Codex (codex)
  available; installed: yes, authenticated: yes
  Plan: Plus
  5 hours: 41% used; resets 2026-09-07T16:48:37.000Z
  Weekly: 6% used; resets 2026-09-14T11:48:37.000Z
  Gpt Reserve · Weekly: 0% used; resets 2026-09-14T12:18:06.000Z
  Credits: 0 credits left
  Credits available: No
  Fetched 2026-09-07T12:18:06.217Z; fresh; expires 2026-09-07T12:23:06.217Z

GitHub Copilot (copilot)
  available; installed: yes, authenticated: yes
  Plan: Individual
  Chat: 0% used; 0 / 200 requests; resets 2026-10-01T00:00:00.000Z
  Completions: 0% used; 0 / 2,000 requests; resets 2026-10-01T00:00:00.000Z
  Premium Interactions: 100% used; 0 / 0 requests; resets 2026-10-01T00:00:00.000Z
  Quota reset: 2026-10-01T00:00:00.000Z
  Fetched 2026-09-07T12:18:06.252Z; fresh; expires 2026-09-07T12:23:06.252Z
```

</details>

### JSON

Use `--json` for agents and scripts. Stdout contains the report; ASU invocation errors go to stderr. Human output rounds quantities to two decimal places, while JSON preserves normalized numeric precision.

<details>
<summary>Show the complete version 1 JSON report</summary>

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-09-07T12:18:06.253Z",
  "warnings": [],
  "providers": [
    {
      "planLabel": "Max 20x",
      "windows": [
        {
          "id": "five_hour",
          "label": "5 hours",
          "percentUsed": 45,
          "resetsAt": "2026-09-07T14:29:59.895Z"
        },
        {
          "id": "seven_day",
          "label": "Weekly",
          "percentUsed": 78,
          "resetsAt": "2026-09-08T04:59:59.895Z"
        },
        {
          "id": "weekly-model-fable",
          "label": "Weekly · Fable",
          "percentUsed": 45,
          "resetsAt": "2026-09-08T04:59:59.895Z",
          "scope": {
            "model": "Fable"
          }
        }
      ],
      "balances": [],
      "details": [
        {
          "label": "Extra usage",
          "value": "Disabled"
        }
      ],
      "providerId": "claude",
      "displayName": "Claude",
      "experimental": false,
      "installed": true,
      "credentialsPresent": true,
      "authenticated": true,
      "availability": "available",
      "reason": null,
      "fetchedAt": "2026-09-07T12:18:06.042Z",
      "expiresAt": "2026-09-07T12:23:06.042Z",
      "cached": false
    },
    {
      "planLabel": "Plus",
      "windows": [
        {
          "id": "usage-primary_window",
          "label": "5 hours",
          "percentUsed": 41,
          "resetsAt": "2026-09-07T16:48:37.000Z"
        },
        {
          "id": "usage-secondary_window",
          "label": "Weekly",
          "percentUsed": 6,
          "resetsAt": "2026-09-14T11:48:37.000Z"
        },
        {
          "id": "additional-0-gpt-reserve-primary_window",
          "label": "Gpt Reserve · Weekly",
          "percentUsed": 0,
          "resetsAt": "2026-09-14T12:18:06.000Z"
        }
      ],
      "balances": [
        {
          "id": "credits",
          "label": "Credits",
          "unit": "credits",
          "remaining": 0,
          "unlimited": false
        }
      ],
      "details": [
        {
          "label": "Credits available",
          "value": "No"
        }
      ],
      "providerId": "codex",
      "displayName": "Codex",
      "experimental": false,
      "installed": true,
      "credentialsPresent": true,
      "authenticated": true,
      "availability": "available",
      "reason": null,
      "fetchedAt": "2026-09-07T12:18:06.217Z",
      "expiresAt": "2026-09-07T12:23:06.217Z",
      "cached": false
    },
    {
      "planLabel": "Individual",
      "windows": [
        {
          "id": "chat",
          "label": "Chat",
          "percentUsed": 0,
          "resetsAt": "2026-10-01T00:00:00.000Z",
          "used": 0,
          "limit": 200,
          "unit": "requests",
          "unlimited": false
        },
        {
          "id": "completions",
          "label": "Completions",
          "percentUsed": 0,
          "resetsAt": "2026-10-01T00:00:00.000Z",
          "used": 0,
          "limit": 2000,
          "unit": "requests",
          "unlimited": false
        },
        {
          "id": "premium-interactions",
          "label": "Premium Interactions",
          "percentUsed": 100,
          "resetsAt": "2026-10-01T00:00:00.000Z",
          "used": 0,
          "limit": 0,
          "unit": "requests",
          "unlimited": false
        }
      ],
      "balances": [],
      "details": [
        {
          "label": "Quota reset",
          "value": "2026-10-01T00:00:00.000Z"
        }
      ],
      "providerId": "copilot",
      "displayName": "GitHub Copilot",
      "experimental": false,
      "installed": true,
      "credentialsPresent": true,
      "authenticated": true,
      "availability": "available",
      "reason": null,
      "fetchedAt": "2026-09-07T12:18:06.252Z",
      "expiresAt": "2026-09-07T12:23:06.252Z",
      "cached": false
    }
  ]
}
```

</details>

## CLI reference

```text
asu [usage] [options]
```

When running from GitHub, put ASU options after `github:allixsenos/asu`.

| Option | Behavior |
| --- | --- |
| `--format plain\|table\|json` | Choose one output format |
| `--plain`, `--table`, `--json` | Shortcuts for `--format`; mutually exclusive |
| `--provider claude,codex` | Select provider IDs; repeat the flag or separate IDs with commas |
| `--all` | Include providers without a detected installation or credentials |
| `--fresh` | Bypass cached usage; concurrent fresh requests still share work |
| `--no-cache` | Disable persistent cache reads and writes |
| `--cache-dir PATH` | Override the usage cache directory |
| `--plugin PATH_OR_PACKAGE` | Load an explicitly chosen, trusted provider plugin; repeatable |
| `--help`, `-h` | Show help |
| `--version`, `-v` | Print the package version |

Without `--all` or `--provider`, ASU omits providers with no detected installation, credentials, or discovery error. Credentials may be usable even when the provider's executable is not on `PATH`. Installation and authentication are separate fields; `null` means unknown.

### Exit codes

| Code | Meaning |
| --- | --- |
| `0` | At least one selected provider returned available usage |
| `1` | No selected provider returned available usage; a report is still printed |
| `2` | Invalid invocation or plugin configuration; an error is printed to stderr |

A zero exit code does not mean every provider succeeded. Inspect each provider's `availability` when automating. One provider's missing credentials, timeout, or malformed response does not discard the other providers' data.

### Using JSON in scripts

```bash
npx --yes github:allixsenos/asu --json > usage.json
jq '.providers[] | {providerId, availability, planLabel, windows}' usage.json

# Find available providers with a window at or above 80% used
jq '[.providers[]
  | select(.availability == "available")
  | select(any(.windows[]; .percentUsed != null and .percentUsed >= 80))
  | .providerId]' usage.json
```

Consumers should check `schemaVersion` before processing a report. Version 1 includes:

| Field | Meaning |
| --- | --- |
| `generatedAt`, `warnings`, `providers` | Report timestamp, shared warnings, and independent provider results |
| `providerId`, `displayName`, `experimental` | Provider identity and live-validation status |
| `installed`, `credentialsPresent`, `authenticated` | Separate discovery and authentication observations |
| `availability`, `reason` | `available`, `unavailable`, or `error`, with a reason code and safe message when needed |
| `planLabel` | Subscription label, or `null` if unknown |
| `windows` | Variable-length usage windows with IDs, percentages, UTC resets, optional quantities, and model/surface scope |
| `balances` | Reported credits or monetary balances with explicit units |
| `details` | Additional normalized label/value information |
| `fetchedAt`, `expiresAt`, `cached` | Timestamp and freshness of each provider's snapshot |

Unknown percentages and reset times are `null`. Missing quantities and balances do not mean zero. Unlimited allowances are explicit, and percentages may exceed 100 if a provider reports overage. Avoid assuming a fixed number or ordering of windows. See the [report contract](docs/architecture.md#report-contract) and [schemas](src/models.ts) for the full model.

## Supported providers

| ID | Provider | Credential sources, in precedence order | Validation |
| --- | --- | --- | --- |
| `claude` | Claude | `.credentials.json` under `$CLAUDE_CONFIG_DIR`, `$CLAUDE_HOME`, or `~/.claude`; macOS Keychain fallback | Live account tested on Linux |
| `codex` | Codex | `$CODEX_HOME/auth.json`, `~/.config/codex/auth.json`, `~/.codex/auth.json` | Live account tested on Linux |
| `copilot` | GitHub Copilot | `COPILOT_TOKEN`, `GITHUB_TOKEN`, `GITHUB_PAT`, GitHub CLI `hosts.yml` | Live account tested on Linux |
| `cursor` | Cursor | `CURSOR_ACCESS_TOKEN`, `CURSOR_TOKEN`, desktop SQLite, `~/.config/cursor/auth.json` | Experimental; fixture tests only |
| `zai` | Z.ai | `ZAI_API_KEY`, `GLM_API_KEY` | Experimental; fixture tests only |
| `grok` | Grok | `GROK_API_KEY`, `GROK_TOKEN`, `~/.grok/auth.json` | Experimental; fixture tests only |
| `kimi` | Kimi | `KIMI_TOKEN`, `KIMI_API_KEY`, credentials under `$KIMI_CODE_HOME` or `~/.kimi-code`, legacy `~/.kimi` | Experimental; fixture tests only |
| `minimax` | MiniMax | `MINIMAX_API_KEY`, `~/.mmx/credentials.json`, `~/.mmx/config.json` | Experimental; fixture tests only |

Only Claude Max 20x, Codex Plus, and GitHub Copilot Individual have been checked against the maintainer's live accounts. The other five adapters always return `experimental: true` and are marked in human output. Passing fixture tests does not verify a live subscription or every credential-store variant. macOS and Windows paths have not been live-tested.

Credential lookup details:

- Claude reads `claudeAiOauth.accessToken`. On macOS it falls back to Keychain service `Claude Code-credentials`, trying the current user's account before the legacy service-only lookup.
- Codex requires OAuth `tokens.access_token`, with optional `tokens.account_id`. API-key authentication and OS-keyring-only credentials are not supported by this adapter.
- Copilot honors `GH_CONFIG_DIR` and `XDG_CONFIG_HOME` when reading GitHub CLI credentials. Credentials held exclusively in Copilot CLI's own credential store are not currently read. An installed `gh` alone does not count as an installed Copilot CLI.
- Cursor reads its desktop `state.vscdb` in read-only mode, using platform-specific locations including macOS Application Support and Windows `APPDATA`; Linux lookup honors `XDG_CONFIG_HOME`.
- Kimi's credential filename is `credentials/kimi-code.json` beneath its configured or default home.
- MiniMax supports `MINIMAX_REGION=cn` or a recognized `MINIMAX_BASE_URL`. Arbitrary API destinations are rejected.

The APIs include undocumented internal endpoints and can change. Adapter-specific request methods, schemas, primary sources, and limitations are recorded in [provider contracts](docs/provider-contracts.md).

## How it works

```text
CLI options → provider registry → concurrent provider operations
                                      │
                          read local credentials (read-only)
                                      │
                       five-minute cache or provider usage API
                                      │
                         normalize, validate, and redact
                                      │
                            table / plain text / JSON
```

Each provider lives in its own file under [`src/providers/`](src/providers). The shared service handles deadlines, failure isolation, caching, and report validation. Generic renderers support any number of windows or balances. All work happens in the local Node process: there is no dashboard, HTTP server, hosted backend, or telemetry.

### Cache and timeouts

Results are cached for **five minutes**, separately by provider and credential identity. The cache directory is chosen in this order:

1. `--cache-dir PATH`
2. `$ASU_CACHE_DIR`
3. `$XDG_CACHE_HOME/asu`
4. `~/.cache/asu`

Credentials are read on each invocation; changes invalidate the cache key. Concurrent calls share work in-process and use filesystem locks across CLI invocations. API failures are cached too. Missing, malformed, and locally expired credentials are checked again on each invocation without an API request.

Use `--fresh` to bypass an existing result after resolving a problem. Use `--no-cache` to avoid reading or writing the persistent cache. The report still includes the snapshot's five-minute `expiresAt` even when disk caching is disabled. Expired entries are replaced on the next lookup; unused old account entries are not automatically pruned.

HTTP requests have an eight-second deadline, a one-MiB response limit, and no redirects. Each provider operation has a twelve-second deadline. Cache-lock contention is bounded at approximately 32 seconds; cache failures fall back to fetching without persistence and produce a warning.

### Credential handling

ASU reads existing credentials and sends them only to the adapter's provider endpoint. It never refreshes tokens, signs in, rewrites provider files, executes the provider CLI to obtain usage, or estimates subscription consumption from conversation history. Missing or rejected credentials produce an unavailable result; sign in or refresh through the provider's own CLI.

Only normalized usage is printed and cached. Tokens, refresh tokens, account IDs, and raw API errors are excluded. The cache uses private directory/file permissions on Unix and SHA-256 filenames derived from credential identity. Usage reports still contain plan and account-usage information; the examples above were deliberately shared by the maintainer.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| GitHub says the repository is missing or access is denied | It is private. Verify Git access with `git ls-remote git@github.com:allixsenos/asu.git HEAD`, or use your configured HTTPS authentication. |
| Git installation fails during `prepare` | Confirm the Node version, dependency-registry access, and that npm permits build scripts. See the local checkout instructions below. |
| npm 9 reports `could not determine executable to run` while preparing a Git install | Try `npm exec --yes --package=github:allixsenos/asu -- asu --table` instead of its `npx` wrapper. |
| No supported agents or credentials detected | Try `--all`, check the credential sources above, and verify the expected home-directory overrides and `PATH`. |
| `missing_credentials`, `invalid_credentials`, or `unauthorized` | Sign in or refresh through the provider's CLI, then retry ASU with `--fresh`. A successful CLI login helps only if its credential store is supported above. |
| `credential_read_error` | Check that the credential file or store is readable by your current user. |
| `timeout`, `rate_limited`, or `http_error` | Check connectivity and the provider's status; wait before retrying a rate limit. Use `--fresh` to bypass a cached failure. |
| `invalid_response` | The provider may have changed its response schema. Check [known contract limitations](docs/provider-contracts.md). |
| Usage appears stale | Check `fetchedAt` and `cached`; use `--fresh`. ASU cannot make the upstream provider update its figures sooner. |
| One provider fails but the command exits successfully | Exit code `0` means at least one provider succeeded. Inspect each provider's `availability`. |

## Plugins

Providers are pluggable ESM modules with a unique ID, version, and three operations: detect installation, resolve credentials, and fetch normalized usage. An adapter owns its credential format and API contract; the shared service and renderers stay provider-independent.

```bash
npx --yes github:allixsenos/asu --plugin ./my-provider.mjs --provider my-provider --json
```

A plugin can export `default` or `provider`. Installed package names resolve from the current working directory. Plugins are explicitly loaded local code with access to the process; only load modules you trust. ASU does not download or automatically discover plugins. See the [plugin contract and example](docs/architecture.md#external-plugin-example) for implementation details. The package also exports its service, schemas, and TypeScript types as a library.

## Local development and testing

```bash
gh repo clone allixsenos/asu
cd asu
npm ci

# npm ci builds through prepare; rebuild after editing TypeScript
npm run build
node dist/cli.js --table
node dist/cli.js --provider claude,codex,copilot --fresh --json

# Required checks for behavior changes
npm run check
npm test
```

Tests use synthetic API responses and temporary credential stores. They cover normalization, credential precedence and expiration, malformed responses, failure isolation, timeouts, cache expiry, concurrent requests, account changes, redaction, and actual CLI subprocess output. They do not use your accounts or call provider APIs. Live verification is a separate step, as documented in the snapshot above.

GitHub Actions runs type checks, tests, and npm-package smoke checks on Node 22 and 24. To try the packed artifact locally without publishing:

```bash
npm pack
npx --yes --package ./allixsenos-asu-0.1.0.tgz asu --help
npx --yes --package ./allixsenos-asu-0.1.0.tgz asu --table
```

Enable the repository's commit-message hook and prefer rebasing pulls:

```bash
git config core.hooksPath .githooks
git config pull.rebase true
```

Conventional Commits are mandatory. Prefer small, scoped commits and squash merges; rebase merges are allowed, and merge commits are disabled. [`CLAUDE.md`](CLAUDE.md) is a symlink to [`AGENTS.md`](AGENTS.md), so Claude and other agents share the project instructions.

## Project status

Private development repository. The package is marked `private: true`, is not published to npm, and is currently `UNLICENSED`. Making the repository public or publishing a package requires the owner's explicit decision.
