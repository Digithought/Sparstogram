description: Implement a formal benchmark suite using tinybench for performance regression testing
dependencies: none (tinybench to be added as devDependency)
files: package.json, src/sparstogram.bench.ts, src/sparstogram.ts
----

## Overview

Add a statistically rigorous benchmark suite to complement the existing wall-clock performance
tests in `src/sparstogram.test.ts` (line 1529+). The suite profiles the hot paths of Sparstogram
and outputs JSON results suitable for CI comparison.

## Framework: tinybench

Use `tinybench` (npm package) — the micro-benchmark library that powers `vitest bench`. It is:
- Modern ESM, TypeScript-friendly
- Lightweight (~15KB, no transitive deps)
- Provides statistically significant measurements (mean, p75, p99, stddev, iterations)
- Well-maintained (unlike benchmark.js which is unmaintained since 2017)

## Benchmark file: `src/sparstogram.bench.ts`

A standalone script runnable via `node --loader=ts-node/esm src/sparstogram.bench.ts`.
Outputs human-readable table to stderr and machine-readable JSON to stdout.

### Benchmark scenarios

**1. `add()` hot path at varying maxCentroids** (maxCentroids = 50, 500, 5000; 10K values each)
- Each iteration creates a fresh Sparstogram and adds 10,000 `sin(i)*1000` values.
- Measures total time and derives per-add throughput.
- Baseline reference: ~80ms (50), ~94ms (500), ~118ms (5000).

**2. `compressOneBucket()` via compression-heavy add** (maxCentroids = 3, 5, 10; 5K values)
- Since `compressOneBucket` is private, benchmark indirectly: add 5,000 distinct values to a
  histogram with very low `maxCentroids`. Every add beyond the limit triggers compression with
  high stale-entry churn.
- This isolates compression cost because the compression-to-insert ratio is very high.

**3. `compressOneBucket()` via bulk reduction** (populate 5000 centroids, then set maxCentroids=50)
- Build a histogram with `maxCentroids=5000`, add 5000 values (no compression), then set
  `maxCentroids=50` to force 4950 compression operations in a burst.
- Measures pure compression throughput without insert overhead.

**4. `mergeFrom()` with varying sizes**
- Merge two histograms of size N into `maxCentroids=100`: N = 100, 1000, 5000.
- Baseline reference: ~57ms for two 5K histograms into 100 centroids.

**5. `peaks()` with varying smoothing and centroid counts**
- `peaks(smoothing)` on histograms with 100, 500, 2000 centroids; smoothing = 1, 3, 10.
- Measures iterator overhead and smoothing window cost.

**6. Memory per centroid**
- Use `process.memoryUsage().heapUsed` delta to measure memory for histograms at
  centroidCount = 100, 1000, 5000, 10000.
- Reports bytes per centroid. (Run outside tinybench timing, as a separate measurement.)

### Output format

JSON array to stdout:
```json
[
  {
    "name": "add() maxCentroids=50 x10K",
    "hz": 12.5,
    "mean": 80.0,
    "p75": 85.0,
    "p99": 95.0,
    "samples": 50
  },
  ...
]
```

Memory results appended as entries with `"type": "memory"`.

## package.json change

Add script:
```json
"bench": "node --loader=ts-node/esm src/sparstogram.bench.ts"
```

Add devDependency:
```json
"tinybench": "^3.0.0"
```

## Key tests for later review

- Running `npm run bench` completes without error and produces valid JSON on stdout.
- JSON contains entries for all 6 benchmark categories.
- Results are within 5x of baseline measurements (guards against gross regressions in the benchmarks themselves).
- Memory-per-centroid is reported and is in a reasonable range (< 1KB per centroid).

## TODO

### Phase 1: Setup
- Install tinybench: `npm install --save-dev tinybench`
- Add `"bench"` script to package.json
- Create `src/sparstogram.bench.ts` skeleton with tinybench imports

### Phase 2: Benchmark implementations
- Implement add() benchmarks at maxCentroids 50, 500, 5000
- Implement compression-heavy add() benchmarks at maxCentroids 3, 5, 10
- Implement bulk compression benchmark (5000 → 50 centroids)
- Implement mergeFrom() benchmarks at sizes 100, 1000, 5000
- Implement peaks() benchmarks with varying smoothing (1, 3, 10) and centroid counts (100, 500, 2000)
- Implement memory-per-centroid measurement at scales 100, 1000, 5000, 10000

### Phase 3: Output and integration
- Format results as JSON to stdout, human-readable table to stderr
- Verify `npm run bench` works end-to-end
- Ensure existing tests still pass (`npm test`)
