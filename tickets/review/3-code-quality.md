description: Review code organization, readability, and maintainability
dependencies: none
files: src/sparstogram.ts
----
Assess code structure, naming, dead code, and consistency patterns.

Items to review:

- Monolithic 850-line class — compression, querying, markers, iteration all in one class; manageable at current size but approaching threshold for decomposition
- Commented-out code at :714-786 — ~70 lines of inverseNormalCDF and alternative inferValueFromOffset; should be removed (in git history) or documented as intentional with a rationale
- `min2()` at :674 — reimplements `Math.min` for 2 args; unclear if measurable benefit over built-in
- Prototype binding at :687 — `(Sparstogram.prototype as any).edgeContribution = edgeContribution`; unusual dual pattern (private method + module function); fragile and prevents tree-shaking
- Magic numbers — `1e-9` (:403), `1e-12` (:421), `0.5` (:424); should be named constants with rationale comments
- Error handling inconsistency — some methods throw (valueAt, markerAt), others return 0 (rankAt on empty, countAt on empty); no consistent contract
- `peaks()` issues:
  - Dead `result` variable at :319 — declared but never used (peaks are yielded directly)
  - `left` and `right` at :317-318 — declared with `let` but never reassigned; should be `const`
  - Ring buffer TODO at :317 — noted but not implemented
- ESLint configuration — verify rules are meaningful and enforced; check for suppressions
- Naming: `getPriorScore` vs `updateNextScore` — "get" vs "update" implies different side effects but both are pure computations

Output: findings into doc/assessment.md; follow-up fix/ tickets for dead code cleanup and consistency issues.

TODO
- Identify all magic numbers and propose named constants
- Catalog error handling patterns across all public methods
- Verify no dead code beyond commented-out section
- Check ESLint config for active rules
- Evaluate whether class decomposition is warranted at current size
- Document findings in doc/assessment.md
