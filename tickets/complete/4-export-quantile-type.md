description: Export Quantile and Marker interfaces so consumers can name return types
dependencies: none
files: src/sparstogram.ts (:33, :43), dist/sparstogram.d.ts (:15, :24), src/sparstogram.test.ts (:1700-1717)
----
## What was built

Added `export` keyword to `Marker` and `Quantile` interfaces in `src/sparstogram.ts`.
These are the return types of `valueAt()`, `quantileAt()`, and `markerAt()` but were
previously not exported, preventing consumers from naming them in type annotations.

## Key files

- `src/sparstogram.ts`: `export interface Marker` (line 33), `export interface Quantile extends Marker` (line 43)
- `dist/sparstogram.d.ts`: Both interfaces now appear with `export` in the declaration output

## Testing

- Test "Quantile and Marker type exports" (line 1700) verifies both types work as explicit
  type annotations on return values of `valueAt()` and `quantileAt()`
- All 182 tests pass, build succeeds with no errors

## Usage

```typescript
import { Sparstogram, Quantile, Marker } from 'sparstogram';

const hist = new Sparstogram(10);
hist.add(42);

const q: Quantile = hist.valueAt(1);  // rank, centroid, offset, value
const m: Marker = hist.quantileAt(0.5); // rank, centroid, offset
```
