description: Audited floating-point arithmetic for stability, precision, and edge-case correctness
dependencies: none
files: src/sparstogram.ts (:689-849), src/sparstogram.test.ts, doc/assessment.md
----
## Summary

Full audit of all floating-point arithmetic paths in sparstogram for NaN propagation, division by zero, precision loss, underflow/overflow, and epsilon adequacy.

## Key Findings

### normalCDF with variance=0 — NaN risk mitigated by call-site guards
- `normalCDF(x, mean, 0)` produces NaN when `x == mean` (0/0 in erf argument)
- When `x != mean`, correctly returns 0 or 1 (point mass behavior via ±Infinity → erf)
- All call sites (`rankAt` → `interpolateRank`/`inferRank`) are guarded by B+Tree `find()` exact-match check — the `x == mean` case is handled before reaching `normalCDF`
- Defense-in-depth: recommend adding variance=0 guard directly in `normalCDF` (low priority)

### erf() A&S 7.1.26 — adequate
- Max error ~1.5e-7; sufficient for histogram approximation
- Handles very large arguments correctly (exp underflow → erf=1)
- Handles Infinity correctly (t→0, y→1)

### Epsilon constants — all adequate
- `1e-9` in score formula (:403): prevents div-by-zero; near-zero curvature produces large but finite scores. Intentional design for flat-region preservation.
- `1e-12` in `dens()` (:421): prevents div-by-zero for coincident centroids. Negligible for normal value separations.

### tightnessJ drift — within tolerance
- 10K-addition test shows <1% relative drift between incremental and recomputed values
- Acceptable for a monitoring heuristic (not used for correctness-critical decisions)

### combineSharedMean — safe at boundaries
- Two count=1 centroids at same value: df=1, variance=0. Correct.

### NaN/Infinity input validation — existing bug, tracked separately
- `add(NaN)` corrupts B+Tree; `add(±Infinity)` causes rankAt NaN for ±Infinity lookups
- Already tracked in `fix/5-nan-infinity-input-validation.md`

## Tests Added (10 tests)

- `numerical stability — variance=0 interpolation paths` (4 tests): rankAt between zero-variance centroids, just beyond zero-variance centroid, countAt between, mixed variance neighbors
- `numerical stability — erf and normalCDF edge values` (2 tests): very large spread, very small variance
- `numerical stability — tightnessJ drift` (1 test): 10K additions, incremental vs recomputed within 1%
- `numerical stability — curvature score edge cases` (2 tests): coincident-value centroids, near-zero curvature uniform distribution
- `numerical stability — combineSharedMean edge cases` (1 test): two count=1 centroids

## Test Results

105 passing (all green), type-check clean.

## Follow-up

- `fix/5-nan-infinity-input-validation.md` — input validation (existing ticket)
- Recommended: add `normalCDF` variance=0 guard as defense-in-depth (low priority, no current bug path)
