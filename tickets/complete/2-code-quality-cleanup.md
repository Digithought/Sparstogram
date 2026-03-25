description: Code quality cleanup — dead code removal, const correctness, named constants, min2 replacement
dependencies: none
files: src/sparstogram.ts
----
## What was done

Non-behavioral refactors to `src/sparstogram.ts`:

1. **Removed ~73 lines of commented-out code** — `inverseNormalCDF` and a disabled `inferValueFromOffset` alternative (preserved in git history).
2. **Removed dead variable** — unused `const result: Peak[] = []` in `peaks()`.
3. **`let` → `const`** — `left` and `right` arrays in `peaks()` are never reassigned.
4. **Replaced `min2()` with `Math.min`** — V8 inlines `Math.min` for two numeric args. Deleted the `min2` helper.
5. **Removed redundant prototype binding** — `(Sparstogram.prototype as any).edgeContribution` was redundant since the private method already delegates to the module function.
6. **Extracted named constants** — `SCORE_EPSILON` (1e-9) and `DENSITY_EPSILON` (1e-12) replace inline magic numbers in `getPriorScore`, `updateNextScore`, and `localCurvature`.

## Testing

- All 148 tests pass with no changes required.
- TypeScript compiles cleanly (`tsc --noEmit` passes).
- Coverage exists for all affected areas: edgeContribution suite, peaks suite, curvature score edge cases.

## Review notes

- No quality issues found. Constants well-named, no DRY violations, generator pattern correct.
- Pure non-behavioral refactors — no new tests needed.
