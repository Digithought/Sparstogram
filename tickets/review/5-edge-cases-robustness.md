description: Systematically verify behavior at boundaries and with degenerate inputs
dependencies: none
files: src/sparstogram.ts, src/sparstogram.test.ts
----
Evaluate all public methods for correctness at boundary conditions and with adversarial inputs.

Known high-priority concerns from initial assessment:

- `add(NaN)` — no validation; NaN breaks B+Tree ordering (comparisons always false), corrupts index silently
- `add(Infinity)` / `add(-Infinity)` — no validation; Infinity is orderable but erf() and density calculations may produce unexpected results
- `mergeFrom(self)` — iterates `self.ascending()` while mutating self via `insertOrIncrementBucket()` — iterator invalidation
- `valueAt(0)` — `Math.abs(0)` = 0; first centroid has count >= 1, so `0 <= count` is true; returns offset=-1 — negative offset passed to `inferValueFromOffset()`
- `quantileAt(-0.1)` / `quantileAt(1.1)` — silently clamped via `max(1, ...)` / `min(count, ...)`; no error thrown; may surprise users

Additional items to verify:

- Same value added 10K times — count accumulates correctly? variance stays 0?
- Reduce `maxCentroids` below `centroidCount` — batch compression
- `rankAt()` / `countAt()` on empty histogram
- `peaks()` with 0, 1, 2 centroids
- `append()` with count=0 or variance<0 (validation exists — confirm)
- Very large counts (>2^53) — integer precision

Output: findings into doc/assessment.md; follow-up fix/ tickets for each confirmed bug.

TODO
- Test add(NaN) — confirm index corruption, write guard
- Test add(Infinity), add(-Infinity) — characterize behavior
- Test mergeFrom(self) — confirm iterator invalidation
- Test valueAt(0) — confirm negative offset bug
- Test quantileAt out-of-range — decide: throw or clamp with documentation
- Test same-value accumulation at scale
- Test maxCentroids reduction below centroidCount
- Test empty histogram across all query methods
- Test peaks() with minimal centroid counts
- Document all findings in doc/assessment.md
