description: Replace peaks() Array.shift() with RingBuffer for O(1) sliding windows
files: src/sparstogram.ts (RingBuffer class ~:57-96, peaks ~:375-405), src/sparstogram.test.ts (~:1976-1989)
----

## Summary

Replaced the two plain `Array<Centroid>` sliding windows in `peaks()` with a private `RingBuffer<T>`
class that provides O(1) `push`, `shift`, `at` (with negative indexing), and `reduce` — eliminating
the O(n) cost of `Array.shift()` for large `smoothing` values.

### What was built

1. **`RingBuffer<T>` class** — private (not exported), placed above the `Sparstogram` class in
   `sparstogram.ts`. Uses a fixed-size array with `head`/`count` pointers for circular access.

2. **`peaks()` updated** — `left` and `right` arrays replaced with `RingBuffer<Centroid>(smoothing + 1)`.
   Capacity is `smoothing + 1` because the loop temporarily holds one extra element before shifting.
   The loop logic is structurally identical — only the container type changed.

3. **Guard for `smoothing < 1`** — Added `if (smoothing < 1) return;` at the top of `peaks()`.
   Previously, `smoothing=0` would cause a TypeError (documented bug). Now it cleanly returns no peaks.

4. **Test updated** — The `peaks(0)` test was updated from expecting TypeError to expecting empty results,
   matching the new guard behavior.

### Key test expectations (for review validation)
- All 182 existing tests pass unchanged (except the `peaks(0)` test updated above)
- Empty histogram → no peaks
- Too few centroids for smoothing → no peaks
- Single peak `[1,2,3,4,5,4,3,2,1]` with smoothing=1 → 1 peak, max=5
- Multiple peaks with smoothing=3 → 2 peaks with specific bounds
- Excessive smoothing → no peaks
- 500 centroids with smoothing=3 completes in <1s
- `peaks(0)` and `peaks(-1)` → no peaks (no throw)

### Usage
No API changes. `peaks()` behaves identically for all valid inputs. The RingBuffer is internal only.
