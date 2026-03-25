description: Criteria mutual exclusion fix — field-count validation replaces AND check
dependencies: none
files: src/sparstogram.ts (criteriaToPath at :641-657), src/sparstogram.test.ts
----
## What was built

Fixed `criteriaToPath()` which only rejected criteria when **all three** fields (markerIndex, value, quantile) were specified simultaneously (AND check). Two-of-three combinations were silently accepted with precedence-based selection.

### Implementation

Replaced the `&&` guard with a field-count approach:
- Counts defined fields (`!== undefined`) for markerIndex, value, quantile
- Throws if count > 1 (multiple fields) or count === 0 (empty object)
- Error messages unchanged

## Key files

- **src/sparstogram.ts** — `criteriaToPath()` (lines 641-657)
- **src/sparstogram.test.ts** — validation tests at lines 601-687

## Testing notes

- **145 tests pass**, TypeScript compiles cleanly
- Dedicated `Criteria validation — 2-of-3 rejection` describe block covers all pairwise combos + all-three
- Empty `{}` rejection tested in "should not allow invalid criteria"
- Existing single-field happy-path tests (ascending/descending by value, markerIndex, quantile) unaffected

## Review observations

- Field-count approach is correct, minimal, and handles edge cases (falsy `0` for markerIndex/value via `!== undefined`)
- Quantile truthy check on line 653 is safe since Quantile is an object type
- No DRY, performance, or resource cleanup concerns — the validation is a trivial constant-time check
