description: Create ESLint flat config with TypeScript rules, add lint script, ensure code passes
dependencies: none
files: package.json, eslint.config.js (new), src/sparstogram.ts, src/sparstogram.test.ts, src/index.ts
----

## Context

ESLint 9.27.0, `@typescript-eslint/eslint-plugin` 8.32.1, and `@typescript-eslint/parser` 8.32.1 are installed as devDependencies but no config or lint script exists. `@eslint/js` 9.27.0 is available as a transitive dep of eslint. The project is ESM (`"type": "module"`), TypeScript strict mode enabled. Source is 3 files: `src/sparstogram.ts` (796 lines), `src/sparstogram.test.ts` (1684 lines), `src/index.ts` (1 line). No `as any` casts or suppression comments exist in source.

The `@typescript-eslint/eslint-plugin` v8 exports flat config arrays at `configs['flat/recommended']` — no need to install the `typescript-eslint` meta-package.

## Design

### `eslint.config.js` — flat config format

```js
import eslint from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';

export default [
  // Base JS recommended rules
  eslint.configs.recommended,

  // TypeScript recommended (flat config — includes parser setup + plugin registration)
  ...tsPlugin.configs['flat/recommended'],

  // Project-specific scope and overrides
  {
    files: ['src/**/*.ts'],
  },

  // Ignore build output
  {
    ignores: ['dist/', 'docs/', 'node_modules/'],
  },
];
```

Key points:
- Uses the `flat/recommended` export from the already-installed plugin — no new dependencies needed
- Scopes linting to `src/**/*.ts` which includes both library code and colocated tests
- Ignores `dist/`, `docs/`, and `node_modules/`
- No type-checked rules (avoids project-service complexity for a small library; standard `recommended` is sufficient)

### `package.json` changes

- Add script: `"lint": "eslint src/"`
- Update `prepublishOnly` to: `"npm run lint && npm run build && npm run doc"`
  - Lint runs first so publish is blocked on lint pass, and so lint failures are caught before the slower build

### Lint violations

No `as any`, `@ts-ignore`, `eslint-disable`, or obvious issues were found in current source. Any violations found during implementation should be fixed directly (not suppressed), since this is a small codebase.

## Test considerations for review phase

- `npx eslint src/` exits 0 with no warnings
- `npm run lint` script works
- `npm run prepublishOnly` still works end-to-end (lint + build + doc)
- Introducing a deliberate lint error (e.g., unused variable) is caught by `npm run lint`

## TODO

- Create `eslint.config.js` at project root with flat config as designed above
- Add `"lint": "eslint src/"` script to `package.json`
- Update `prepublishOnly` to `"npm run lint && npm run build && npm run doc"` in `package.json`
- Run `npm run lint` and fix any violations found
- Run `npm run build` to verify nothing is broken
- Run `npm test` to verify tests still pass
