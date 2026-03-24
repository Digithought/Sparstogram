description: Fix _losses.find() key mismatch — CentroidEntry.loss (base) vs stored Loss.loss (score)
dependencies: none
files: src/sparstogram.ts (insertOrIncrementBucket :431, updateNext :526, compressOneBucket :538)
----
## Problem

The `_losses` B+Tree is keyed by curvature-aware score (`getPriorScore`/`updateNextScore`), but all
`_losses.find(entry)` calls pass a CentroidEntry whose `.loss` field is the **base pair loss**
(from `computeLoss`/`getPriorLoss`). Since `score = baseLoss / (eps + curvature) ≠ baseLoss`,
the find always fails for non-first centroids. `updateAt`/`deleteAt` on a not-on path silently no-ops.

Affected call sites:
- **:448** — update (increment existing) path: `_losses.updateAt(_losses.find(entry), ...)`
- **:533** — `updateNext()`: `_losses.updateAt(_losses.find(nextEntry), ...)`
- **:610** — `compressOneBucket()` delete: `_losses.deleteAt(_losses.find(priorEntry)!)`

## Impact

- Stale/orphaned entries accumulate in `_losses` (2 per merge cycle)
- Compression picks based on outdated scores → suboptimal pair selection
- Memory growth in `_losses` tree
- Stack overflow risk via recursive stale-entry retry in `compressOneBucket` (see fix/3-compress-recursion-depth-limit.md)
- Centroid data correctness is NOT affected (`_centroids` tree is always correct)

## Fix Options

**Option A — Store score in CentroidEntry.loss instead of base loss:**
Change `getPriorLoss` usages to `getPriorScore` at :445/:462 and :530. Then `CentroidEntry.loss` matches
the stored `Loss.loss`, and `find` succeeds. Requires updating `compressOneBucket` return value (:620)
to return the base loss separately (API contract says it returns base loss).

**Option B — Add a separate `score` field to CentroidEntry:**
Keep `loss` as base loss. Add `score: number` for the curvature-aware value. Store and search by score.
More fields, but preserves clarity of both values.

**Option C — Search _losses by constructing a Loss key with the score:**
At each `find` call site, compute the score and search by `{loss: score, value: entry.value}`.
Most targeted fix but requires recomputing the score at each call site.

**Recommendation:** Option A is simplest. The base loss is only needed for the `compressOneBucket` return
value and can be computed on-demand there.

TODO
- Change CentroidEntry.loss to store score (from getPriorScore) instead of base loss
- Update all sites that set CentroidEntry.loss: insertOrIncrementBucket (both paths), updateNext
- In compressOneBucket, compute base loss on-demand for the return value
- Verify _losses.find succeeds by adding a debug assertion or test
- Run full test suite — existing dual-index consistency tests should pass
