description: Added distribution diversity tests, remaining error path tests, and regression labels (Phases 3-5 of test expansion)
dependencies: none
files: src/sparstogram.test.ts
----

## Summary

Added 24 new tests across 3 phases, bringing the total test count from 150 to 174.

### Phase 3: Distribution Diversity (4 tests)

Tests with non-uniform distributions to verify the algorithm handles real-world data shapes:

- **Normal/Gaussian distribution**: Box-Muller transform with seeded LCG PRNG (seed=42), 1000 values. Verifies median centroid is near the mean and `rankAt(mean) ≈ count/2`.
- **Exponential/skewed distribution**: `-ln(uniform) * scale` with seeded PRNG (seed=123). Verifies `rankAt` near 0 grows faster than in the tail.
- **Reverse input order**: Values N..1. Verifies count, maxCentroids constraint, and rankAt monotonicity.
- **Random input order**: Fisher-Yates shuffle with seeded PRNG (seed=999). Verifies same count/centroidCount as sorted input and similar rank results within compression tolerance.

### Phase 4: Remaining Error Paths (18 tests)

- **markerAt() out-of-bounds**: `markerAt(-1)` and `markerAt(markers.length)` both throw "Invalid marker".
- **descending() invalid criteria**: Parity with ascending tests — `descending({})`, and all 2-of-3 combinations throw.
- **append() variadic**: `append(c1, c2, c3)` with multiple centroids in one call, with and without compression.
- **add(-0)**: Documents that `-0` coalesces with `0` via B+Tree comparator.
- **peaks(0)**: Documents the TypeError bug (left.at(-1) is undefined when smoothing=0).
- **peaks(-1)**: Returns no peaks (window condition never satisfied).
- **edgeContribution**: Zero count centroid returns 0; negative values return correct distance.
- **maxCentroids=1 full API exercise**: All API methods work on a single-centroid histogram.
- **maxCentroids=2 full API exercise**: All API methods work on a two-centroid histogram.

### Phase 5: Regression Labels (2 comments)

- Added `// regression: v0.9.5 (marker offset fix)` to compressed histogram marker test.
- Added `// regression: v0.9.5 (combinedVariance fix)` to combinedVariance correctness describe block.

## Testing

- All 174 tests pass
- Build succeeds with no type errors

## Use cases for review validation

- Verify seeded PRNG produces deterministic results across runs
- Verify error path tests match actual thrown messages
- Verify peaks(0) bug test documents current behavior accurately
- Verify regression labels are on the correct tests
