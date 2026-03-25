description: Store curvature-aware score in CentroidEntry.loss so _losses.find() matches stored keys
dependencies: none
files: src/sparstogram.ts (CentroidEntry, insertOrIncrementBucket, updateNext, compressOneBucket), src/sparstogram.test.ts
----
## Summary

The `_losses` B+Tree is keyed by `{loss: score, value}` where `score` is the curvature-aware value
(`baseLoss * (eps + curvature)`). Previously `CentroidEntry.loss` stored the **base** loss, not the score,
so `_losses.find(entry)` always failed for non-first centroids (score != baseLoss), causing
`updateAt`/`deleteAt` to silently no-op.

The fix stores the curvature-aware **score** in `CentroidEntry.loss` so `_losses.find(entry)` succeeds.

## Changes Made

### src/sparstogram.ts
- **CentroidEntry.loss** now documented as curvature-aware score (not raw base loss)
- **insertOrIncrementBucket (existing bucket)**: Stores `priorScore` in centroid entry
- **insertOrIncrementBucket (new bucket)**: Inserts with placeholder `loss: Infinity`, computes `priorScore` after insertion, then updates entry
- **updateNext**: Stores `newScore` in centroid entry
- **compressOneBucket**: Inserts merged entry with placeholder, computes score after insertion; returns `computeLoss(priorEntry, minEntry)` for API-compatible base loss
- **getPriorLoss**: Removed (dead code after fix)

### src/sparstogram.test.ts
- Compressed histogram marker test: Widened tolerance for `lowerQuartile.centroid.value` to `within(20,35)` — correct scoring shifts merge pair selection
- Uniform distribution test: Verifies balanced centroids with ratio < 10

## Testing Notes
- All 149 tests pass
- TypeScript compiles cleanly (`tsc --noEmit`)
- Key test areas to verify during review:
  - "Dual-Index Consistency" suite — validates that `_losses` and `_centroids` stay synchronized through insert, update, and compress operations
  - "loss-score key mismatch — stale entry detection" tests — directly exercises the fixed path
  - "compression quality — uniform distribution" — confirms balanced merge behavior with correct scoring
  - "compression quality — bimodal distribution preserves modes" — confirms curvature-awareness preserves peaks
  - "compressOneBucket returns base loss not score" — ensures API returns base loss, not the internal score

## Usage
The fix is transparent to API consumers. `add()` and `append()` return base pair loss (not the curvature-aware score). Internal `_losses` index now stays in sync with `CentroidEntry.loss`, eliminating stale/orphaned entries and the stack overflow risk from recursive retry in `compressOneBucket`.
