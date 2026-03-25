description: Redesign Criteria.quantile to accept number (0-1) instead of full Quantile object
dependencies: 3-export-quantile-strip-loss (implement)
files: src/sparstogram.ts, src/sparstogram.test.ts
----

### Problem

`Criteria.quantile` requires a full `Quantile` object, but `criteriaToPath` (line 641) only reads
`criteria.quantile.centroid.value`. This is inconsistent with `quantileAt(number)` which accepts
a plain number (0-1).

Consumers must do `{ quantile: sparstogram.quantileAt(0.5) }` when `{ quantile: 0.5 }` would be
more ergonomic and consistent.

### Plan

**Change type to `number`**: `quantile?: number` (0-1), internally call `quantileAt()`
in `criteriaToPath`. Clean, consistent, but a breaking change if any consumer passes a `Quantile`
object today.  We're pre 1.0 though, and next publish will be 1.0, so breaking the API is okay.

