description: Fixed inverted curvature-aware score formula — changed division to multiplication so flat regions merge first and peaks/tails are preserved
files: src/sparstogram.ts (getPriorScore :418, updateNextScore :432, CentroidEntry comment :13, block comment :416), README.md (Compression Score :93-111), src/sparstogram.test.ts (uniform distribution :1210, score direction :1254, near-zero curvature :1107, loss :1298)
----

## What was built

The curvature-aware compression score formula was changed from `baseLoss / (eps + curvature)` to `baseLoss * (eps + curvature)` in both `getPriorScore` and `updateNextScore`. This corrects the merge priority so that:

- **Low curvature** (flat regions) → small score → merged first
- **High curvature** (peaks/tails) → large score → preserved

All comments and README documentation were updated to match.

## Key files

- `src/sparstogram.ts` — `getPriorScore` (:418), `updateNextScore` (:432), `CentroidEntry` interface comment (:13), scoring block comment (:416)
- `README.md` — Compression Score section (:93-111)
- `src/sparstogram.test.ts` — tests covering correct behavior

## Testing

All 182 tests pass. Key test cases for this fix:

- **Uniform distribution balance**: 100 values → 5 centroids, max/min count ratio < 10
- **Score direction**: 50 uniform values → 10 centroids, no extreme imbalance (ratio < 20)
- **Bimodal preservation**: Two well-separated clusters both retain representation
- **Loss non-negativity**: All `add()` loss values ≥ 0
- **Near-zero curvature**: No overflow or NaN when curvature ≈ 0
- **compressOneBucket returns base loss**: Returned loss is finite and reasonable, not curvature-adjusted

## Notes

- `doc/assessment.md` contains stale references to the old division formula (lines 38, 68, 97, 267) — this is a pre-fix audit document and was not updated to preserve its historical record of findings.
