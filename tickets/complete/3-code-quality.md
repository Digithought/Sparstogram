description: Review of code organization, readability, and maintainability — completed
dependencies: none
files: src/sparstogram.ts, doc/assessment.md
----
## Summary

Reviewed code quality and maintainability of `src/sparstogram.ts` (~850 lines: ~637 class + ~213 module helpers).

## Key Findings

**Class decomposition (12.1):** Not warranted at current size. Responsibilities (insertion, compression, querying, iteration, markers) are cohesive — all share the same B+Tree state. Revisit if the class grows past ~1000 lines.

**Dead code (12.2, 12.9):** 73 lines of commented-out `inverseNormalCDF` + alternative `inferValueFromOffset` at :714-786. Dead `result` variable in `peaks()` at :319. → `fix/2-code-quality-cleanup.md`

**Redundant code (12.3, 12.4):** `min2()` reimplements `Math.min`; prototype binding at :687 is redundant with the private method wrapper at :428. → `fix/2-code-quality-cleanup.md`

**Magic numbers (12.5):** `1e-9` (score epsilon) and `1e-12` (density epsilon) should be named constants. → `fix/2-code-quality-cleanup.md`

**Error handling (12.6):** Deliberate design: query methods that can default return 0 on empty; methods needing data throw. Consistent within its logic. No fix needed.

**ESLint (12.8):** Installed but no config file — completely unenforced. → `plan/2-eslint-setup.md`

**Minor issues (12.10, 12.11):** `let` → `const` in `peaks()`. Method naming (`getPriorScore` vs `updateNextScore`) deferred until loss-score key mismatch fix lands.

## Build & Test Status

- 131 tests passing
- TypeScript compiles clean (`tsc --noEmit`)
- No ESLint config to check (finding in itself)

## Follow-up Tickets

- `fix/2-code-quality-cleanup.md` — dead code removal, named constants, `min2()` → `Math.min`, prototype binding removal, `let` → `const`
- `plan/2-eslint-setup.md` — create ESLint flat config, add lint script

## Assessment

Findings documented in `doc/assessment.md` section R12.
