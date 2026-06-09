#!/usr/bin/env python3
"""
merge-translations.py - 将 translate-tool 输出合并到 apps/site/messages/{locale}.json

用法:
  # 1. 等翻译完成后导出结果
  cd /root/projects/translate-tool
  source /root/projects/.venv/bin/activate
  python3 -m translate_tool.cli results -n industry-meta-v2 -o /tmp/industry-meta-results.json

  # 2. 合并到各语言 JSON
  python3 merge-translations.py /tmp/industry-meta-results.json
"""

import json
import sys
import os

SITE_MESSAGES_DIR = "/root/projects/trade/web/apps/site/messages"

def merge_into_messages(results_file: str):
    with open(results_file) as f:
        data = json.load(f)
    
    results = data.get("results", data)
    stats = {"updated": 0, "files": 0}
    
    for locale, translations in results.items():
        filepath = os.path.join(SITE_MESSAGES_DIR, f"{locale}.json")
        if not os.path.exists(filepath):
            print(f"⚠️  {filepath} not found, skipping {locale}")
            continue
        
        with open(filepath) as f:
            messages = json.load(f)
        
        file_updated = False
        for key, translated_text in translations.items():
            # key is like "IndustryDairy.metaTitle"
            parts = key.split(".")
            if len(parts) == 2:
                namespace, msg_key = parts
                if namespace not in messages:
                    messages[namespace] = {}
                if msg_key not in messages[namespace]:
                    messages[namespace][msg_key] = translated_text
                    stats["updated"] += 1
                    file_updated = True
                # else: keep existing translation
        
        if file_updated:
            stats["files"] += 1
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(messages, f, ensure_ascii=False, indent=2)
            print(f"✅ {locale}.json updated")
    
    print(f"\nDone: {stats['updated']} keys added across {stats['files']} files")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: merge-translations.py <translate-tool-results.json>")
        sys.exit(1)
    merge_into_messages(sys.argv[1])
