description: Fix Criteria mutual exclusion — only rejects all-three, allows two-of-three
dependencies: none
files: src/sparstogram.ts (criteriaToPath at :623-636), src/sparstogram.test.ts
----
## Bug

`criteriaToPath()` at line 625 only throws when **all three** Criteria fields are specified:

```typescript
if (criteria.markerIndex !== undefined && criteria.value !== undefined && criteria.quantile) {
```

When two of three are provided (e.g. `{value: 15, markerIndex: 0}`), one is silently picked by
precedence order (markerIndex > quantile > value). This violates the documented intent of mutual exclusion.

### Existing test gives false confidence

The test at `sparstogram.test.ts:604` tests `{value: 15, markerIndex: 0}` on a sparstogram
constructed **without markers**. It passes because `markerAt(0)` throws "Invalid marker", not
because the criteria validation catches the two-field case.

## Reproducing tests

Three tests added in `API Surface Review > Criteria validation — 2-of-3 rejection`:
- `BUG: value + markerIndex does not throw (should reject)` — currently documents the bug
- `BUG: value + quantile does not throw (should reject)`
- `BUG: markerIndex + quantile does not throw (should reject)`

After fixing, update these tests to `expect(...).to.throw()`.

## Fix

Replace the single all-three check with a count of defined fields:

```typescript
const fieldCount = (criteria.markerIndex !== undefined ? 1 : 0)
    + (criteria.value !== undefined ? 1 : 0)
    + (criteria.quantile !== undefined ? 1 : 0);
if (fieldCount > 1) {
    throw new Error("Only one of markerIndex, value, or quantile can be specified as criteria");
}
if (fieldCount === 0) {
    throw new Error("Either markerIndex, value, or quantile must be specified as criteria");
}
```

## TODO
- Replace the AND check at :625 with field-count logic
- Update the three BUG tests to expect throws
- Update the existing test at :604 to use a sparstogram WITH markers (so it tests validation, not markerAt)
- Verify all 66+ tests pass
