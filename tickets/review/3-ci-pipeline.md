description: Review GitHub Actions CI workflow for test and build verification
dependencies: none
files: .github/workflows/ci.yml
----
## Summary

Created `.github/workflows/ci.yml` — a single GitHub Actions workflow that gates PRs and pushes to `master` with automated test and build verification.

**What it does:**
- Triggers on push to `master` and pull requests targeting `master`
- Runs on `ubuntu-latest` with a Node.js 20/22 matrix
- Steps: checkout, setup-node (with npm cache), `npm install`, `npm test`, `npm run build`
- No lint, publish, or secret steps included

**Key decisions:**
- Uses `npm install` (not `npm ci`) because there is no root `package-lock.json`
- Single job keeps the pipeline simple for a small library
- Node cache via `actions/setup-node` `cache` parameter

## Testing / Validation

- `npm test` passes locally (149 tests, 608ms)
- `npm run build` passes locally (clean tsc compilation)
- Verify YAML structure is valid (triggers, matrix, steps)
- Confirm no secrets or publish steps leak
- Confirm `actions/checkout@v4` and `actions/setup-node@v4` are pinned to v4
- Confirm matrix covers Node 20 and 22 on ubuntu-latest

## Usage

Push to `master` or open a PR targeting `master` — the CI workflow runs automatically.
