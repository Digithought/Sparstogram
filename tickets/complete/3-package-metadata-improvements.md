description: Added types condition to conditional exports in package.json
dependencies: none
files: package.json, README.md
----
## Summary

Updated the `exports` field in package.json from a simple string to conditional exports with a `types` condition listed first, per TypeScript documentation requirements. This enables proper type resolution for TypeScript consumers using `moduleResolution: "node16"` or `"bundler"`.

### What was built

```json
"exports": {
  ".": {
    "types": "./dist/index.d.ts",
    "default": "./dist/index.js"
  }
}
```

The top-level `"types"` field is retained as a fallback for older tooling using `moduleResolution: "node"`.

### Already present (no changes needed)

- `engines` field (`"node": ">=16.11"`)
- ESM-only note in README Installation section with CJS dynamic import example

## Testing / Validation

- Build passes (`npm run build`)
- All 182 tests pass (`npm test`)
- `dist/index.js` and `dist/index.d.ts` exist at the paths referenced in `exports`
- `types` condition is listed before `default` as required by TypeScript
- Top-level `types` field retained for classic `moduleResolution: "node"` fallback

## Key files

- `package.json` — conditional exports with `types` condition
- `README.md` — ESM-only note and CJS dynamic import guidance
