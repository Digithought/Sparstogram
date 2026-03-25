description: Export Quantile and Marker interfaces so consumers can name return types
dependencies: none
files: src/sparstogram.ts (:32-45), dist/sparstogram.d.ts, src/sparstogram.test.ts
----
## Problem

`Quantile` is the return type of `valueAt()`, `quantileAt()`, and `markerAt()`, but neither
`Quantile` nor its base `Marker` are exported. Consumers see the structural type via inference
but cannot name it in their own type annotations:

```typescript
import { Sparstogram, Quantile } from 'sparstogram';  // Error: Quantile not exported
const q: Quantile = hist.valueAt(1);  // Cannot name the type
```

Confirmed in `dist/sparstogram.d.ts`: both `interface Marker` (line 15) and `interface Quantile`
(line 24) lack the `export` keyword, while `Centroid`, `Peak`, and `Criteria` are all exported.

Since `Quantile extends Marker`, and `Marker` is referenced in `Quantile`'s type hierarchy,
`Marker` should also be exported for full type coverage.

## Fix

In `src/sparstogram.ts`:
- Line 32: change `interface Marker {` → `export interface Marker {`
- Line 42: change `interface Quantile extends Marker {` → `export interface Quantile extends Marker {`

## Verification

- Rebuild (`npm run build`) and confirm `dist/sparstogram.d.ts` shows `export interface Marker`
  and `export interface Quantile`
- Add a compile-time test: import `Quantile` and `Marker` by name and use them in type annotations
- Run existing tests to confirm no regressions

## Note

The `Criteria.quantile` ergonomics concern (changing type from `Quantile` to `number`) is already
tracked in `tickets/plan/3-export-quantile-strip-centroidentry.md` (Phase 3) and is out of scope
for this fix.

## TODO
- Add `export` keyword to `Marker` interface (line 32)
- Add `export` keyword to `Quantile` interface (line 42)
- Add test verifying `Quantile` and `Marker` can be imported and used as type annotations
- Rebuild and verify `dist/sparstogram.d.ts` reflects both exports
- Run full test suite to confirm no regressions
