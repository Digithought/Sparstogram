description: Fixed CentroidEntry.loss to store curvature-aware score so _losses.find() matches stored keys
files: src/sparstogram.ts (CentroidEntry, insertOrIncrementBucket, updateNext, compressOneBucket), src/sparstogram.test.ts
----
## What was built

Fixed a key mismatch between `CentroidEntry.loss` and the `_losses` B+Tree keys. Previously
`CentroidEntry.loss` stored the raw base loss while `_losses` was keyed by the curvature-aware
score (`baseLoss * (eps + curvature)`), so `_losses.find(entry)` always failed for non-first
centroids. This caused `updateAt`/`deleteAt` to silently no-op, leading to stale/orphaned entries
and a potential stack overflow from recursive retry in `compressOneBucket`.

### Changes
- **CentroidEntry.loss** now stores the curvature-aware score (matching `_losses` keys)
- All mutation paths updated: `insertOrIncrementBucket` (existing & new bucket), `updateNext`, `compressOneBucket`
- Placeholder `loss: Infinity` used during insert, then real score computed after insertion (when neighbors are available)
- `compressOneBucket` returns `computeLoss(priorEntry, minEntry)` (base loss) for API compatibility
- `getPriorLoss` removed (dead code)
- Defensive retry loop in `compressOneBucket` with 1000-iteration bound retained as safety net

## Testing notes
- 182 tests pass, TypeScript and ESLint clean
- Key test suites:
  - **Dual-Index Consistency** — validates `_losses`/`_centroids` sync through insert, update, compress, merge
  - **loss-score key mismatch — stale entry detection** — exercises the fixed path with insert-update-compress cycles
  - **compression quality — uniform distribution** — confirms balanced merge behavior with correct scoring
  - **compression quality — bimodal distribution preserves modes** — confirms curvature-awareness preserves peaks
  - **compressOneBucket returns base loss not score** — ensures API returns base loss, not internal score
  - Stress tests at 100K scale pass within timeouts

## Usage
Transparent to API consumers. `add()` and `append()` return base pair loss. Internal index synchronization
is now correct, eliminating stale entries and stack overflow risk.
