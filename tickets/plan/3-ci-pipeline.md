description: Add GitHub Actions CI pipeline for automated test, build, and publish verification
dependencies: none
files: .github/workflows/ci.yml (new), package.json
----
The project has no CI/CD pipeline. This means broken builds can be published to NPM without any automated gate.

## Requirements

- GitHub Actions workflow that runs on push and PR to `master`
- Steps: install dependencies, run linter (if configured), run tests, run build
- Node.js matrix: test on current LTS (v20) and latest (v22+)
- Optional: publish workflow triggered on version tags (manual gate recommended for a library)

## Rationale

- Build and test correctness is currently only verified locally
- No protection against regressions on PR merge
- `prepublishOnly` runs build+doc locally but nothing verifies tests pass before publish

## Design Notes

- Keep the workflow simple — a single `ci.yml` with test and build jobs
- Use `npm ci` for reproducible installs (requires `package-lock.json` to be committed — see packaging-improvements ticket)
- Consider caching `node_modules` for faster runs
- No need for deployment/publish automation initially — focus on CI gate first
