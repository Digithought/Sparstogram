description: Document iterator invalidation behavior on ascending()/descending() methods
dependencies: none
files: src/sparstogram.ts (ascending :369, descending :380), README.md (:531)
----
## Summary

Added JSDoc `@remarks` annotations to `ascending()` and `descending()` warning that mutating the
histogram during iteration (via `add()`, `append()`, `mergeFrom()`, or `maxCentroids` setter)
invalidates the iterator and may produce incorrect results or errors.

Added limitation #5 to the README's "Current Limitations" section documenting the same behavior.

## Changes Made

- `src/sparstogram.ts`: Added `@remarks` with `{@link}` references to mutating methods on both
  `ascending()` and `descending()` JSDoc blocks.
- `README.md`: Added item 5 under "Current Limitations" describing iterator invalidation.

## TODO
- Verify JSDoc renders correctly in generated docs (if typedoc is configured)
- Verify no test regressions
