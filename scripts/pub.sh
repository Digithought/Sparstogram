#!/usr/bin/env bash
set -euo pipefail

# Usage: scripts/pub.sh
#
# Publishes the current version to npm and pushes commits + tags.
# Requires that 'npm run bump' was run first (expects a matching git tag).

version="v$(node -p "require('./package.json').version")"

# Verify the version is tagged
if ! git tag -l "$version" | grep -q .; then
  echo "Error: tag '$version' not found. Run 'npm run bump' first." >&2
  exit 1
fi

# Ensure working tree is clean
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Error: working tree not clean. Commit or stash changes first." >&2
  exit 1
fi

# Publish to npm (prepublishOnly will lint + build as a safety net)
echo "==> Publishing ${version} to npm..."
npm publish

# Push commits and tags
echo "==> Pushing to remote..."
git push --follow-tags

echo ""
echo "Published ${version}"
