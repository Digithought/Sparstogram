description: valueAt(0) now throws instead of producing negative offset
dependencies: none
files: src/sparstogram.ts (valueAt at :239-261), src/sparstogram.test.ts
----
## Summary

Added a rank=0 guard at the top of `valueAt()`. Rank 0 is invalid — positive ranks count from the start (1-based), negative ranks count from the end. The gap at 0 separates the two directions.

Previously, `valueAt(0)` computed `offset = 0 - 1 = -1`, passing a negative offset to `inferValueFromOffset()`. For count=1 centroids this was masked by a guard, but for multi-count centroids with variance it produced incorrect extrapolation below the centroid's range.

## Changes

- `src/sparstogram.ts:241-243` — Early throw: `"Rank must be non-zero (positive for from-start, negative for from-end)"`
- Updated BUG test (`valueAt(0)`) to expect the throw instead of documenting the negative offset
- Updated empty-histogram test for `valueAt(0)` to match new error message
- Updated empty-histogram `quantileAt` test (quantileAt on empty histogram now hits rank=0 guard since `Math.min(0, Math.max(1, 0)) = 0`)

## Test plan

- `valueAt(0)` on a populated histogram throws with "Rank must be non-zero"
- `valueAt(1)` and `valueAt(-1)` still work correctly
- `quantileAt` on empty histogram still throws
- All 145 existing tests pass
