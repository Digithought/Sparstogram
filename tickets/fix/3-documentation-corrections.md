description: Fix documentation inaccuracies, broken links, missing JSDoc, and undocumented constraints
dependencies: fix/5-inverted-curvature-score-formula (README score formula prose must be updated after formula fix)
files: readme.md, src/sparstogram.ts, doc/figures/simple-diagram.jpg, doc/figures/complex-diagram.jpg, package.json
----
Findings from review ticket `3-documentation-accuracy.md` (assessment R7). All items verified against code and file system.

### Broken Image Link (Critical)

README line 11 references `doc/complex-diagram.jpg` but the file is at `doc/figures/complex-diagram.jpg`. This is a broken image in the rendered README on GitHub/npm.

### Missing @throws JSDoc Annotations

These public methods throw but lack `@throws` documentation:
- `valueAt(rank)` (:257) — throws `"Rank out of range"`
- `markerAt(index)` (:306) — throws `"Invalid marker - not in list of markers given to constructor"`
- `maxCentroids` setter (:117) — throws `"maxCentroids must be at least 1"`
- `append(...centroids)` (:169-171) — throws on count < 1 or variance < 0

### Missing Limitations in README

README "Current Limitations" section (:521-531) is incomplete. Add:
1. **No NaN/Infinity handling** — `add(NaN)` corrupts the internal index silently (tracked separately in `fix/5-nan-infinity-input-validation.md`, but limitation should be documented now)
2. **No serialization API** — no `toJSON()`/`fromJSON()`; users must iterate centroids via `ascending()` and re-`append()`; quantile markers are lost on reconstruction
3. **Iterator invalidation** — `ascending()`/`descending()` yield lazily; calling `add()` or other mutating methods during iteration corrupts internal paths
4. **`mergeFrom(self)` is broken** — self-merge causes iterator invalidation during mutation

### mergeFrom() Caveats Missing

README distributed/parallel section (:457-491) should warn:
- Source histogram markers are ignored; only target markers are updated
- `mergeFrom(self)` is broken (iterator invalidation)
- Merge is not commutative due to weighted-median recentering

### ESM-Only Nature Undocumented

`package.json` has `"type": "module"`. CJS consumers need dynamic `await import('sparstogram')`. Should be noted in Installation or Usage section.

### Node.js Minimum Version Undocumented

`tsconfig.json` targets ES2022 requiring Node.js >= 16.11. Should add `"engines": { "node": ">=16.11" }` to `package.json` and mention in README.

### Score Formula Prose/Code Contradiction (Deferred)

README lines 108-111 correctly describe the intended behavior (flat regions merged first, peaks preserved) but the formula at line 98 (`baseLoss / (ε + curvature)`) implements the opposite. **Deferred** to `fix/5-inverted-curvature-score-formula.md` — README formula description should be updated after the code fix.

TODO
## Phase 1: Straightforward fixes
- Fix broken image path on README line 11: `doc/complex-diagram.jpg` → `doc/figures/complex-diagram.jpg`
- Decide on `simple-diagram.jpg`: reference in README or remove from repo
- Add `@throws` JSDoc to `valueAt()`, `markerAt()`, `maxCentroids` setter, `append()`
- Add `@throws` or caveat to `ascending()`/`descending()` JSDoc re: iterator invalidation

## Phase 2: README content additions
- Add limitations to "Current Limitations" section: NaN handling, no serialization, iterator invalidation
- Add caveats to merge/distributed section: marker behavior, self-merge, non-commutativity
- Add note about ESM-only package to Installation section
- Add Node.js minimum version requirement to Installation section
- Add `"engines": { "node": ">=16.11" }` to package.json
