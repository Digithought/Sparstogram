description: Exported Quantile/Marker types, stripped CentroidEntry.loss from public API, annotated append() return type
dependencies: none
files: src/sparstogram.ts, src/sparstogram.test.ts
----

### Summary

Non-breaking type-surface fixes closing gaps from the type-safety review (R9).

### Changes made

1. **`Marker` and `Quantile` exports** — already exported prior to this ticket (lines 32, 42). No change needed.

2. **`append()` return type** — added explicit `: number` annotation for consistency with `add(): number`.

3. **Stripped `loss` from public-facing objects** — at each public boundary, the internal `CentroidEntry` (which extends `Centroid` with an internal `loss` field) is destructured to yield/return a plain `Centroid`:
   - `ascending()` — destructures before yielding
   - `descending()` — destructures before yielding
   - `valueAt()` — destructures entry before using as centroid field in return
   - `markerAt()` — destructures `marker.centroid` (cast as `CentroidEntry`) when building the returned Quantile

4. **Updated existing bug-documenting test** — the "BUG: iterators expose internal loss field" test was flipped to assert the fix (loss is NOT present).

### Testing

- 6 new tests in "public API does not leak internal loss property" describe block:
  - `ascending()` centroids have no `loss` property
  - `descending()` centroids have no `loss` property
  - `valueAt()` centroid has no `loss` property
  - `quantileAt()` centroid has no `loss` property
  - `markerAt()` centroid has no `loss` property
  - `mergeFrom()` still works after stripping (regression guard)
- Updated existing test: "iterators do not expose internal loss field on centroids"
- All 155 tests passing, build clean

### Key validation points for review

- Verify that `loss` stripping doesn't impact internal callers (`mergeFrom` iterates via `ascending()` and passes to `insertOrIncrementBucket(Centroid)` — stripping is harmless)
- Verify no performance regression from object spread in hot paths (`ascending`/`descending` are public iterators, not internal tight loops)
- Verify `markerAt()` cast to `CentroidEntry` is safe (markers always hold live BTree node references which are `CentroidEntry`)
