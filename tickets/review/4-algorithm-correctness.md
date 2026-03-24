description: Verify mathematical correctness of curvature-aware compression scoring and merge logic
dependencies: none
files: src/sparstogram.ts (compressOneBucket :538, computeLoss :377, getPriorScore :392, localCurvature :420, combinedVariance :648, combineSharedMean :640)
----
Deep review of the compression algorithm for mathematical correctness and fidelity to the stated theory.

Items to verify:

- Curvature estimation from density differences (left/right neighbors) — `localCurvature()` at :420; fallback when `l` or `r` is missing uses `dens(a,b)` as stand-in; does this bias edge pairs toward or away from compression?
- Score formula `baseLoss / (1e-9 + curvature)` — epsilon 1e-9 is very small; near-zero curvature in perfectly flat regions produces enormous scores; is the intent to strongly preserve flat regions? That seems backwards (flat = safe to merge)
- "Weighted median" recentering at :580 — actually a binary choice (`priorEntry.count >= minEntry.count`); this is the mode of two values, not a true weighted median; naming may mislead; verify it's the intended behavior
- `combinedVariance()` at :648 — Welford-style parallel variance decomposition; verify ssBetween = (nA * nB * (vA - vB)^2) / totalN matches the standard formula
- `computeLoss()` at :377 — adds `weightedDistance` and `combinedVariance` with no normalization; these have different units/scales; is the relative weighting intentional?
- Loss index comparator at :79 — `a.loss === b.loss` uses strict float equality for tiebreaking; could cause non-deterministic ordering
- `compressOneBucket()` returns `minEntry.loss` (base loss) not the curvature-aware score — is this the right value for the public API?
- Verify compression always selects globally optimal pair — stale entries could cause a suboptimal pair to be selected

Output: findings into doc/assessment.md; follow-up fix/ tickets for any correctness issues.

TODO
- Cross-check curvature formula against README mathematical description
- Analyze edge-pair bias from localCurvature fallback
- Evaluate epsilon choice (1e-9) against typical curvature magnitudes
- Verify combinedVariance against standard parallel variance decomposition
- Test float equality in loss comparator with adversarial inputs
- Benchmark curvature scoring vs naive closest-pair on known distributions
- Document findings in doc/assessment.md
