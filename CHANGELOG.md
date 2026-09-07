# Changelog

All notable changes to ASU are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

## 0.1.0

First internal release.

### Added

- `asu` CLI with plain text, table, and version 1 JSON output.
- Provider adapters for Claude, Codex, and GitHub Copilot, checked against live accounts on Linux.
- Experimental adapters for Cursor, Z.ai, Grok, Kimi, and MiniMax, checked against fixtures only.
- Read-only credential discovery from provider files, environment variables, the macOS Keychain, and the Cursor SQLite store.
- Five-minute usage cache in memory and on disk, with file locks across CLI invocations.
- Explicit local provider plugins through `--plugin`.
- Library exports for the usage service, schemas, and TypeScript types.
- CI on Node 22 and 24 with type checks, tests, Conventional Commit checks, and a packed-tarball smoke test.
