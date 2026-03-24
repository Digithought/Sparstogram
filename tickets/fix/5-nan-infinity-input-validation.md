description: add(NaN) corrupts B+Tree; add(Infinity) breaks comparator and rankAt — need input validation
dependencies: none
files: src/sparstogram.ts (add at :152, append at :166, constructor comparator at :67), src/sparstogram.test.ts
----
## Bug

### NaN
`add(NaN)` silently inserts NaN into the B+Tree. Since `NaN < x` and `NaN > x` are both false,
the tree's ordering invariant is violated. The index is silently corrupted — subsequent queries
may return wrong results or NaN.

### Infinity
`add(Infinity)` or `add(-Infinity)` inserts into the tree (Infinity is orderable relative to
finite numbers). However, the B+Tree comparator `(a, b) => a - b` produces NaN when comparing
equal Infinity values (`Infinity - Infinity = NaN`), breaking `find()` for exact Infinity lookups.
This causes `rankAt(Infinity)` and `rankAt(-Infinity)` to return NaN because the find misses
the exact match and falls through to interpolation, where `erf()` arithmetic with Infinity
also produces NaN.

## Reproducing tests

In `Edge Cases & Robustness`:
- `add(NaN) > BUG: NaN corrupts the B+Tree — comparisons always false`
- `add(Infinity) > BUG: rankAt produces NaN for Infinity values — comparator returns NaN for Inf-Inf`

## Fix

Add a guard in `add()` and in the `append()` loop to reject non-finite values:

```typescript
add(value: number): number {
    if (!Number.isFinite(value)) {
        throw new Error("Value must be a finite number (NaN and Infinity are not supported)");
    }
    // ... existing logic
}
```

Also guard in `append()`:
```typescript
if (!Number.isFinite(centroid.value)) {
    throw new Error("Centroid value must be a finite number");
}
```

After fixing, update the BUG tests to expect throws.

## TODO
- Add `Number.isFinite()` guard in `add()` at :152
- Add `Number.isFinite()` guard in `append()` at :167 (after existing count/variance checks)
- Update NaN test to expect throw
- Update Infinity tests to expect throw
- Verify all tests pass
