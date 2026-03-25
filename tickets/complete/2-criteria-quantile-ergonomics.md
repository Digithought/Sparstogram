description: Redesigned Criteria.quantile from Quantile object to plain number (0-1)
dependencies: 3-export-quantile-strip-loss (complete)
files: src/sparstogram.ts, src/sparstogram.test.ts
----

### What was built

Changed `Criteria.quantile` type from `Quantile` (object) to `number` (0-1 range), so consumers
can write `{ quantile: 0.5 }` instead of `{ quantile: sparstogram.quantileAt(0.5) }`.

Internally, `criteriaToPath` now calls `this.quantileAt(criteria.quantile)` to resolve the
number to a centroid value before the B+Tree lookup.

Also fixed a falsy-zero bug: `criteria.quantile ?` → `criteria.quantile !== undefined ?`
so that `{ quantile: 0 }` works correctly.

### Key files

- `src/sparstogram.ts:55` — `Criteria.quantile` type: `Quantile` → `number`
- `src/sparstogram.ts:666` — `criteriaToPath` resolves quantile number via `quantileAt()`

### Testing

- `ascending({ quantile: 0.8 })` test passes plain number
- `ascending({ quantile: 0 })` test added to cover the falsy-zero edge case
- All 6 criteria-validation rejection tests updated to pass numbers
- Descending criteria rejection tests updated similarly
- 183 tests pass, build clean

### Review notes

- Breaking change to `Criteria.quantile` type — acceptable pre-1.0
- No documentation updates needed (readme doesn't show quantile-based criteria examples)
- Implementation is minimal: 2-line change in source, clean delegation to existing `quantileAt()`
