description: Curvature-aware score formula is inverted — merges high-curvature pairs (peaks/tails) first instead of preserving them
dependencies: none
files: src/sparstogram.ts (getPriorScore :392, updateNextScore :406, localCurvature :420), README.md (Compression Score section ~:94-111)
----
## Bug

The score formula at :403 is `baseLoss / (1e-9 + curvature)`. Since `_losses` is a min-queue (lowest score merged first), this gives:

- **Low curvature** (flat regions) → denominator ≈ 1e-9 → score ≈ baseLoss × 1e9 → **preserved** (high score, not selected)
- **High curvature** (peaks/tails) → denominator is large → score is small → **merged first** (low score, selected)

This is the **opposite** of the documented intent. The README states: "Pairs in flat distribution regions (low curvature) get merged early. Pairs at peaks, valleys, and tails (high curvature) are preserved."

## Evidence

- Uniform distribution (100 values 0–99 into 5 centroids): produces one centroid at value=0 with count=96 and 4 individual centroids at 96–99. Ideal would be ~5 evenly-spaced centroids with ~20 count each.
- Edge pairs merge first due to the `localCurvature` fallback inflating edge curvature, which interacts with the inverted formula to give edges low scores.
- Tests documenting this are in `src/sparstogram.test.ts` under "Algorithm Correctness — Curvature-Aware Compression".

## Proposed Fix

Change the score formula from division to multiplication:

```typescript
// In getPriorScore() and updateNextScore():
return base * (1e-9 + curv);   // was: base / (1e-9 + curv)
```

This gives:
- High curvature → high score → preserved (matches intent)
- Low curvature → low score → merged first (matches intent)

The epsilon `1e-9` prevents score from being exactly 0 when curvature is 0.

After fixing the formula, the `localCurvature` edge fallback should also be re-evaluated: with the corrected formula, the fallback inflates edge curvature → inflates score → edges preserved, which IS the desired behavior for tail preservation.

## Impact

- Behavioral change to compression: existing histograms compressed under the old formula will have different centroid distributions.
- README "Compression Score" and "Curvature-Aware Scoring" sections need to be corrected (the prose describes the intended behavior, not the current behavior).
- All existing tests that assert specific centroid values after compression may need updating.

TODO
- Change `base / (1e-9 + curv)` to `base * (1e-9 + curv)` in getPriorScore and updateNextScore
- Update the BUG-labeled tests to assert the corrected behavior (uniform → balanced centroids)
- Re-verify bimodal/normal/skewed distributions produce better results with the corrected formula
- Update README Compression Score section if behavior description is already correct (it is — just the code was wrong)
- Benchmark compression quality before/after on standard distributions
