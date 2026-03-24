description: Export Quantile type, strip CentroidEntry.loss from public API, improve Criteria.quantile ergonomics
dependencies: none
files: src/sparstogram.ts, dist/sparstogram.d.ts
----
Three related type-surface improvements identified during the type-safety review (R9 in doc/assessment.md):

### 1. Export `Quantile` interface

`Quantile` is the return type of `valueAt()`, `quantileAt()`, and `markerAt()`, but is not exported.
Consumers see the inferred structural shape but cannot name it in their own type annotations.
Fix: add `export` to the `Quantile` interface declaration.
Consider also exporting `Marker` if `Quantile extends Marker` makes the hierarchy visible.

### 2. Strip `CentroidEntry.loss` from public-facing objects

`ascending()` and `descending()` declare `IterableIterator<Centroid>` but yield raw `CentroidEntry`
objects that include the internal `loss` field. Same leak occurs in the `centroid` field of `Quantile`
objects returned by `valueAt()`, `quantileAt()`, `markerAt()`.

Consumers can access `.loss` at runtime without type support — a contract violation.

Options:
- Destructure to strip `loss` before yielding: `const { loss, ...centroid } = entry; yield centroid;`
- Use a projection helper to avoid per-yield allocation overhead
- Consider whether `loss` is useful to expose intentionally (and if so, add it to `Centroid`)

### 3. `Criteria.quantile` ergonomics

`Criteria.quantile` requires a full `Quantile` object, but `criteriaToPath` only reads
`criteria.quantile.centroid.value`. This is inconsistent with `quantileAt(number)` which accepts
a plain number (0-1).

Options:
- Change `Criteria.quantile` type to `number` (0-1), aligning with `quantileAt()`
- Accept both via union: `number | Quantile`
- This is a breaking change if any consumer passes a `Quantile` object today

### Minor: `append()` return type annotation

Add explicit `: number` return type to `append()` for consistency with `add(): number`.

TODO
- Phase 1: Export `Quantile`, add `: number` to `append()` (non-breaking)
- Phase 2: Strip `loss` from yielded/returned objects (non-breaking, but changes runtime shape)
- Phase 3: Evaluate `Criteria.quantile` redesign (breaking change — needs major version or deprecation)
