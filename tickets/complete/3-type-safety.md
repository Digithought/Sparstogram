description: Audit TypeScript usage for type safety, exported type completeness, and strictness
files: src/sparstogram.ts, dist/sparstogram.d.ts, doc/assessment.md
----
## Summary

Reviewed TypeScript type system usage across the public API surface and internal implementation.
Build passes, all 145 tests pass.

## Findings (doc/assessment.md §R9)

| Item | Verdict |
|------|---------|
| `as any` prototype binding (:687) | Acceptable — only cast; redundant with private method; fragile but functional |
| `Quantile` not exported | **Improvement needed** — consumers can't name the return type of `valueAt`/`quantileAt`/`markerAt` |
| `Marker` not exported | OK — internal only |
| `CentroidEntry.loss` leaks through iterators | **Confirmed bug** — runtime objects include `loss` field not in declared `Centroid` type |
| `Criteria.quantile` typed as `Quantile` | **Improvement needed** — only `.centroid.value` is used; `number` would be more ergonomic |
| `_markers` double-optional | OK — both levels handled correctly |
| `markers` constructor param public | OK — frozen after construction |
| Strict null checks / `!` assertions | OK — all 35 assertions guarded by `.on` checks or equivalent logic |
| `append()` return type | Minor — inferred correctly as `number`; should be explicit |

## Follow-up

- `tickets/plan/3-export-quantile-strip-centroidentry.md` — export `Quantile`, strip `CentroidEntry.loss`, evaluate `Criteria.quantile` redesign

## Testing

No new tests needed for review-only ticket. Existing test suite covers the confirmed behaviors:
- "BUG: iterators expose internal loss field on centroids" confirms CentroidEntry leak
- Criteria 2-of-3 rejection tests confirm validation gap (covered by api-surface ticket)
