description: Fix documentation inaccuracies — broken image link, missing JSDoc @throws, missing README limitations/caveats, ESM-only note, Node.js version requirement
dependencies: implement/5-inverted-curvature-score-formula (score formula prose deferred to that ticket), fix/3-iterator-invalidation-docs (ascending/descending JSDoc deferred to that ticket)
files: readme.md, src/sparstogram.ts, package.json
----

## Overview

Documentation corrections identified during review ticket `3-documentation-accuracy.md`. All items verified against current code. Items handled by other tickets are excluded.

### Broken Image Link

README line 11 references `doc/complex-diagram.jpg` but the actual file is at `doc/figures/complex-diagram.jpg`. This renders as a broken image on GitHub/npm.

**Note:** `doc/figures/simple-diagram.jpg` also exists but is a less detailed version of the complex diagram (no labels/axes). Decision: do not reference it — the complex diagram is superior. Leave the file in the repo.

### Missing @throws JSDoc (src/sparstogram.ts)

These public methods throw but lack `@throws` documentation:

- **`valueAt(rank)`** (~line 248): throws `"Rank must be non-zero"` (line 250) and `"Rank out of range"` (line 269)
- **`markerAt(index)`** (~line 311): throws `"Invalid marker - not in list of markers given to constructor"` (line 318)
- **`maxCentroids` setter** (~line 115): throws `"maxCentroids must be at least 1"` (line 117)
- **`append(...centroids)`** (~line 169): throws on non-finite value, count < 1, or variance < 0 (lines 171-178)

**NOT included here:** `ascending()`/`descending()` iterator invalidation warnings — covered by `fix/3-iterator-invalidation-docs.md`.

### Missing README Limitations (readme.md, "Current Limitations" section ~line 521)

Add after item 4:

5. **No NaN/Infinity handling** — `add()` now throws on NaN/Infinity (fixed in `5-nan-infinity-input-validation`), but this is a runtime error, not graceful handling. Document as a known constraint.
6. **No serialization API** — no `toJSON()`/`fromJSON()`; users must iterate centroids via `ascending()` and re-`append()`; quantile markers are lost on round-trip reconstruction.
7. **Iterator invalidation** — `ascending()`/`descending()` yield lazily from B+Tree paths; calling `add()`, `append()`, `mergeFrom()`, or the `maxCentroids` setter during iteration may corrupt internal paths and produce incorrect results.
8. **`mergeFrom(self)` is unsupported** — self-merge causes iterator invalidation during mutation; use `append()` with data from `ascending()` collected into an array first.

### mergeFrom() Caveats (readme.md, distributed/parallel section ~line 457)

Add a caveats subsection after the merge code examples noting:

- Source histogram's quantile markers are ignored during merge; only the target's markers are updated
- `mergeFrom(self)` is not supported (iterator invalidation during mutation)
- Merge is not commutative — weighted-median recentering means `a.mergeFrom(b)` may differ from `b.mergeFrom(a)`

### ESM-Only Package (readme.md, Installation section ~line 182)

Add a note after the install commands:

> **Note:** Sparstogram is an ESM-only package (`"type": "module"` in package.json). CommonJS consumers must use dynamic import: `const { Sparstogram } = await import('sparstogram');`

### Node.js Minimum Version

- Add `"engines": { "node": ">=16.11" }` to `package.json` (ES2022 target requires Node.js 16.11+)
- Add a note in the Installation section: "Requires Node.js 16.11 or later (ES2022)."

## Items Deferred to Other Tickets

- **Score formula prose** (README lines 98, 103, 106): deferred to `implement/5-inverted-curvature-score-formula.md` Phase 3
- **ascending()/descending() JSDoc warnings**: deferred to `fix/3-iterator-invalidation-docs.md`

TODO

## Phase 1: Straightforward fixes
- Fix broken image path on README line 11: `doc/complex-diagram.jpg` → `doc/figures/complex-diagram.jpg`
- Add `@throws` JSDoc to `valueAt()` (~line 244): document both "Rank must be non-zero" and "Rank out of range"
- Add `@throws` JSDoc to `markerAt()` (~line 307): document "Invalid marker - not in list of markers given to constructor"
- Add `@throws` JSDoc to `maxCentroids` setter (~line 110): document "maxCentroids must be at least 1"
- Add `@throws` JSDoc to `append()` (~line 164): document throws on non-finite value, count < 1, or variance < 0

## Phase 2: README content additions
- Add limitations 5-8 to "Current Limitations" section (~line 531): NaN/Infinity, no serialization, iterator invalidation, mergeFrom(self)
- Add caveats subsection to distributed/parallel section (~line 491): marker behavior, self-merge, non-commutativity
- Add ESM-only note to Installation section (~line 188)
- Add Node.js minimum version note to Installation section
- Add `"engines": { "node": ">=16.11" }` to package.json
