description: add(NaN) and add(Infinity) now throw — input validation guards added
dependencies: none
files: src/sparstogram.ts (add at :152, append at :170), src/sparstogram.test.ts
----
## Summary

Added `Number.isFinite()` guards to reject NaN, Infinity, and -Infinity at the input boundary:

- **`add(value)`** — throws `"Value must be a finite number (NaN and Infinity are not supported)"` if `!Number.isFinite(value)`.
- **`append(...centroids)`** — throws `"Centroid value must be a finite number"` if any centroid has a non-finite value (checked before count/variance validation).

## Use cases for testing/validation

1. `add(NaN)` throws and does not mutate the histogram (count and centroidCount unchanged).
2. `add(Infinity)` throws and does not mutate the histogram.
3. `add(-Infinity)` throws and does not mutate the histogram.
4. `append({ value: NaN, count: 1, variance: 0 })` throws.
5. `append({ value: Infinity, count: 1, variance: 0 })` throws.
6. Normal finite values continue to work as before (regression).

## Test status

All 144 tests pass, including the updated edge-case tests that now expect throws instead of documenting bugs.
