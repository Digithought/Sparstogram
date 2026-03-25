description: Document iterator invalidation behavior on ascending()/descending() methods
dependencies: none
files: src/sparstogram.ts (ascending :378, descending :390), README.md (:543)
----
## What was done

Added `@remarks` JSDoc annotations to `ascending()` and `descending()` warning that mutating the
histogram during iteration (via `add()`, `append()`, `mergeFrom()`, or `maxCentroids` setter)
invalidates the iterator and may produce incorrect results or errors.

Added limitation #5 to README's "Current Limitations" section documenting the same behavior with
additional context about lazy B+Tree path yielding.

## Key files

- `src/sparstogram.ts:376-379` — `ascending()` JSDoc with `@remarks` and `{@link}` references
- `src/sparstogram.ts:388-391` — `descending()` JSDoc with `@remarks` and `{@link}` references
- `README.md:543` — Limitation #5

## Testing

- 182 tests pass, no regressions.
- Build succeeds (`npm run build`).
- Existing tests cover the documented behavior:
  - "ascending/descending iterators are lazy generators" verifies generator consistency.
  - "self-merge throws to prevent iterator invalidation" verifies the runtime guard.

## Review notes

- JSDoc wording is clear and accurate for API consumers.
- README limitation #5 is consistent with JSDoc remarks, adds helpful "why" context (B+Tree paths).
- Pre-existing: `npm run doc` fails due to benchmark file type errors (unrelated to this ticket).
