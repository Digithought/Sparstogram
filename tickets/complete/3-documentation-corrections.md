description: Documentation corrections — broken image link, @throws JSDoc, README limitations/caveats, ESM-only note, Node.js version
files: readme.md, src/sparstogram.ts, package.json
----

## What was done

1. **Fixed broken image link** — `doc/complex-diagram.jpg` → `doc/figures/complex-diagram.jpg`
2. **Added `@throws` JSDoc** to `maxCentroids` setter, `valueAt()`, `markerAt()`, `append()`
3. **Added README limitations 6-8** — NaN/Infinity handling, no serialization API, self-merge unsupported
4. **Added Merge Caveats subsection** — source markers ignored, self-merge unsupported, non-commutativity
5. **Added ESM-only note** in Installation section with CommonJS workaround
6. **Added `engines` field** — `"node": ">=16.11"` in package.json with matching README note

## Key files
- `readme.md` — all prose additions
- `src/sparstogram.ts` — `@throws` JSDoc tags
- `package.json` — `engines` field

## Testing / Validation
- Build passes (`npm run build`)
- All 182 tests pass (`npm test`)
- Lint clean (`npm run lint`)
- Image file verified at `doc/figures/complex-diagram.jpg`
- All `@throws` tags verified in source via grep
- Existing tests cover all documented throw behaviors (NaN, Infinity, self-merge, invalid marker, valueAt(0), append validation, maxCentroids < 1)

## Not in scope
- Score formula prose — separate ticket `implement/5-inverted-curvature-score-formula.md`
- Iterator invalidation JSDoc warnings — separate ticket `fix/3-iterator-invalidation-docs.md`
- Typedoc generation failure (pre-existing issue with bench file missing `@types/node`)
