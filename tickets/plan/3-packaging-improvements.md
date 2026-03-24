description: Improve package.json exports, document Node.js minimum version, migrate off deprecated test loader
dependencies: none
files: package.json, tsconfig.json, README.md
----
Several packaging and distribution improvements identified during build review.

## Items

### 1. Add `types` condition to exports field
Current `exports` field is a simple string mapping:
```json
"exports": { ".": "./dist/index.js" }
```
Should be:
```json
"exports": { ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" } }
```
This ensures TypeScript consumers using `moduleResolution: "node16"` or `"bundler"` resolve types via the exports map rather than relying on the top-level `"types"` fallback. Current setup works but is not best practice per TypeScript documentation.

### 2. Document Node.js minimum version
ES2022 target requires Node.js >= 16.11. Add `engines` field to `package.json`:
```json
"engines": { "node": ">=16.11" }
```
Consider also noting this in README's installation/requirements section.

### 3. Migrate test script off deprecated `--loader` flag
Current test script:
```
node --loader=ts-node/esm node_modules/mocha/bin/mocha.js src/**/*.test.ts
```
Node.js 20+ deprecated `--loader` in favor of `--import`. Options:
- Use `--import` with `ts-node/esm` register hook
- Switch to `tsx` as the TypeScript loader (simpler, fewer deprecation warnings)
- Use mocha's built-in `--require`/`--loader` config

### 4. Consider committing `package-lock.json`
Not currently in git. For reproducible CI builds, committing the lock file enables `npm ci`. Acceptable to omit for libraries, but recommended if CI is added (see `3-ci-pipeline.md`).

### 5. ESM-only documentation
Add a note to README that this is an ESM-only package. CJS consumers need `await import('sparstogram')`.
