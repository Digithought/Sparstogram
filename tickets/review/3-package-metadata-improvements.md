description: Added types condition to conditional exports in package.json
dependencies: none
files: package.json, README.md
----
## Summary

Updated the `exports` field in package.json from a simple string to conditional exports with the `types` condition listed first, per TypeScript documentation requirements. This enables proper type resolution for TypeScript consumers using `moduleResolution: "node16"` or `"bundler"`.

### Change made

```json
"exports": {
  ".": {
    "types": "./dist/index.d.ts",
    "default": "./dist/index.js"
  }
}
```

The top-level `"types"` field (`./dist/index.d.ts`) is retained as a fallback for older tooling.

### Already present (no changes needed)

- `engines` field (`"node": ">=16.11"`) — already in package.json
- ESM-only note — already in README.md Installation section

## Testing / Validation

- Build passes (`npm run build`)
- All 155 tests pass (`npm test`)
- Verify TypeScript consumers resolve types via `exports` map when using `moduleResolution: "node16"` or `"bundler"` in their tsconfig
- Verify the top-level `types` field still works as fallback for `moduleResolution: "node"` (classic)
- Verify CJS dynamic import note in README is accurate: `const { Sparstogram } = await import('sparstogram');`
