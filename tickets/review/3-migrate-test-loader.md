description: Migrated test/bench scripts from deprecated --loader (ts-node) to --import (tsx)
dependencies: none
files: package.json
----

## Summary

Replaced `ts-node` with `tsx` as the TypeScript execution engine for test and bench scripts. The `--loader` flag is deprecated in Node.js 20+; `--import tsx` is the supported alternative.

### Changes

- **package.json `test` script**: `node --loader=ts-node/esm` → `node --import tsx`
- **package.json `bench` script**: `node --loader=ts-node/esm` → `node --import tsx`
- **Added** `tsx` to devDependencies
- **Removed** `ts-node` from devDependencies

### Testing / Validation

- All 155 tests pass with `npm test`
- Build (`npm run build`) succeeds
- No deprecation warnings from the `--loader` flag
- ts-node fully removed — not referenced anywhere else in the project
