description: Added distribution diversity tests, remaining error path tests, and regression labels (Phases 3-5 of test expansion)
dependencies: none
files: src/sparstogram.test.ts
----

## What was built

Added 24+ new tests across 3 phases covering distribution diversity, error paths, and regression labels.

### Phase 3: Distribution Diversity (4 tests)
- Normal/Gaussian distribution via Box-Muller with seeded LCG PRNG
- Exponential/skewed distribution verifying mode region preservation
- Reverse input order verifying monotonicity invariant
- Random (Fisher-Yates shuffled) input verifying order-independence

### Phase 4: Remaining Error Paths (18 tests)
- `markerAt()` out-of-bounds (both -1 and markers.length)
- `descending()` invalid criteria: empty `{}` and all 2-of-3 field combinations
- `append()` variadic: multi-centroid in one call, with/without compression
- `add(-0)` coalescing with `0`
- `peaks(0)` and `peaks(-1)`: early return for smoothing < 1
- `edgeContribution` edge cases: zero-count centroid, negative values
- `maxCentroids=1` and `maxCentroids=2` full API exercises

### Phase 5: Regression Labels (2 comments)
- `// regression: v0.9.5 (marker offset fix)` on compressed histogram marker test
- `// regression: v0.9.5 (combinedVariance fix)` on combinedVariance describe block

## Review notes

- Extracted repeated setup in `descending() invalid criteria` tests into `beforeEach` (DRY fix)
- All tests use only public API — no implementation coupling
- Seeded PRNG (`lcg`) defined once and reused across distribution tests — deterministic
- Error message strings in tests verified against implementation
- `peaks(0)` test correctly documents current behavior (`smoothing < 1` → early return, no TypeError)
- Build and all 182 tests pass
