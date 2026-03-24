description: Audit floating-point arithmetic for stability, precision, and edge-case correctness
dependencies: none
files: src/sparstogram.ts (erf :695, normalCDF :689, inferValueFromOffset :789, interpolateCentroids :800, calculateDensity :829)
----
Review all floating-point arithmetic paths for NaN propagation, division by zero, precision loss, and underflow/overflow.

Known high-priority concerns from initial assessment:

- `normalCDF()` with variance=0 — `sqrt(0)` = 0, division by 0 in erf() argument produces NaN; this is called by `interpolateCentroids()` when a zero-variance centroid has a neighbor query — confirmed NaN propagation path
- `interpolateCentroids()` calls normalCDF for both centroids without checking variance — if either has variance=0 and value != query value, NaN results
- `erf()` A&S 7.1.26 approximation — max error ~1.5e-7; adequate but undocumented accuracy bound

Additional items to audit:

- `inferValueFromOffset()` — guarded for count=1 and variance=0; OK
- `offsetToValue` scalar at boundaries: fraction = offset/(count-1); assumes uniform spacing within 1-sigma
- `calculateDensity()` with variance=0 — returns 1 if exact match, 0 otherwise; intentional but discontinuous
- `tightnessJ` incremental drift over many operations — floating-point addition ordering
- Very large values (>1e15) — `Math.exp(-x*x)` underflow in erf; produces 0, making erf=1; functionally OK
- `dens()` epsilon `1e-12` in denominator at :421 — prevents div-by-zero for coincident values
- `combineSharedMean()` — denominator `count - 1` when total count = 2 gives df=1; OK but verify no count=0 path
- Loss accumulation: score = baseLoss / (1e-9 + curvature) — near-zero curvature produces huge scores

Output: findings into doc/assessment.md; follow-up fix/ tickets for NaN paths.

TODO
- Trace normalCDF call with variance=0 through interpolateCentroids, interpolateRank, inferRank
- Determine all code paths that reach normalCDF with variance=0
- Verify erf() accuracy bounds; add inline documentation
- Check tightnessJ drift with a long-running test (10K+ adds, compare incremental vs recomputed)
- Audit all epsilon constants (1e-9, 1e-12) for adequacy
- Document findings in doc/assessment.md
