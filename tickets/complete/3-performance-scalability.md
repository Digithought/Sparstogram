description: Performance & scalability review — completed evaluation of computational and memory efficiency
dependencies: none
files: src/sparstogram.ts, src/sparstogram.test.ts, doc/assessment.md
----

## What was done

Reviewed all performance-critical code paths identified in the ticket. Profiled `add()` at multiple
maxCentroids scales, verified `mergeFrom()` linearity, tested `peaks()` with large centroid counts,
evaluated stale entry handling in `compressOneBucket()`, and assessed memory per centroid.

## Key findings

| Item | Verdict | Notes |
|------|---------|-------|
| `add()` hot path | OK | O(log n) confirmed. 10K adds: ~8-12µs/add across maxCentroids 50-5000. |
| `compressOneBucket()` stale entries | Risk | Recursive retry, no depth limit. Works at tested scales (5K values into 3 centroids). Stack overflow risk at extreme scales. Tracked in `fix/3-compress-recursion-depth-limit.md`. |
| Memory per centroid | OK | ~200-400 bytes estimated (two B+Tree entries). ~1-2MB at maxCentroids=5000. |
| `peaks()` Array.shift() | Minor | O(1) in practice (arrays capped at `smoothing` elements, default 3). Only relevant for very large smoothing. |
| `mergeFrom()` | OK | O(m log n) confirmed. Two 5K histograms merged in ~57ms. No quadratic behavior. |
| `_losses.find()` | OK | O(log n) comparator-based. Key mismatch causes stale entries but not O(n) scans. |
| Prototype binding :687 | Fix recommended | Prevents tree-shaking. Tracked in `fix/2-code-quality-cleanup.md`. |
| `min2()` helper :674 | Fix recommended | No measurable benefit over Math.min. Tracked in `fix/2-code-quality-cleanup.md`. |
| No benchmark suite | Gap | No formal benchmarks. Plan ticket: `plan/3-benchmark-suite.md`. |

## Tests added (14 new tests)

- `add() at varying maxCentroids scales` — 3 tests (maxCentroids 50, 500, 5000 with 10K values each)
- `peaks() with large centroid count` — 2 tests (500 centroids/smoothing=3, large smoothing on small dataset)
- `mergeFrom() linearity` — 2 tests (non-overlapping and overlapping 5K histograms)
- `compressOneBucket stale entry handling` — 2 tests (1K and 5K values into tiny maxCentroids)
- `edgeContribution exported function` — 4 tests (same value, different values, count=1, symmetry)
- `min2 via edgeContribution` — 1 test (asymmetric counts)

All 145 tests pass. Build succeeds.

## Follow-up tickets created

- `plan/3-benchmark-suite.md` — Formal benchmark suite with performance regression testing
- `plan/2-peaks-ring-buffer.md` — Replace peaks() arrays with ring buffers (low priority)

## Pre-existing related tickets

- `fix/3-compress-recursion-depth-limit.md` — Convert recursive retry to iterative loop
- `fix/2-code-quality-cleanup.md` — Remove min2(), prototype binding, dead code

## Assessment

Updated R6 section in `doc/assessment.md` with all findings, profiling results, and status markers.
