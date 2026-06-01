#!/bin/bash
set -e

# Merge blog SSG output into the main site's public directory
# Resolve paths relative to the monorepo root (where this script lives)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONOREPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

BLOG_DIR="$MONOREPO_ROOT/apps/blog"
SITE_DIR="$MONOREPO_ROOT/apps/site"

echo "=== Ensuring blog dependencies are installed ==="
cd "$BLOG_DIR"
# Cloudflare Pages may install deps only for the site workspace,
# so run npm install explicitly for the blog workspace.
npm install 2>&1 | tail -3

echo "=== Building blog with assetPrefix: /blog ==="
npm run build

echo "=== Moving blog static assets to blog/_next/static/ ==="
mkdir -p out/blog/_next
mv out/_next/static out/blog/_next/static/
rm -rf out/_next

echo "=== Copying blog locale pages to site's public/ ==="
for locale_dir in out/*/; do
  locale=$(basename "$locale_dir")
  if [ -d "${locale_dir}blog" ]; then
    mkdir -p "$SITE_DIR/public/$locale"
    cp -r "${locale_dir}blog" "$SITE_DIR/public/$locale/"
    echo "  Copied $locale/blog"
  fi
done

echo "=== Copying blog static assets to site's public/blog/ ==="
cp -r out/blog "$SITE_DIR/public/blog"

echo "=== Cleaning up blog artifacts from site public ==="
rm -f "$SITE_DIR/public/404.html" 2>/dev/null || true
rm -rf "$SITE_DIR/public/404" "$SITE_DIR/public/_not-found" 2>/dev/null || true

echo "✅ Blog merge complete"
