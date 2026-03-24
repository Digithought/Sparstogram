description: Audit TypeScript usage for type safety, exported type completeness, and strictness
dependencies: 5-api-surface
files: src/sparstogram.ts, dist/sparstogram.d.ts
----
Review TypeScript type system usage for correctness and completeness of the public type surface.

Items to verify:

- `as any` at :687 — prototype binding `(Sparstogram.prototype as any).edgeContribution`; only cast; acceptable but fragile
- `Quantile` interface not exported — return type of valueAt(), quantileAt(), markerAt(); consumers see inferred structural type but can't name it
- `Marker` interface not exported — internal; Quantile extends Marker; OK since Marker is internal-only
- `CentroidEntry` leaks through iterators — ascending()/descending() declare `Centroid` return type but actual objects are CentroidEntry with extra `loss` field; consumers could access `.loss` without type support
- `Criteria.quantile` typed as `Quantile` — requires full Quantile object; would be more ergonomic as number (0-1), inconsistent with `quantileAt(number)`
- `_markers` double-optional — `(Marker | undefined)[] | undefined`; handled correctly in code
- `markers` constructor param is `public` — exposes as instance property; frozen; type is `number[] | undefined`
- Strict null checks enabled; `!` assertions used after `.at(path)` — safe because guarded by `.on` checks
- Return type annotations — most methods explicit; `append()` infers `number`; should be explicit
- Could discriminated unions improve the Criteria interface? (e.g. `{ type: 'marker', index: number } | { type: 'value', value: number }`)

Output: findings into doc/assessment.md; follow-up plan/ tickets for type improvements.

TODO
- Check dist/sparstogram.d.ts for exported types vs what consumers need
- Verify no internal types leak through public method signatures
- Evaluate Criteria redesign options
- Check all `!` assertions are preceded by `.on` guards
- Document findings in doc/assessment.md
