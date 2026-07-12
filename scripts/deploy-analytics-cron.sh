#!/bin/bash
# Deploy the analytics-cron standalone Worker
#
# The D1 database_id is NOT committed to git. It's provided via the
# D1_DATABASE_ID environment variable (set in ~/.openclaw/.env or
# injected into the shell environment).
#
# Usage:
#   ./scripts/deploy-analytics-cron.sh
#
# Required env:
#   D1_DATABASE_ID  — The UUID of the trade-web-admin D1 database
#   (database_id from Cloudflare Dashboard)

set -euo pipefail

cd "$(dirname "$0")/../apps/admin/workers/analytics-cron"

if [ -z "${D1_DATABASE_ID:-}" ]; then
  echo "ERROR: D1_DATABASE_ID is not set."
  echo "Set it in your environment (e.g. ~/.openclaw/.env):"
  echo '  export D1_DATABASE_ID="your-d1-database-id"'
  exit 1
fi

# Check if wrangler.toml exists (it's gitignored)
if [ ! -f wrangler.toml ]; then
  if [ ! -f wrangler.toml.example ]; then
    echo "ERROR: wrangler.toml.example not found"
    exit 1
  fi
  echo "Generating wrangler.toml from example + environment..."
  # regex: uncomment the line that has "database_id = \"...\""
  sed "s|^# \(database_id = \).*|\1\"$D1_DATABASE_ID\"|" wrangler.toml.example > wrangler.toml
fi

echo "Deploying analytics-cron Worker..."
npx wrangler deploy
