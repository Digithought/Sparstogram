description: compressOneBucket converted from recursion to iterative loop with depth limit
dependencies: none
files: src/sparstogram.ts (compressOneBucket ~:544), src/sparstogram.test.ts (~:1640)
----
## Summary

Converted `compressOneBucket()` from recursive stale-entry retry to an iterative `for` loop. The three
`return this.compressOneBucket()` recursive calls (centroid gone, first-centroid/no-prior, prior vanished)
are now `continue` statements within a bounded loop.

A safety counter (`maxStaleRetries = 1000`) throws a descriptive error if the loop exhausts retries,
preventing both stack overflow and infinite looping.

## Changes

**src/sparstogram.ts — `compressOneBucket()`**
- Wrapped the stale-entry detection + merge logic in `for (let attempt = 0; ; attempt++)` loop
- Three recursive `return this.compressOneBucket()` calls → `continue`
- Added `maxStaleRetries = 1000` guard that throws on exhaustion
- Merge logic executes inline and `return`s from within the loop on success

**src/sparstogram.test.ts**
- Added test: merge 5000-centroid histogram (source with maxCentroids=5000) into target with maxCentroids=5
  - Verifies no stack overflow
  - Asserts consistency, centroidCount=5, count=5001

## Testing

- All 145 tests pass
- New test specifically exercises the high-stale-entry scenario via mergeFrom with massive centroid count mismatch

TODO
- Implementation is complete — ready for review
