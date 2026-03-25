description: compressOneBucket converted from recursion to iterative loop with depth limit
dependencies: none
files: src/sparstogram.ts (compressOneBucket ~:544), src/sparstogram.test.ts (~:1644)
----
## Summary

`compressOneBucket()` was converted from recursive stale-entry retry to an iterative `for` loop
with a `maxStaleRetries = 1000` safety guard. The three `return this.compressOneBucket()` recursive
calls (centroid gone, first-centroid/no-prior, prior vanished) are now `continue` statements. The
guard throws a descriptive error if retries are exhausted, preventing both stack overflow and infinite loops.

## Key Review Points

- `compressOneBucket()` at src/sparstogram.ts:545 — verify the loop structure, all three `continue` paths,
  and that the `maxStaleRetries` guard fires correctly
- Confirm no behavioral change: the merge logic within the loop should be identical to the prior recursive version
- The `maxStaleRetries = 1000` constant is a local variable — consider whether it should be configurable or if 1000 is a reasonable fixed ceiling

## Testing / Validation

Three dedicated tests in the `compressOneBucket stale entry handling at scale` describe block (src/sparstogram.test.ts:1644):

1. **1000 distinct values into maxCentroids=5** — exercises high stale-entry churn via `add()`, verifies no stack overflow, asserts consistency and centroidCount=5
2. **5000 distinct values into maxCentroids=3** — stress-tests stale entry accumulation, asserts consistency and centroidCount=3
3. **Merge 5000-centroid histogram into maxCentroids=5** — merges a source with 5000 centroids into a target with maxCentroids=5, verifies no stack overflow, asserts consistency, centroidCount=5, count=5001

All 149 tests pass. Build clean.
