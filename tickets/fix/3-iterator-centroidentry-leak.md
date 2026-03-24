description: Strip internal CentroidEntry fields from iterator yields to match Centroid return type
dependencies: none
files: src/sparstogram.ts (ascending at :357-362, descending at :367-372), src/sparstogram.test.ts
----
## Problem

`ascending()` and `descending()` declare `IterableIterator<Centroid>` as their return type, but
yield the raw `CentroidEntry` objects from the B+Tree, which include an internal `loss` field.

Consumers can access `.loss` at runtime even though it's not in the declared type:
```typescript
for (const c of hist.ascending()) {
    console.log((c as any).loss);  // Works at runtime — internal field leaked
}
```

Test confirms: `Object.keys(c)` includes `'loss'` for all iterated centroids.

## Fix

Destructure out only the `Centroid` fields when yielding:

```typescript
*ascending(criteria?: Criteria): IterableIterator<Centroid> {
    const startPath = this.criteriaToPath(criteria) ?? this._centroids.first();
    for (const path of this._centroids.ascending(startPath)) {
        const { value, variance, count } = this._centroids.at(path)!;
        yield { value, variance, count };
    }
}
```

Same pattern for `descending()`.

**Tradeoff:** Creates a new object per yield. For most use cases (iterating centroids) the
allocation is negligible. If hot-path performance is a concern, could keep the leak and
document it, or provide a separate `rawAscending()` internal method.

## TODO
- Destructure Centroid fields in ascending() yield
- Destructure Centroid fields in descending() yield
- Update test `BUG: iterators expose internal loss field on centroids` to expect no loss field
- Verify all tests pass
