description: Exported Quantile/Marker types, stripped CentroidEntry.loss from public API, annotated append() return type
dependencies: none
files: src/sparstogram.ts, src/sparstogram.test.ts
----

### What was built

Non-breaking type-surface fixes closing gaps from the type-safety review (R9):

1. **`append()` return type** — explicit `: number` annotation for consistency with `add(): number`.
2. **Stripped `loss` from public-facing objects** — at each public boundary, the internal `CentroidEntry` is destructured to yield/return a plain `Centroid` (no `loss` field):
   - `ascending()` (line 383), `descending()` (line 395), `valueAt()` (line 267), `markerAt()` (line 324)
3. **`Marker` and `Quantile` exports** — already exported; no change needed.

### Key files

- `src/sparstogram.ts` — loss stripping at all 4 public boundaries via `const { loss: _, ...centroid }` destructuring
- `src/sparstogram.test.ts` — 6 new tests in "public API does not leak internal loss property" block + updated former BUG test

### Testing

- 182 tests passing, build clean
- Tests cover all 5 public boundaries (`ascending`, `descending`, `valueAt`, `quantileAt`, `markerAt`) plus `mergeFrom` regression guard

### Review notes

- `mergeFrom` consumes `ascending()` output → stripped centroids are fine since `insertOrIncrementBucket(Centroid)` creates its own `CentroidEntry` with fresh `loss`
- Object spread overhead is only in public iterators, not internal tight loops (`peaks()`, compression use raw BTree paths)
- `markerAt()` cast `marker.centroid as CentroidEntry` is safe — markers hold live BTree node references
