description: Dependency health audit — digitree, dev deps, npm audit, lock file, ts-node
dependencies: none
files: doc/assessment.md (R11 section), package.json
----
## What was done

Full dependency health audit covering runtime and dev dependencies:

### Runtime dependency: digitree

- **Actively maintained** — same author (Nathan T. Allan), last publish 2026-01-22 (v1.4.6), 16 releases over 2 years, 0 open issues
- **License:** Apache-2.0 — compatible with sparstogram's MIT license
- **Security:** Zero known vulnerabilities
- **API coupling:** 85 call sites across two BTree instances — tight but inherent to the design
- **Version gap:** Installed 1.4.0, latest 1.4.6 (semver-minor update available)

### Dev dependencies

- All at recent stable versions; several have semver-compatible updates available
- Major version bumps available for TypeScript (5→6), ESLint (9→10), Chai (5→6) — not urgent
- `ts-node --loader` flag deprecated in Node.js 22+; `tsx` is recommended replacement

### npm audit

- 12 advisories total, **all in dev transitive dependencies** (eslint, mocha, rimraf chains)
- Zero runtime vulnerabilities
- Most fixable with `npm audit fix`; mocha's `diff`/`serialize-javascript` require `--force`

### package-lock.json

- Not committed — standard for libraries (consumers use own lock files)
- Consider committing for CI reproducibility (already noted in R8)

## Findings location

All findings documented in `doc/assessment.md` section **R11: Dependency Health & Security** with item-level detail (11.1–11.7).

## Recommendations (low priority)

- Update digitree to 1.4.6
- Run `npm audit fix` for dev dependency advisories
- Consider tsx migration for test runner
- Evaluate major version upgrades (TS 6, ESLint 10, Chai 6) separately
