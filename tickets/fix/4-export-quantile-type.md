description: Export Quantile (and Marker) interfaces so consumers can type return values
dependencies: none
files: src/sparstogram.ts (:32-45), dist/sparstogram.d.ts
----
## Problem

`Quantile` is the return type of `valueAt()`, `quantileAt()`, and `markerAt()`, but it is not
exported. Consumers see the structural type via inference but cannot name it in their own type
annotations:

```typescript
// Consumer code — this fails:
import { Sparstogram, Quantile } from 'sparstogram';  // Error: Quantile not exported
const q: Quantile = hist.valueAt(1);  // Cannot name the type
```

The `d.ts` confirms: `interface Quantile extends Marker` has no `export` keyword.

`Marker` is also non-exported but is only used internally and as a base for `Quantile`. Exporting
`Marker` too would give full type coverage, but is optional.

## Fix

Add `export` to the `Quantile` interface declaration at line 42:
```typescript
export interface Quantile extends Marker {
```

Optionally also export `Marker` at line 32.

## Additional consideration: Criteria.quantile ergonomics

`Criteria.quantile` is typed as `Quantile`, requiring a full object. This is inconsistent with
`quantileAt(number)` which takes a plain 0-1 number. Consider changing `Criteria.quantile` to
accept `number` (quantile value) instead of the full `Quantile` object. This would make the API
more consistent and ergonomic. If changed, update `criteriaToPath` to call `quantileAt()` internally.

## TODO
- Add `export` keyword to `Quantile` interface (and optionally `Marker`)
- Rebuild to verify `dist/sparstogram.d.ts` reflects the export
- Evaluate and optionally change `Criteria.quantile` type from `Quantile` to `number`
- If Criteria.quantile changes, update criteriaToPath and any tests using quantile criteria
