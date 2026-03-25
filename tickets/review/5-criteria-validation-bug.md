description: Review Criteria mutual exclusion fix — field-count validation replaces AND check
dependencies: none
files: src/sparstogram.ts (criteriaToPath at :626-636), src/sparstogram.test.ts
----
## Summary

Fixed `criteriaToPath()` which only rejected criteria when **all three** fields (markerIndex, value, quantile) were specified. Two-of-three combinations were silently accepted with precedence-based selection.

### What changed

**src/sparstogram.ts** — `criteriaToPath()` (line 626):
- Replaced the `&&` check (`markerIndex && value && quantile`) with a field-count approach
- Counts defined fields; throws if count > 1 or count === 0
- Error messages unchanged

**src/sparstogram.test.ts** — Three areas updated:
1. **3 BUG tests converted to expect throws** (`Criteria validation — 2-of-3 rejection`):
   - `rejects value + markerIndex`
   - `rejects value + quantile`
   - `rejects markerIndex + quantile`
2. **Existing `should not allow invalid criteria` test** updated to construct a sparstogram WITH markers (`[0.5]`), so it tests validation logic rather than accidentally passing via `markerAt()` throwing "Invalid marker"

## Use cases for testing / validation

- Pass two of three Criteria fields to `ascending()` or `descending()` — should throw
- Pass all three — should throw (regression)
- Pass exactly one field — should work as before
- Pass empty object `{}` — should throw (no field specified)
- Existing iterator tests (ascending/descending with single criteria) should be unaffected

## Test results

All 145 tests pass.
