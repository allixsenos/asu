# Architecture

```text
CLI arguments
    ↓
Provider registry (built-ins + explicit trusted plugins)
    ↓
Usage service (parallel providers, isolated failures, deadlines)
    ↓                         ↓
Read-only credential lookup  Five-minute memory/disk cache + process locks
    ↓                         ↓
Provider usage API → adapter normalization → schema validation + redaction
    ↓
Versioned report → plain text / table / JSON
```

The package exports a library API as well as the `asu` executable. It contains no frontend or daemon. Provider IDs and versions define adapter identity; credentials contribute to the cache key so accounts cannot share results accidentally.

## Provider contract

```ts
interface Provider {
  id: string;
  displayName: string;
  version: number;
  experimental?: boolean;
  detect(context: LocalContext): Promise<boolean | null>;
  resolveCredentials(context: LocalContext): Promise<Credentials | null>;
  fetchUsage(context: ProviderContext, credentials: Credentials): Promise<UsageData>;
}
```

An adapter owns its credential formats, HTTP request, and response normalization. `LocalContext` supplies the home directory, environment, platform, bounded file readers, Keychain lookup, and read-only SQLite lookup. `ProviderContext` adds the JSON HTTP transport, abort signal, and clock. None of the credentials object is returned to consumers. A new provider does not require new branches in the usage service or output code.

`detect` checks executable/app presence without launching the provider. A provider accessed through other clients, such as Z.ai, can return `null`. `resolveCredentials` reads credentials on each invocation; it must not refresh them. `fetchUsage` must forward `context.signal` to `context.request`.

Provider functions run concurrently, with independent results and failures. The service validates normalized outputs, strips undeclared properties, sanitizes terminal controls, and redacts token/account-ID echoes before caching. Plugin exceptions never appear verbatim in output. Plugins are trusted local code, not sandboxed: do not load untrusted modules. A synchronous plugin that blocks the Node event loop cannot be interrupted by an asynchronous deadline.

## External plugin example

Save an ESM module, for example `my-provider.mjs`, exporting `default` or `provider`:

```js
export default {
  id: 'my-provider',
  displayName: 'My provider',
  version: 1,
  experimental: true,
  async detect() { return null; },
  async resolveCredentials(context) {
    const token = context.env.MY_PROVIDER_TOKEN;
    return token ? { token } : null;
  },
  async fetchUsage(context, credentials) {
    // Call the provider's fixed HTTPS usage endpoint through context.request,
    // validate its response, and return only normalized UsageData.
    return {
      planLabel: null,
      windows: [],
      balances: [],
      details: [{ label: 'Integration', value: 'Example adapter; no usage endpoint configured' }],
    };
  },
};
```

```bash
node dist/cli.js --plugin ./my-provider.mjs --provider my-provider --json
```

Installed package names are resolved from the current working directory. Plugins are never downloaded or auto-discovered. Duplicate provider IDs and malformed interfaces are rejected. TypeScript plugins can import `Provider`, `Credentials`, `UsageData`, and other exported types from `@allixsenos/asu`; distribute compiled JavaScript for Node compatibility. Bump `version` after changing an adapter's request or normalization semantics.

## Report contract

`schemaVersion: 1` is the machine interface. `generatedAt` describes the report; `fetchedAt` and `expiresAt` describe each provider snapshot. Results include `providerId`, `displayName`, `experimental`, `installed`, `credentialsPresent`, `authenticated`, `availability`, optional `reason`, `planLabel`, `windows`, `balances`, `details`, and `cached`.

Windows have stable IDs, labels, `percentUsed`, UTC `resetsAt`, and optionally quantities, units, unlimited status, and model/surface scope. Unknown percentages and resets are `null`; absent balances and quantities are not zero. Percentages may exceed 100 when a provider reports overage. Human renderers round to two decimals; JSON preserves normalized precision. Unlimited windows do not render a percentage.

Availability is `available`, `unavailable` (missing/rejected/unreadable credentials), or `error` (fetch/normalization failure). Authenticated is `true` only after a recognized successful usage response, `false` for unavailable credentials, and `null` after a request failure that cannot establish authentication. These are snapshot values, not a promise that the token remains valid after `fetchedAt`.

## Tests

Normalization tests cover observed and synthetic schemas. Credential tests inject environment/files and check precedence, expiration, and read-only behavior. Service tests use fake clocks and concurrent callers to test isolation, coalescing, TTL expiry, account changes, persistent locks, corruption, and redaction. CLI tests execute actual subprocesses and parse stdout, including symlinked entry points used by npm. Live checks remain a separate, explicitly documented validation step.
