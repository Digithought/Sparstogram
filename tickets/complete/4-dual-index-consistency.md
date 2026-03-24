description: Review of dual B+Tree index consistency — centroid index and loss index synchronization
dependencies: none
files: src/sparstogram.ts, src/sparstogram.test.ts, doc/assessment.md
----
## Summary

Reviewed all mutation paths (insert, update/increment, compress, mergeFrom, maxCentroids setter) for
consistency between the `_centroids` B+Tree (ordered by value) and `_losses` B+Tree (ordered by score).

## Key Finding: Loss-Score Key Mismatch (confirmed bug)

**Root cause:** `CentroidEntry.loss` stores the **base pair loss** (`computeLoss`), but `_losses` entries
store the **curvature-aware score** (`getPriorScore`/`updateNextScore` = baseLoss / (eps + curvature)).
All `_losses.find(entry)` calls pass a CentroidEntry, searching by base loss, but the tree is keyed by
score. Since score ≠ baseLoss, find fails silently → `updateAt`/`deleteAt` no-ops.

Affected sites: :448 (update path), :533 (updateNext), :610 (compress delete).

**Impact:** Stale entries accumulate in `_losses`; compression uses outdated scores (suboptimal pair
selection); potential stack overflow from recursive stale-entry retry. Centroid data is always correct —
only the loss priority queue is stale.

## Other Findings

- **compressOneBucket recursion**: No depth limit; O(N) stale entries → O(N) recursion. Stack overflow
  risk for large merges.
- **Iterator invalidation**: `ascending()`/`descending()` are lazy generators; tree mutation during
  iteration is undocumented and unsafe.
- **mergeFrom batch**: Structurally correct but inherits stale-entry issues.
- **maxCentroids setter**: Loop terminates correctly; stale entries affect optimality not termination.

## Testing

Added 14 tests in `Dual-Index Consistency` describe block covering:
- Insert path (5-centroid trace)
- Update path (duplicate inserts → compress)
- Compress path (aggressive 20→3, compress to 1 then expand)
- Stale entry accumulation (200 distinct into max=5, 1000 mixed values)
- mergeFrom batch compression (two histograms, large→small)
- maxCentroids stepwise reduction
- Iterator consistency
- Loss-score key mismatch (insert-update-compress cycle, neighbor updates, high churn)

All 131 tests pass. Build (tsc --noEmit) passes.

## Follow-up Fix Tickets Created

- `fix/4-loss-score-key-mismatch.md` — Core fix for the key-domain mismatch
- `fix/3-compress-recursion-depth-limit.md` — Convert recursive retry to iterative loop
- `fix/3-iterator-invalidation-docs.md` — Document iterator invalidation in JSDoc

## Assessment Update

Section R3 in `doc/assessment.md` fully populated with findings and status for all 8 items.
