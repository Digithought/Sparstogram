#!/usr/bin/env bash
set -euo pipefail

# Usage: scripts/bump.sh [major|minor|patch|<version>]
# Default: patch
#
# Pre-flight: runs tests, lint, and build.
# Generates docs and commits them if changed (avoids typedoc
# non-determinism polluting the version commit).
# Then bumps version in package.json, commits, and tags.

level="${1:-patch}"

# Ensure working tree is clean
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Error: working tree not clean. Commit or stash changes first." >&2
  exit 1
fi

# Pre-flight checks
echo "==> Running tests..."
npm test

echo "==> Linting..."
npm run lint

echo "==> Building..."
npm run build

# Generate docs and commit if changed
echo "==> Generating docs..."
npm run doc

if ! git diff --quiet -- docs/; then
  git add docs/
  git commit -m "docs: regenerate API docs"
  echo "    Docs committed."
else
  echo "    Docs unchanged."
fi

# Bump version (creates commit + tag)
echo "==> Bumping version ($level)..."
npm version "$level" -m "v%s"

new_version="$(node -p "require('./package.json').version")"
echo ""
echo "Bumped to v${new_version}"
echo "Run 'npm run pub' to publish and push."
