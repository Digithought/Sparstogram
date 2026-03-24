description: Verify centroid index and loss index stay synchronized under all mutation paths
dependencies: none
files: src/sparstogram.ts (insertOrIncrementBucket :431, compressOneBucket :538, updateNext :526, add :152, append :166, mergeFrom :188)
----
The dual B+Tree design (centroids by value, losses by score) is the core invariant. Review all mutation paths for consistency.

Known concerns:

- `compressOneBucket()` stale entry retry at :542-570 — recursive with no depth limit; could stack overflow if many stale entries accumulate (e.g. after a large batch merge)
- `_losses.find(entry)` in `updateNext()` at :533 — matches by the old entry object; if the loss was already updated in an earlier step of the same operation, find may fail to locate the correct entry
- Iterator invalidation — `ascending()`/`descending()` yield lazily from B+Tree paths; if `add()` is called during iteration, tree mutations invalidate paths; this is not documented

Items to verify:

- Insert path at :455-477 — new centroid: inserts loss entry, updates next's loss via updateNext; verify all affected neighbors updated
- Update (increment existing) path at :433-449 — updates loss at old key position via `_losses.find(entry)`; relies on digitree find semantics (comparator-based, not reference equality); verify this works
- Merge path in `compressOneBucket()` at :600-612 — deletes two old centroids and two old loss entries, inserts one new; verify no orphaned loss entries remain
- `mergeFrom()` batch compression at :193-198 — inner loop batches by maxCentroids/4; confirm each compressOneBucket call sees consistent state
- `maxCentroids` setter at :120 — while loop compressing; verify each iteration leaves indices consistent

Output: findings into doc/assessment.md; follow-up fix/ tickets for recursion limit and iterator safety.

TODO
- Trace insert path: verify all loss index updates for a 5-centroid histogram
- Trace compress path: verify no orphaned entries after merge
- Test stale entry accumulation scenario — many rapid inserts then compress
- Add recursion depth counter to compressOneBucket retry path
- Document iterator invalidation behavior in JSDoc
- Document findings in doc/assessment.md
