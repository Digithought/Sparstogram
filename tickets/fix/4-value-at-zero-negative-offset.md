description: valueAt(0) produces offset=-1 (negative offset passed to inferValueFromOffset)
dependencies: none
files: src/sparstogram.ts (valueAt at :239-258), src/sparstogram.test.ts
----
## Bug

`valueAt(0)` computes `Math.abs(0) = 0` as the remaining rank. The first centroid has count >= 1,
so the condition `0 <= entry.count` is true. The offset is then computed as `0 - 1 = -1`.

This negative offset is passed to `inferValueFromOffset()`. For count=1 centroids, the guard
`count === 1` catches it and returns `centroid.value`. For multi-count centroids with variance > 0,
the negative offset produces `fraction = -1 / (count - 1)`, yielding a value *below* the
centroid's range — an incorrect extrapolation.

### Root cause

`valueAt()` uses 0-based rank internally (`remainingRank = Math.abs(rank)`) but the offset
computation `remainingRank - 1` assumes 1-based rank. When rank=0, this produces offset=-1.

## Reproducing tests

In `Edge Cases & Robustness > valueAt(0)`:
- `BUG: valueAt(0) produces offset=-1 (negative offset)`

## Fix options

**Option A (recommended):** Reject rank=0 early — it is not a valid rank (ranks are 1-based or negative):
```typescript
valueAt(rank: number): Quantile {
    if (rank === 0) {
        throw new Error("Rank must be non-zero (positive for from-start, negative for from-end)");
    }
    // ... existing logic
}
```

**Option B:** Treat rank=0 as rank=1 (silent clamp). Less principled.

After fixing, update the BUG test to expect a throw (Option A).

## TODO
- Add rank=0 guard at the top of `valueAt()` at :239
- Update the valueAt(0) test to expect a throw
- Verify all tests pass
