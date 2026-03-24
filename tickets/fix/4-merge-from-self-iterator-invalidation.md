description: mergeFrom(self) mutates tree while iterating own ascending() — iterator invalidation
dependencies: none
files: src/sparstogram.ts (mergeFrom at :188-199), src/sparstogram.test.ts
----
## Bug

`mergeFrom(other)` iterates `other.ascending()` while calling `insertOrIncrementBucket()` on `this`.
When `other === this`, the iterator is traversing the same B+Tree that is being mutated. This is
classic iterator invalidation — the B+Tree's internal paths become stale after insertions.

Observed behavior: the count is doubled (because `mergeFrom` adds `other.count` to `this._count`
at the start, and `other.count === this.count`), but the centroid data may be inconsistent due
to the tree being mutated during iteration.

## Reproducing tests

In `Edge Cases & Robustness > mergeFrom(self)`:
- `BUG: self-merge mutates while iterating — iterator invalidation`

## Fix options

**Option A (recommended):** Guard against self-merge at the start of `mergeFrom()`:
```typescript
mergeFrom(other: Sparstogram) {
    if (other === this) {
        throw new Error("Cannot merge a histogram into itself");
    }
    // ... existing logic
}
```

**Option B:** Snapshot the centroids before iterating:
```typescript
mergeFrom(other: Sparstogram) {
    const centroids = [...other.ascending()]; // snapshot
    this._count += other.count;
    for (const centroid of centroids) {
        this.insertOrIncrementBucket(centroid);
    }
    // ... compression
}
```

Option A is simpler and makes the error explicit. Option B handles self-merge but changes
semantics (effectively doubles all counts). Recommend Option A unless there's a use case for self-merge.

After fixing, update the BUG test to expect a throw (Option A) or verify correct doubling (Option B).

## TODO
- Add self-merge guard at the top of `mergeFrom()` at :188
- Update the self-merge test to expect a throw
- Verify all tests pass
