description: Export Quantile/Marker types, strip CentroidEntry.loss from public API, annotate append() return type
dependencies: none
files: src/sparstogram.ts, src/sparstogram.test.ts
----

### Overview

Non-breaking type-surface fixes to close the gaps identified in the type-safety review (R9).

### 1. Export `Quantile` and `Marker` interfaces

`Quantile` is the return type of `valueAt()`, `quantileAt()`, and `markerAt()` but is not exported.
`Marker` is `Quantile`'s super-interface. Both should be exported so consumers can name them.

At `src/sparstogram.ts`:
- Line 32: add `export` to `interface Marker`
- Line 42: add `export` to `interface Quantile extends Marker`

### 2. Strip `loss` from public-facing objects

`CentroidEntry` extends `Centroid` with an internal `loss` field. Raw `CentroidEntry` objects
leak through the public API in several places. The fix is to destructure at each public boundary
to yield/return a plain `Centroid` without `loss`.

Affected methods:

- **`ascending()` (line 369)**: yields `this._centroids.at(path)!` — a `CentroidEntry`.
  Fix: destructure to strip `loss` before yielding.
  ```ts
  const { loss: _, ...centroid } = this._centroids.at(path)!;
  yield centroid;
  ```

- **`descending()` (line 380)**: same pattern.

- **`valueAt()` (line 248)**: returns `{ rank, centroid: entry, offset, value }` where `entry` is a `CentroidEntry`.
  Fix: destructure entry before using as centroid field.

- **`markerAt()` (line 311)**: spreads marker which holds a live `CentroidEntry` reference in `marker.centroid`.
  Fix: destructure `marker.centroid` when building the returned Quantile.

**Safe for internal callers**: `mergeFrom()` iterates via `other.ascending()` and passes
results to `insertOrIncrementBucket(Centroid)` — stripping `loss` is harmless there.
Internal code (`updateMarkers`, `compressOneBucket`, etc.) uses the BTree directly, not
these public methods.

### 3. `append()` return type annotation

Add explicit `: number` return type to `append()` (line 169) for consistency with `add(): number`.

### Key tests

- Verify `Quantile` and `Marker` types are importable (TypeScript compilation)
- Verify centroids from `ascending()` and `descending()` do NOT have a `loss` property at runtime
- Verify `centroid` in objects returned by `valueAt()`, `quantileAt()`, `markerAt()` do NOT have `loss`
- Verify `mergeFrom()` still works after stripping (existing tests cover this)
- Verify `append()` return type is `number` (TypeScript compilation)

TODO
- Export `Marker` and `Quantile` interfaces (add `export` keyword)
- Add `: number` return type annotation to `append()`
- Strip `loss` from yields in `ascending()` and `descending()`
- Strip `loss` from centroid in `valueAt()` return
- Strip `loss` from centroid in `markerAt()` return
- Add tests verifying no `loss` property on public-facing objects
- Run build and tests to confirm no regressions
