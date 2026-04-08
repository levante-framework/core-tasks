# core-tasks/actions

https://github.com/levante-framework/core-tasks/actions

- [Version and Publish](#version-and-publish)
- [Create Release](#create-release)

## Version and Publish

https://github.com/levante-framework/core-tasks/actions/workflows/deploy-and-publish.yml

Manually triggered workflow that bumps the `core-tasks` package version, publishes it to npm, and optionally updates the dep in [levante-dashboard/package.json](https://github.com/levante-framework/levante-dashboard/blob/main/package.json).

**Prerequisites**

| Secret | Purpose |
|---|---|
| `LEVANTE_BOT_APP_ID` | GitHub App ID used to generate a token with push access to `main` |
| `LEVANTE_BOT_APP_PRIVATE_KEY` | Private key for the GitHub App above |
| `LEVANTE_NPM_TOKEN` | npm access token with publish permission for the package |

**Inputs**

| Input | Default | Description |
|---|---|---|
| `Use workflow from` | `main` | Which version of `deploy-and-publish.yml` to run. Default value is almost always correct. |
| `version-type` | `patch` | Semver bump level: `patch`, `minor`, or `major`. Only used when `bump-and-tag` is enabled. |
| `bump-and-tag` | `true` | Runs `npm version`, commits the updated `package.json` to `main`, and pushes a `vX.Y.Z` git tag. |
| `update-dashboard` | `true` | Fires a `repository_dispatch` event (`update-core-tasks`) to `levante-dashboard` with the new version number. |

## Create Release

https://github.com/levante-framework/core-tasks/actions/workflows/create-release.yml

Manually triggered workflow that creates a [GitHub Release](https://github.com/levante-framework/core-tasks/releases) from a tag, with an auto-generated changelog.

**Prerequisites**

- The default `GITHUB_TOKEN` must have `contents: write` permission (granted via the job-level `permissions` block — no other secrets needed).

**Inputs**

| Input | Default | Description |
|---|---|---|
| `Use workflow from` | `main` | Must be triggered from a **tag ref** (not a branch). The workflow fails early if run from a branch. |
| `additional_notes` | _(empty)_ | Optional free-text prepended to the release body above the auto-generated changeset. |
