description: Migrate test script from deprecated --loader flag to --import with tsx
dependencies: none
files: package.json
----
Node.js 20+ deprecated `--loader` in favor of `--import`. The current test script uses the deprecated flag:

```
node --loader=ts-node/esm node_modules/mocha/bin/mocha.js src/**/*.test.ts --colors --bail
```

## Approach: switch to tsx

Replace `ts-node` with `tsx` as the TypeScript loader. `tsx` is a simpler, zero-config TypeScript runner that uses `--import` under the hood and has no deprecation warnings. It handles ESM natively.

New test script:
```
node --import tsx node_modules/mocha/bin/mocha.js src/**/*.test.ts --colors --bail
```

Dependency changes in devDependencies:
- Add `tsx` (latest)
- Remove `ts-node` (no longer needed once migration is verified)

### Why tsx over ts-node --import

- ts-node's `--import` register hook (`ts-node/esm/register`) has historically had reliability issues with ESM
- tsx is simpler: no tsconfig-specific configuration needed for execution
- tsx uses esbuild under the hood — faster transpilation for tests
- ts-node remains only used for the test script; no other references exist

### Verification

After making the change, run `npm test` to confirm all tests pass with the new loader. The test file is `src/sparstogram.test.ts`.

### Note on package-lock.json

The lock file is not committed (listed in .gitignore implicitly by absence). Committing it is deferred to the CI pipeline ticket (`3-ci-pipeline.md`).

## TODO

- Install tsx: `npm install --save-dev tsx`
- Update test script in package.json to use `node --import tsx`
- Run `npm test` to verify all tests pass
- Remove ts-node from devDependencies: `npm uninstall ts-node`
- Run `npm test` again to confirm ts-node is no longer needed
