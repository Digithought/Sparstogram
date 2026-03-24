description: Verify documentation matches implementation; identify gaps and inaccuracies
dependencies: none
files: readme.md, src/sparstogram.ts, doc/figures/complex-diagram.jpg, doc/figures/simple-diagram.jpg
----
Cross-check all documentation against the current implementation.

Items to verify:

- README mathematical notation — curvature formula, loss formula, tightnessJ formula should match code
- README usage examples — do they compile and produce expected results with current API?
- README "Limitations" section — missing: no NaN handling, no serialization, iterator invalidation
- JSDoc completeness — most public methods have JSDoc; `ascending()`/`descending()` criteria param needs detail
- Return type docs for edge cases — `valueAt()` throws on out-of-range but JSDoc doesn't mention it; same for `markerAt()`
- Complexity claims — "roughly O(log n)" in README matches B+Tree implementation
- `doc/figures/` — `complex-diagram.jpg` and `simple-diagram.jpg` exist but are NOT referenced in README
- Time-window aggregation — mentioned in README as advanced topic but not implemented; could confuse users
- Distributed merge guidance — `mergeFrom()` documented but caveats about marker loss during merge not mentioned
- No CHANGELOG — version history not tracked; breaking changes between versions undocumented
- ESM-only nature not documented — CJS consumers need dynamic import()
- Node.js minimum version (16.11+ for ES2022 target) not documented

Output: findings into doc/assessment.md; follow-up fix/ tickets for doc corrections.

TODO
- Cross-check each README formula against corresponding code function
- Try compiling README examples against current API
- Verify all public methods have complete JSDoc with @throws documentation
- Determine whether figures should be referenced or removed
- Review time-window aggregation section for accuracy
- Document findings in doc/assessment.md
