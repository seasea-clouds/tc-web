#!/bin/bash
# postbuild.sh — Move Next.js static export output under /admin/ basePath
# Called after `next build` so that CF Pages serves pages at /admin/ paths.

set -euo pipefail

OUT_DIR="out"
TARGET="$OUT_DIR/admin"

# Clean up any previous admin dir
rm -rf "$TARGET" 2>/dev/null
mkdir -p "$TARGET"

# Step 1: Move _next static directory (to get /admin/_next/static/ URLs)
cp -r "$OUT_DIR/_next" "$TARGET/_next"
rm -rf "$OUT_DIR/_next"

# Step 2: Move all generated page directories (dashboard, login, users, etc.)
for d in "$OUT_DIR"/*/; do
  dirname=$(basename "$d")
  if [ "$dirname" = "admin" ]; then
    continue
  fi
  mv "$d" "$TARGET/$dirname"
done

# Step 3: Move root-level files (index.html, 404.html, *.txt)
for f in "$OUT_DIR"/*.html "$OUT_DIR"/*.txt "$OUT_DIR"/404; do
  if [ -f "$f" ]; then
    mv "$f" "$TARGET/"
  fi
done

# Step 3.5: Move root-level icon files (favicon.ico, icon.png) under /admin/ basePath
for f in "$OUT_DIR"/favicon.ico "$OUT_DIR"/icon.png; do
  if [ -f "$f" ]; then
    mv "$f" "$TARGET/"
  fi
done

# Step 4: Create a redirect at root level (/ → /admin/)
cat > "$OUT_DIR/index.html" << 'EOF'
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0;url=/admin/">
  <title>Redirecting to Admin...</title>
</head>
<body>
  <p>Redirecting to <a href="/admin/">Admin Panel</a>...</p>
</body>
</html>
EOF

echo "✅ postbuild.sh: All content moved under $TARGET/"
echo "   Root redirect: / → /admin/"
