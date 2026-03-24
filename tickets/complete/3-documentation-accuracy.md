description: Documentation accuracy review — cross-checked README formulas, usage examples, JSDoc, figures, and constraints against implementation
files: readme.md, src/sparstogram.ts, doc/figures/complex-diagram.jpg, doc/figures/simple-diagram.jpg, doc/assessment.md
----

## What was reviewed

Full cross-check of all documentation (README, JSDoc) against the current implementation (`src/sparstogram.ts`).

## Key findings

1. **All README formulas match code** — curvature, score, baseLoss, tightnessJ, combinedVariance, normalCDF/density all verified correct. Minor omission: README density formula doesn't show the `1e-12` epsilon guard (implementation detail, acceptable).

2. **All README usage examples are correct** — six code blocks verified against current API signatures and return types.

3. **Broken image link** — README line 11 references `doc/complex-diagram.jpg` but file is at `doc/figures/complex-diagram.jpg`. `simple-diagram.jpg` exists but is unreferenced.

4. **Missing @throws JSDoc** — `valueAt()`, `markerAt()`, `maxCentroids` setter, and `append()` all throw but lack `@throws` annotations.

5. **Incomplete limitations section** — Missing: NaN handling, no serialization API, iterator invalidation, `mergeFrom(self)` broken.

6. **mergeFrom() caveats undocumented** — Marker behavior during merge, self-merge bug, non-commutativity not mentioned.

7. **ESM-only nature and Node.js >=16.11 requirement undocumented**.

8. **Time-window aggregation section is fine** — presented as a usage pattern, not a feature claim.

9. **Complexity claims accurate** — O(log n) for add/query, O(1) for markerAt, O(m log n) for mergeFrom all verified.

10. **Score formula prose contradicts formula** — already tracked in `fix/5-inverted-curvature-score-formula.md`.

## Testing

- 131 tests passing
- Build succeeds cleanly

## Follow-up

- `fix/3-documentation-corrections.md` — all actionable documentation fixes consolidated into one ticket
- Assessment updated in `doc/assessment.md` section R7
