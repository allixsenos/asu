# Releasing

A release is a Git tag on `main` plus a GitHub release that carries the packed tarball. The package stays private. Nothing goes to the npm registry.

## Before you tag

1. Make sure `main` is green in CI.
2. Move the entries under `Unreleased` in `CHANGELOG.md` to a new version heading.
3. Set the same version in `package.json` and `package-lock.json` with `npm version <version> --no-git-tag-version`.
4. Run `npm run check` and `npm test`.
5. Commit with the message `chore(release): <version>`.
6. Open a pull request, get it reviewed, and squash merge it.

## Tag and publish the GitHub release

1. Check out `main` and pull.
2. Run `git tag -s v<version> -m "v<version>"`. Tag signing is mandatory.
3. Run `git push origin v<version>`.

The release workflow then runs the checks again, makes sure the tag matches `package.json`, packs the tarball, smoke tests it, and creates the GitHub release with the tarball attached. The workflow fails if the tag and `package.json` disagree.

## Install a released version

```bash
npx --yes github:allixsenos/asu#v<version> --table
```

Users with access to the private repository can also download the tarball from the GitHub release and install it with `npm install <tarball>`.

## Version rules

- Conventional Commit types decide the bump: `feat` is minor, `fix` and `perf` are patch, a `!` or a `BREAKING CHANGE:` footer is major.
- Before 1.0.0, a breaking change bumps the minor version.
- A change to the JSON report that removes or renames a field must bump `schemaVersion` in `src/models.ts`. Additive fields do not.
