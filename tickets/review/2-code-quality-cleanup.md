description: Code quality cleanup — dead code removal, const correctness, named constants, min2 replacement
dependencies: none
files: src/sparstogram.ts
----
## Summary

Non-behavioral refactors applied to `src/sparstogram.ts`:

1. **Removed ~73 lines of commented-out code** — `inverseNormalCDF` and the disabled `inferValueFromOffset` alternative (previously around lines 736-808). Preserved in git history.
2. **Removed dead variable** — `const result: Peak[] = []` in `peaks()` was declared but never used (peaks are yielded directly).
3. **`let` → `const`** — `left` and `right` arrays in `peaks()` are never reassigned; changed to `const`.
4. **Replaced `min2()` with `Math.min`** — V8 inlines `Math.min` for two numeric args. Deleted the `min2` helper function.
5. **Removed redundant prototype binding** — `(Sparstogram.prototype as any).edgeContribution = edgeContribution` was redundant since the private method at line ~442 already delegates to the module function. Removed binding and its comment.
6. **Extracted named constants** — `SCORE_EPSILON` (1e-9) and `DENSITY_EPSILON` (1e-12) replace inline magic numbers in `getPriorScore`, `updateNextScore`, and `localCurvature`.

## Testing

- All 145 existing tests pass with no changes required.
- These are pure non-behavioral refactors; no new tests needed.

## Key validation points

- `edgeContribution` (exported) still uses `Math.min` correctly — verify symmetry and correctness via existing "edgeContribution" test suite.
- `peaks()` generator still yields correctly — verify via "peaks method" test suite.
- Compression behavior unchanged — verify via "compression" and "dual-index consistency" test suites.
- Epsilon constants used in scoring — verify via "curvature score edge cases" tests.
