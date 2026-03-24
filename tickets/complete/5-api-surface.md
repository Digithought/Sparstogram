description: API surface review — completeness, safety, and ergonomics
files: src/sparstogram.ts, src/sparstogram.test.ts, dist/sparstogram.d.ts, doc/assessment.md
----
## What was reviewed

Full public API evaluation covering: type exports, Criteria validation, error handling consistency,
iterator type safety, constructor parameter visibility, serialization gaps, and return value semantics.

## Key findings

### Confirmed bugs (fix tickets created)

1. **Criteria 2-of-3 validation** (priority 5): `criteriaToPath()` only rejects when all three
   Criteria fields are set. Two-of-three silently picks one by precedence. Existing test passes
   for wrong reason. → `tickets/fix/5-criteria-validation-bug.md`

2. **Quantile type not exported** (priority 4): Return type of `valueAt()`, `quantileAt()`,
   `markerAt()` is not importable by consumers. Also `Criteria.quantile` typed as `Quantile`
   (requires full object) instead of `number`. → `tickets/fix/4-export-quantile-type.md`

3. **CentroidEntry leak through iterators** (priority 3): `ascending()`/`descending()` yield
   internal `CentroidEntry` objects with extra `loss` field despite declaring `Centroid` return
   type. → `tickets/fix/3-iterator-centroidentry-leak.md`

### Documented (not bugs, design decisions)

- **Error handling asymmetry**: `valueAt`/`markerAt` throw on invalid input; `rankAt`/`countAt`
  return 0 on empty. Consistent within category (rank queries vs point queries).
- **markers visibility**: `public markers` is exposed but frozen. Acceptable.
- **valueAt error message**: Says "Rank out of range" without stating valid range. Minor UX.
- **No serialization API**: Users must iterate + re-append. Markers lost. Low priority for v0.9.x.
- **No reset()/clear()**: Must construct new instance. Minor.
- **edgeContribution() export**: Useful utility for tightnessJ monitoring. Acceptable.

## Tests added

12 new tests in `API Surface Review` section of `sparstogram.test.ts`:
- 4 Criteria validation tests (3 documenting the bug, 1 confirming all-three rejection)
- 1 CentroidEntry leak test
- 4 error handling consistency tests
- 2 markers visibility tests
- 1 valueAt error message test

All 66 tests pass. Build passes cleanly.

## Assessment doc

Updated `doc/assessment.md` R4 section with confirmed statuses and new items 4.11-4.13.
