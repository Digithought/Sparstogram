description: Redesign Criteria.quantile to accept number (0-1) instead of full Quantile object
dependencies: 3-export-quantile-strip-loss (implement)
files: src/sparstogram.ts, src/sparstogram.test.ts
----

### Problem

`Criteria.quantile` requires a full `Quantile` object, but `criteriaToPath` (line 641) only reads
`criteria.quantile.centroid.value`. This is inconsistent with `quantileAt(number)` which accepts
a plain number (0-1).

Consumers must do `{ quantile: sparstogram.quantileAt(0.5) }` when `{ quantile: 0.5 }` would be
more ergonomic and consistent.

### Options

**Option A — Change type to `number`**: `quantile?: number` (0-1), internally call `quantileAt()`
in `criteriaToPath`. Clean, consistent, but a breaking change if any consumer passes a `Quantile`
object today.

**Option B — Union type**: `quantile?: number | Quantile`, accepting both. Non-breaking, but adds
complexity and the `Quantile` path is harder to justify keeping.

**Option C — Deprecate**: Keep `Quantile` overload, add separate `quantileValue?: number` field,
deprecate `quantile` field. Non-breaking, but clutters the interface.

### Questions to resolve

- Is there any known consumer that passes a `Quantile` object to `Criteria.quantile`?
- Should this wait for a major version bump (v1.0)?
- Does the project prefer breaking changes with semver, or deprecation-first?

### Impact

This is a breaking change (under Options A) or an API addition (Options B/C).
The version is 0.9.5 (pre-1.0), which may make breaking changes more acceptable under semver.
