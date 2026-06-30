#!/usr/bin/env python3
"""
Merge translate-tool results for portal-new-keys-v2 into 47 locale JSON files.

Usage: python3 merge-new-keys-v2.py <results.json> [--dry-run]

The results.json should contain translations for:
  - periodStart -> Report namespace
  - subscribedViewReport, subscribedDesc, subscribedBadge -> Check namespace
"""
import json, sys, os

MSG_DIR = "/root/projects/trade/web/apps/portal/messages"

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 merge-new-keys-v2.py <results.json> [--dry-run]")
        sys.exit(1)

    results_path = sys.argv[1]
    dry_run = "--dry-run" in sys.argv

    with open(results_path) as f:
        results = json.load(f)

    # results format: { "key": { "lang": "translation", ... }, ... }
    # or: { "key": [{"lang": "af", "text": "..."}, ...] }

    # Normalize to dict-of-dicts
    normalized = {}
    for key, langs in results.items():
        if isinstance(langs, dict):
            normalized[key] = langs
        elif isinstance(langs, list):
            normalized[key] = {item["lang"]: item["text"] for item in langs}
        else:
            print(f"  ⚠️ Skipping {key}: unknown format {type(langs)}")
            continue

    KEY_NAMESPACE = {
        "periodStart": "Report",
        "subscribedViewReport": "Check",
        "subscribedDesc": "Check",
        "subscribedBadge": "Check",
    }

    stats = {"updated": 0, "skipped": 0, "errors": 0}

    # Process each locale file
    for fname in sorted(os.listdir(MSG_DIR)):
        if not fname.endswith(".json"):
            continue
        lang = fname.replace(".json", "")
        if lang == "en":
            continue  # Don't overwrite English (source)

        fpath = os.path.join(MSG_DIR, fname)
        with open(fpath) as f:
            data = json.load(f)

        orig = json.dumps(data, ensure_ascii=False, indent=2)
        changed = False

        for key, translations in normalized.items():
            namespace = KEY_NAMESPACE.get(key)
            if not namespace:
                print(f"  ⚠️ Unknown key: {key}, skipping")
                continue

            translation = translations.get(lang)
            if not translation:
                print(f"  ⚠️ {lang}/{key}: no translation found")
                stats["skipped"] += 1
                continue

            # Ensure namespace exists
            if namespace not in data:
                data[namespace] = {}
                changed = True

            if data[namespace].get(key) != translation:
                data[namespace][key] = translation
                changed = True

        if changed:
            new_content = json.dumps(data, ensure_ascii=False, indent=2)
            if not dry_run:
                with open(fpath, "w") as f:
                    f.write(new_content)
            stats["updated"] += 1
            print(f"  {'[DRY-RUN] Would update' if dry_run else '✅'} {lang}")
        else:
            stats["skipped"] += 1

    print(f"\n{'='*40}")
    print(f"{'[DRY-RUN] ' if dry_run else ''}Merge complete:")
    print(f"  Files updated: {stats['updated']}")
    print(f"  Files skipped: {stats['skipped']}")
    print(f"  Errors: {stats['errors']}")

if __name__ == "__main__":
    main()
