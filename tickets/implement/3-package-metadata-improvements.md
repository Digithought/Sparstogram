description: Add types condition to exports, engines field, and ESM-only documentation
dependencies: none
files: package.json, README.md
----
Three related packaging metadata improvements for better TypeScript resolution, Node.js compatibility documentation, and consumer guidance.

## 1. Add `types` condition to exports field

The current `exports` field is a simple string:
```json
"exports": { ".": "./dist/index.js" }
```

Change to conditional exports so TypeScript consumers using `moduleResolution: "node16"` or `"bundler"` resolve types via the exports map:
```json
"exports": {
  ".": {
    "types": "./dist/index.d.ts",
    "default": "./dist/index.js"
  }
}
```

The `types` condition must come first per TypeScript documentation. The top-level `"types"` field should remain as a fallback for older tooling.

## 2. Add `engines` field

ES2022 target (in tsconfig.json) requires Node.js >= 16.11. Add:
```json
"engines": { "node": ">=16.11" }
```

## 3. ESM-only note in README

Add a brief note in the Installation section of README.md indicating this is an ESM-only package. CJS consumers need dynamic import: `await import('sparstogram')`.

## TODO

- Update `exports` field in package.json to conditional exports with `types` condition first
- Add `engines` field to package.json
- Add ESM-only note to README.md Installation section
