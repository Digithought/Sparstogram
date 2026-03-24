description: Set up ESLint configuration — currently installed but completely unenforced
dependencies: none
files: package.json, eslint.config.js (new)
----
ESLint 9.27.0 and `@typescript-eslint/eslint-plugin` + `@typescript-eslint/parser` are installed as devDependencies but **no `eslint.config.js` exists** at the project root. Running `npx eslint` fails with "couldn't find config file". No `npm run lint` script exists in `package.json` either.

## Goals

- Create `eslint.config.js` using flat config format (ESLint 9.x)
- Enable `@typescript-eslint/recommended` rules
- Add a `lint` script to `package.json`
- Ensure existing code passes or fix violations
- Consider adding lint to the `prepublishOnly` script

## Considerations

- The project uses ESM (`"type": "module"`) — config file should be `eslint.config.js` (not `.cjs`)
- TypeScript strict mode is already enabled — complement with eslint rules for unused vars, no-explicit-any, etc.
- The single `as any` at :687 (prototype binding) will be removed by `fix/2-code-quality-cleanup.md`; if that fix lands first, no suppressions needed
- Keep rules pragmatic — the project is a small library, not a large application

TODO
- Create `eslint.config.js` with TypeScript-aware flat config
- Add `"lint": "eslint src/"` script to `package.json`
- Run lint and fix any violations
- Consider adding lint check to `prepublishOnly`
