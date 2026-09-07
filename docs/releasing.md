# Releasing

[release-please](https://github.com/googleapis/release-please) drives releases from the Conventional Commit history. A release is a Git tag on `main`, a GitHub release with the packed tarball attached, and a package in [GitHub Packages](https://github.com/allixsenos/asu/pkgs/npm/asu). Nothing goes to the public npm registry.

## How a release happens

1. Each push to `main` runs the release workflow.
2. release-please opens or updates a pull request named `chore(main): release <version>`. The PR bumps `package.json` and `package-lock.json` and writes the new `CHANGELOG.md` section.
3. Review the PR and squash merge it.
4. release-please then creates the tag `v<version>` and the GitHub release.
5. The `publish` job checks out the tag, runs the checks and tests, packs the tarball, smoke tests it, attaches it to the release, and runs `npm publish` against GitHub Packages.

## Version rules

- Conventional Commit types decide the bump: `feat` is minor, `fix` and `perf` are patch, a `!` or a `BREAKING CHANGE:` footer is major.
- Before 1.0.0, a breaking change bumps the minor version and a feature bumps the patch version. This is the `bump-minor-pre-major` and `bump-patch-for-minor-pre-major` configuration.
- To force a version, add `Release-As: <version>` as a footer on a commit to `main`.
- A change to the JSON report that removes or renames a field must bump `schemaVersion` in `src/models.ts`. Additive fields do not.

## Configuration

- `release-please-config.json` holds the release type and the bump rules.
- `.release-please-manifest.json` holds the last released version. release-please updates it in each release PR. Do not edit it by hand after the first release.
- The workflow uses the `RELEASE_PLEASE_TOKEN` secret when it exists, and the default `GITHUB_TOKEN` otherwise. Pull requests that the default token opens do not trigger CI, so the release PR shows no checks. A fine-grained PAT with contents and pull requests write access solves that.
- Tags that release-please creates are not signed with a personal key. GitHub creates them through the API.

## Install a released version

Add these lines to `~/.npmrc`, with a personal access token that has the `read:packages` scope:

```text
@allixsenos:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=TOKEN
```

Then run:

```bash
npx @allixsenos/asu --table
```

The tarball on the GitHub release also installs with `npm install <tarball>`.
