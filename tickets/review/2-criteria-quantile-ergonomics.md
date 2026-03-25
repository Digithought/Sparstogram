description: Redesigned Criteria.quantile from Quantile object to plain number (0-1)
dependencies: 3-export-quantile-strip-loss (complete)
files: src/sparstogram.ts, src/sparstogram.test.ts
----

### Summary

Changed `Criteria.quantile` from `Quantile` (object) to `number` (0-1 range), so consumers
can write `{ quantile: 0.5 }` instead of `{ quantile: sparstogram.quantileAt(0.5) }`.

Internally, `criteriaToPath` now calls `this.quantileAt(criteria.quantile)` to resolve the
number to a centroid value before the B+Tree lookup.

### Breaking change

`Criteria.quantile` type changed from `Quantile` to `number`. Pre-1.0, acceptable per ticket.

### Key changes

- `src/sparstogram.ts:55` — `Criteria.quantile` type: `Quantile` → `number`
- `src/sparstogram.ts:666` — `criteriaToPath` resolves quantile number via `quantileAt()`
  - Also fixed falsy-zero bug: changed `criteria.quantile ?` to `criteria.quantile !== undefined ?`

### Testing / validation

- Existing `ascending({ quantile: ... })` test updated to pass `0.8` instead of a `Quantile` object
- All 6 criteria-validation rejection tests updated to pass numbers
- Descending criteria rejection tests updated similarly
- All 182 tests pass, build clean
