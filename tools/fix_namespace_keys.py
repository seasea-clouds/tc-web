#!/usr/bin/env python3
"""
P1a: Copy top-level module-prefixed keys into Check namespace.

Many keys used by rules.ts via buildT('Check') are stored at the top-level
of locale JSON files instead of inside the 'Check' namespace. Since buildT()
only looks inside the Check namespace, these keys are invisible and t() returns
the raw key.

This script copies module-prefixed keys (ccc*, nmpa*, gacc*, label*, cb*, tm*)
from the top level into the Check namespace for ALL 48 locale files.
It does NOT delete the originals (other code may reference them at top-level).
"""

import json, os, sys, glob

LOCALE_DIR = "apps/portal/messages"
PREFIXES = ("ccc", "nmpa", "gacc", "label", "cb", "tm", "ongoing", "contact", "varies", "na_label", "standard_label", "tbd_label", "check_import")

def main():
    locale_files = sorted(glob.glob(f"{LOCALE_DIR}/*.json"))
    total_copied = 0
    
    for fpath in locale_files:
        locale = os.path.basename(fpath).replace(".json", "")
        with open(fpath, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        if "Check" not in data:
            data["Check"] = {}
        
        copied = 0
        for key, value in list(data.items()):
            if key == "Check":
                continue
            if not isinstance(value, str) and not isinstance(value, (int, float, bool)):
                continue
            if key.startswith(PREFIXES):
                # Don't overwrite if already exists in Check
                if key not in data["Check"]:
                    data["Check"][key] = value
                    copied += 1
        
        if copied > 0:
            with open(fpath, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
                f.write("\n")
        
        print(f"  {locale}: +{copied} keys to Check namespace")
        total_copied += copied
    
    print(f"\n✅ Total: +{total_copied} keys copied across {len(locale_files)} locale files")

if __name__ == "__main__":
    main()
