description: Fixed inverted curvature-aware score formula — changed division to multiplication so flat regions merge first and peaks/tails are preserved
dependencies: none
files: src/sparstogram.ts (getPriorScore :416, updateNextScore :430, comment :403), README.md (Compression Score section :93-111), src/sparstogram.test.ts (uniform distribution test :1211, score direction test :1257, near-zero curvature comment :1109, loss comment :1307)
----

## Summary

The curvature-aware score formula in `getPriorScore` and `updateNextScore` used division (`base / (eps + curv)`), which inverted the intended merge priority: flat regions got enormous scores (preserved) while peaks/tails got small scores (merged first). Changed to multiplication (`base * (eps + curv)`) so that:

- **Low curvature** (flat regions) → small score → merged first (correct)
- **High curvature** (peaks/tails) → large score → preserved (correct)

## Changes Made

### src/sparstogram.ts
- Line 403: Updated comment from `score = baseLoss / (eps + ...)` to `score = baseLoss * (eps + ...)`
- Line 416 (`getPriorScore`): `base / (SCORE_EPSILON + curv)` → `base * (SCORE_EPSILON + curv)`
- Line 430 (`updateNextScore`): `base / (SCORE_EPSILON + curv)` → `base * (SCORE_EPSILON + curv)`

### README.md
- Line 98: Formula from `baseLoss / (ε + curvature)` to `baseLoss * (ε + curvature)`
- Line 103: ε description from "prevent division by zero" to "prevent the score from being exactly zero"
- Line 106: Updated prose to more clearly describe that low-curvature flat regions merge first

### src/sparstogram.test.ts
- Uniform distribution test: renamed to assert balanced centroids (max/min ratio < 10), was < 50
- Score direction test: converted from bug-documenting ("edges merge first") to correctness-asserting ("flat regions merge first, edges preserved")
- Updated comments referencing old division formula in near-zero curvature test and loss test

## Testing Use Cases

- **Uniform distribution balance**: 100 values into 5 centroids → max/min count ratio < 10
- **Flat regions merge first**: 50 uniform values into 10 centroids → no extreme centroid imbalance (ratio < 20)
- **Bimodal preservation**: Two well-separated clusters both retain representation
- **Loss non-negativity**: All returned loss values ≥ 0
- **Near-zero curvature**: No overflow or NaN when curvature approaches 0
- **Total count preservation**: Unaffected (pure bookkeeping)
- All 148 tests pass
