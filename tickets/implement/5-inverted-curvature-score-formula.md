description: Fix inverted curvature-aware score formula — change division to multiplication so flat regions merge first and peaks/tails are preserved
dependencies: none
files: src/sparstogram.ts (getPriorScore ~:395, updateNextScore ~:409, localCurvature ~:423, comment ~:393), README.md (Compression Score section ~:93-111), src/sparstogram.test.ts (BUG tests ~:1234, ~:1282)
----

## Root Cause

The score formula in `getPriorScore` (line 406) and `updateNextScore` (line 420) uses division:

```typescript
return base / (1e-9 + curv);
```

Since `_losses` is a min-queue (lowest score merged first), this produces inverted behavior:

- **Low curvature** (flat regions) → denominator ≈ 1e-9 → score ≈ baseLoss × 1e9 → **preserved** (wrong)
- **High curvature** (peaks/tails) → denominator is large → score is small → **merged first** (wrong)

The documented intent (README lines 109-111, prose descriptions throughout) is the opposite: flat regions should merge first, peaks/tails should be preserved.

## Fix

Change division to multiplication in both scoring functions:

```typescript
// In getPriorScore() and updateNextScore():
return base * (1e-9 + curv);   // was: base / (1e-9 + curv)
```

This gives:
- **Low curvature** → small multiplier → low score → merged first (correct)
- **High curvature** → large multiplier → high score → preserved (correct)

The epsilon `1e-9` prevents score from being exactly 0 when curvature is 0.

## Edge Curvature Fallback

The `localCurvature` function (line 423-428) uses `dens(a, b)` as a fallback when there's no left or right neighbor (edge pairs). With the corrected multiplication formula, this inflated edge curvature → inflated score → edges preserved. This is the **desired** behavior for tail preservation. No change needed to `localCurvature`.

## Files to Change

### src/sparstogram.ts
1. Line 393: Update comment from `score = baseLoss / (eps + ...)` to `score = baseLoss * (eps + ...)`
2. Line 406 (`getPriorScore`): Change `base / (1e-9 + curv)` to `base * (1e-9 + curv)`
3. Line 420 (`updateNextScore`): Change `base / (1e-9 + curv)` to `base * (1e-9 + curv)`

### README.md
1. Line 98: Change formula from `score = baseLoss / (ε + curvature)` to `score = baseLoss * (ε + curvature)`
2. Line 103: Update ε description — it now prevents the score from being exactly zero, not division by zero
3. Line 106: The prose describes the intended behavior correctly — just verify it still reads accurately with the new formula

### src/sparstogram.test.ts
1. **Line 1234** — `'BUG: uniform distribution collapses asymmetrically due to inverted score formula'`: Convert from BUG-documenting to correctness-asserting. After fix, uniform 100 values into 5 centroids should produce roughly balanced centroids (max/min count ratio should be modest, e.g., < 10 instead of > 10).
2. **Line 1282** — `'README claims flat regions merge first, but edges merge first for uniform data'`: Update or remove — after fix, the README and behavior should agree. Could be converted to a positive assertion that uniform data doesn't cause extreme edge-absorption.
3. **Line 1131** — `'score formula handles near-zero curvature without overflow'`: Comment at line 1132 references old formula — update comment.
4. **Lines 1331-1334** — `'add() returns finite, positive loss when compression occurs'`: The comment about "Score can be enormous (baseLoss / 1e-9)" should be updated since score is now multiplication-based.
5. Verify all other tests still pass — the bimodal, count-preservation, and loss-monotonicity tests should continue to pass (or improve).

## Verification

After applying the fix:
- `npm test` must pass with all 145 tests (some updated)
- Uniform distribution (100 values, 5 centroids) should produce roughly balanced centroids
- Bimodal distribution should still preserve both modes
- Loss values should remain non-negative and finite
- Total count preservation is unaffected (pure bookkeeping, not score-dependent)

TODO

Phase 1: Code fix
- Change `base / (1e-9 + curv)` to `base * (1e-9 + curv)` in `getPriorScore` (line 406)
- Change `base / (1e-9 + curv)` to `base * (1e-9 + curv)` in `updateNextScore` (line 420)
- Update the comment at line 393 to reflect multiplication formula

Phase 2: Test updates
- Update BUG test at ~line 1234 to assert balanced centroids (max/min ratio < 10) instead of asymmetry (ratio > 10)
- Update test at ~line 1282 to assert correct behavior matches README documentation
- Update comments at ~line 1132 and ~lines 1331-1334 referencing old formula
- Run full test suite and fix any newly failing tests due to changed compression behavior

Phase 3: Documentation
- Update README line 98: formula from division to multiplication
- Update README line 103: ε description from "prevent division by zero" to "prevent zero score"
- Verify README prose at lines 106-111 still accurately describes the (now-correct) behavior
