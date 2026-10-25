#!/usr/bin/env bash
# Publish web/ (including the generated web/data/) to the gh-pages branch,
# which GitHub Pages serves. Run from the repo root after code/export_web.py.
#
#   bash code/deploy.sh
#
# Refuses to run with uncommitted changes, so the live site always matches a commit.
set -euo pipefail

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Uncommitted changes; commit first so the deploy matches a commit." >&2
  exit 1
fi
if [[ ! -f web/data/county_latest.json || ! -f web/data/findings.json ]]; then
  echo "web/data/ is not built; run code/export_web.py first." >&2
  exit 1
fi

remote=$(git remote get-url origin)
commit=$(git rev-parse --short HEAD)
branch=$(git rev-parse --abbrev-ref HEAD)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

# Build on top of the existing gh-pages history rather than replacing it.
git clone --quiet --depth 1 --branch gh-pages "$remote" "$work"
find "$work" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -r web/. "$work"/
touch "$work/.nojekyll"

cd "$work"
git config user.name "$(git -C "$OLDPWD" config user.name)"
git config user.email "$(git -C "$OLDPWD" config user.email)"
git add -A
if git diff --cached --quiet; then
  echo "Nothing changed; the live site already matches $commit."
  exit 0
fi
git commit --quiet -m "Deploy screener from $branch $commit"
git push --quiet origin gh-pages
echo "Deployed $commit. Live in about a minute."
