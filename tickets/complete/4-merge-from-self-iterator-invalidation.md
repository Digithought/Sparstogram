description: mergeFrom(self) throws to prevent iterator invalidation
files: src/sparstogram.ts (:199-202), src/sparstogram.test.ts (:785-795)
----
## What was built

A self-merge guard at the top of `mergeFrom()` that throws `"Cannot merge a histogram into itself"` when `other === this`. This prevents iterator invalidation caused by mutating the B+Tree while iterating it during the merge loop.

## Key files

- `src/sparstogram.ts:199-202` — guard: `if (other === this) throw new Error(...)`
- `src/sparstogram.test.ts:785-795` — test verifying throw and state preservation

## Testing notes

- Self-merge throws with the expected error message
- Histogram state (count, centroidCount) is verified unchanged after the rejected self-merge
- Normal `mergeFrom(other)` continues to work (covered by extensive existing test suite)
- All 182 tests pass, no type errors in source files

## Review notes

- Guard is at the top of the method, before any mutation — guarantees no side effects on throw
- Identity check (`===`) is the correct, minimal approach — O(1), no false positives
- Added state-preservation assertions to the test during review
