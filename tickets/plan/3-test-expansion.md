description: Expand test suite to cover identified gaps in property-based invariants, stress testing, distribution diversity, and remaining error paths
dependencies: 5-nan-infinity-input-validation (NaN/Infinity tests depend on whether validation is added or tests document current behavior), 5-inverted-curvature-score-formula (tolerance values for compression quality tests may need adjustment after fix)
files: src/sparstogram.test.ts, src/sparstogram.ts
----
The review of 4-test-coverage-gaps identified 131 passing tests with good coverage of happy paths and several documented bugs. However, the following categories of tests are missing or incomplete.

## Phase 1: Property-Based Invariants

These tests verify mathematical properties that must hold regardless of input data. They are the highest-value additions because they test the contract, not the implementation.

- **Rank roundtrip**: For uncompressed histograms (centroidCount <= maxCentroids), `rankAt(valueAt(r).value)` should equal `r` for all valid ranks 1..count. For compressed histograms, the roundtrip should be approximately correct (within compression tolerance).
- **rankAt monotonicity sweep**: For a set of probe values x1 < x2 < ... < xN (including values between centroids, not just at centroid means), `rankAt(x1) <= rankAt(x2) <= ... <= rankAt(xN)`.
- **mergeFrom commutativity**: For histograms A and B, `merge(clone(A), B)` and `merge(clone(B), A)` should produce equivalent results (same total count, similar centroid distribution). Note: exact equality is not expected due to compression order dependence, but rank queries should agree within tolerance.
- **tightnessJ monotonicity under compression**: When `maxCentroids` is reduced (triggering compression), `tightnessJ` should not decrease — compression merges pairs which can only maintain or increase the metric.

## Phase 2: Stress & Scale Testing

- **100K values stress test**: Add 100K uniformly distributed values into maxCentroids=50. Verify: count correct, centroidCount <= maxCentroids, all query methods return finite results, no stack overflow. Time budget: <5s.
- **100K values with heavy compression**: Add 100K values into maxCentroids=5. Verify same invariants. This exercises the stale-entry retry path heavily.
- **Memory proportionality**: After 100K additions to maxCentroids=50, the centroid count should be exactly 50 — verify no unbounded growth in the loss index.

## Phase 3: Distribution Diversity

Add test scenarios with non-uniform distributions to verify the algorithm handles real-world data shapes:

- **Normal/Gaussian**: Generate ~1000 values using Box-Muller transform (deterministic seed via linear congruential generator). Verify median centroid is near the mean, and rankAt at mean ≈ count/2.
- **Exponential/skewed**: Generate values as `-ln(uniform)` scaled appropriately. Verify compression preserves the mode region (near 0) with more centroids than the tail.
- **Reverse input order**: Add values N, N-1, ..., 1 and verify same invariants as ascending order.
- **Random input order**: Use a seeded PRNG to shuffle 0..N-1, add in that order, verify same centroid count and similar rank results as ascending order.

## Phase 4: Remaining Error Paths

- **`markerAt()` out-of-bounds**: `markerAt(markers.length)` and `markerAt(-1)` should throw "Invalid marker".
- **`descending()` with invalid criteria**: `descending({})` and `descending({value: 1, markerIndex: 0})` — same validation as ascending.
- **`append()` variadic**: Call `append(c1, c2, c3)` with multiple centroids in one call. Verify count and compression.
- **`add(-0)`**: Verify `-0` coalesces with `0` (or document that it doesn't).
- **`peaks(0)` and `peaks(-1)`**: Verify behavior with zero or negative smoothing.
- **`edgeContribution()` exported function**: Test with zero count, same value, negative values to verify the public contract.
- **`maxCentroids=1` full API exercise**: Construct with `new Sparstogram(1)`, add multiple values, then exercise `rankAt`, `valueAt`, `countAt`, `quantileAt`, `peaks`, `ascending`, `descending` — verify all work on a single-centroid histogram.
- **`maxCentroids=2` full API exercise**: Same as above with 2 centroids.

## Phase 5: Regression Labels (Low Priority)

- Add `// regression: v0.9.5` comments to tests that cover the marker offset fix (`:586-598`) and combinedVariance fix (`:648-671`). This is documentation-only, no new tests needed.

TODO
- Phase 1: Add rank roundtrip property test
- Phase 1: Add rankAt monotonicity sweep test (probe between centroids)
- Phase 1: Add mergeFrom commutativity test
- Phase 1: Add tightnessJ monotonicity under compression test
- Phase 2: Add 100K stress test (maxCentroids=50 and maxCentroids=5)
- Phase 3: Add normal distribution test
- Phase 3: Add skewed distribution test
- Phase 3: Add reverse and random input order tests
- Phase 4: Add markerAt out-of-bounds test
- Phase 4: Add descending invalid criteria test
- Phase 4: Add append variadic test
- Phase 4: Add negative-zero, peaks(0), edgeContribution edge case tests
- Phase 4: Add maxCentroids=1 and maxCentroids=2 full API exercise tests
- Phase 5: Add regression labels to existing v0.9.5 fix tests
