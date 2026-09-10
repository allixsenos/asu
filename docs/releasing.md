# Releasing

[release-please](https://github.com/googleapis/release-please) drives releases from the Conventional Commit history. A release is a Git tag on `main`, a GitHub release with the packed tarball attached, and a version of [`@allixsenos/asu`](https://www.npmjs.com/package/@allixsenos/asu) on the public npm registry.

## How a release happens

1. Each push to `main` runs the release workflow.
2. release-please opens or updates a pull request named `chore(main): release <version>`. The PR bumps `package.json` and `package-lock.json` and writes the new `CHANGELOG.md` section.
3. Review the PR and squash merge it.
4. release-please then creates the tag `v<version>` and the GitHub release.
5. The `publish` job checks out the tag, runs the checks and tests, packs the tarball, smoke tests it, attaches it to the release, and runs `npm publish --access public` against the npm registry.

## npm trusted publishing

The workflow holds no npm token. npm trusts the `release.yml` workflow of this repository through GitHub's OIDC identity, and npm attaches provenance to each version. The job needs the `id-token: write` permission and npm 11.5.1 or newer, so the job installs the latest npm before it publishes.

npm reads the trusted publisher from the package settings, so the package must exist before the workflow can publish it. The first publish is a manual step by the owner:

1. Make sure the npm account owns the `@allixsenos` scope. The scope must equal the npm username, or the name of an npm organization the account created.
2. Run `npm login` on a machine with the repository checked out at the release tag.
3. Run `npm publish --access public` from the repository root. npm asks for the one-time 2FA code.
4. On npmjs.com, open the package, then Settings, then "Trusted Publisher". Choose GitHub Actions and enter the user `allixsenos`, the repository `asu`, and the workflow filename `release.yml`. Leave the environment empty.
5. Optional: in "Publishing access", choose "Require two-factor authentication and disallow tokens". Trusted publishing keeps working, and a leaked token can no longer publish.

After that, every release publishes on its own.

## Version rules

- Conventional Commit types decide the bump: `feat` is minor, `fix` and `perf` are patch, a `!` or a `BREAKING CHANGE:` footer is major.
- Before 1.0.0, a breaking change bumps the minor version instead of the major version. This is the `bump-minor-pre-major` configuration. A feature still bumps the minor version.
- To force a version, add `Release-As: <version>` as a footer on a commit to `main`.
- A change to the JSON report that removes or renames a field must bump `schemaVersion` in `src/models.ts`. Additive fields do not.

## Configuration

- `release-please-config.json` holds the release type and the bump rules. `initial-version` sets the first release to 0.1.0, because release-please defaults to 1.0.0 when no release exists.
- The repository setting "Allow GitHub Actions to create and approve pull requests" must stay on. Without it, release-please cannot open the release PR.
- `dist/` is committed and reads the version from `package.json` at run time, so a release PR needs no rebuild.
- `.release-please-manifest.json` holds the last released version. release-please updates it in each release PR. Do not edit it by hand after the first release.
- The workflow uses the `RELEASE_PLEASE_TOKEN` secret when it exists, and the default `GITHUB_TOKEN` otherwise. Pull requests that the default token opens do not trigger CI, so the release PR shows no checks. A fine-grained PAT with contents and pull requests write access solves that.
- Tags that release-please creates are not signed with a personal key. GitHub creates them through the API.

## Install a released version

```bash
npx --yes @allixsenos/asu@latest --table
```

No token is needed. The package is public on the npm registry.

Each GitHub release also carries the tarball twice: as `allixsenos-asu-<version>.tgz` and as `asu.tgz`. The second name gives `https://github.com/allixsenos/asu/releases/latest/download/asu.tgz` a stable URL for the newest release. Both work with `npx --yes <url>` and with `npm install <url>`, and neither needs a token or a build step.
