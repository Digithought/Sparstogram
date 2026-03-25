description: Replace peaks() Array.shift() with RingBuffer for O(1) sliding windows
files: src/ring-buffer.ts, src/sparstogram.ts (~:338-374), src/sparstogram.test.ts (~:1978-1991)
----

## What was built

1. **`RingBuffer<T>` class** (`src/ring-buffer.ts`) — fixed-capacity circular buffer with O(1) `push`,
   `shift`, `at` (with negative indexing), and `reduce`. Internal only — not re-exported in the
   package's public API (`index.ts` and `package.json` exports).

2. **`peaks()` updated** — the two `Array<Centroid>` sliding windows replaced with
   `RingBuffer<Centroid>(smoothing + 1)`. Loop logic structurally unchanged; only the container type
   changed.

3. **Guard for `smoothing < 1`** — `if (smoothing < 1) return;` at the top of `peaks()` prevents
   TypeError on invalid smoothing values.

## Testing notes

- All 182 tests pass (2s).
- Lint clean on both changed files.
- Peaks test coverage includes: empty histograms, 0–3 centroids, single/multiple peak detection,
  smoothing=1 (minimum capacity RingBuffer), large smoothing on small data, 500-centroid performance
  (<1s), and smoothing ≤ 0 guard.
- RingBuffer exercised indirectly through peaks tests — all operations (push, shift, at, reduce,
  length) are hit.

## Review observations

- RingBuffer is in a separate file (not inline in sparstogram.ts as ticket described) — this is
  cleaner modularity, not a defect.
- No bounds checking on push/shift/at — acceptable for internal use; usage pattern guarantees
  capacity is never exceeded.
- Pre-existing type errors in `sparstogram.bench.ts` (missing `@types/node`) are unrelated.
