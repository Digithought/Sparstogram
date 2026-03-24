description: Review build pipeline, NPM package contents, and distribution correctness
dependencies: none
files: package.json, tsconfig.json, tsconfig.build.json, .npmignore, .gitignore
----
Verify the build and packaging pipeline produces a correct, minimal NPM package.

Items to verify:

- ESM-only package (`"type": "module"`) — CJS consumers need dynamic `import()`; not documented
- `exports` field lacks `"types"` condition — TypeScript resolves via top-level `"types"` field (works but not best practice for modern resolution)
- Source maps ship in NPM package — adds ~28KB; intentional?
- `prepublishOnly` runs `npm run doc` — TypeDoc output goes to `docs/`; verify this directory is excluded from published package
- No CI/CD pipeline — no GitHub Actions or equivalent; risk of publishing broken builds
- ES2022 target — requires Node.js >= 16.11; not documented as minimum version
- `--loader=ts-node/esm` in test script — Node.js 20+ deprecated loader API; consider `--import` or `tsx`
- `.npmignore` — verify `.vscode/`, `doc/`, `docs/`, `src/`, `tickets/`, `tess/` all excluded
- `tsconfig.build.json` vs `tsconfig.json` — build excludes tests, enables declarations; verify intentional
- LICENSE file — verify exists and is included in package
- No `package-lock.json` presence verified — needed for reproducible builds

Output: findings into doc/assessment.md; follow-up plan/ tickets for CI and packaging fixes.

TODO
- Run `npm pack --dry-run` to list actual package contents
- Verify .npmignore excludes all non-distribution files
- Check exports field against TypeScript moduleResolution: "bundler" and "node16"
- Verify LICENSE file exists
- Check if package-lock.json is committed
- Evaluate ts-node/esm deprecation impact
- Document findings in doc/assessment.md
