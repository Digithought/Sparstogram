description: mergeFrom(self) now throws to prevent iterator invalidation
dependencies: none
files: src/sparstogram.ts (mergeFrom at :194), src/sparstogram.test.ts (:786-793)
----
## Summary

Added a self-merge guard at the top of `mergeFrom()` that throws when `other === this`.
This prevents iterator invalidation caused by mutating the B+Tree while iterating it.

## Changes

- `src/sparstogram.ts:194-196` — `if (other === this) throw new Error("Cannot merge a histogram into itself")`
- `src/sparstogram.test.ts:786-793` — test asserting `mergeFrom(self)` throws with expected message

## Use cases for testing / validation

- Calling `s.mergeFrom(s)` should throw `"Cannot merge a histogram into itself"`
- The histogram state should be unchanged after the rejected self-merge
- Normal `mergeFrom(other)` where `other !== this` should still work as before
- All 149 tests pass
