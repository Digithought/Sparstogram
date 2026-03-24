description: Evaluate computational and memory efficiency, identify bottlenecks
dependencies: none
files: src/sparstogram.ts (add :152, compressOneBucket :538, peaks :316, mergeFrom :188)
----
Profile and analyze performance characteristics. No benchmarks currently exist in the repo.

Items to evaluate:

- `add()` hot path — ~2 B+Tree lookups + 1-2 loss updates + possible compression; O(log n); profile actual cost at various centroid counts
- `compressOneBucket()` stale entry scanning — recursive retry; worst case O(s * log n) where s = stale entries; no amortized bound proven
- Memory per centroid — CentroidEntry (4 fields) + B+Tree overhead + Loss entry (2 fields) + B+Tree overhead; estimate actual bytes
- `peaks()` at :317 — uses Array.shift() which is O(n); combined with the iteration loop this makes peaks O(n * smoothing); TODO comment says "replace with ring buffers"
- `mergeFrom()` batch compression — batch size = maxCentroids/4; total ~ O(m log n); confirm no quadratic behavior
- `_losses.find(entry)` — comparator-based B+Tree lookup; O(log n); verify not accidentally O(n)
- Prototype binding at :687 — `(Sparstogram.prototype as any).edgeContribution = edgeContribution`; prevents tree-shaking of the class in bundlers
- `min2()` helper at :674 — reimplements Math.min for 2 args; micro-optimization; benchmark whether measurable

Comparisons (informational, not blocking):

- How does Sparstogram compare to t-digest, DDSketch for same accuracy/memory budget?
- What's the practical sweet spot for maxCentroids?

Output: findings into doc/assessment.md; follow-up plan/ tickets for benchmarks and peaks() optimization.

TODO
- Profile add() at maxCentroids = 50, 500, 5000
- Measure memory per centroid at various scales
- Benchmark peaks() with large centroid count + small smoothing
- Test mergeFrom() with two large histograms — confirm linear not quadratic
- Evaluate min2() vs Math.min in a microbenchmark
- Document findings in doc/assessment.md
