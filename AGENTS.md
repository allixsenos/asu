# ASU

ASU is a TypeScript CLI that reports agent subscription usage as the provider reports it. Humans and agents use it. Support plain text, a table, and versioned JSON. Do not add a dashboard or an HTTP server.

- Providers are plugins. Each one lives in its own file under `src/providers/`.
- Keep provider-specific credential formats and API normalization inside the adapter.
- Credentials are read-only. Never refresh tokens, rewrite provider files, or log credentials or raw API errors.
- Read account usage from provider APIs. Never estimate it from conversation history.
- Provider contracts change. Check them against primary sources and document what is uncertain.
- Run `npm run check` and `npm test` before you commit a behavior change.
- Conventional Commits are mandatory. Prefer small, scoped commits.
- Never create merge commits. Prefer squash merges. Rebase merges are permitted.
- The repository is private. The release workflow publishes the package only to GitHub Packages. Do not publish to the public npm registry.
