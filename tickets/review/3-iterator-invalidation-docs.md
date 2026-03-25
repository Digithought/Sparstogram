description: Document iterator invalidation behavior on ascending()/descending() methods
dependencies: none
files: src/sparstogram.ts (ascending :378, descending :390), README.md (:543)
----
## Summary

Added JSDoc `@remarks` annotations to `ascending()` and `descending()` warning that mutating the
histogram during iteration (via `add()`, `append()`, `mergeFrom()`, or `maxCentroids` setter)
invalidates the iterator and may produce incorrect results or errors.

Added limitation #5 to the README's "Current Limitations" section documenting the same behavior.

## Changes

- `src/sparstogram.ts:376`: `@remarks` with `{@link}` references on `ascending()` JSDoc.
- `src/sparstogram.ts:388`: `@remarks` with `{@link}` references on `descending()` JSDoc.
- `README.md:543`: Limitation #5 describing iterator invalidation behavior.

## Validation

- All 155 tests pass — no regressions.
- Build succeeds (`npm run build`).
- Typedoc generates correctly (`npm run doc`) — `@remarks` sections render with properly resolved `{@link}` cross-references to `add`, `append`, `mergeFrom`, and `maxCentroids`.

## Review Checklist

- Verify JSDoc wording is clear and accurate for API consumers.
- Confirm README limitation #5 is consistent with the JSDoc remarks.
- Existing test `ascending/descending iterators are lazy generators` covers the documented behavior.
