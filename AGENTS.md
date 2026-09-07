# ASU

ASU is a TypeScript CLI for provider-reported agent subscription usage. Its consumers are humans and agents; support plain text, a pretty table, and versioned JSON. Do not add a dashboard or HTTP server.

- Providers are pluggable and live in separate files under `src/providers/`.
- Keep provider-specific credential formats and API normalization in their adapters.
- Credentials are read-only. Never refresh tokens, rewrite provider files, or log credentials or raw API errors.
- Read account usage from provider APIs, never estimate it from conversation history.
- Verify changing provider contracts against primary sources and document uncertainty.
- Run `npm run check` and `npm test` before committing behavior changes.
- Conventional Commits are mandatory. Prefer small, scoped commits.
- Never create merge commits. Prefer squash merges; rebase merges are allowed.
- The repository is private. Do not publish it or the npm package without explicit authorization.
