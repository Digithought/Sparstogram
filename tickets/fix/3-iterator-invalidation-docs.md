description: Document iterator invalidation behavior on ascending()/descending() methods
dependencies: none
files: src/sparstogram.ts (ascending :357, descending :367)
----
## Problem

`ascending()` and `descending()` are lazy generators that yield from digitree B+Tree paths. If
the tree is mutated during iteration (via `add()`, `append()`, `mergeFrom()`, or `maxCentroids` setter),
internal path references may become invalid, producing undefined behavior.

This is not documented anywhere — no JSDoc warning, no README caveat.

Already manifests in `mergeFrom(self)` (tracked in `fix/4-merge-from-self-iterator-invalidation.md`).

## Fix

Add JSDoc `@remarks` or `@throws` annotations to both iterator methods warning that tree mutation
during iteration invalidates the iterator and may produce incorrect results or errors.

TODO
- Add JSDoc warning to `ascending()` about iterator invalidation during mutation
- Add JSDoc warning to `descending()` about iterator invalidation during mutation
- Add a note in README limitations section about iterator safety
