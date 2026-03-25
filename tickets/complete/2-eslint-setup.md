description: ESLint flat config with TypeScript rules, lint script, prepublishOnly gate
dependencies: none
files: eslint.config.js, package.json, src/sparstogram.ts
----

## Summary

ESLint 9 flat config with `@eslint/js` recommended + `@typescript-eslint` `flat/recommended` rules. Integrated into the build pipeline via `npm run lint` and `prepublishOnly`.

## What was built

- `eslint.config.js` — flat config with recommended JS + TS rules, `_`-prefixed unused var allowance, test file overrides for Chai expressions and `any` typing
- `package.json` — `lint` script (`eslint src/`), `prepublishOnly` gates lint before build
- `src/sparstogram.ts` — two lint fixes: unused `.map()` parameter removed, `let` → `const` in `for...of` loops

## Review fix

- Added `@eslint/js` as an explicit devDependency (was a phantom dep only available transitively via `eslint@9`)

## Key files

- `eslint.config.js` — ESLint flat config
- `package.json` — `lint` / `prepublishOnly` scripts
- `src/sparstogram.ts` — source lint fixes

## Testing notes

- `npm run lint` — exits 0, no errors or warnings
- `npm run build` — succeeds
- `npm test` — all 182 tests pass
- `npm run prepublishOnly` — lint → build pipeline works end-to-end
- Deliberate lint error (`const unused = 1;`) is correctly caught

## Usage

- `npm run lint` — run ESLint on `src/`
- Lint runs automatically as part of `npm run prepublishOnly` before publish
