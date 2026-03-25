description: GitHub Actions CI workflow for test and build verification
dependencies: none
files: .github/workflows/ci.yml
----
## What was built

A single GitHub Actions workflow (`.github/workflows/ci.yml`) that gates pushes to `master` and PRs targeting `master` with automated test and build verification.

- Triggers on push to `master` and pull requests targeting `master`
- Runs on `ubuntu-latest` with Node.js 20/22 matrix
- Steps: checkout, setup-node (with npm cache), `npm ci`, `npm test`, `npm run build`

## Review fix

Changed `npm install` to `npm ci` — a `package-lock.json` exists in the repo, so `npm ci` is the correct choice for deterministic, faster CI installs.

## Testing notes

- 182 tests pass locally (2s)
- `npm run build` compiles cleanly
- YAML structure validated via programmatic parse
- No secrets, `.env` files, or publish steps present
- Actions pinned to v4 major version tags

## Usage

Push to `master` or open a PR targeting `master` — the CI workflow runs automatically.
