description: Add property-based invariant tests and 100K stress tests (Phases 1-2 of test expansion)
dependencies: 5-inverted-curvature-score-formula (tightnessJ monotonicity and compression quality tolerances may shift after score formula fix)
files: src/sparstogram.test.ts, src/sparstogram.ts
----

## Phase 1: Property-Based Invariants

Tests that verify mathematical contracts regardless of input data. These are the highest-value additions.

### Rank roundtrip

For uncompressed histograms (centroidCount <= maxCentroids), `rankAt(valueAt(r).value)` should equal `r` for all valid ranks 1..count. For compressed histograms, the roundtrip should be approximately correct (within compression tolerance).

Test approach:
- Build histogram with 10 values, maxCentroids=20 (no compression). For each rank 1..10, verify `rankAt(valueAt(r).value) === r`.
- Build histogram with 100 values, maxCentroids=5 (compressed). For each rank in a sample (1, 25, 50, 75, 100), verify roundtrip within tolerance (e.g., within 20% of count).

### rankAt monotonicity sweep

For probe values x1 < x2 < ... < xN (including values between centroids, not just at centroid means), `rankAt(x1) <= rankAt(x2) <= ... <= rankAt(xN)`.

Test approach:
- Build compressed histogram (100 values, maxCentroids=5).
- Generate 50 evenly spaced probe values across the range.
- Verify `rankAt` is monotonically non-decreasing for all probes.

### mergeFrom commutativity

For histograms A and B, `merge(clone(A), B)` and `merge(clone(B), A)` should produce equivalent results: same total count, similar centroid distribution. Exact equality is not expected due to compression order dependence, but rank queries should agree within tolerance.

Test approach:
- Build A with 50 values [0..49], B with 50 values [25..74] (overlapping).
- Clone both, merge in both orders.
- Assert: same total count, same centroidCount <= maxCentroids.
- Assert: `rankAt` for 10 probe values agrees within 10% between the two orderings.
- Note: "cloning" can be done by creating a fresh histogram and iterating `ascending()` to `append()`.

### tightnessJ monotonicity under compression

When `maxCentroids` is reduced (triggering compression), `tightnessJ` should not decrease — compression merges pairs which can only maintain or increase the metric.

Test approach:
- Build histogram with 20 distinct values, maxCentroids=20.
- Record `tightnessJ`.
- Step down maxCentroids from 15 to 2 in steps. At each step, verify `tightnessJ >= previousTightnessJ`.
- Note: This may need tolerance for floating-point imprecision. Use `>= previous - epsilon` where epsilon accounts for FP drift.

## Phase 2: Stress & Scale Testing

### 100K stress test (maxCentroids=50)

Add 100K uniformly distributed values into maxCentroids=50. Verify:
- count === 100000
- centroidCount <= 50
- All query methods (rankAt, valueAt, countAt, quantileAt) return finite results
- No stack overflow
- Time budget: < 5s

### 100K stress test (maxCentroids=5)

Same as above with maxCentroids=5. This exercises the stale-entry retry path heavily.

### Memory proportionality

After 100K additions to maxCentroids=50, the centroid count should be exactly 50 — verify no unbounded growth. Check via `centroidCount === 50` and iterate ascending to confirm exactly 50 centroids.

TODO
- Phase 1: Add rank roundtrip property test (uncompressed and compressed)
- Phase 1: Add rankAt monotonicity sweep test (probe between centroids, 50 probes)
- Phase 1: Add mergeFrom commutativity test (overlapping ranges, rank agreement)
- Phase 1: Add tightnessJ monotonicity under compression test (step-down maxCentroids)
- Phase 2: Add 100K stress test with maxCentroids=50 (count, bounds, finiteness, time)
- Phase 2: Add 100K stress test with maxCentroids=5 (heavy compression)
- Phase 2: Add memory proportionality test (centroidCount === maxCentroids after 100K)
