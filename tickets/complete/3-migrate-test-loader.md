description: Migrated test/bench/debug configs from deprecated --loader (ts-node) to --import (tsx)
dependencies: none
files: package.json, .vscode/launch.json, doc/assessment.md
----

## What was built

Replaced `ts-node` with `tsx` as the TypeScript execution engine across all project entry points. The `--loader` flag is deprecated in Node.js 20+; `--import tsx` is the supported alternative.

### Changes

- **package.json `test` script**: `node --loader=ts-node/esm` → `node --import tsx`
- **package.json `bench` script**: `node --loader=ts-node/esm` → `node --import tsx`
- **Added** `tsx` to devDependencies
- **Removed** `ts-node` from devDependencies
- **.vscode/launch.json**: Both debug configurations updated from `--loader=ts-node/esm` to `--import tsx` (review fix — was missed in initial implementation)
- **doc/assessment.md**: Updated assessment items 8.7, 11.7, and issue tracker to reflect migration as done

## Testing notes

- All 182 tests pass with `npm test`
- Build (`npm run build`) succeeds
- No deprecation warnings from the `--loader` flag
- `ts-node` fully removed from devDependencies and node_modules
- No operational references to `ts-node` or `--loader` remain (only historical ticket/doc archives)

## Review findings

During review, `.vscode/launch.json` was found to still reference `--loader=ts-node/esm`, which would have been broken since `ts-node` was removed from devDependencies. This was fixed along with stale assessment doc entries.
