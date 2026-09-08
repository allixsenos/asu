# Use ASU from an agent

ASU reports how much of a coding-agent subscription you used, straight from the provider's account API. An agent can call it to check its own budget before a long task. The figures tell it when to slow down or stop.

## The call

```bash
npx --yes @allixsenos/asu <provider> --json
```

Provider names: `claude` for Claude Code, `codex` for Codex, `copilot` for GitHub Copilot, `cursor`, `zai`, `grok`, `kimi`, `minimax`. Without a name, ASU reports every provider it detects.

Use `--json`. Stdout holds only the report. Diagnostics go to stderr. Exit code 0 means at least one selected provider returned usage. Exit code 1 means none did, and the report still explains why. Exit code 2 means the invocation was wrong.

ASU only reads credentials that the provider's own CLI already stored. It never signs in, refreshes a token, or writes to a provider file.

## What to read

Check `schemaVersion` first. This document describes version 1.

For each entry in `providers`:

- `availability` is `available`, `unavailable`, or `error`. Only `available` carries usage.
- `windows` is the list of rate-limit windows. Each has `label`, `percentUsed`, and `resetsAt`. A provider can have any number of windows, in any order. Do not assume a fixed set.
- `percentUsed` is `null` when the provider did not report it. It can exceed 100 when the provider reports overage.
- `resetsAt` is a UTC timestamp or `null`. Time until reset is `resetsAt` minus now. Providers compute it relative to each request, so the value can jitter by a second or more between calls, and an idle Codex window moves with the clock. Treat a change of less than a few minutes as the same reset. A real reset moves it forward by a whole window.
- `reason.code` explains an unavailable or failed provider: `missing_credentials`, `invalid_credentials`, `unauthorized`, `timeout`, `rate_limited`, `http_error`, `invalid_response`, or `provider_error`.
- `cached` is true when the figures come from ASU's five-minute cache. `fetchedAt` is the time of that fetch.

## Recipes

Highest usage across all windows of one provider:

```bash
npx --yes @allixsenos/asu claude --json \
  | jq '[.providers[0].windows[].percentUsed | select(. != null)] | max'
```

Minutes until the most constrained window resets:

```bash
npx --yes @allixsenos/asu claude --json \
  | jq -r '.providers[0].windows | max_by(.percentUsed // 0) | .resetsAt' \
  | xargs -I{} node -e 'console.log(Math.round((Date.parse("{}") - Date.now()) / 60000))'
```

Every available provider with a window at or above 80 percent:

```bash
npx --yes @allixsenos/asu --json | jq '[.providers[]
  | select(.availability == "available")
  | select(any(.windows[]; .percentUsed != null and .percentUsed >= 80))
  | .providerId]'
```

## A policy that works

1. Run the call once at the start of a task, then again before each expensive step.
2. Read the highest `percentUsed` among the windows that reset within the next few hours. For Claude and Codex that is the five-hour window. The weekly window matters when it is above 90.
3. Below 70, continue. Between 70 and 90, prefer smaller steps and fewer retries. At or above 90, finish the current step, report the figure and the reset time to the user, and stop.
4. Do not poll more often than every five minutes. ASU caches for five minutes, and `--fresh` sends a new request to the provider. Frequent fresh requests can hit the provider's rate limit, which ASU reports as `rate_limited`.

## Paste into your project's agent instructions

```markdown
Before a long task, run `npx --yes @allixsenos/asu claude --json` and read the highest
`percentUsed` in `providers[0].windows`. Continue below 70. Between 70 and 90 use smaller
steps. At 90 or above, stop, and tell the user the figure and the `resetsAt` time.
Do not run it more than once per five minutes.
```

Replace `claude` with the provider you run on.

## Measure one command

The [asu-usage skill](../skills/asu-usage/SKILL.md) in this repository takes a snapshot before and after a command, prints the percentage points each window consumed, and appends the result to a ledger. Install it with `npx skills add allixsenos/asu`, or copy the directory into your agent's skills folder.
