description: Export Quantile and Marker interfaces so consumers can name return types
dependencies: none
files: src/sparstogram.ts (:32, :42), dist/sparstogram.d.ts (:15, :24), src/sparstogram.test.ts
----
## Summary

Added `export` keyword to `Marker` (line 32) and `Quantile` (line 42) interfaces in
`src/sparstogram.ts`. These are the return types of `valueAt()`, `quantileAt()`, and `markerAt()`
but were previously not exported, preventing consumers from naming them in type annotations.

## Changes

- `src/sparstogram.ts`: Added `export` to `interface Marker` and `interface Quantile extends Marker`
- `src/sparstogram.test.ts`: Added import of `Quantile` and `Marker`; added test that uses both
  as explicit type annotations on values returned by `valueAt()` and `quantileAt()`

## Verification

- `dist/sparstogram.d.ts` now shows `export interface Marker` (line 15) and
  `export interface Quantile` (line 24)
- All 149 tests pass including the new type-annotation test
- Build succeeds with no errors

## Test cases for review

- The new test ("Quantile and Marker type exports") verifies:
  - `Quantile` can annotate the return of `valueAt()`
  - `Marker` can annotate the return of `quantileAt()` (since `Quantile extends Marker`)
  - Both types expose the expected properties (`rank`, `centroid`, `offset`, `value`)
- Compile-time: importing `{ Quantile, Marker }` from the module succeeds (would fail before this change)
