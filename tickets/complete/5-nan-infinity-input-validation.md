description: add(NaN) and add(Infinity) now throw — input validation guards added
dependencies: none
files: src/sparstogram.ts (add at :152, append at :170), src/sparstogram.test.ts
----
## What was built

`Number.isFinite()` guards on both input boundaries to reject NaN, Infinity, and -Infinity:

- **`add(value)`** — throws `"Value must be a finite number (NaN and Infinity are not supported)"` before any state mutation.
- **`append(...centroids)`** — throws `"Centroid value must be a finite number"` per-centroid, checked before count/variance validation.

## Key files

- `src/sparstogram.ts` — guards at lines 153 and 171
- `src/sparstogram.test.ts` — edge-case tests under `add(NaN)`, `add(Infinity) and add(-Infinity)`, and `append() validation`

## Testing notes

All 148 tests pass. Coverage for this feature:

| Test | Verifies |
|------|----------|
| `add(NaN) throws` | Throws, count and centroidCount unchanged |
| `add(Infinity) throws` | Throws, count and centroidCount unchanged |
| `add(-Infinity) throws` | Throws, count and centroidCount unchanged |
| `append() with NaN value throws` | Throws, count and centroidCount unchanged |
| `append() with Infinity value throws` | Throws, count and centroidCount unchanged |
| `append() with -Infinity value throws` | Throws, count and centroidCount unchanged |
| Existing regression suite (142 tests) | Normal finite values unaffected |

## Review notes

- Guard placement is correct: in `add()`, the check is before `++this._count`, preventing state corruption on rejection.
- In `append()`, the finite check is ordered first among validation checks (before count and variance), which is the right priority.
- `Number.isFinite()` is the idiomatic single-check that covers all three cases (NaN, +Infinity, -Infinity).
- During review, three missing `append` NaN/Infinity tests were added to match the ticket's stated use cases.
