---
name: asu-usage
description: Measure what an operation costs in coding-agent subscription allowance using asu (Agent Subscription Usage). Use when the user asks how much of the session or weekly limit something consumed, wants a before/after usage reading, wants to budget how many more runs fit in a window, or mentions asu, subscription usage, session limit, weekly limit, or rate-limit headroom.
metadata:
  version: 1.1.0
---

# asu-usage

`asu` reads coding-agent subscription usage from the credentials already on the machine. This skill wraps it so an operation's cost can be measured rather than guessed.

Repository: https://github.com/allixsenos/asu

## Install

With the skills CLI:

```bash
npx skills add allixsenos/asu
```

Or copy this directory to `~/.claude/skills/asu-usage/`.

## Get the tool

`asu` needs Node.js 22.13 or newer and npm. Check with `node --version`. It reads the credentials that the provider's own CLI stored, so sign in there first: `claude`, `codex`, or `gh auth login` for Copilot. `asu` never signs in or refreshes a token itself.

No install is needed. `npx` fetches the newest release from npm on first use and caches it:

```bash
npx --yes @allixsenos/asu claude --json --fresh
```

For a permanent `asu` command, when the npm global prefix is writable:

```bash
npm install -g @allixsenos/asu
asu claude --json --fresh
```

An `EACCES` error from that install means the prefix belongs to root, as with a system Node. Stay with the `npx` form rather than using `sudo`.

If npm is unreachable, the Git form runs the current `main` branch and needs Git: `npx --yes github:allixsenos/asu claude --json`. `measure.py` uses the `npx` form, so it works with no install at all.

Check the setup with `npx --yes @allixsenos/asu --version` and then `npx --yes @allixsenos/asu claude`. Exit code 0 means usage came back. Exit code 1 with a reason line means the provider is not signed in or not installed.

Provider names: `claude`, `codex`, `copilot`, `cursor`, `zai`, `grok`, `kimi`, `minimax`. Useful flags: `--json`, `--table`, `--plain`, `--fresh` (bypass cache), `--utc`, `--all`.

JSON shape (`schemaVersion: 1`), for one provider:

```
providers[0].availability              "available" carries usage; anything else has a reason
providers[0].planLabel                 e.g. "Max 20x"
providers[0].windows[]  .id            e.g. five_hour | seven_day | weekly-model-<name>
                        .label         "5 hours" | "Weekly" | "Weekly · Fable"
                        .percentUsed   number or null; Claude reports whole numbers, others can report fractions
                        .resetsAt      ISO timestamp, whole seconds, or null
providers[0].cached, .expiresAt        readings cache ~5 minutes
```

## Rules that matter

1. **Always pass `--fresh` for before/after measurement.** Readings cache for about five minutes. Without it the "after" snapshot can return the cached "before" value and every delta reads as zero.
2. **Percent, not tokens.** The subscription limit is expressed in percentage points of a rolling window. There is no published token-to-percent conversion, so measure it, do not compute it.
3. **Watch for a window reset mid-run, but ignore jitter.** Providers compute `resetsAt` relative to each request, so it can differ by a second or more between two snapshots of the same window, and an idle Codex window moves with the clock. That is not a reset. A real reset moves `resetsAt` forward by a whole window and the percentage drops. `measure.py` compares with a five-minute tolerance plus the percentage check, and flags a real reset instead of reporting a negative delta.
4. **Per-model windows exist.** Opus/Fable-class models have their own weekly window on top of the shared one. A run on a heavier model moves two counters.
5. **Resolution is limited.** Claude reports whole percentage points, so a short operation can legitimately show `+0 pp`. Measure a batch to get resolution. A window with `percentUsed: null` gets no delta.

## Usage

`measure.py` lives next to this file.

```bash
S=~/.claude/skills/asu-usage        # or wherever the skill is installed

# current state, records nothing
python3 $S/measure.py --snapshot

# measure a command: snapshot, run, snapshot, report delta, append to ledger
python3 $S/measure.py -l "one book" -- ./text-pipeline.sh lun 032

# accumulated history and totals
python3 $S/measure.py --report
```

Output:

```
usage delta for one book over 23.4 min:
  Claude 5 hours          9% ->  21%   +12 pp
  Claude Weekly           6% ->   7%   +1 pp
  Claude Weekly · Fable   8% ->   8%   +0 pp
  recorded -> ~/.claude/asu-ledger.jsonl
```

The ledger is JSONL, one record per run (`label`, `cmd`, `exit`, `elapsedSec`, `plan`, per-window `before`/`after`/`delta`). Override the path with `--ledger` or `ASU_LEDGER`. Pick another provider with `--provider codex`.

## Reading the result

- **Budgeting:** if one unit costs N points of the 5-hour window, roughly `(100 - current) / N` units fit before the window is exhausted. The weekly window is usually the binding constraint on multi-day work.
- **Comparing models:** run the same unit under two models and compare points consumed, not tokens. This is the honest way to decide whether a cheaper model is worth it.
- **A `+0 pp` result** on a real operation means the operation is below the reporting resolution, not free. Batch several and divide.
