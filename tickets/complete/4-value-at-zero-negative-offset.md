description: valueAt(0) now throws instead of producing a negative offset
files: src/sparstogram.ts (valueAt at :248-251), src/sparstogram.test.ts
----
## What was built

Added a rank=0 guard at the top of `valueAt()`. Rank 0 is invalid — positive ranks count from the start (1-based), negative ranks count from the end. The gap at 0 separates the two directions.

Previously, `valueAt(0)` computed `offset = 0 - 1 = -1`, passing a negative offset to `inferValueFromOffset()`. For multi-count centroids with variance this produced incorrect extrapolation below the centroid's range.

## Key change

`src/sparstogram.ts:249-251` — Early throw with message: `"Rank must be non-zero (positive for from-start, negative for from-end)"`

## Testing notes

- `valueAt(0)` on a populated histogram throws "Rank must be non-zero"
- `valueAt(0)` on an empty histogram throws "Rank must be non-zero"
- `valueAt(1)` and `valueAt(-1)` continue to work correctly
- `quantileAt` on empty histogram throws (hits rank=0 guard since `Math.min(0, Math.max(1, 0)) = 0`)
- All 145 tests pass, type-check clean
