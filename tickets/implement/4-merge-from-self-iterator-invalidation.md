description: mergeFrom(self) now throws to prevent iterator invalidation
dependencies: none
files: src/sparstogram.ts (mergeFrom at :194), src/sparstogram.test.ts (:786-796)
----
## Summary

Added a self-merge guard at the top of `mergeFrom()` that throws when `other === this`.
This prevents iterator invalidation caused by mutating the B+Tree while iterating it.

Updated the existing BUG test to assert the throw with the message
`"Cannot merge a histogram into itself"`.

## Changes

- `src/sparstogram.ts:194-196` — added `if (other === this) throw` guard
- `src/sparstogram.test.ts:786-796` — replaced BUG-documenting test with clean assertion

## Testing

- All 144 tests pass
- The `mergeFrom(self)` test now verifies the throw directly
