description: compressOneBucket converted from recursion to iterative loop with depth limit
dependencies: none
files: src/sparstogram.ts (compressOneBucket ~:558), src/sparstogram.test.ts (~:1647)
----
## What was built

`compressOneBucket()` was converted from recursive stale-entry retry to an iterative `for` loop
with a `maxStaleRetries = 1000` safety guard. The three `return this.compressOneBucket()` recursive
calls (centroid gone, first-centroid/no-prior, prior vanished) became `continue` statements. The
guard throws a descriptive error if retries are exhausted, preventing both stack overflow and
infinite loops.

## Key files

- `src/sparstogram.ts:558` — `compressOneBucket()` iterative implementation
- `src/sparstogram.test.ts:1647` — `compressOneBucket stale entry handling at scale` test block

## Testing

Three dedicated tests in the `compressOneBucket stale entry handling at scale` describe block:

1. **1000 distinct values into maxCentroids=5** — exercises high stale-entry churn via `add()`, verifies no stack overflow, asserts consistency and centroidCount=5
2. **5000 distinct values into maxCentroids=3** — stress-tests stale entry accumulation, asserts consistency and centroidCount=3
3. **Merge 5000-centroid histogram into maxCentroids=5** — merges a source with 5000 centroids into a target with maxCentroids=5, verifies no stack overflow, asserts consistency, centroidCount=5, count=5001

All tests use the public API and verify through `assertConsistent()` (centroidCount, count totals, ascending order, rankAt monotonicity).

## Review notes

- Loop structure and all three continue paths verified correct
- Merge logic within the loop is identical to the prior recursive version
- `maxStaleRetries = 1000` is a reasonable fixed ceiling (real-world stale counts are typically 0-2)
- Third continue path (line 590, `!priorEntry`) is unreachable defensive code — harmless
- 182 tests pass, build clean (pre-existing type errors in bench.ts only)
