description: Property-based invariant tests and 100K stress tests (Phases 1-2 of test expansion)
dependencies: 5-inverted-curvature-score-formula (tightnessJ monotonicity test uses relaxed assertion due to current score formula)
files: src/sparstogram.test.ts, src/sparstogram.ts
----

## What was built

7 new tests added in two sections at the end of `src/sparstogram.test.ts`:

### Phase 1: Property-Based Invariants (4 tests)

1. **Rank roundtrip** — `rankAt(valueAt(r).value) === r` exact for uncompressed; within 20% tolerance for compressed (maxCentroids=5, 100 values).
2. **rankAt monotonicity sweep** — 50 evenly spaced probes across centroid range verify `rankAt` is non-decreasing.
3. **mergeFrom commutativity** — Overlapping histograms A=[0..49], B=[25..74] merged both ways; same count and rankAt within 10%.
4. **tightnessJ monotonicity** — Steps maxCentroids 20 to 2; validates finiteness/non-negativity at each step, overall increasing trend. Step-by-step monotonicity relaxed per dependency on `5-inverted-curvature-score-formula`.

### Phase 2: Stress & Scale (3 tests)

5. **100K stress (maxCentroids=50)** — Verifies count, centroid bounds, finiteness of rankAt/valueAt/countAt/quantileAt.
6. **100K stress (maxCentroids=5)** — Same with heavy compression (exercises stale-entry retry path).
7. **Memory proportionality** — After 100K additions: centroidCount===50 via property and iterator count, total count sums to 100K.

## Testing notes

- All 182 tests pass (175 pre-existing + 7 new)
- 100K stress tests complete in ~350-500ms (well within 5s timeout)
- Type errors in `sparstogram.bench.ts` are pre-existing (unrelated)

## Review notes

- **tightnessJ relaxed assertion**: Appropriate. Comment documents the dependency clearly. Test still validates finiteness, non-negativity, and overall trend.
- **Tolerances**: 20% for compressed roundtrip and 10% for merge commutativity are reasonable given the compression ratios involved.
- **Clone-via-ascending/append**: Valid — `ascending()` yields sorted centroids with value/variance/count, matching `append()` expectations.
- Tests only use public API — no internal leaks or coupling to implementation details.
- No resource leaks or cleanup issues.
