description: Remove dead code, extract named constants, fix minor code quality issues
dependencies: none (but defer method renaming until after fix/4-loss-score-key-mismatch.md)
files: src/sparstogram.ts
----
Clean up code quality issues identified in review ticket 3-code-quality.md (assessment R12).

All changes are safe, non-behavioral refactors. Tests should continue to pass unchanged.

## Items

- Remove commented-out `inverseNormalCDF` and alternative `inferValueFromOffset` at :714-786 (~73 lines). These are superseded by the active `inferValueFromOffset` at :789 and preserved in git history.
- Remove dead `const result: Peak[] = [];` at :319 in `peaks()` — declared but never used (peaks are yielded directly).
- Change `let left` and `let right` to `const left` and `const right` at :317-318 in `peaks()` — references are never reassigned.
- Replace `min2()` at :674 with `Math.min` in `edgeContribution()` at :683. V8 inlines `Math.min` for two numeric args; no performance benefit from the custom helper.
- Remove prototype binding at :687 (`(Sparstogram.prototype as any).edgeContribution = edgeContribution`). The private method wrapper at :428 already delegates to the module function; the prototype override is redundant and prevents tree-shaking.
- Extract named constants for epsilon values:
  - `const SCORE_EPSILON = 1e-9;` (used at :403, :417 in `getPriorScore`/`updateNextScore`)
  - `const DENSITY_EPSILON = 1e-12;` (used at :421 in `localCurvature`)

TODO
- Remove commented-out code block (:714-786)
- Remove dead `result` variable in `peaks()`
- Change `let` to `const` for `left` and `right` in `peaks()`
- Replace `min2()` with `Math.min` and delete `min2()`
- Remove prototype binding line at :687 and its comment at :686
- Add `SCORE_EPSILON` and `DENSITY_EPSILON` constants near top of module-level helpers section
- Replace inline `1e-9` and `1e-12` with named constants
- Run tests to verify no behavioral change
