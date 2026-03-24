description: Identify untested scenarios and assess test quality against the implementation
dependencies: 5-edge-cases-robustness, 5-numerical-stability
files: src/sparstogram.test.ts, src/sparstogram.ts
----
Assess the existing 54-test suite for coverage gaps. The test file is well-structured (12 describe blocks) but several important scenarios are missing.

Confirmed gaps:

- No NaN/Infinity/negative-zero input tests
- No `maxCentroids=1` or `maxCentroids=2` boundary tests
- No large-scale stress test (100K+ values, memory verification)
- No rank roundtrip property: `rankAt(valueAt(r).value) ~ r`
- No `rankAt()` monotonicity check: for x1 < x2, rankAt(x1) <= rankAt(x2)
- No `mergeFrom()` commutativity test: merge(A,B) vs merge(B,A)
- No `peaks()` tests with varying smoothing parameter
- No iterator test with quantile-based Criteria
- No `tightnessJ` monotonicity verification under compression
- No `countAt()` test between two zero-variance centroids (NaN risk)
- No explicit regression markers for v0.9.5 fixes (marker offset, combinedVariance)

Items to evaluate:

- Are existing assertions tight enough? (e.g., closeTo tolerances)
- Is the test data representative? (uniform, normal, bimodal, skewed distributions)
- Are error paths tested? (invalid inputs, out-of-range queries)
- Same value added many times — partially tested but no dedicated scale test

Output: findings into doc/assessment.md; follow-up plan/ tickets for test expansion.

TODO
- Catalog existing test scenarios vs public API surface
- Identify which public methods lack error-path tests
- Verify assertion tolerance values are appropriate
- Evaluate distribution diversity in test data
- Document findings in doc/assessment.md
