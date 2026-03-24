description: Systematically verified behavior at boundaries and with degenerate inputs
dependencies: none
files: src/sparstogram.ts, src/sparstogram.test.ts, doc/assessment.md
----
## Summary

Reviewed all public methods for correctness at boundary conditions and with adversarial inputs.
Added 29 new tests in `Edge Cases & Robustness` test suite (95 total tests, all passing).
Created 3 fix tickets for confirmed bugs.

## Confirmed Bugs (fix tickets created)

| Bug | Severity | Fix Ticket |
|-----|----------|------------|
| `add(NaN)` corrupts B+Tree — NaN comparisons always false | **High** | `fix/5-nan-infinity-input-validation.md` |
| `add(±Infinity)` breaks comparator (`Inf-Inf = NaN`) — `rankAt` returns NaN | **High** | `fix/5-nan-infinity-input-validation.md` |
| `mergeFrom(self)` — iterator invalidation during self-merge | **Medium** | `fix/4-merge-from-self-iterator-invalidation.md` |
| `valueAt(0)` produces offset=-1 (negative offset) | **Medium** | `fix/4-value-at-zero-negative-offset.md` |

## Verified Working (no action needed)

- Same value added 10K times: count, variance, and queries all correct
- `maxCentroids` reduction below `centroidCount`: batch compression works, count preserved
- `rankAt()`/`countAt()` on empty histogram: returns 0
- `valueAt()`/`quantileAt()` on empty histogram: throws "Rank out of range"
- `ascending()`/`descending()` on empty histogram: yields nothing
- `peaks()` with 0, 1, 2 centroids: behaves correctly per smoothing window
- `append()` with count=0 or variance<0: throws correctly
- `quantileAt(0)` and `quantileAt(1)`: returns first/last value correctly

## Design Decisions Documented (not bugs)

- `quantileAt(-0.1)`/`quantileAt(1.1)`: silently clamps to valid range. Tests document behavior.
- Very large counts (>2^53): integer precision lost. Test documents limitation.

## Testing

All 95 tests pass. TypeScript compilation clean.

## Key Files

- Tests: `src/sparstogram.test.ts` — `Edge Cases & Robustness` section
- Assessment: `doc/assessment.md` — R10 section updated with all findings
