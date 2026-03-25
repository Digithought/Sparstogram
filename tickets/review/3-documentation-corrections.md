description: Review documentation corrections — broken image link, @throws JSDoc, README limitations/caveats, ESM-only note, Node.js version requirement
dependencies: none
files: readme.md, src/sparstogram.ts, package.json
----

## Summary

Fixed documentation inaccuracies across README, source JSDoc, and package.json.

### Changes Made

1. **Broken image link** (readme.md line 11): `doc/complex-diagram.jpg` → `doc/figures/complex-diagram.jpg`

2. **@throws JSDoc** (src/sparstogram.ts): Added `@throws` tags to:
   - `maxCentroids` setter — documents "must be at least 1"
   - `valueAt(rank)` — documents "rank must be non-zero" and "rank out of range"
   - `markerAt(index)` — documents "invalid marker" error
   - `append(...centroids)` — documents non-finite value, count < 1, variance < 0

3. **README Current Limitations** (readme.md, ~line 533): Added items 6-8:
   - No NaN/Infinity handling (throws, not graceful)
   - No serialization API (no toJSON/fromJSON)
   - `mergeFrom(self)` unsupported (iterator invalidation)

4. **Merge Caveats** (readme.md, distributed/parallel section): New "Merge Caveats" subsection covering source markers ignored, self-merge unsupported, non-commutativity

5. **ESM-only note** (readme.md, Installation section): Added note about `"type": "module"` and CommonJS dynamic import workaround

6. **Node.js minimum version**: Added `"engines": { "node": ">=16.11" }` to package.json and a note in README Installation section

### Items NOT in scope (handled by other tickets)
- Score formula prose — deferred to `implement/5-inverted-curvature-score-formula.md`
- `ascending()`/`descending()` JSDoc warnings — deferred to `fix/3-iterator-invalidation-docs.md`

### Testing / Validation
- Build passes (`npm run build`)
- All 149 tests pass (`npm test`)
- Verify image renders on GitHub by checking `doc/figures/complex-diagram.jpg` path
- Verify JSDoc `@throws` tags appear in generated typedoc output (`npm run doc`)
- Verify `engines` field in package.json is respected by `npm install --engine-strict`
- Spot-check README rendered markdown for formatting issues (blockquote, numbered list continuity)
