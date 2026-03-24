description: Replace peaks() Array.shift() with ring buffers for large smoothing values
dependencies: none
files: src/sparstogram.ts (peaks :316)
----
The `peaks()` method at :316-352 uses plain arrays `left` and `right` with `Array.shift()` for sliding windows.
`Array.shift()` is O(n) per call because it reindexes the array.

However, the arrays are capped at `smoothing` elements. With the default smoothing=3, the arrays never exceed
3 elements, making shift() effectively O(1). This is only a concern for very large smoothing values
(e.g., smoothing > 100).

The existing TODO comment at :317 says "replace these with ring buffers." A simple ring buffer (fixed-size
circular array with head/tail pointers) would make shift() O(1) regardless of smoothing.

Impact: Low priority. Only affects exotic use cases with large smoothing parameters. Current performance
with smoothing=3 and 500 centroids is sub-millisecond.

Also noted: `const result: Peak[] = [];` at :319 is declared but never used (dead variable). The `let left`
and `let right` should be `const`. These are tracked in `fix/2-code-quality-cleanup.md`.

TODO
- Implement a simple RingBuffer<T> class or use an existing ring buffer library
- Replace `left` and `right` arrays in `peaks()` with ring buffers
- Remove the TODO comment at :317
- Verify peaks() behavior unchanged with existing tests
