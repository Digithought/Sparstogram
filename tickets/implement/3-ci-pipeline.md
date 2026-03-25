description: Add GitHub Actions CI workflow for automated test and build verification
dependencies: none (package-lock.json absence means npm install instead of npm ci — acceptable for now)
files: .github/workflows/ci.yml (new), package.json (reference only)
----
## Overview

Create a single GitHub Actions workflow (`.github/workflows/ci.yml`) that gates PRs and pushes to `master` with automated test and build verification.

## Workflow Design

**Trigger:** `push` to `master` and `pull_request` targeting `master`.

**Matrix:** Node.js 20 (current LTS) and 22 (latest).

**OS:** `ubuntu-latest` (sufficient for a pure TypeScript library).

**Steps:**
1. `actions/checkout@v4`
2. `actions/setup-node@v4` with node-version from matrix and `cache: 'npm'` (falls back gracefully if no lock file)
3. `npm install` — no `package-lock.json` at root, so `npm ci` is not viable yet
4. `npm test` — runs mocha test suite via ts-node ESM loader
5. `npm run build` — runs `tsc -p tsconfig.build.json`, verifies clean compilation and dist output

**No lint step:** ESLint is in devDependencies but there is no ESLint config file or `lint` script. Skipping until linting is properly configured.

**No publish step:** Per ticket requirements, focus on CI gate first. `prepublishOnly` already handles local build+doc before publish.

## Key Decisions

- Use `npm install` not `npm ci` due to missing root `package-lock.json`. If a packaging-improvements ticket adds the lock file, the workflow should be updated to use `npm ci`.
- Single job (not separate test/build jobs) keeps it simple — the full pipeline is fast for a small library.
- Node.js cache via `actions/setup-node` `cache` parameter is simpler than manual `actions/cache` setup.

## Test Plan (for review phase)

- Verify workflow YAML is valid (actionlint or manual review)
- Confirm triggers: push to master, PR to master
- Confirm matrix covers Node 20 and 22
- Confirm `npm install`, `npm test`, `npm run build` all appear in steps
- Confirm no secrets or publish steps are included

## TODO

- Create `.github/workflows/` directory structure
- Write `ci.yml` with:
  - Trigger on push/PR to master
  - Node.js 20/22 matrix on ubuntu-latest
  - Checkout, setup-node with cache, npm install, npm test, npm run build
- Run `npm test` and `npm run build` locally to verify they pass before finalizing
