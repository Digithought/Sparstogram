description: Formal benchmark suite using tinybench for performance regression testing
dependencies: none
files: package.json, src/sparstogram.bench.ts
----

## What was built

A standalone benchmark suite (`src/sparstogram.bench.ts`) using tinybench that profiles the hot
paths of Sparstogram and outputs JSON results suitable for CI comparison.

Run via `npm run bench`. Outputs a human-readable table to stderr and machine-readable JSON to
stdout.

## Benchmark categories (23 entries total)

1. **add() hot path** — maxCentroids = 50, 500, 5000; 10K sin(i)*1000 values each
2. **Compression-heavy add()** — maxCentroids = 3, 5, 10; 5K distinct values (high stale-entry churn)
3. **Bulk compression** — populate 5000 centroids, then set maxCentroids=50
4. **mergeFrom()** — merge two histograms of N = 100, 1000, 5000 into maxCentroids=100
5. **peaks()** — centroids = 100, 500, 2000; smoothing = 1, 3, 10 (9 combos)
6. **Memory per centroid** — heap delta at centroidCount = 100, 1000, 5000, 10000

## JSON output format

Array of objects with fields: `name`, `hz`, `mean`, `p75`, `p99`, `samples`, and optional
`type: "memory"` for memory entries.

## Changes made

- `package.json`: added `tinybench` devDependency and `"bench"` script
- `src/sparstogram.bench.ts`: new file with all 6 benchmark categories

## Testing / validation checklist

- `npm run bench` completes without error and produces valid JSON on stdout
- JSON contains entries for all 6 benchmark categories (23 total entries)
- Timing results are within reasonable range of baselines (not grossly regressed)
- Memory-per-centroid is reported for all 4 scales
- `npm test` passes (149 tests) — benchmark file does not interfere with existing tests
- Review table formatting on stderr for readability
- Verify the bench script is excluded from build output (not in tsconfig.build.json includes)
