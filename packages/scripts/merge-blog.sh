#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONOREPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

BLOG_DIR="$MONOREPO_ROOT/apps/blog"
SITE_DIR="$MONOREPO_ROOT/apps/site"

echo "=== Building blog (no assetPrefix) ==="
cd "$BLOG_DIR"
npm run build 2>&1 | tail -3

echo "=== Merging blog pages into site public/ ==="
for locale_dir in out/*/; do
  locale=$(basename "$locale_dir")
  if [ -d "${locale_dir}blog" ]; then
    mkdir -p "$SITE_DIR/public/$locale"
    cp -r "${locale_dir}blog" "$SITE_DIR/public/$locale/"
  fi
done

# Don't copy _next/static/ — Next.js will generate it during site build
# Blog chunks will be merged in after site build (see build-all.mjs or equivalent)

echo "=== Cleaning up blog artifacts from site public ==="
rm -f "$SITE_DIR/public/404.html" 2>/dev/null || true
rm -rf "$SITE_DIR/public/404" "$SITE_DIR/public/_not-found" 2>/dev/null || true

echo "✅ Blog merge complete (pages only, chunks will merge post-build)"
