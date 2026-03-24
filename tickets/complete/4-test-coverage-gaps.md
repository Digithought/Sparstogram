description: Reviewed test suite (131 tests) for coverage gaps, tolerance quality, distribution diversity, and error-path completeness
files: src/sparstogram.test.ts, src/sparstogram.ts, doc/assessment.md
----
## What Was Done

Thorough review of the 131-test suite against the full public API surface of Sparstogram. Assessed:

1. **Test-to-API mapping**: Every public method/property has happy-path coverage. Error paths are covered for most methods with specific gaps noted below.
2. **Gap catalog**: Evaluated all 12 items from the original ticket. 4 are fully covered (5.7, 5.9, 5.11 and partially 5.1/5.2/5.5/5.8), 5 are not covered (5.3, 5.4, 5.6, 5.10, 5.12). Found 8 additional gaps (5.13-5.20).
3. **Assertion tolerances**: All closeTo/within tolerances are appropriate for current behavior. Some may need tightening after the inverted score formula fix.
4. **Distribution diversity**: Uniform, bimodal, sparse, duplicate, and sine-wave distributions are tested. Normal, skewed, reverse-order, and random-order are missing.
5. **Error paths**: Most methods have error-path tests. Missing: `markerAt(out-of-bounds)`, `descending(invalid criteria)`, `append(variadic)`, `add(-0)`, `peaks(0)`, `edgeContribution` edge cases.

## Key Findings

- **Strongest coverage**: `add()`, `rankAt()`, `valueAt()`, `countAt()`, `ascending()`/`descending()` — well-tested with multiple scenarios including compression and empty histograms.
- **Most impactful gaps**: No property-based invariant tests (rank roundtrip, monotonicity sweep), no stress tests (100K+), no merge commutativity verification.
- **Quality observation**: The BUG-documenting test pattern (prefix "BUG:") is good practice — clearly separates behavior documentation from correctness assertions.

## Follow-Up

- `plan/3-test-expansion.md` — 5-phase plan covering property invariants, stress testing, distribution diversity, error paths, and regression labels.

## Assessment Update

Updated `doc/assessment.md` section R5 with detailed status for all gap items, assertion tolerance analysis, distribution diversity assessment, and per-method error-path coverage table.
