#!/usr/bin/env python3
"""Retranslate Check module for languages that were missed."""
import json, os, sys, time

sys.path.insert(0, "/root/projects/translate-tool")
from lib.translation_engine import TranslationEngine

en = json.load(open("messages/en.json"))
engine = TranslationEngine(caller="t6-check-retranslate")

TARGETS = ["ta", "th", "tr", "uk", "ur", "vi", "zh"]
LOG = "/tmp/t6-check-retranslate.log"
SKIP_KEYS = {"ce", "ul", "fcc", "no"}
SKIP_TEXTS = {"david@sinotradecompliance.com", "Jing'an District, Shanghai, China", "SinoTrade Compliance"}
SKIP_KEYNAMES = {"reportFooterEmail", "reportFooterName", "reportFooterAddress", "reportFooterWebsite"}

def log(m):
    t = time.strftime("%H:%M:%S")
    with open(LOG, "a") as f:
        f.write(f"[{t}] {m}\n")
    print(f"[{t}] {m}", flush=True)

def should_skip(k, v):
    if k in SKIP_KEYS or k in SKIP_KEYNAMES:
        return True
    if v in SKIP_TEXTS:
        return True
    if v.startswith("$") or "@" in v:
        return True
    if len(v) <= 2:
        return True
    return False

start = time.time()
total = 0

for lang in TARGETS:
    path = f"messages/{lang}.json"
    d = json.load(open(path))
    check = d.get("Check", {})
    todo = [(k, v) for k, v in en["Check"].items()
            if not should_skip(k, v) and (k not in check or not check[k] or check[k] == v)]
    
    if not todo:
        log(f"⏭️ {lang}: nothing to do")
        continue

    cnt = 0
    for k, v in todo:
        try:
            r = engine.translate(v, tgt=lang)
            if r and r != v:
                check[k] = r
                cnt += 1
                log(f"  {lang}/{k}: \"{str(v)[:40]}\" -> \"{str(r)[:40]}\"")
            else:
                check[k] = v
        except Exception as e:
            log(f"  ⚠️ {lang}/{k} failed: {e}")
            check[k] = v

    d["Check"] = check
    json.dump(d, open(path, "w"), indent=2, ensure_ascii=False)
    total += cnt
    log(f"✅ {lang}: +{cnt}")

elapsed = (time.time() - start) / 60
log(f"\n🎉 DONE! {total} translations in {elapsed:.0f}m")
