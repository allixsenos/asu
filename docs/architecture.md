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
Versioned report → plain text / table / bars / JSON
```

The package exports a library API and the `asu` executable. It contains no frontend and no daemon. The provider ID and version identify an adapter. The credentials are part of the cache key, so two accounts never share a cached result by accident.

## Provider contract

```ts
interface Provider {
  id: string;
  displayName: string;
  version: number;
  experimental?: boolean;
  detect(context: LocalContext): Promise<boolean | null>;
  listLogins?(context: LocalContext): Promise<Login[]>;
  resolveCredentials?(context: LocalContext): Promise<Credentials | null>;
  fetchUsage(context: ProviderContext, credentials: Credentials): Promise<UsageData>;
}
```

An adapter owns its credential formats, its HTTP request, and its response normalization. `LocalContext` supplies the home directory, the environment, the platform, bounded file readers, a Keychain lookup, and a read-only SQLite lookup. `ProviderContext` adds the JSON HTTP transport, an abort signal, and a clock. Consumers never receive the credentials object. A new provider needs no new branch in the usage service or in the output code.

`detect` examines whether the executable or app is present. It does not start the provider. A provider that users reach through other clients, such as Z.ai, can return `null`. `listLogins` returns every login the provider's own tools store, each with its source, on each invocation. A plugin can implement `resolveCredentials` instead, for one login. It must not refresh them. `fetchUsage` must pass `context.signal` to `context.request`.

The service runs the provider functions concurrently. Each result and each failure is independent. The service validates the normalized output, removes undeclared properties, removes terminal control characters, and redacts echoed tokens and account IDs before it caches the result. A plugin exception never appears in the output as written. Plugins are trusted local code and run without a sandbox. Do not load a module you do not trust. The asynchronous deadline cannot stop a synchronous plugin that blocks the Node event loop.

## Login sources and accounts

A `Login` holds the credentials, the `source` it came from, whether that tool uses it now (`inUse`), and optional identity: an `accountKey` such as an account UUID, an `email`, a `handle`, or an `alias`. A `LoginSource` is a store shared by several tools, such as opencode, that returns logins for several providers.

On each run the service reads every `LoginSource` once and every provider's `listLogins`, in parallel. A shared store that fails becomes a report warning and hides no other login. For each provider, the service merges logins that share an `accountKey` or a token into one account, keeps the sources of all of them, and uses the credentials that expire last. A login without an identity stays its own account. The service fetches each account once, in-use accounts first.

The identity fields never reach the cache. The cached usage carries `account: null`, and the service attaches the account per run. The label is the alias, else the masked email, else the masked handle. The full email reaches the report only when the caller passes `showEmail`.

## External plugin example

Save an ESM module, for example `my-provider.mjs`, that exports `default` or `provider`:

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

ASU resolves an installed package name from the current working directory. It never downloads a plugin and never searches for one. It rejects a duplicate provider ID and a malformed interface. A TypeScript plugin can import `Provider`, `Credentials`, `UsageData`, and the other exported types from `@allixsenos/asu`. Distribute compiled JavaScript so that Node can load it. Bump `version` after you change the request or the normalization semantics of an adapter.

## Report contract

`schemaVersion: 2` is the machine interface. Version 2 added `account`, and one provider can appear once per account. `asuVersion` is the ASU package version that wrote the report. `generatedAt` describes the report. `fetchedAt` and `expiresAt` describe each provider snapshot. A result includes `providerId`, `displayName`, `experimental`, `installed`, `credentialsPresent`, `authenticated`, `availability`, an optional `reason`, `account`, `planLabel`, `windows`, `balances`, `details`, and `cached`.

A window has a stable ID, a label, `percentUsed`, and a UTC `resetsAt`. It can also have quantities, a unit, an unlimited flag, and a model or surface scope. An unknown percentage or reset is `null`. `resetsAt` has whole-second precision. Providers compute it relative to the request, so two calls can still differ by a second or more for the same window, and an idle Codex window moves with the clock. Compare reset times with a tolerance of a few minutes. An absent balance or quantity is not zero. A percentage can exceed 100 when the provider reports overage. The human renderers round to two decimals. JSON keeps the normalized precision. An unlimited window shows no percentage.

Availability is one of three values. `available` means the provider returned usage. `unavailable` means the credentials are missing, rejected, or unreadable. `error` means the fetch or the normalization failed. `authenticated` is `true` only after a recognized successful usage response. It is `false` for unavailable credentials. It is `null` after a request failure that cannot establish authentication. These are snapshot values. They do not promise that the token stays valid after `fetchedAt`.

`account` is `null` when no login was found. Otherwise it has an `id` of the form `<providerId>:<8 hex characters>`, a hash of the account identity or of the first login's token. It also has a `label`, which is `null` when the login has no identity, and `sources`, each with a `name` and `inUse`. `email` appears only with `--show-email`. `token_expired` means the stored token is past its expiry. ASU never refreshes it, so it stays expired until the owning tool refreshes it.

## Tests

Normalization tests cover observed and synthetic schemas. Credential tests inject environment variables and files, then examine precedence, expiration, and read-only behavior. Service tests use fake clocks and concurrent callers to examine isolation, coalescing, TTL expiry, account changes, persistent locks, corruption, and redaction. CLI tests run real subprocesses and parse stdout, including the symlinked entry points that npm creates. Live checks are a separate, documented validation step.
