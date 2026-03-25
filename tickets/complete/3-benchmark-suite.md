description: Formal benchmark suite using tinybench for performance regression testing
dependencies: none
files: package.json, src/sparstogram.bench.ts, tsconfig.build.json
----

## What was built

A standalone benchmark suite (`src/sparstogram.bench.ts`) using tinybench that profiles the hot
paths of Sparstogram and outputs JSON results suitable for CI comparison.

Run via `npm run bench`. Outputs a human-readable table to stderr and machine-readable JSON to
stdout.

## Benchmark categories (23 entries total)

1. **add() hot path** — maxCentroids = 50, 500, 5000; 10K sin(i)*1000 values each
2. **Compression-heavy add()** — maxCentroids = 3, 5, 10; 5K distinct values
3. **Bulk compression** — populate 5000 centroids, then set maxCentroids=50
4. **mergeFrom()** — merge two histograms of N = 100, 1000, 5000 into maxCentroids=100
5. **peaks()** — centroids = 100, 500, 2000; smoothing = 1, 3, 10 (9 combos)
6. **Memory per centroid** — heap delta at centroidCount = 100, 1000, 5000, 10000

## Review findings

- **Fix applied**: Added `--expose-gc` to the `bench` npm script so that `global.gc()` is
  available during memory measurement. Without it, 5K/10K centroid memory readings were 0.
- Bench file is properly excluded from build via `tsconfig.build.json` (`**/*.bench.*`).
- JSON output is valid when running the script directly; `npm run` prepends lifecycle lines to
  stdout, so CI should invoke `node --expose-gc --import tsx src/sparstogram.bench.ts` for clean
  JSON piping.
- All 182 tests pass; lint is clean; build succeeds.
- Code is well-structured: typed interface, clear section headers, DRY loops, extracted formatting
  helpers, proper error handling via `main().catch`.

## Usage

```bash
# Human-readable table on stderr, JSON on stdout
npm run bench

# CI-friendly: pipe clean JSON
node --expose-gc --import tsx src/sparstogram.bench.ts > results.json
```
