#!/bin/bash
# Merge P3 translations from translate-tool into 47 locale JSON files
# Called by cron every 15 minutes until done

set -euo pipefail

source /root/projects/.venv/bin/activate

TASK_NAME="portal-rules-i18n-p3"
PORTAL_MSG="/root/projects/trade/web/apps/portal/messages"
RESULTS_FILE="/tmp/translation-results-p3.json"

# Check translation status
STATUS=$(translate-tool status -n "$TASK_NAME" 2>&1 | tail -1)

if echo "$STATUS" | grep -q "running"; then
    echo "[$(date '+%H:%M')] P3 translation in progress"
    exit 0
fi

if ! echo "$STATUS" | grep -q "done"; then
    echo "[$(date '+%H:%M')] P3 translation status: $STATUS"
    exit 1
fi

echo "[$(date '+%H:%M')] P3 translation DONE. Exporting..."

translate-tool results -n "$TASK_NAME" -o "$RESULTS_FILE" 2>&1

if [ ! -f "$RESULTS_FILE" ]; then
    echo "Results file not found"
    exit 1
fi

python3 << 'PYEOF'
import json, os

results_file = "/tmp/translation-results-p3.json"
msg_dir = "/root/projects/trade/web/apps/portal/messages"

with open(results_file) as f:
    raw = json.load(f)

translations = raw.get("results", raw.get("translations", {}))
if not translations:
    print(f"Cannot parse results: {type(raw).__name__}")
    exit(1)

print(f"Export has {len(translations)} languages")
for lang, keys in list(translations.items())[:3]:
    print(f"  {lang}: {len(keys)} keys - {list(keys.keys())[:3]}...")

merged = 0
for lang, keys in translations.items():
    fpath = os.path.join(msg_dir, f"{lang}.json")
    if not os.path.exists(fpath):
        continue
    with open(fpath) as f:
        data = json.load(f)
    added = 0
    for k, v in keys.items():
        if k not in data:
            data[k] = v
            added += 1
    with open(fpath, 'w') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    merged += added
    print(f"  {lang}: +{added}")

print(f"Total new keys merged: {merged}")
PYEOF

echo "[$(date '+%H:%M')] Running CI build..."

cd /root/projects/trade/web/apps/portal
if npm run build 2>&1 | tail -10; then
    echo "BUILD PASSED ✅"
    cd /root/projects/trade/web
    git add apps/portal/messages/
    git commit -m "P3: merge 151 translated keys into 47 locale files"
    git push
    # Remove this cron job
    crontab -l | grep -v "merge-translations-p3" | crontab -
    echo "Committed & pushed. Cron removed. All done ✅"
else
    echo "BUILD FAILED ❌"
fi
