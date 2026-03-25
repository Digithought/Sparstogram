description: Add distribution diversity tests, remaining error path tests, and regression labels (Phases 3-5 of test expansion)
dependencies: none
files: src/sparstogram.test.ts, src/sparstogram.ts
----

## Phase 3: Distribution Diversity

Tests with non-uniform distributions to verify the algorithm handles real-world data shapes.

### Normal/Gaussian distribution

Generate ~1000 values using Box-Muller transform with a deterministic seed (linear congruential generator). Verify:
- median centroid is near the mean
- `rankAt(mean)` is approximately `count / 2`

Seeded PRNG approach: use LCG with known seed. `x = (a * x + c) % m` where a=1664525, c=1013904223, m=2^32. Box-Muller: `sqrt(-2 * ln(u1)) * cos(2 * pi * u2)`.

### Exponential/skewed distribution

Generate values as `-ln(uniform)` scaled appropriately. Verify:
- compression preserves the mode region (near 0) with more centroids than the tail
- `rankAt` near 0 grows faster than `rankAt` in the tail

### Reverse input order

Add values N, N-1, ..., 1 and verify same invariants as ascending order:
- count is correct
- centroidCount <= maxCentroids
- `rankAt` monotonicity holds

### Random input order

Use a seeded PRNG to shuffle 0..N-1. Add in that order. Verify same centroid count and similar rank results as ascending order (within compression tolerance).

## Phase 4: Remaining Error Paths

### markerAt() out-of-bounds

Already verified by exploration:
- `markerAt(markers.length)` throws "Invalid marker"
- `markerAt(-1)` throws "Invalid marker"
- Add tests to document this.

### descending() with invalid criteria

Already verified by exploration:
- `descending({})` throws "Either markerIndex, value, or quantile must be specified"
- `descending({value: 1, markerIndex: 0})` throws "Only one of..."
- Add tests (ascending already has these; descending needs parity).

### append() variadic

Call `append(c1, c2, c3)` with multiple centroids in one call. Verify count and compression.

### add(-0)

Verified by exploration: `-0` coalesces with `0` (B+Tree comparator: `(-0) - 0 === 0`). Stored as `0`, not `-0`. Add a test documenting this behavior.

### peaks(0) and peaks(-1)

Verified by exploration:
- `peaks(0)` crashes with TypeError (`left.at(-1)` returns `undefined` when smoothing=0 makes the window check pass immediately with empty arrays). This is a bug.
- `peaks(-1)` should return no peaks (window condition `left.length === -1` never true).
- Add tests documenting current behavior. `peaks(0)` test should document the crash.

### edgeContribution edge cases

Existing tests cover: same value, differing values, count=1, symmetry. Add:
- Zero count centroid: `edgeContribution({value:0, variance:0, count:0}, {value:10, variance:0, count:5})` — should return 0 (min is 0).
- Negative values: `edgeContribution({value:-10, variance:0, count:3}, {value:10, variance:0, count:5})` — should return `3 * 20 = 60`.

### maxCentroids=1 full API exercise

Construct `new Sparstogram(1)`, add multiple values, exercise: `rankAt`, `valueAt`, `countAt`, `quantileAt`, `peaks`, `ascending`, `descending`. Verify all work on a single-centroid histogram.

### maxCentroids=2 full API exercise

Same as above with 2 centroids.

## Phase 5: Regression Labels

Add `// regression: v0.9.5` comments to tests covering:
- marker offset fix (tests exercising markers after compression)
- combinedVariance fix (tests in "combinedVariance correctness" section)

This is documentation-only, no new tests needed.

TODO
- Phase 3: Add normal distribution test (Box-Muller, seeded PRNG, median near mean)
- Phase 3: Add exponential/skewed distribution test (mode preservation)
- Phase 3: Add reverse input order test (N..1, same invariants as ascending)
- Phase 3: Add random input order test (seeded shuffle, similar ranks as sorted)
- Phase 4: Add markerAt out-of-bounds tests (markerAt(-1), markerAt(markers.length))
- Phase 4: Add descending invalid criteria tests (parity with ascending tests)
- Phase 4: Add append variadic test (multiple centroids in one call)
- Phase 4: Add add(-0) coalesces with 0 test
- Phase 4: Add peaks(0) crash documentation test and peaks(-1) no-peaks test
- Phase 4: Add edgeContribution zero count and negative value tests
- Phase 4: Add maxCentroids=1 full API exercise test
- Phase 4: Add maxCentroids=2 full API exercise test
- Phase 5: Add regression labels to v0.9.5 fix tests (documentation only)
