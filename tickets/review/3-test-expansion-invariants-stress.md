description: Review property-based invariant tests and 100K stress tests (Phases 1-2 of test expansion)
dependencies: 5-inverted-curvature-score-formula (tightnessJ monotonicity test uses relaxed assertion due to current score formula)
files: src/sparstogram.test.ts, src/sparstogram.ts
----

## What was built

Added 7 new tests in two sections at the end of `src/sparstogram.test.ts`:

### Phase 1: Property-Based Invariants (4 tests)

1. **Rank roundtrip** — Verifies `rankAt(valueAt(r).value) === r` for uncompressed histograms (exact), and `≈ r` within 20% tolerance for compressed histograms.

2. **rankAt monotonicity sweep** — Generates 50 evenly spaced probes across the centroid range of a compressed histogram and verifies `rankAt` is monotonically non-decreasing.

3. **mergeFrom commutativity** — Builds overlapping histograms A=[0..49] and B=[25..74], clones via ascending/append, merges in both orders, and asserts same total count and rankAt agreement within 10%.

4. **tightnessJ monotonicity under compression** — Steps maxCentroids from 20 down to 2 and verifies tightnessJ stays finite/non-negative throughout, and overall increases (initial→final). Note: exact step-by-step monotonicity is not guaranteed with the current curvature-aware score formula — test uses relaxed assertion per dependency on `5-inverted-curvature-score-formula`.

### Phase 2: Stress & Scale Testing (3 tests)

5. **100K stress (maxCentroids=50)** — Adds 100K values, verifies count, centroid bounds, and finiteness of all query methods (rankAt, valueAt, countAt, quantileAt). 5s timeout.

6. **100K stress (maxCentroids=5)** — Same as above with heavy compression (exercises stale-entry retry path).

7. **Memory proportionality** — After 100K additions to maxCentroids=50, verifies centroidCount === 50 both via the property and by iterating ascending to count exactly 50 centroids, plus validates total count from centroids sums to 100K.

## Testing notes

- All 182 tests pass (175 pre-existing + 7 new)
- 100K stress tests complete in ~400-600ms each (well within 5s budget)
- No stack overflows observed

## Key review points

- Verify the tightnessJ test's relaxed assertion is appropriate given the score formula dependency
- Check that tolerance values (20% for compressed roundtrip, 10% for merge commutativity) are reasonable
- Confirm the clone-via-ascending/append approach is valid for merge commutativity test
