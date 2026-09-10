# ASU: agent subscription usage

See how much of your coding-agent subscription you used, straight from the provider's account API.

ASU is a local TypeScript CLI for humans and agents. It finds supported installations and credentials, fetches usage from each provider concurrently, and prints bars, a table, plain text, or versioned JSON. Each provider has its own adapter. A failed provider does not hide the results of the other providers.

## What it looks like

```bash
npx --yes @allixsenos/asu@latest
```

![Terminal running npx --yes @allixsenos/asu@latest. ASU 0.9.0 shows three providers with one bar per window. Claude, Max 20x, active: 5 hours 30 percent resets in 17 minutes, Weekly 26 percent and Weekly Fable 22 percent reset Tuesday 15 September 07:00. Codex, Plus, active: three windows at 0 percent, 0 credits left. GitHub Copilot, Individual, active: Chat and Completions at 0 percent, Premium Interactions at 100 percent in red, 0 of 0 requests. Green bars for low usage, red for exhausted.](https://raw.githubusercontent.com/allixsenos/asu/main/assets/asu-bars.png)

This is a real run against the maintainer's accounts on 2026-09-10. Bars are green below 70 percent, yellow from 70, and red from 90. Reset times are relative to the moment of the run, with the local clock after the dot. Pass `--table` for the table view, `--utc` for full timestamps, `--plain` for log-friendly text, or `--json` for agents and scripts. The same view as plain text is in the [snapshot section](#bars) below.

## Quick start

ASU needs **Node.js 22.13 or newer** and npm. Sign in through the provider's own CLI first.

```bash
npx --yes @allixsenos/asu@latest
```

This runs the newest release of [`@allixsenos/asu`](https://www.npmjs.com/package/@allixsenos/asu) from npm. No token is needed. Your provider credentials, which are separate, let ASU read usage.

```bash
# Plain text for terminals, logs, and pipes
npx --yes @allixsenos/asu@latest --plain

# Structured output for agents and scripts
npx --yes @allixsenos/asu@latest --json

# One provider, by its bare name
npx --yes @allixsenos/asu@latest claude

# Select accounts and bypass the five-minute usage cache
npx --yes @allixsenos/asu@latest claude codex copilot --fresh --table

# Include every built-in provider, even if no credentials are found
npx --yes @allixsenos/asu@latest --all --table
```

To pin a version, name it, for example `@allixsenos/asu@0.3.0`. The `--fresh` flag refreshes provider usage. It does not select a newer package revision.

### Run the unreleased main branch

```bash
npx --yes github:allixsenos/asu --table
```

This needs Git. The repository commits the built `dist/` directory, so the install needs no build step. For SSH, use `git+ssh://git@github.com/allixsenos/asu.git#main`. To pin a commit or a tag, append it, for example `github:allixsenos/asu#v0.3.0`. Each GitHub release also carries the packed tarball, and `npx --yes https://github.com/allixsenos/asu/releases/latest/download/asu.tgz --table` runs the newest one.

## Real account output

We fetched the snapshot below on **2026-09-10 at 07:08 UTC** from the maintainer's authenticated Claude, Codex, and GitHub Copilot accounts on Linux. These are real provider-reported figures, not fixtures or estimates. They become stale as usage changes.

The capture used the local checkout:

```bash
node dist/cli.js --provider claude,codex,copilot --fresh --no-cache --json
```

ASU's own renderers made the bars, the table, and the plain text below from that same JSON snapshot with `--utc`, so all four examples show identical data. The examples include no credentials and no account identifiers. All reset times are UTC.

Without `--utc`, the table and the plain text show reset, fetch, and expiry times relative to now, for example `2h30m` or `45m`. A time a day or more away also names the local calendar day, for example `7d (Tue 15 Sep)`. A reset time that already passed shows as `now`. JSON always contains the full UTC timestamps.

### Bars

Use `--bars` for this view. It is the default in an interactive terminal. One bar per window, colored by severity in a terminal, with the countdown and the local clock after each bar. The bar shrinks in a narrow terminal, then the clock goes, and below that the default falls back to plain text.

```text
ASU 0.7.0 · 2026-09-10T07:08:14.046Z

Claude · Max 20x · active · fresh
  5 hours         ━━━━━─────────────────────────   18%  resets 2026-09-10T09:30:00.000Z
  Weekly          ━━━━━━━───────────────────────   24%  resets 2026-09-15T05:00:00.000Z
  Weekly · Fable  ━━━━━─────────────────────────   18%  resets 2026-09-15T05:00:00.000Z
  Extra usage     Disabled
  fetched 2026-09-10T07:08:13.944Z · cache expires 2026-09-10T07:13:13.944Z

Codex · Plus · active · fresh
  5 hours               ──────────────────────────────    0%  resets 2026-09-10T12:08:13.000Z
  Weekly                ──────────────────────────────    0%  resets 2026-09-17T07:08:13.000Z
  Gpt Reserve · Weekly  ──────────────────────────────    0%  resets 2026-09-17T07:08:13.000Z
  Credits               0 credits left
  Credits available     No
  fetched 2026-09-10T07:08:14.004Z · cache expires 2026-09-10T07:13:14.004Z

GitHub Copilot · Individual · active · fresh
  Chat                  ──────────────────────────────    0%  resets 2026-10-01T00:00:00.000Z  0 / 200 requests
  Completions           ──────────────────────────────    0%  resets 2026-10-01T00:00:00.000Z  0 / 2,000 requests
  Premium Interactions  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  100%  resets 2026-10-01T00:00:00.000Z  0 / 0 requests
  fetched 2026-09-10T07:08:14.045Z · cache expires 2026-09-10T07:13:14.045Z
```

### Pretty table

Use `--table` for this view. When a cell would wrap, the default falls back to plain text. Pass `--table` to force the table.

```text
ASU 0.7.0 · 2026-09-10T07:08:14.046Z
┌──────────────────┬────────────────────┬───────────────────────┬───────────────────────┬────────────────────┐
│ Provider         │ Plan / status      │ Window / balance      │ Usage                 │ Resets (UTC)       │
├──────────────────┼────────────────────┼───────────────────────┼───────────────────────┼────────────────────┤
│ Claude           │ Max 20x            │ 5 hours               │ 18% used              │ 2026-09-10 09:30   │
│                  │ active             │                       │                       │                    │
│                  │ fresh              │                       │                       │                    │
│                  │                    │ Weekly                │ 24% used              │ 2026-09-15 05:00   │
│                  │                    │ Weekly · Fable        │ 18% used              │ 2026-09-15 05:00   │
│                  │                    │ Extra usage           │ Disabled              │ —                  │
├──────────────────┼────────────────────┼───────────────────────┼───────────────────────┼────────────────────┤
│ Codex            │ Plus               │ 5 hours               │ 0% used               │ 2026-09-10 12:08   │
│                  │ active             │                       │                       │                    │
│                  │ fresh              │                       │                       │                    │
│                  │                    │ Weekly                │ 0% used               │ 2026-09-17 07:08   │
│                  │                    │ Gpt Reserve · Weekly  │ 0% used               │ 2026-09-17 07:08   │
│                  │                    │ Credits               │ 0 credits left        │ —                  │
│                  │                    │ Credits available     │ No                    │ —                  │
├──────────────────┼────────────────────┼───────────────────────┼───────────────────────┼────────────────────┤
│ GitHub Copilot   │ Individual         │ Chat                  │ 0% used               │ 2026-10-01 00:00   │
│                  │ active             │                       │ 0 / 200 requests      │                    │
│                  │ fresh              │                       │                       │                    │
│                  │                    │ Completions           │ 0% used               │ 2026-10-01 00:00   │
│                  │                    │                       │ 0 / 2,000 requests    │                    │
│                  │                    │ Premium Interactions  │ 100% used             │ 2026-10-01 00:00   │
│                  │                    │                       │ 0 / 0 requests        │                    │
└──────────────────┴────────────────────┴───────────────────────┴───────────────────────┴────────────────────┘
Claude: fetched 2026-09-10T07:08:13.944Z; cache expires 2026-09-10T07:13:13.944Z.
Codex: fetched 2026-09-10T07:08:14.004Z; cache expires 2026-09-10T07:13:14.004Z.
GitHub Copilot: fetched 2026-09-10T07:08:14.045Z; cache expires 2026-09-10T07:13:14.045Z.
```

Read Copilot's premium row with care. The endpoint returned zero entitlement, zero remaining requests, and zero percent remaining. ASU therefore shows `100% used` next to `0 / 0 requests`. This does **not** show that anyone consumed a premium request. The internal endpoint can return legacy quota information. Treat its quantities as the provider's reported snapshot, not as a complete billing statement.

### Plain text

Use `--plain` for readable output in logs and pipes. It is the default when stdout is not a terminal.

<details>
<summary>Show the complete plain-text output</summary>

```text
ASU 0.7.0 · 2026-09-10T07:08:14.046Z

Claude (claude)
  active
  Plan: Max 20x
  5 hours: 18% used; resets 2026-09-10T09:30:00.000Z
  Weekly: 24% used; resets 2026-09-15T05:00:00.000Z
  Weekly · Fable: 18% used; resets 2026-09-15T05:00:00.000Z
  Extra usage: Disabled
  Fetched 2026-09-10T07:08:13.944Z; fresh; expires 2026-09-10T07:13:13.944Z

Codex (codex)
  active
  Plan: Plus
  5 hours: 0% used; resets 2026-09-10T12:08:13.000Z
  Weekly: 0% used; resets 2026-09-17T07:08:13.000Z
  Gpt Reserve · Weekly: 0% used; resets 2026-09-17T07:08:13.000Z
  Credits: 0 credits left
  Credits available: No
  Fetched 2026-09-10T07:08:14.004Z; fresh; expires 2026-09-10T07:13:14.004Z

GitHub Copilot (copilot)
  active
  Plan: Individual
  Chat: 0% used; 0 / 200 requests; resets 2026-10-01T00:00:00.000Z
  Completions: 0% used; 0 / 2,000 requests; resets 2026-10-01T00:00:00.000Z
  Premium Interactions: 100% used; 0 / 0 requests; resets 2026-10-01T00:00:00.000Z
  Fetched 2026-09-10T07:08:14.045Z; fresh; expires 2026-09-10T07:13:14.045Z
```

</details>

### JSON

Use `--json` for agents and scripts. Stdout contains the report. An ASU invocation error goes to stderr. The human output rounds quantities to two decimal places and shows relative times. JSON keeps the normalized numeric precision and the full UTC timestamps.

<details>
<summary>Show the complete version 1 JSON report</summary>

```json
{
  "schemaVersion": 1,
  "asuVersion": "0.7.0",
  "generatedAt": "2026-09-10T07:08:14.046Z",
  "warnings": [],
  "providers": [
    {
      "planLabel": "Max 20x",
      "windows": [
        {
          "id": "five_hour",
          "label": "5 hours",
          "percentUsed": 18,
          "resetsAt": "2026-09-10T09:30:00.000Z"
        },
        {
          "id": "seven_day",
          "label": "Weekly",
          "percentUsed": 24,
          "resetsAt": "2026-09-15T05:00:00.000Z"
        },
        {
          "id": "weekly-model-fable",
          "label": "Weekly · Fable",
          "percentUsed": 18,
          "resetsAt": "2026-09-15T05:00:00.000Z",
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
      "fetchedAt": "2026-09-10T07:08:13.944Z",
      "expiresAt": "2026-09-10T07:13:13.944Z",
      "cached": false
    },
    {
      "planLabel": "Plus",
      "windows": [
        {
          "id": "usage-primary_window",
          "label": "5 hours",
          "percentUsed": 0,
          "resetsAt": "2026-09-10T12:08:13.000Z"
        },
        {
          "id": "usage-secondary_window",
          "label": "Weekly",
          "percentUsed": 0,
          "resetsAt": "2026-09-17T07:08:13.000Z"
        },
        {
          "id": "additional-0-gpt-reserve-primary_window",
          "label": "Gpt Reserve · Weekly",
          "percentUsed": 0,
          "resetsAt": "2026-09-17T07:08:13.000Z"
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
      "fetchedAt": "2026-09-10T07:08:14.004Z",
      "expiresAt": "2026-09-10T07:13:14.004Z",
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
      "details": [],
      "providerId": "copilot",
      "displayName": "GitHub Copilot",
      "experimental": false,
      "installed": true,
      "credentialsPresent": true,
      "authenticated": true,
      "availability": "available",
      "reason": null,
      "fetchedAt": "2026-09-10T07:08:14.045Z",
      "expiresAt": "2026-09-10T07:13:14.045Z",
      "cached": false
    }
  ]
}
```

</details>

## CLI reference

```text
asu [usage] [provider...] [options]
```

When you run ASU through `npx`, put the ASU options after the package name.

| Option | Behavior |
| --- | --- |
| `--format plain\|table\|bars\|json` | Select one output format. Without it, a terminal gets the bars, or plain text when even the narrowest bar layout would wrap. A pipe gets plain text. |
| `--bars`, `--table`, `--plain`, `--json` | Shortcuts for `--format`. Use only one. |
| `--utc` | Print full UTC timestamps in table and plain output instead of times relative to now, such as `2h30m` or `7d (Tue 15 Sep)` |
| `claude codex` | Select providers by their bare names, in any position. `asu claude --plain` and `asu --plain claude` are the same. |
| `--provider claude,codex` | The same selection as a flag. Repeat the flag or separate the IDs with commas. |
| `--all` | Include providers with no detected installation or credentials |
| `--fresh` | Bypass cached usage. Concurrent fresh requests still share one fetch. |
| `--no-cache` | Do not read or write the persistent cache |
| `--cache-dir PATH` | Set the usage cache directory |
| `--plugin PATH_OR_PACKAGE` | Load a trusted provider plugin that you name explicitly. Repeatable. |
| `--help`, `-h` | Show help |
| `--version`, `-v` | Print the package version |

Without `--all` or `--provider`, ASU omits a provider that has no detected installation, no credentials, and no discovery error. Credentials can work even when the provider's executable is not on `PATH`. The table and the plain text show one status per provider: `active` when usage came back, `not logged in` when credentials are missing or rejected, `not installed` when neither credentials nor the provider's executable were found, and `error` when the request failed. JSON keeps `installed`, `credentialsPresent`, and `authenticated` as separate fields, where `null` means unknown.

### Exit codes

| Code | Meaning |
| --- | --- |
| `0` | At least one selected provider returned available usage |
| `1` | No selected provider returned available usage. ASU still prints a report. |
| `2` | Invalid invocation or plugin configuration. ASU prints an error to stderr. |

A zero exit code does not mean that every provider succeeded. When you automate ASU, examine the `availability` of each provider. Missing credentials, a timeout, or a malformed response from one provider does not discard the data of the other providers.

### Use JSON in scripts

```bash
npx --yes @allixsenos/asu@latest --json > usage.json
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
| `asuVersion` | The ASU package version that wrote the report. The plain and table headers show it too. |
| `generatedAt`, `warnings`, `providers` | Report timestamp, shared warnings, and independent provider results |
| `providerId`, `displayName`, `experimental` | Provider identity and live-validation status |
| `installed`, `credentialsPresent`, `authenticated` | Separate discovery and authentication observations |
| `availability`, `reason` | `available`, `unavailable`, or `error`, with a reason code and a safe message when needed |
| `planLabel` | Subscription label, or `null` if unknown |
| `windows` | Variable-length usage windows with IDs, percentages, UTC resets, optional quantities, and model or surface scope |
| `balances` | Reported credits or monetary balances with explicit units |
| `details` | Additional normalized label and value pairs |
| `fetchedAt`, `expiresAt`, `cached` | Timestamp and freshness of each provider snapshot |

An unknown percentage or reset time is `null`. A missing quantity or balance does not mean zero. An unlimited allowance is explicit. A percentage can exceed 100 if a provider reports overage. Do not assume a fixed number or order of windows. See the [report contract](docs/architecture.md#report-contract) and the [schemas](src/models.ts) for the full model. An agent that wants to watch its own budget can follow [Use ASU from an agent](docs/agent-usage.md). The [asu-usage skill](skills/asu-usage/SKILL.md) measures what one command costs, and `npx skills add allixsenos/asu` installs it.

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

Once a day, after the report, ASU asks the npm registry for its own newest version and prints one line on stderr when a newer one exists. The request carries only the package name, and the answer is kept in the cache directory. `--no-cache`, `ASU_NO_UPDATE_CHECK=1`, `NO_UPDATE_NOTIFIER=1`, or `CI=true` turns the check off. This is the only request ASU makes to anything other than a provider.

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
| `npx --yes @allixsenos/asu` runs an old version | npx reuses the first version it cached for a bare name and never looks again. Use `@allixsenos/asu@latest`, which resolves on every run, or remove the cache with `rm -rf ~/.npm/_npx`. ASU prints a one-line notice on stderr once a day when a newer version exists. |

## Plugins

A provider is an ESM module with a unique ID, a version, and three operations: detect the installation, resolve the credentials, and fetch normalized usage. An adapter owns its credential format and its API contract. The shared service and the renderers stay provider-independent.

```bash
npx --yes @allixsenos/asu@latest --plugin ./my-provider.mjs --provider my-provider --json
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

release-please writes [`CHANGELOG.md`](CHANGELOG.md) and creates each release from the commit history. [Releasing](docs/releasing.md) describes the release pull request, the GitHub release with the packed tarball, and the npm publication.

## Project status

Public repository under the [MIT license](LICENSE). The release workflow publishes the package to the public npm registry. ASU has no telemetry and never will. See the [security policy](SECURITY.md) for what that means and how to report a vulnerability.
