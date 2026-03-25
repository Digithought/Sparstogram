description: ESLint flat config with TypeScript rules, lint script, prepublishOnly gate
dependencies: none
files: eslint.config.js, package.json, src/sparstogram.ts
----

## What was done

- Created `eslint.config.js` using ESLint 9 flat config format with `@eslint/js` recommended rules and `@typescript-eslint/eslint-plugin` `flat/recommended` preset
- Added `"lint": "eslint src/"` script to `package.json`
- Updated `prepublishOnly` to run lint before build: `"npm run lint && npm run build && npm run doc"`
- Fixed two lint violations in `src/sparstogram.ts`:
  - Removed unused parameter `q` in `.map(q => undefined)` → `.map(() => undefined)`
  - Changed `let path` to `const path` in `for...of` loop
- Configured `no-unused-vars` to allow `_`-prefixed variables (used for destructuring out `loss` from `CentroidEntry`)
- Disabled `no-unused-expressions` and `no-explicit-any` for test files (Chai assertion pattern and catch clause typing)

## Test / validation use cases

- `npx eslint src/` exits 0 with no errors or warnings
- `npm run lint` works as a script
- `npm run build` still succeeds
- `npm test` — all 182 tests pass
- `npm run prepublishOnly` runs lint → build → doc end-to-end
- Introducing a deliberate lint error (e.g., `const unused = 1;` in a src file) is caught by `npm run lint`
