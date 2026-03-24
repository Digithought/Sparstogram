description: Reviewed mathematical correctness of curvature-aware compression scoring and merge logic
dependencies: none
files: src/sparstogram.ts, src/sparstogram.test.ts, doc/assessment.md
----
## Summary

Deep review of the compression algorithm's mathematical correctness. Verified 8 items covering curvature estimation, score formula, variance decomposition, loss computation, comparator determinism, weighted median recentering, return values, and stale-entry handling.

## Key Findings

**Critical — Score formula inverted (1.2):**
The formula `score = baseLoss / (eps + curvature)` gives low scores to high-curvature pairs, causing peaks/tails to be merged first — the opposite of the documented intent. Uniform distribution compresses to 96:1:1:1:1 instead of ~20:20:20:20:20. Fix ticket: `fix/5-inverted-curvature-score-formula.md`.

**Verified correct:**
- `combinedVariance()` — standard parallel variance decomposition, verified against Welford formula
- `localCurvature()` edge fallback — treats boundary as density discontinuity (defensible)
- Weighted median recentering — correct for 2-element case; `>=` gives prior (lower) priority on ties
- Loss comparator — deterministic; float `===` is IEEE 754 compliant; value tiebreak ensures total order
- `computeLoss()` unit mixing — acknowledged design concern (existing TODO), not a correctness bug
- `compressOneBucket()` returns base loss — correct API behavior, not the curvature score
- Stale entry handling — lazily cleaned, no valid pairs skipped; performance concern only

## Tests Added

12 new tests in `src/sparstogram.test.ts` under "Algorithm Correctness — Curvature-Aware Compression":
- combinedVariance: same-value, different-value, and 3-point merge
- Compression preserves total count (heavy compression, maxCentroids shrink)
- Uniform distribution asymmetric collapse (documents the inverted formula bug)
- Bimodal distribution preserves modes
- Loss non-negativity
- Score formula direction (documents edge-first merging for uniform data)
- Weighted median: heavier member wins; equal counts → prior wins
- compressOneBucket returns base loss not score

All 117 tests pass. Build clean.

## Follow-up Tickets

- `fix/5-inverted-curvature-score-formula.md` — Critical: invert score formula from division to multiplication
