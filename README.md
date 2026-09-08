# ASU: agent subscription usage

See how much of your coding-agent subscription you used, straight from the provider's account API.

ASU is a local TypeScript CLI for humans and agents. It finds supported installations and credentials, fetches usage from each provider concurrently, and prints a table, plain text, or versioned JSON. Each provider has its own adapter. A failed provider does not hide the results of the other providers.

## Quick start

ASU needs **Node.js 22.13 or newer**, npm, and Git. Sign in through the provider's own CLI first.

```bash
npx --yes github:allixsenos/asu --table
```

This runs the current `main` branch. The repository commits the built `dist/` directory, so the install needs no build step and no token. To run a released version instead, use the tarball of the newest [GitHub release](https://github.com/allixsenos/asu/releases):

```bash
npx --yes https://github.com/allixsenos/asu/releases/latest/download/asu.tgz --table
```

Released versions are also on GitHub Packages, not on the public npm registry. See [Releasing](docs/releasing.md) for the `.npmrc` lines. Your provider credentials, which are separate, let ASU read usage.

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

For SSH, use `git+ssh://git@github.com/allixsenos/asu.git#main` in place of `github:allixsenos/asu`. For reproducible automation, pin a reviewed commit SHA or tag, for example `github:allixsenos/asu#v0.1.0`. The `--fresh` flag refreshes provider usage. It does not select a newer package revision.

## Real account output

We fetched the snapshot below on **2026-09-07 at 12:18 UTC** from the maintainer's authenticated Claude, Codex, and GitHub Copilot accounts on Linux. These are real provider-reported figures, not fixtures or estimates. They become stale as usage changes.

The capture used the local checkout:

```bash
node dist/cli.js --provider claude,codex,copilot --fresh --no-cache --json
```

ASU's own renderers made the table and the plain text below from that same JSON snapshot with `--utc`, so all three examples show identical data. The examples include no credentials and no account identifiers. All reset times are UTC.

Without `--utc`, the table and the plain text show reset, fetch, and expiry times relative to now, for example `2h30m`, `45m`, or `3d6h`. A reset time that already passed shows as `now`. JSON always contains the full UTC timestamps.

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

Read Copilot's premium row with care. The endpoint returned zero entitlement, zero remaining requests, and zero percent remaining. ASU therefore shows `100% used` next to `0 / 0 requests`. This does **not** show that anyone consumed a premium request. The internal endpoint can return legacy quota information. Treat its quantities as the provider's reported snapshot, not as a complete billing statement.

### Plain text

Use `--plain` for readable output in logs and pipes. It is the default when stdout is not a terminal.

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

Use `--json` for agents and scripts. Stdout contains the report. An ASU invocation error goes to stderr. The human output rounds quantities to two decimal places and shows relative times. JSON keeps the normalized numeric precision and the full UTC timestamps.

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

When you run ASU through `npx`, put the ASU options after the package URL.

| Option | Behavior |
| --- | --- |
| `--format plain\|table\|json` | Select one output format |
| `--plain`, `--table`, `--json` | Shortcuts for `--format`. Use only one. |
| `--utc` | Print full UTC timestamps in table and plain output instead of times relative to now, such as `2h30m` |
| `--provider claude,codex` | Select provider IDs. Repeat the flag or separate the IDs with commas. |
| `--all` | Include providers with no detected installation or credentials |
| `--fresh` | Bypass cached usage. Concurrent fresh requests still share one fetch. |
| `--no-cache` | Do not read or write the persistent cache |
| `--cache-dir PATH` | Set the usage cache directory |
| `--plugin PATH_OR_PACKAGE` | Load a trusted provider plugin that you name explicitly. Repeatable. |
| `--help`, `-h` | Show help |
| `--version`, `-v` | Print the package version |

Without `--all` or `--provider`, ASU omits a provider that has no detected installation, no credentials, and no discovery error. Credentials can work even when the provider's executable is not on `PATH`. Installation and authentication are separate fields. `null` means unknown.

### Exit codes

| Code | Meaning |
| --- | --- |
| `0` | At least one selected provider returned available usage |
| `1` | No selected provider returned available usage. ASU still prints a report. |
| `2` | Invalid invocation or plugin configuration. ASU prints an error to stderr. |

A zero exit code does not mean that every provider succeeded. When you automate ASU, examine the `availability` of each provider. Missing credentials, a timeout, or a malformed response from one provider does not discard the data of the other providers.

### Use JSON in scripts

```bash
npx --yes github:allixsenos/asu --json > usage.json
jq '.providers[] | {providerId, availability, planLabel, windows}' usage.json

# Find available providers with a window at or above 80% used
jq '[.providers[]
  | select(.availability == "available")
  | select(any(.windows[]; .percentUsed != null and .percentUsed >= 80))
  | .providerId]' usage.json
```

A consumer must examine `schemaVersion` before it processes a report. Version 1 includes:

| Field | Meaning |
| --- | --- |
| `generatedAt`, `warnings`, `providers` | Report timestamp, shared warnings, and independent provider results |
| `providerId`, `displayName`, `experimental` | Provider identity and live-validation status |
| `installed`, `credentialsPresent`, `authenticated` | Separate discovery and authentication observations |
| `availability`, `reason` | `available`, `unavailable`, or `error`, with a reason code and a safe message when needed |
| `planLabel` | Subscription label, or `null` if unknown |
| `windows` | Variable-length usage windows with IDs, percentages, UTC resets, optional quantities, and model or surface scope |
| `balances` | Reported credits or monetary balances with explicit units |
| `details` | Additional normalized label and value pairs |
| `fetchedAt`, `expiresAt`, `cached` | Timestamp and freshness of each provider snapshot |

An unknown percentage or reset time is `null`. A missing quantity or balance does not mean zero. An unlimited allowance is explicit. A percentage can exceed 100 if a provider reports overage. Do not assume a fixed number or order of windows. See the [report contract](docs/architecture.md#report-contract) and the [schemas](src/models.ts) for the full model.

## Supported providers

| ID | Provider | Credential sources, in precedence order | Validation |
| --- | --- | --- | --- |
| `claude` | Claude | `.credentials.json` under `$CLAUDE_CONFIG_DIR`, `$CLAUDE_HOME`, or `~/.claude`. macOS Keychain fallback. | Live account, Linux |
| `codex` | Codex | `$CODEX_HOME/auth.json`, `~/.config/codex/auth.json`, `~/.codex/auth.json` | Live account, Linux |
| `copilot` | GitHub Copilot | `COPILOT_TOKEN`, `GITHUB_TOKEN`, `GITHUB_PAT`, GitHub CLI `hosts.yml` | Live account, Linux |
| `cursor` | Cursor | `CURSOR_ACCESS_TOKEN`, `CURSOR_TOKEN`, desktop SQLite, `~/.config/cursor/auth.json` | Experimental. Fixture tests only. |
| `zai` | Z.ai | `ZAI_API_KEY`, `GLM_API_KEY` | Experimental. Fixture tests only. |
| `grok` | Grok | `GROK_API_KEY`, `GROK_TOKEN`, `~/.grok/auth.json` | Experimental. Fixture tests only. |
| `kimi` | Kimi | `KIMI_TOKEN`, `KIMI_API_KEY`, credentials under `$KIMI_CODE_HOME` or `~/.kimi-code`, legacy `~/.kimi` | Experimental. Fixture tests only. |
| `minimax` | MiniMax | `MINIMAX_API_KEY`, `~/.mmx/credentials.json`, `~/.mmx/config.json` | Experimental. Fixture tests only. |

Only Claude Max 20x, Codex Plus, and GitHub Copilot Individual passed a check against the maintainer's live accounts. The other five adapters always return `experimental: true`, and the human output marks them. A passed fixture test does not prove a live subscription or every credential-store variant. The macOS and Windows paths have no live test.

Credential lookup details:

- Claude reads `claudeAiOauth.accessToken`. On macOS it falls back to the Keychain service `Claude Code-credentials`. It tries the current user's account before the legacy service-only lookup.
- Codex needs the OAuth `tokens.access_token`, with an optional `tokens.account_id`. This adapter does not support API-key authentication or credentials that live only in the OS keyring.
- Copilot obeys `GH_CONFIG_DIR` and `XDG_CONFIG_HOME` when it reads the GitHub CLI credentials. It does not read credentials that live only in the Copilot CLI's own store. An installed `gh` alone does not count as an installed Copilot CLI.
- Cursor reads its desktop `state.vscdb` in read-only mode. It uses the platform locations, including macOS Application Support and Windows `APPDATA`. The Linux lookup obeys `XDG_CONFIG_HOME`.
- Kimi's credential file is `credentials/kimi-code.json` under its configured or default home.
- MiniMax supports `MINIMAX_REGION=cn` or a recognized `MINIMAX_BASE_URL`. ASU rejects an arbitrary API destination.

The APIs include undocumented internal endpoints and can change. The request methods, schemas, primary sources, and limitations of each adapter are in [provider contracts](docs/provider-contracts.md).

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

Each provider lives in its own file under [`src/providers/`](src/providers). The shared service handles deadlines, failure isolation, caching, and report validation. The renderers accept any number of windows or balances. All work happens in the local Node process. There is no dashboard, HTTP server, hosted backend, or telemetry.

### Cache and timeouts

ASU caches a result for **five minutes**, separately for each provider and credential identity. It selects the cache directory in this order:

1. `--cache-dir PATH`
2. `$ASU_CACHE_DIR`
3. `$XDG_CACHE_HOME/asu`
4. `~/.cache/asu`

ASU reads the credentials on each invocation. A changed credential changes the cache key. Concurrent calls in one process share one fetch. Concurrent CLI invocations use file locks. ASU also caches an API failure. It examines missing, malformed, and locally expired credentials again on each invocation, without an API request.

Use `--fresh` to bypass an existing result after you solve a problem. Use `--no-cache` when ASU must not read or write the persistent cache. The report still includes the five-minute `expiresAt` of the snapshot when disk caching is off. ASU replaces an expired entry at the next lookup. It does not remove the old entries of unused accounts.

An HTTP request has an eight-second deadline, a one-MiB response limit, and no redirects. Each provider operation has a twelve-second deadline. A wait for the cache lock stops after about 32 seconds. When the cache fails, ASU fetches without persistence and adds a warning.

### Credential handling

ASU reads existing credentials and sends them only to the provider endpoint of the adapter. It never refreshes a token, signs in, rewrites a provider file, runs the provider CLI to get usage, or estimates subscription consumption from conversation history. Missing or rejected credentials give an unavailable result. Sign in or refresh through the provider's own CLI.

ASU prints and caches only normalized usage. It excludes tokens, refresh tokens, account IDs, and raw API errors. The cache uses private directory and file permissions on Unix, and SHA-256 filenames derived from the credential identity. A usage report still contains plan and account-usage information. The maintainer shared the examples above on purpose.

## Troubleshooting

| Symptom | What to examine |
| --- | --- |
| GitHub says the repository is missing or access is denied | Examine your Git access with `git ls-remote https://github.com/allixsenos/asu.git HEAD`. The SSH URL needs a GitHub SSH key. |
| The Git install fails during `prepare` | Examine the Node version, the dependency-registry access, and whether npm permits build scripts. See the local checkout instructions below. |
| `npx` exits with code 1 and prints nothing, or npm 9 reports `could not determine executable to run` | npm 9 cannot run the nested install that a Git dependency with a `build` or `prepare` script needs through `npx`. ASU commits `dist/` and has neither script, so a current checkout does not hit this. Clear the npx cache with `rm -rf ~/.npm/_npx` and retry, or use the release tarball URL. |
| No supported agents or credentials detected | Use `--all`, examine the credential sources above, and examine the home-directory overrides and `PATH`. |
| `missing_credentials`, `invalid_credentials`, or `unauthorized` | Sign in or refresh through the provider's CLI, then run ASU again with `--fresh`. A successful CLI login helps only if ASU supports its credential store. |
| `credential_read_error` | Make sure that your current user can read the credential file or store. |
| `timeout`, `rate_limited`, or `http_error` | Examine the connectivity and the provider status. Wait before you retry after a rate limit. Use `--fresh` to bypass a cached failure. |
| `invalid_response` | The provider may have a new response schema. See the [known limitations](docs/provider-contracts.md#known-limitations). |
| Usage looks stale | Examine `fetchedAt` and `cached`, then use `--fresh`. ASU cannot make the provider update its figures sooner. |
| One provider fails but the command exits with zero | Exit code `0` means that at least one provider succeeded. Examine the `availability` of each provider. |

## Plugins

A provider is an ESM module with a unique ID, a version, and three operations: detect the installation, resolve the credentials, and fetch normalized usage. An adapter owns its credential format and its API contract. The shared service and the renderers stay provider-independent.

```bash
npx --yes github:allixsenos/asu --plugin ./my-provider.mjs --provider my-provider --json
```

A plugin can export `default` or `provider`. ASU resolves an installed package name from the current working directory. A plugin is local code that you load explicitly, and it has full access to the process. Load only modules that you trust. ASU does not download plugins and does not search for them. See the [plugin contract and example](docs/architecture.md#external-plugin-example) for the details. The package also exports its service, schemas, and TypeScript types as a library.

## Local development and testing

```bash
gh repo clone allixsenos/asu
cd asu
npm ci

# dist/ is committed. Rebuild after you edit TypeScript and commit the result.
npm run compile
node dist/cli.js --table
node dist/cli.js --provider claude,codex,copilot --fresh --json

# Required checks for behavior changes
npm run check
npm test
```

The tests use synthetic API responses and temporary credential stores. They cover normalization, credential precedence and expiration, malformed responses, failure isolation, timeouts, cache expiry, concurrent requests, account changes, redaction, and real CLI subprocess output. They do not use your accounts and do not call provider APIs. Live verification is a separate step, as the snapshot above documents.

GitHub Actions runs the type checks, the tests, and a packed-package smoke test on Node 22 and 24. It also fails when the committed `dist/` differs from a fresh build. To try the packed artifact locally without a publication:

```bash
npx --yes --package "./$(npm pack --silent)" asu --help
npx --yes --package "./$(npm pack --silent)" asu --table
```

Enable the commit-message hook of the repository and prefer rebase on pull:

```bash
git config core.hooksPath .githooks
git config pull.rebase true
```

Conventional Commits are mandatory. Prefer small, scoped commits and squash merges. Rebase merges are permitted, and merge commits are off. [`CLAUDE.md`](CLAUDE.md) is a symlink to [`AGENTS.md`](AGENTS.md), so Claude and other agents share the project instructions.

## Releases

release-please writes [`CHANGELOG.md`](CHANGELOG.md) and creates each release from the commit history. [Releasing](docs/releasing.md) describes the release pull request, the GitHub release with the packed tarball, and the GitHub Packages publication.

## Project status

Public repository. The package is `UNLICENSED`, so the owner keeps all rights until a license is added. The release workflow publishes it only to GitHub Packages. Only the owner can decide to publish to the public npm registry.
