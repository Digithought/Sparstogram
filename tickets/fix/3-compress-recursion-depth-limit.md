description: Convert compressOneBucket stale-entry retry from recursion to iterative loop with depth limit
dependencies: fix/4-loss-score-key-mismatch.md (fixing the key mismatch will reduce stale entries, but this is still needed as defense-in-depth)
files: src/sparstogram.ts (compressOneBucket :538)
----
## Problem

`compressOneBucket()` retries recursively when it encounters stale entries in `_losses`:
- :549 — centroid no longer exists
- :560 — centroid is first (no prior)
- :570 — prior entry vanished

Each retry cleans one stale entry. For large merges (`mergeFrom` with thousands of centroids), stale
entries can accumulate to O(N), causing O(N) recursion depth. JavaScript's default stack limit is
~10K-25K frames; exceeding this causes a stack overflow crash.

## Fix

Convert the three recursive `return this.compressOneBucket()` calls to a `while` loop:

```typescript
private compressOneBucket(): number {
    while (true) {
        const minLossPath = this._losses.first();
        // ... existing logic ...
        if (!minPath.on) {
            this._losses.deleteAt(minLossPath);
            continue; // was: return this.compressOneBucket()
        }
        // ... etc for other stale checks ...
        // If we reach here, proceed with merge
        break;
    }
    // ... merge logic ...
}
```

TODO
- Refactor compressOneBucket to use iterative loop instead of recursion
- Add a safety counter (e.g., max 1000 retries) that throws a descriptive error
- Add test: merge 5000-centroid histogram into maxCentroids=5 without stack overflow
