# Sparstogram v0.9.5 — Review Assessment

**Date:** 2026-03-24
**Scope:** Full review of algorithm, implementation, API, tests, docs, build, and dependencies.

## Review Tickets

All tickets live in `tickets/review/`. Findings from each review populate the sections below. Follow-up work produces new tickets in `tickets/fix/` or `tickets/plan/`.

| Priority | Ticket File | Area |
|----------|------------|------|
| **5** | `5-edge-cases-robustness.md` | Boundary conditions, degenerate inputs |
| **5** | `5-numerical-stability.md` | Floating-point, NaN propagation, precision |
| **5** | `5-api-surface.md` | Public API correctness, type exports, ergonomics |
| **4** | `4-algorithm-correctness.md` | Curvature scoring math, merge logic |
| **4** | `4-dual-index-consistency.md` | B+Tree sync, stale entries, iterator safety |
| **4** | `4-test-coverage-gaps.md` | Missing test scenarios |
| **3** | `3-performance-scalability.md` | Benchmarks, memory, bottlenecks |
| **3** | `3-documentation-accuracy.md` | README vs code, JSDoc, figures |
| **3** | `3-build-packaging.md` | NPM package, CI, ESM/CJS |
| **3** | `3-type-safety.md` | TypeScript strictness, exported types |
| **3** | `3-dependency-health.md` | digitree, npm audit, lock file |
| **3** | `3-code-quality.md` | Dead code, naming, consistency |

---

## Findings

> Sections below are populated as each review ticket is processed. Status markers: pending, in-progress, done.

### R1: Algorithm Correctness — Curvature-Aware Compression

**Scope:** Verify mathematical correctness of the compression scoring and merge logic.

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1.1 | Curvature estimation from density differences (left/right neighbors) | done | `localCurvature()` :420 — fallback when `l` or `r` is missing uses `dens(a,b)` as stand-in. This **inflates curvature for edge pairs**, which is mathematically equivalent to treating external density as 0 (boundary discontinuity). This is defensible for tail preservation, but interacts with the inverted score formula (1.2) to merge edges first. |
| 1.2 | Score formula: `baseLoss / (1e-9 + curvature)` — **INVERTED** | **confirmed bug** | :403 — The formula gives LOW scores to HIGH curvature pairs, causing them to be merged first. This is **opposite** to the documented intent: README says "pairs at peaks/tails are preserved" but the code merges them preferentially. Uniform distribution test confirms: 100 values into 5 centroids produces one centroid at value=0 with count=96 and 4 individual tail centroids. Should likely be `baseLoss * (eps + curvature)` instead. Fix ticket: `fix/5-inverted-curvature-score-formula.md` |
| 1.3 | Weighted median recentering vs weighted mean | done | :580 — binary choice `priorEntry.count >= minEntry.count`. For a two-element set, this IS the correct weighted median (the element where cumulative weight >= 50%). Naming is accurate. Test confirms: heavier member wins; equal counts → prior (lower value) wins due to `>=`. |
| 1.4 | `combinedVariance()` formula correctness | done | :648 — Verified against standard parallel variance decomposition: `ssBetween = (nA * nB * (vA - vB)^2) / totalN` matches exactly. Edge cases correct: both count=1 → variance = diff²/2. Test confirms two points at {10,20} → variance=50. |
| 1.5 | `combineSharedMean()` — assumes shared value (same bucket) | done | :640 — denominator `count - 1 = 1` when both are count=1 (total=2). Variance terms are 0 for count=1 inputs; result is 0. No count=0 path exists (guarded by `append()` validation). |
| 1.6 | Loss index ordering determinism (loss, value tiebreak) | done | :79 — `===` on floats is deterministic in IEEE 754. Two different pairs producing identical loss is extremely unlikely; tiebreaker by value ensures total order. Not a correctness issue. |
| 1.7 | `computeLoss()` includes `combinedVariance` additively | done | :383 — `weightedDistance` (value×count units) + `combinedVariance` (value² units). Different scales; relative weighting is data-dependent. Existing TODO in code acknowledges this. Design concern, not a correctness bug. |
| 1.8 | Compression always selects globally optimal merge candidate | done | Stale entries in `_losses` are cleaned up lazily via recursive retry in `compressOneBucket()`. Valid pairs are never skipped — stale entries only cause extra retries. Performance concern (no depth limit), not correctness. |

**Follow-up tickets:**
- `fix/5-inverted-curvature-score-formula.md` — **Critical**: score formula direction is inverted; multiply instead of divide (1.2)
- README curvature scoring description needs correction after formula fix

---

### R2: Numerical Stability & Floating-Point Edge Cases

**Scope:** Audit floating-point arithmetic for stability, precision, and edge-case correctness.

| # | Item | Status | Notes |
|---|------|--------|-------|
| 2.1 | `erf()` A&S 7.1.26 approximation accuracy | done | :695 — max error ~1.5e-7; adequate for histogram use. Verified: erf(Infinity)=1, erf(NaN)=NaN. Test exercises very-large-spread case. |
| 2.2 | `normalCDF()` with variance=0 | done | :689 — `sqrt(0)=0`, argument `(x-mean)/0`. When `x!=mean`: returns 0 or 1 (correct for point mass). When `x==mean`: NaN — but this path is guarded at all call sites by B+Tree `find()` exact-match check. Defense-in-depth: function-level guard recommended (see follow-up). Tests confirm no NaN via public API. |
| 2.3 | `inferValueFromOffset()` when count=1 | done | :790 — guarded, returns `centroid.value`; OK |
| 2.4 | `offsetToValue` scalar at boundaries | done | :795 — `fraction = offset / (count - 1)` when offset=0 or offset=count-1 gives -1/+1 sigma; assumes uniform spacing within 1-sigma. Correct for linear interpolation model. |
| 2.5 | `interpolateCentroids()` with zero-variance centroids | done | :800 — calls `normalCDF` for both centroids. In practice, only reached when query value differs from both centroid means (guarded by `rankAt` exact-match check). Tests confirm: `rankAt` between two zero-variance centroids returns finite result, not NaN. |
| 2.6 | `calculateDensity()` variance=0 guard | done | :829 — returns 1 if exact match, 0 otherwise; discontinuous but intentional and correct for point mass. |
| 2.7 | `tightnessJ` incremental drift over many operations | done | Test added: 10K `sin(i)*1000` additions, compare incremental vs recomputed from iterator. Drift stays within 1% relative error. Acceptable for a monitoring heuristic. |
| 2.8 | Very large values (>1e15) — `Math.exp(-x*x)` underflow in erf | done | Produces 0 for large x, which makes erf=1; functionally OK. Test confirms `rankAt` with 1e15 spread returns finite result. |
| 2.9 | NaN/Infinity input to `add()` | **confirmed bug** | No guard; NaN propagates silently through B+Tree ordering. Already tracked in `fix/5-nan-infinity-input-validation.md`. |
| 2.10 | `dens()` epsilon `1e-12` in denominator | done | :421 — prevents division by zero for coincident values; adequate. Test confirms compression of coincident-value centroids works without Infinity/NaN. |
| 2.11 | `1e-9` epsilon in score formula | done | :403 — `baseLoss / (1e-9 + curvature)`. Near-zero curvature (uniform data) produces large but finite scores (~1e9×baseLoss). This is intentional — flat regions are preserved. Test confirms uniform distribution compresses correctly. |
| 2.12 | `combineSharedMean()` with both counts=1 | done | :640 — denominator `count-1=1` when both are count=1. Variance terms are 0; result is 0. Test confirms. |

**Follow-up tickets:**
- `fix/5-nan-infinity-input-validation.md` — add input validation for NaN/Infinity in `add()` (existing)
- *Recommended*: Add variance=0 guard directly in `normalCDF()` as defense-in-depth (return 0.5 for x==mean, 0/1 for x!=mean). Low priority since all call sites are currently guarded.

---

### R3: Data Structure Integrity — Dual B+Tree Index Consistency

**Scope:** Verify the centroid index and loss index stay synchronized under all mutation paths.

| # | Item | Status | Notes |
|---|------|--------|-------|
| 3.1 | Insert path: loss index updated for new pair + affected neighbor | done | :463-464 — new centroid: `_centroids.insert` stores base loss, `_losses.insert` stores score. Insert path itself is correct (both use `.insert`, no `find` needed). The `updateNext` call at :475 triggers the key-mismatch issue (see 3.2). |
| 3.2 | Update (increment existing) path: loss index updated | **confirmed bug** | :447-448 — `_losses.find(entry)` searches by `entry.loss` (base loss from CentroidEntry) but the stored loss entry has `.loss` = curvature-aware score. Since `score = baseLoss / (eps + curvature) ≠ baseLoss`, the find returns a not-on path and `updateAt` silently no-ops. The old stale entry remains in `_losses`. Verified: digitree `find` uses comparator-based binary search, not reference equality. Duck typing from CentroidEntry→Loss is structurally valid but the `.loss` field semantically mismatches (base vs score). |
| 3.3 | Stale entry detection in `compressOneBucket()` | **confirmed risk** | :542-570 — recursive retry with no depth limit. Each failed `_losses.find` (3.2, 3.4, 3.5) leaves orphaned/stale entries. Compression cleans one stale entry per recursive call. For a `mergeFrom` of N centroids, up to O(N) stale entries can accumulate → O(N) recursion depth. JS stack limit (~10K-25K frames) can be exceeded for large merges. |
| 3.4 | Loss key after merge: old entries for deleted centroids | **confirmed bug** | :610 — `_losses.deleteAt(_losses.find(priorEntry)!)` fails because `priorEntry.loss` (base) ≠ stored `.loss` (score). The old loss entry for the deleted prior centroid is orphaned. New merged entry is correctly inserted at :611. The orphan is later cleaned up when `compressOneBucket` picks it (centroid gone → stale → retry at :542-544). |
| 3.5 | `updateNext()` double-update risk | **confirmed bug** | :533 — same root cause as 3.2. `_losses.find(nextEntry)` uses `nextEntry.loss` (base) to search but stored entry has `.loss` (score). The find fails silently, `updateAt` is a no-op, and next's old loss entry remains stale in `_losses`. The next centroid's `_centroids` entry IS correctly updated (line 532), so queries are unaffected — only the loss priority queue is stale. |
| 3.6 | `mergeFrom()` batch compression | done | :193-198 — batches of `maxCentroids/4`; each calls `compressOneBucket()` which is the standard path. Correct structurally, but inherits the stale-entry accumulation from 3.2-3.5, amplified by the large number of insertions. |
| 3.7 | `maxCentroids` setter triggers compression loop | done | :120-122 — `while` loop; each `compressOneBucket()` decrements `_centroidCount`; terminates correctly. Compression itself works (picks a pair, merges, produces correct centroid data). The stale entries in `_losses` affect merge-pair selection optimality but not termination. |
| 3.8 | Iterator invalidation during mutation | **confirmed — undocumented** | `ascending()`/`descending()` yield lazily from digitree paths. If `add()` or `compressOneBucket()` is called during iteration, B+Tree mutations invalidate internal path references. Manifests in `mergeFrom(self)` (already tracked in `fix/4-merge-from-self-iterator-invalidation.md`). No JSDoc warning on iterators. |

**Root Cause Analysis:**

The systematic issue across 3.2, 3.4, and 3.5 is a **key-domain mismatch** between the two B+Trees:
- `_centroids` stores `CentroidEntry.loss` = **base pair loss** (from `computeLoss` / `getPriorLoss`)
- `_losses` stores `Loss.loss` = **curvature-aware score** (from `getPriorScore` / `updateNextScore`)
- Score = baseLoss / (1e-9 + curvature), so score ≠ baseLoss except when there is no prior (both Infinity)

When any code path calls `_losses.find(centroidEntry)`, it uses `centroidEntry.loss` (base) as the search key, but the stored entries are keyed by score. The comparator never returns 0 → find fails → `updateAt`/`deleteAt` is a no-op.

**Impact:**
- **Not a crash bug**: The stale entry cleanup in `compressOneBucket()` prevents errors
- **Suboptimal compression**: Merge-pair selection uses stale scores, not current ones
- **Memory growth**: `_losses` tree accumulates orphaned entries (2 per merge: one from failed delete at :610, one from failed update at :533)
- **Stack overflow risk**: Recursive retry depth proportional to stale entry count
- **Centroid data correctness is NOT affected**: `_centroids` tree is always updated correctly; only the loss priority queue is stale

**Follow-up tickets:**
- `fix/4-loss-score-key-mismatch.md` — **Core fix**: store score (not base loss) in CentroidEntry.loss, or add a separate score field, or search _losses by score
- `fix/3-compress-recursion-depth-limit.md` — Convert recursive retry to iterative loop with depth limit
- `fix/3-iterator-invalidation-docs.md` — Document iterator invalidation behavior in JSDoc on `ascending()`/`descending()`

---

### R4: API Surface & Usability

**Scope:** Evaluate public API for completeness, safety, and ergonomics.

| # | Item | Status | Notes |
|---|------|--------|-------|
| 4.1 | `maxCentroids=1` behavior | done | Valid; single centroid accumulates everything; all queries work but lossy |
| 4.2 | `add()` returns loss — semantics clear? | done | Returns 0 when no compression; returns `minEntry.loss` (base loss, not score) on compression; documented |
| 4.3 | `valueAt()` 1-indexed with negative rank | done | Unusual convention; throws on out-of-range — error message says "Rank out of range" but doesn't say valid range. Test added. |
| 4.4 | Criteria mutual exclusion | **confirmed bug** | :625 — only throws if **all three** specified; allows two of three simultaneously. Tested: `{value, markerIndex}`, `{value, quantile}`, `{markerIndex, quantile}` all silently pick one by precedence. Existing test at :604 passes for wrong reason (throws from markerAt, not validation). Fix ticket created. |
| 4.5 | Missing serialization API | done | No `toJSON()`/`fromJSON()` — users must iterate centroids and re-append; markers lost. Low priority for v0.9.x. |
| 4.6 | Missing `reset()`/`clear()` | done | Must construct new instance; minor inconvenience |
| 4.7 | `edgeContribution()` exported | done | Public utility; reasonable for advanced users monitoring tightnessJ |
| 4.8 | `Quantile` interface not exported | **confirmed** | `d.ts` shows non-exported `interface Quantile extends Marker`. Consumers see structural type but can't name it. Fix ticket created. |
| 4.9 | `markers` constructor parameter is `public` | done | Exposes mutable array on instance; `Object.freeze` helps but `.markers` is still publicly visible. Tests confirm frozen. |
| 4.10 | Thread safety | done | Not applicable (single-threaded JS), but no reentrancy guard if called from generator callbacks |
| 4.11 | `CentroidEntry` leak through iterators | **confirmed** | `ascending()`/`descending()` yield `CentroidEntry` objects (with `loss` field) despite declaring `Centroid` return type. Test confirms `loss` key present at runtime. Fix ticket created. |
| 4.12 | Error handling inconsistency | done | `valueAt`/`markerAt` throw on empty; `rankAt`/`countAt` return 0. Documented in tests. Design decision — not a bug. |
| 4.13 | `Criteria.quantile` typed as `Quantile` | done | Requires full `Quantile` object; inconsistent with `quantileAt(number)` taking a plain number. Ergonomic concern — included in fix ticket. |

**Follow-up tickets:** Fix Criteria validation (4.4). Export `Quantile` and `Marker` types (4.8). Strip `CentroidEntry` fields in iterators (4.11). Consider `Criteria.quantile` redesign (4.13).

---

### R5: Test Coverage & Quality Gaps

**Scope:** Identify untested scenarios and assess test quality.

**Current state:** 131 tests across 12+ describe blocks. All pass. TypeScript type-checks clean.

#### Gap Analysis (original ticket items)

| # | Item | Status | Notes |
|---|------|--------|-------|
| 5.1 | NaN/Infinity/negative-zero inputs | **partial** | NaN (:766) and Infinity (:784) tested as BUG-documenting tests. **Negative-zero (`-0`) not tested** — `add(-0)` may or may not coalesce with `add(0)` depending on B+Tree comparator behavior with `Object.is` vs `===`. |
| 5.2 | `maxCentroids=1` and `maxCentroids=2` boundary | **partial** | `maxCentroids=1`: tested via reduction (:935-941), combineSharedMean (:1163), weighted median (:1312). `maxCentroids=2`: tested only in `countAt` compressed (:366). **No dedicated test constructing `new Sparstogram(1)` or `new Sparstogram(2)` and exercising all query methods.** |
| 5.3 | Large-scale stress test (100K+ values) | **not covered** | Largest test is 10K values (tightnessJ drift :1107). **No 100K+ test.** No memory profiling. |
| 5.4 | Rank roundtrip: `rankAt(valueAt(r).value) ≈ r` | **not covered** | No property-based roundtrip test. `assertConsistent()` checks monotonicity at centroid values but not the roundtrip invariant. |
| 5.5 | `rankAt()` monotonicity | **partial** | `assertConsistent()` (:1373-1379) checks monotonicity at centroid values only. **No sweep through arbitrary inter-centroid values.** |
| 5.6 | `mergeFrom()` commutativity/associativity | **not covered** | Tests verify merge correctness but not `merge(A,B) ≈ merge(B,A)` or associativity. |
| 5.7 | Same value added many times | **done** | 10K identical values (:901-921) with count, centroidCount, variance, and query verification. |
| 5.8 | `peaks()` with smoothing variations | **partial** | Tested: default(3), smoothing=1, smoothing=10 (larger than dataset). **No systematic sweep** (smoothing=2, 4, 5). No test for `smoothing=0` behavior. |
| 5.9 | Iterator with quantile-based criteria | **done** | Tested at (:620-624): `ascending({ quantile: sparstogram.valueAt(4) })`. |
| 5.10 | `tightnessJ` monotonicity under compression | **not covered** | Drift accuracy tested (:1107-1128), but no test verifies tightnessJ behavior specifically during compression steps. |
| 5.11 | `countAt()` for zero-variance centroids | **done** | Tested at (:1064-1072): `countAt(15)` between two zero-variance centroids at 10 and 20 returns finite value. |
| 5.12 | Regression tests for v0.9.5 bug fixes | **not covered** | No explicit regression markers. Marker offset and combinedVariance fixes are covered by existing functional tests but not labeled as regressions. |

#### Additional Gaps Found During Review

| # | Item | Status | Notes |
|---|------|--------|-------|
| 5.13 | `markerAt()` with out-of-bounds index | **not covered** | No test for `markerAt(markers.length)` or `markerAt(-1)` — both should throw "Invalid marker" but behavior not verified. |
| 5.14 | `descending()` with invalid criteria | **not covered** | Only `ascending()` tested with invalid criteria (:602-606). `descending()` with `{}`, two-field criteria untested. |
| 5.15 | Normal/Gaussian distribution | **not covered** | No test with normally-distributed data (e.g., Box-Muller generated). |
| 5.16 | Skewed distribution (exponential, log-normal) | **not covered** | Only uniform, bimodal, sparse, and sine-wave distributions tested. |
| 5.17 | Reverse/random input order | **not covered** | All tests use ascending, symmetric, or pattern-based input order. No test verifies that descending or random input order produces equivalent results. |
| 5.18 | `append()` with multiple centroids in one call | **not covered** | All `append()` tests call with single centroid. The variadic `append(...centroids)` path with 2+ centroids in one call is untested. |
| 5.19 | `edgeContribution()` exported function | **not covered** | Used internally in tests as a helper (:1118) but no dedicated test of the exported function's behavior with edge cases (zero count, same value, negative values). |
| 5.20 | `peaks()` with plateau (flat top) | **not covered** | No test with data that has a flat peak (multiple consecutive equal counts). |

#### Assertion Tolerance Assessment

| Location | Tolerance | Verdict |
|----------|-----------|---------|
| `:272` `closeTo(50, 0.1)` | Median marker in uncompressed 100-value histogram | **Appropriate** — marker tracking is exact |
| `:295` `closeTo(26.5, 1)` | Lower quartile after curvature-aware compression | **Appropriate** — loosened for scoring variation |
| `:299` `within(45, 55)` | Median in 10-centroid compressed histogram | **Appropriate** — reasonable for lossy compression |
| `:304` `within(40, 80)` | Upper quartile in compressed histogram | **Wide but acceptable** — 10 centroids for 97 values is very lossy |
| `:336-337` `within(-800, 400)` | 10th percentile in maxCentroids=2 histogram | **Very wide** — documents limitation rather than testing accuracy |
| `:1126` relative error < 0.01 | tightnessJ drift after 10K additions | **Appropriate** — 1% tolerance for heuristic metric |
| `:1263` `maxCount/minCount > 10` | Uniform distribution asymmetry | **Appropriate** — documents inverted score formula bug |
| `:1347` `loss < 1e6` | Compression loss magnitude | **Appropriate** — upper bound sanity check |

**Verdict:** Tolerances are generally appropriate. The wide tolerances at `:304` and `:336-337` document limitations of extreme compression rather than testing precision. Consider tightening `:304` to `within(60, 80)` once the inverted score formula is fixed, as compression quality should improve.

#### Distribution Diversity Assessment

| Distribution | Covered? | Notes |
|-------------|----------|-------|
| Uniform (0..N) | ✅ | Extensively tested across many blocks |
| Bimodal | ✅ | `:1268` — two separated clusters |
| Sparse (few widely-spaced values) | ✅ | Multiple tests with {1, 100, 1000} patterns |
| Dense with duplicates | ✅ | `:109-121`, `:178-190` |
| Single value repeated | ✅ | 10K identical values `:901` |
| Sine wave | ✅ | tightnessJ test `:1111` |
| Normal/Gaussian | ❌ | **Gap** — no bell-curve distributed data |
| Skewed (exponential) | ❌ | **Gap** — heavy-tail behavior untested |
| Reverse input order | ❌ | **Gap** — order-dependence not tested |
| Random input order | ❌ | **Gap** — only deterministic sequences |

#### Error Path Coverage by Method

| Method | Happy | Error | Missing |
|--------|-------|-------|---------|
| `constructor(maxCentroids, markers)` | ✅ | ✅ invalid markers | — |
| `maxCentroids` setter | ✅ | ✅ value < 1 | — |
| `add(value)` | ✅ | ⚠️ NaN/Infinity documented as BUG | `-0` input |
| `append(...centroids)` | ✅ | ✅ count=0, variance<0 | multi-centroid variadic call |
| `mergeFrom(other)` | ✅ | ✅ self-merge documented | commutativity |
| `rankAt(value)` | ✅ | ✅ empty, extremes | — |
| `valueAt(rank)` | ✅ | ✅ empty, 0, out-of-range | — |
| `countAt(value)` | ✅ | ✅ empty, between, outside | — |
| `quantileAt(quantile)` | ✅ | ✅ out-of-range, empty | — |
| `markerAt(index)` | ✅ | ✅ empty | out-of-bounds index, negative index |
| `peaks(smoothing)` | ✅ | ✅ empty, minimal, large smoothing | smoothing=0, plateau |
| `ascending(criteria)` | ✅ | ✅ invalid criteria, empty | — |
| `descending(criteria)` | ✅ | ✅ start at value, empty | invalid criteria |
| `edgeContribution(u, v)` | ✅ (as helper) | ❌ | zero count, same value, exported function tests |

**Follow-up ticket:** `plan/3-test-expansion.md` — property-based invariants, stress testing, distribution diversity, remaining error paths.

---

### R6: Performance & Scalability

**Scope:** Evaluate computational and memory efficiency.

| # | Item | Status | Notes |
|---|------|--------|-------|
| 6.1 | `add()` hot path cost | done | ~2 B+Tree lookups + 1-2 loss updates + possible compression = O(log n). Profiled at maxCentroids 50/500/5000 with 10K adds: 80ms/94ms/118ms respectively — sublinear scaling in centroid count confirms O(log n) per add. Tests added. |
| 6.2 | `compressOneBucket()` stale entry scanning | **confirmed risk** | Recursive retry with no depth limit; worst case O(s × log n) where s = stale entries. Tested 5K values into maxCentroids=3 — completes without stack overflow (stale count stays manageable at typical scales). However, pathological cases with very large stale accumulation (>10K) could exceed JS stack. Tracked in `fix/3-compress-recursion-depth-limit.md`. |
| 6.3 | Memory per centroid | done | CentroidEntry: 4 fields (value, variance, count, loss) = ~32 bytes + B+Tree node overhead (~64-128 bytes amortized). Loss entry: 2 fields (loss, value) = ~16 bytes + B+Tree node overhead (~64-128 bytes). **Estimated ~200-400 bytes per centroid** including both trees. At maxCentroids=5000, total ≈ 1-2 MB — acceptable for in-memory streaming use. |
| 6.4 | `peaks()` ring buffer TODO | **minor concern** | :317 — `Array.shift()` is O(n) per call, but arrays are capped at `smoothing` elements. With default smoothing=3, shift is O(1) in practice (constant-size arrays). Only problematic for very large smoothing values (e.g., smoothing=1000+). Tested with 500 centroids, smoothing=3: <1ms. Ring buffers would help only for exotic smoothing values. Low priority. |
| 6.5 | `mergeFrom()` quadratic risk | done | Batch size = `maxCentroids/4`; each compression is O(log n); total ≈ O(m log n). Tested: merging two 5K-value histograms into maxCentroids=100 completed in ~57ms — confirms linear, not quadratic behavior. Overlapping merge (same values) also linear. |
| 6.6 | No benchmarks in repo | **gap** | No dedicated benchmark suite or performance regression tests. Review added 14 performance-related tests validating time bounds and scale behavior, but no formal benchmark framework (e.g., `benchmark.js` or `vitest bench`). Plan ticket created. |
| 6.7 | `_losses.find(entry)` — comparator-based lookup | done | digitree BTree uses comparator-based binary search, not reference equality. `find()` is O(log n). However, due to the loss-score key mismatch (R3 §3.2), `find(centroidEntry)` often fails because `CentroidEntry.loss` (base) ≠ stored `Loss.loss` (score). This causes stale entries but is an O(log n) operation per call — not an O(n) scan. |
| 6.8 | Prototype binding pattern | **fix recommended** | :687 — `(Sparstogram.prototype as any).edgeContribution = edgeContribution` overrides the class method. Prevents tree-shaking of the entire class in bundlers. The private method at :428 already delegates correctly. Remove the prototype binding. Tracked in `fix/2-code-quality-cleanup.md`. |
| 6.9 | `min2()` helper at :674 | done | Reimplements `Math.min` for 2 args. V8 inlines `Math.min` for numeric pairs; no measurable benefit. Validated indirectly via `edgeContribution` tests. Tracked for removal in `fix/2-code-quality-cleanup.md`. |

**Profiling Summary (10K sin(i)×1000 values):**
| maxCentroids | add() total (ms) | per-add (µs) | centroidCount |
|--------------|-------------------|---------------|---------------|
| 50 | ~80 | ~8 | 50 |
| 500 | ~94 | ~9.4 | 500 |
| 5000 | ~118 | ~11.8 | 5000 |

Scaling is sub-linear in maxCentroids — confirms O(log n) per add, with constant overhead from compression when centroidCount < maxCentroids.

**Follow-up tickets:**
- `plan/3-benchmark-suite.md` — Add benchmark suite with formal performance regression testing
- `plan/3-peaks-ring-buffer.md` — Replace `peaks()` arrays with ring buffers for large smoothing values (low priority)
- `fix/3-compress-recursion-depth-limit.md` — Convert recursive retry to iterative loop (existing)
- `fix/2-code-quality-cleanup.md` — Remove `min2()` and prototype binding (existing)

---

### R7: Documentation Accuracy & Completeness

**Scope:** Verify docs match implementation; identify gaps.

| # | Item | Status | Notes |
|---|------|--------|-------|
| 7.1 | README formulas vs code | done | **All formulas match code.** Curvature (:84-88 vs `localCurvature()` :420-424) ✅ — README omits the `1e-12` epsilon guard in density denominator and the edge-pair fallback behavior, but these are implementation details. Score formula (:98 vs :403) ✅. baseLoss (:118 vs :377-383) ✅. tightnessJ (:138 vs :682-683) ✅. combinedVariance (:120-125 vs :648-671) ✅. normalCDF/density (:433-434 vs :688-835) ✅. **Caveat:** Score formula and prose are contradictory — README :108-111 says "flat regions merged first, peaks preserved" but the formula `baseLoss / (ε + curvature)` does the opposite (already tracked in `fix/5-inverted-curvature-score-formula.md`). After formula fix, README formula will need updating. |
| 7.2 | README usage examples compilable? | done | All six example blocks verified against current API signatures: constructor ✅, `add()` ✅, `quantileAt()`/`markerAt()`/`rankAt()`/`valueAt()`/`countAt()` ✅, `ascending()`/`descending()` with Criteria ✅, `peaks()` ✅, `mergeFrom()` ✅, `append(...centroids)` ✅. Return types and property accesses are all correct. |
| 7.3 | "Limitations" section completeness | **gaps found** | README (:521-531) lists 4 limitations. **Missing:** (1) No NaN/Infinity input handling — `add(NaN)` corrupts B+Tree (tracked in `fix/5-nan-infinity-input-validation.md`). (2) No serialization API — must iterate and re-append; markers lost. (3) Iterator invalidation — mutations during iteration corrupt paths. (4) `mergeFrom(self)` is broken. These are user-facing hazards that should be documented. |
| 7.4 | JSDoc on all public methods | **gaps found** | Missing `@throws` annotations: `valueAt()` throws "Rank out of range" (:257), `markerAt()` throws "Invalid marker" (:306), `maxCentroids` setter throws on value < 1 (:117), `append()` throws on count < 1 or variance < 0 (:169-171). `ascending()`/`descending()` `@param criteria` lacks detail on Criteria fields (markerIndex, value, quantile). |
| 7.5 | Return type documentation for edge cases | **gaps found** | `valueAt()` JSDoc says "Returns the Quantile information" but doesn't mention the `@throws` for out-of-range rank. `markerAt()` same — no `@throws`. `add()` JSDoc doesn't mention NaN behavior. `countAt()` return description says "interpolated, but in whole counts" which is accurate. |
| 7.6 | Complexity claims | done | README (:370-378) claims: `add()` O(log n), `quantileAt()` O(log n), `markerAt()` O(1), `mergeFrom()` O(m log n). All verified against implementation — B+Tree operations are O(log n), marker lookup is O(1). README also says "roughly O(log n)" in the summary section (:13) which is accurate. |
| 7.7 | `doc/figures/` referenced? | **broken link + unreferenced image** | README :11 references `doc/complex-diagram.jpg` but the file is at `doc/figures/complex-diagram.jpg` — **broken image link**. `doc/figures/simple-diagram.jpg` exists but is **not referenced** anywhere in README. The three `.png` figures (`hist.png`, `spars.png`, `spars-compressed.png`) are correctly referenced at :159, :165, :173. |
| 7.8 | Time-window aggregation | done | README :493-519 shows time-window aggregation as a **usage pattern** under "Distributed and Parallel Scenarios" — not a claimed feature. The code example is correct (uses standard Sparstogram API) and is clearly presented as a design pattern. **Not misleading.** |
| 7.9 | Distributed merge guidance | **gaps found** | README :457-491 documents `mergeFrom()` for parallel/distributed use but omits critical caveats: (1) Markers in the source histogram are ignored — only the target's markers are updated. (2) Iterator invalidation — `mergeFrom(self)` is broken (tracked in `fix/4-merge-from-self-iterator-invalidation.md`). (3) Merge is not commutative due to weighted-median recentering — `merge(A,B)` may differ from `merge(B,A)`. Users building distributed aggregation should be warned about these. |
| 7.10 | No CHANGELOG | done | Confirmed: no CHANGELOG.md exists. Version 0.9.5. No tracked history of breaking changes. Low priority for pre-1.0 library. |
| 7.11 | ESM-only nature not documented | **gap found** | `package.json` has `"type": "module"` and exports only `./dist/index.js`. CJS consumers need `await import('sparstogram')`. Not mentioned in README. |
| 7.12 | Node.js minimum version not documented | **gap found** | `tsconfig.json` targets ES2022 which requires Node.js >= 16.11. No `engines` field in `package.json`. Not mentioned in README. |

**Follow-up tickets:**
- `fix/3-documentation-corrections.md` — Fix broken image path (:11), add missing `@throws` JSDoc annotations, add limitations for NaN/serialization/iterator invalidation, document ESM-only nature and Node.js minimum, document `mergeFrom()` caveats, reference or remove `simple-diagram.jpg`

---

### R8: Build, Packaging & Distribution

**Scope:** Review build pipeline, NPM package, and CI setup.

| # | Item | Status | Notes |
|---|------|--------|-------|
| 8.1 | ESM-only package (`"type": "module"`) | done | CJS consumers need dynamic `import()` — not documented in README. Acceptable for a modern library; should note in README or engines field. |
| 8.2 | `exports` field lacks `types` condition | **fix recommended** | `package.json:8-10` — exports map is `{ ".": "./dist/index.js" }`. TypeScript resolves types via top-level `"types"` field (works), but `moduleResolution: "bundler"` and `"node16"` both prefer `exports["."].types`. Best practice: `{ ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" } }`. Plan ticket created. |
| 8.3 | Source maps in NPM package | **intentional, minor** | `tsconfig.json` has `"sourceMap": true`. Maps ship in package: `index.js.map` (123B) + `sparstogram.js.map` (28.7KB) = ~28.1KB total, 25% of unpacked size. Useful for debugging; acceptable for a library of this size. Could be stripped to reduce package size. |
| 8.4 | `prepublishOnly` runs `doc` generation | done | `docs/` (TypeDoc HTML output) is correctly excluded from the published package. The `.npmignore` uses a deny-all (`*`) plus whitelist (`!dist/*`, `!LICENSE`, `!package.json`) strategy, so only whitelisted paths ship. `npm pack --dry-run` confirms: only `dist/*`, `LICENSE`, `README.md`, `package.json` are included. |
| 8.5 | No CI/CD pipeline | **fix recommended** | No GitHub Actions or equivalent. Risk of publishing broken builds. Plan ticket created for CI setup. |
| 8.6 | ES2022 target compatibility | **fix recommended** | `tsconfig.json` targets ES2022 which requires Node.js >= 16.11. Not documented in `package.json` `engines` field or README. Plan ticket created. |
| 8.7 | `--loader=ts-node/esm` deprecation | done | Migrated to `--import tsx` with `tsx` as devDependency. `ts-node` removed. Test, bench, and VS Code debug configs all updated. No deprecation warnings. |
| 8.8 | `.npmignore` completeness | done | Strategy is deny-all + whitelist: `*` then `!dist/*`, `!LICENSE`, `!package.json`. This is robust — everything not explicitly whitelisted is excluded. Verified via `npm pack --dry-run`: 9 files total (LICENSE, README.md, 6 dist files, package.json). `.vscode/`, `doc/`, `docs/`, `src/`, `tickets/`, `tess/`, `test/` all correctly excluded. |
| 8.9 | `tsconfig.build.json` vs `tsconfig.json` | done | Build config extends base, narrows `include` to `["src"]`, and excludes `**/*.test.*` and `./test`. Base includes `["src", "test"]` for IDE support. Build correctly produces only library code. Declarations enabled in base (`"declaration": true`), inherited by build. No test `.d.ts` files in dist. Correct. |
| 8.10 | LICENSE file | done | MIT license file exists at project root (9.2KB). Included in NPM package (verified via `npm pack --dry-run`). |
| 8.11 | `package-lock.json` | **note** | Not committed to git. For a library (not an application), this is acceptable — consumers use their own lock files. However, it means CI reproducibility depends on registry state at install time. Consider committing for reproducible dev/CI builds. |
| 8.12 | Build pipeline correctness | done | `npm run build` succeeds cleanly. Produces 6 files in `dist/`: `index.js`, `index.d.ts`, `index.js.map`, `sparstogram.js`, `sparstogram.d.ts`, `sparstogram.js.map`. No test files leak into dist. 131 tests pass. |

**Follow-up tickets:**
- `plan/3-ci-pipeline.md` — Add GitHub Actions for test, build, and publish verification
- `plan/3-packaging-improvements.md` — Add `types` condition to exports, document Node.js minimum version, migrate test runner off deprecated loader API

---

### R9: Type Safety & TypeScript Strictness

**Scope:** Audit TypeScript usage for correctness and exported type completeness.
**Status:** done

| # | Item | Status | Notes |
|---|------|--------|-------|
| 9.1 | `as any` usage | acceptable | :687 — prototype binding `(Sparstogram.prototype as any).edgeContribution = edgeContribution`; only cast in codebase. The private method at :428 already delegates to the helper, so the prototype override is redundant. Functional but fragile — could be eliminated by removing the prototype assignment and relying on the private method. |
| 9.2 | `Quantile` interface not exported | **improvement needed** | Return type of `valueAt()`, `quantileAt()`, `markerAt()` — consumers see inferred structural type `{ rank: number; centroid: Centroid; offset: number; value: number }` but cannot name it in their own annotations. Should be exported. |
| 9.3 | `Marker` interface not exported | OK | Internal; `Quantile extends Marker`; not in any public signature directly — only through `Quantile`. Keeping internal is correct. |
| 9.4 | `CentroidEntry` leaks through iterators | **confirmed bug** | `ascending()`/`descending()` declare `IterableIterator<Centroid>` return type, but yield raw `CentroidEntry` objects with extra `loss` field. Consumers can access `.loss` at runtime without type support. Same leak in `valueAt()`/`quantileAt()`/`markerAt()` via the `centroid` field of the returned `Quantile`. Existing test confirms: "BUG: iterators expose internal loss field on centroids". Fix: strip `loss` before yielding (e.g. destructure). |
| 9.5 | `Criteria.quantile` typed as `Quantile` | **improvement needed** | Requires a full `Quantile` object with `rank`, `centroid`, `offset`, `value` fields, but `criteriaToPath` only reads `criteria.quantile.centroid.value`. Inconsistent with `quantileAt(number)` which accepts a plain `number` (0-1). Accepting `number` instead of `Quantile` would be more ergonomic and consistent. |
| 9.6 | `_markers` nullability | OK | `(Marker \| undefined)[] \| undefined` — double-optional is correct: outer `undefined` means no markers requested, inner `undefined` means marker not yet initialized (first value not added). All code paths handle both levels. |
| 9.7 | `markers` constructor param is `public` | OK | Exposes as instance property; frozen after construction (`Object.freeze(markers)` at :106); type is `number[] \| undefined`. Read-only in practice. |
| 9.8 | Strict null checks | OK | `strict: true` in tsconfig.json. All 35 `!` non-null assertions after `.at(path)` are preceded by `.on` guards or equivalent logic (e.g., iterator loop guarantees, prior `if (!path.on) return` guards). No unsafe assertions found. |
| 9.9 | Return type annotations | minor | Most public methods have explicit return types. `append()` at :166 infers `number` — should be explicit for consistency with `add(): number`. The d.ts correctly shows `: number` regardless. |

**Follow-up tickets:** `plan/3-export-quantile-strip-centroidentry.md` — export `Quantile`, strip `CentroidEntry.loss` from public API, evaluate `Criteria.quantile` redesign.

---

### R10: Edge Cases & Robustness

**Scope:** Systematically verify behavior at boundaries and with degenerate inputs.

| # | Item | Status | Notes |
|---|------|--------|-------|
| 10.1 | `add(NaN)` | **confirmed bug** | NaN breaks B+Tree ordering (comparisons always false); corrupts index silently. Test added. Fix ticket: `fix/5-nan-infinity-input-validation.md` |
| 10.2 | `add(Infinity)` / `add(-Infinity)` | **confirmed bug** | Comparator `(a,b) => a-b` produces NaN for `Inf-Inf`; `rankAt(±Infinity)` returns NaN. Insertion works but lookups fail. Test added. Fix ticket: `fix/5-nan-infinity-input-validation.md` |
| 10.3 | Same value 10K times | done | Count accumulates correctly at single centroid; variance stays 0; all queries work. Tests added. |
| 10.4 | Reduce `maxCentroids` below `centroidCount` | done | Batch compresses correctly; count preserved. Tests added. |
| 10.5 | `rankAt()` on empty histogram | done | Returns 0 for any value. Tests added. |
| 10.6 | `valueAt(0)` | **confirmed bug** | `Math.abs(0) = 0`; offset = 0-1 = -1 (negative). For count=1 centroids, guarded by `inferValueFromOffset`; for multi-count centroids with variance, produces incorrect value. Test added. Fix ticket: `fix/4-value-at-zero-negative-offset.md` |
| 10.7 | `quantileAt(0)` / `quantileAt(1)` | done | Correctly returns first/last value. Tests added. |
| 10.8 | `quantileAt(-0.1)` / `quantileAt(1.1)` | done | Silently clamped to rank 1 / rank=count. Tests document this behavior. Design decision — not a bug. |
| 10.9 | `peaks()` with 0, 1, 2 centroids | done | 0 and 1 centroid: yields nothing. 2 centroids with smoothing=1: yields trailing peak. Default smoothing=3 requires 6+ centroids. Tests added. |
| 10.10 | `mergeFrom(self)` | **confirmed bug** | Iterates self.ascending() while mutating self via insertOrIncrementBucket() — iterator invalidation. Count doubles but centroid data may be inconsistent. Test added. Fix ticket: `fix/4-merge-from-self-iterator-invalidation.md` |
| 10.11 | `append()` with count=0 centroid | done | Throws correctly. Tests added. |
| 10.12 | Very large counts (>2^53) | done | Integer precision lost past MAX_SAFE_INTEGER. Test documents limitation. Low priority — documentation concern. |

**Follow-up tickets created:**
- `fix/5-nan-infinity-input-validation.md` (10.1, 10.2)
- `fix/4-value-at-zero-negative-offset.md` (10.6)
- `fix/4-merge-from-self-iterator-invalidation.md` (10.10)

---

### R11: Dependency Health & Security

**Scope:** Evaluate runtime and dev dependency health.

| # | Item | Status | Notes |
|---|------|--------|-------|
| 11.1 | `digitree` — maintenance status | done | Same author (Nathan T. Allan) as sparstogram. Last publish **2026-01-22** (v1.4.6). 16 releases from 2024-02 to 2026-01. GitHub: 0 open issues, 7 stars, 1 fork. Bus factor: 1 — acceptable given shared authorship, but worth noting. Actively maintained. |
| 11.2 | `digitree` — API stability | done | **85 call sites** across two `BTree` instances (`_centroids`, `_losses`). Uses: `find`, `insert`, `delete`, `ascending`, `descending`, `prior`, `next`, `first`, `last`, `at`, `updateAt`, `count`. Tight coupling is inherent — the B+Tree *is* the core data structure. Installed v1.4.0; latest is 1.4.6 (semver-minor, should be safe to update). |
| 11.3 | `digitree` — license | done | **Apache-2.0**. Compatible with sparstogram's MIT license (Apache-2.0 is permissive; MIT consumers can depend on Apache-2.0 libraries without issue). |
| 11.4 | `digitree` — known vulnerabilities | done | **No known vulnerabilities.** npm audit shows 12 advisories, but all are in transitive dev dependencies (eslint→minimatch, mocha→diff/serialize-javascript, rimraf→glob). Zero runtime vulnerabilities. |
| 11.5 | Dev dependency versions | **note** | Several packages outdated. Within semver range: mocha 11.4→11.7.5, rimraf 6.0.1→6.1.3, typedoc 0.28.4→0.28.18, @typescript-eslint/* 8.32→8.57. **Breaking changes available:** TypeScript 5.8→6.0, ESLint 9→10, Chai 5→6. Recommend updating within semver range first; major bumps need separate evaluation. |
| 11.6 | `package-lock.json` committed? | done | **Not committed.** For a library (not an application), this is standard practice — consumers use their own lock files. However, dev/CI reproducibility depends on npm registry state at install time. Consider committing for CI consistency. Already noted in R8 (8.11). |
| 11.7 | `ts-node` + `--loader` ESM approach | done | Test script uses `node --loader=ts-node/esm`. The `--loader` flag is deprecated in Node.js 22+ (replaced by `--import` with `register()`). Alternatives: (a) `tsx` — drop-in replacement, actively maintained, faster; (b) Node.js 22+ native `--experimental-strip-types` — no loader needed but limited (no enums, no decorators). `tsx` is the pragmatic choice. Low urgency — current setup works. |

**Follow-up tickets:**
- *Recommended:* Update `digitree` from 1.4.0 to 1.4.6 — bug fixes and improvements from same author
- *Recommended:* Run `npm audit fix` to resolve dev dependency advisories (12 total, all in dev transitive deps)
- ~~*Low priority:* Consider `tsx` migration for test runner to replace deprecated `--loader` flag~~ — done (migrated to `--import tsx`)
- *Low priority:* Evaluate TypeScript 6.0, ESLint 10, Chai 6 major version upgrades

---

### R12: Code Quality & Maintainability

**Scope:** Assess code organization, readability, and long-term maintainability.

| # | Item | Status | Notes |
|---|------|--------|-------|
| 12.1 | Monolithic 850-line class | done | ~637 lines for the class + ~213 lines of module-level helpers = ~850 total. Responsibilities (insertion, compression, querying, iteration, markers) are cohesive — all share the same B+Tree state. Decomposing now would add coupling complexity without clear benefit. **Verdict: not warranted at current size.** Revisit if the class grows past ~1000 lines or gains a new major concern (e.g., serialization). |
| 12.2 | Commented-out code | **fix recommended** | :714-786 — 73 lines of `inverseNormalCDF` and non-linear `inferValueFromOffset`. Dead code preserved in git history; no rationale comment explaining why it's kept. The active `inferValueFromOffset` at :789 supersedes it. Should be removed. Fix ticket: `fix/2-code-quality-cleanup.md` |
| 12.3 | `min2()` helper | **fix recommended** | :674 — `function min2(a, b) { return a < b ? a : b; }` used only in `edgeContribution()` at :683. Intended as a micro-optimization over `Math.min`, but V8 inlines `Math.min` for two numeric args. No measurable benefit; harms readability. Replace with `Math.min`. Fix ticket: `fix/2-code-quality-cleanup.md` |
| 12.4 | Prototype binding pattern | **fix recommended** | :687 — `(Sparstogram.prototype as any).edgeContribution = edgeContribution`. The class already has `private edgeContribution()` at :428 that delegates to the module function. The prototype override is redundant and prevents tree-shaking. The private method wrapper at :428 is sufficient — remove the prototype binding. Fix ticket: `fix/2-code-quality-cleanup.md` |
| 12.5 | Magic numbers | **fix recommended** | Three numeric constants lack names: `1e-9` (score epsilon, :403/:417), `1e-12` (density epsilon, :421), `0.5` (curvature averaging weight, :424). The `0.5` is a simple average and arguably self-documenting; the epsilons are not. Propose named constants: `SCORE_EPSILON = 1e-9`, `DENSITY_EPSILON = 1e-12`. Fix ticket: `fix/2-code-quality-cleanup.md` |
| 12.6 | Error handling inconsistency | done | Pattern: methods that can meaningfully return a default on empty data (`rankAt` → 0, `countAt` → 0) do so; methods that require data to produce a valid result (`valueAt`, `markerAt`) throw. This is a **deliberate design choice** — documented in R4 (4.12). `peaks()` yields nothing on insufficient data. The split is consistent within its logic. **No fix needed.** |
| 12.7 | `peaks()` TODO comment | done | :317 — "TODO: replace these with ring buffers". `Array.shift()` is O(n) per call; with smoothing=3 the arrays are capped at 3 elements, so shift is O(1) in practice. Ring buffers would only matter for very large smoothing values. Already tracked in R6 (6.4) as a performance item. Not a code quality issue. |
| 12.8 | ESLint configuration | **fix recommended** | **No `eslint.config.js` exists.** ESLint 9.27.0 and `@typescript-eslint/*` are installed as devDependencies but completely unenforced — running `npx eslint` fails with "couldn't find config file". No `npm run lint` script exists either. Plan ticket: `plan/2-eslint-setup.md` |
| 12.9 | `result` variable in `peaks()` | **fix recommended** | :319 — `const result: Peak[] = [];` declared but never used. The generator yields peaks directly. Dead code. Fix ticket: `fix/2-code-quality-cleanup.md` |
| 12.10 | `let` vs `const` in `peaks()` | **fix recommended** | :317-318 — `let left = new Array<Centroid>();` and `let right = new Array<Centroid>();`. Neither `left` nor `right` is ever reassigned; array contents are mutated via `.push()`/`.shift()` but the references are stable. Should be `const`. Fix ticket: `fix/2-code-quality-cleanup.md` |
| 12.11 | `getPriorScore` vs `updateNextScore` naming | done | :392/:406 — "get" vs "update" suggests different side-effect profiles, but both are pure computations (no mutations). Naming inconsistency. However, renaming these methods touches the loss-score key mismatch area (R3, 3.2-3.5) which has a pending critical fix. **Defer renaming** until after `fix/4-loss-score-key-mismatch.md` is resolved to avoid merge conflicts. |
| 12.12 | `for (let path of ...)` in `peaks()` | done | :322 — `let` is correct here; `path` is reassigned by the for-of loop on each iteration. No change needed. |

**Follow-up tickets:**
- `fix/2-code-quality-cleanup.md` — Remove commented-out code (:714-786), remove dead `result` variable in `peaks()`, `let` → `const` for `left`/`right` in `peaks()`, replace `min2()` with `Math.min`, remove prototype binding at :687, extract named constants for epsilon values
- `plan/2-eslint-setup.md` — Create `eslint.config.js` with TypeScript rules, add `lint` script to package.json

---

## Summary of Critical Findings

| Priority | Finding | Ticket | Item |
|----------|---------|--------|------|
| **High** | `add(NaN)` corrupts B+Tree index — no input validation | R10 | 10.1 |
| **High** | `mergeFrom(self)` causes iterator invalidation during mutation | R10 | 10.10 |
| **High** | `normalCDF()` with variance=0 produces NaN (affects `interpolateCentroids`) | R2 | 2.2, 2.5 |
| **High** | `Criteria` validation allows 2-of-3 fields (should reject) | R4 | 4.4 |
| **Medium** | `valueAt(0)` produces negative offset (-1) | R10 | 10.6 |
| **Medium** | `compressOneBucket()` recursive retry has no depth limit | R3 | 3.3 |
| **Medium** | `Quantile` type not exported — consumers can't type return values | R4, R9 | 4.8, 9.2 |
| **Medium** | Loss index float equality comparison may cause non-determinism | R1 | 1.6 |
| **Medium** | No CI/CD pipeline — risk of publishing broken builds | R8 | 8.5 |
| **Low** | ~70 lines of commented-out code (inverseNormalCDF) | R12 | 12.2 |
| **Low** | `peaks()` has dead `result` variable and `let` → `const` issues | R12 | 12.9, 12.10 |
| **Low** | `doc/figures/` images not referenced in README | R7 | 7.7 |
| **Low** | No test coverage for NaN, Infinity, stress scenarios | R5 | 5.1, 5.3 |
| **Low** | 12 npm audit advisories in dev transitive deps (0 runtime) | R11 | 11.4 |
| **Low** | `digitree` 1.4.0 installed, 1.4.6 available (semver-minor) | R11 | 11.2 |
| ~~**Low**~~ | ~~`ts-node --loader` deprecated in Node.js 22+~~ (done) | R11 | 11.7 |

---

## Recommended Priority Order

1. **R10 + R2** — Fix critical edge cases (NaN guard, variance=0 in interpolation, mergeFrom(self))
2. **R4** — Fix Criteria validation bug; export Quantile type
3. **R3** — Add recursion depth limit to compression retry
4. **R5** — Expand test suite to cover identified gaps
5. **R1** — Deep-verify curvature scoring math against reference formulations
6. **R12** — Clean up commented-out code, dead variables, magic numbers
7. **R8** — Add CI/CD pipeline; verify package contents
8. **R7** — Documentation accuracy pass; reference figures; add CHANGELOG
9. **R6** — Add benchmarks; optimize peaks() ring buffers
10. **R9** — Type export completeness; Criteria redesign
11. **R11** — Dependency audit and health check (completed — no blocking issues; `digitree` actively maintained, zero runtime vulnerabilities, all audit findings in dev transitive deps)
