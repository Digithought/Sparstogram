description: Add a formal benchmark suite for performance regression testing
dependencies: none
files: package.json, src/sparstogram.ts, src/sparstogram.test.ts
----
The repository has no dedicated benchmark suite. Performance characteristics are verified by 14 tests in the
"Performance & Scalability" test block, but these use wall-clock assertions (< 5s) — they catch gross regressions
but not subtle ones.

A benchmark suite should:
- Use a framework like `benchmark.js` or `vitest bench` for statistically significant measurements
- Profile `add()` hot path at maxCentroids = 50, 500, 5000 with 10K+ values
- Profile `compressOneBucket()` in isolation (high stale-entry scenario)
- Profile `mergeFrom()` with varying histogram sizes
- Profile `peaks()` with varying smoothing and centroid counts
- Measure memory per centroid at various scales (using `process.memoryUsage()`)
- Output results in a format suitable for CI comparison (e.g., JSON)

Baseline measurements from review (10K sin(i)×1000 values):
- maxCentroids=50: ~80ms total, ~8µs/add
- maxCentroids=500: ~94ms total, ~9.4µs/add
- maxCentroids=5000: ~118ms total, ~11.8µs/add
- mergeFrom two 5K histograms into 100 centroids: ~57ms

TODO
- Select benchmark framework (benchmark.js or vitest bench)
- Create benchmark script or test file
- Add `npm run bench` script to package.json
- Benchmark add() at multiple maxCentroids scales
- Benchmark compressOneBucket() with stale entry accumulation
- Benchmark mergeFrom() with varying sizes
- Benchmark peaks() with varying smoothing
- Measure and report memory per centroid
- Document baseline results in doc/assessment.md or a dedicated benchmarks doc
