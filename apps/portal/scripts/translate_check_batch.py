#!/usr/bin/env python3
"""
Retranslate Check module for missed languages.
Saves after every 10 keys to avoid losing progress.
"""
import json, os, sys, time

sys.path.insert(0, "/root/projects/translate-tool")
from lib.translation_engine import TranslationEngine

en = json.load(open("messages/en.json"))
engine = TranslationEngine(caller="t6-check-batch")

TARGETS = ["ta", "th", "tr", "uk", "ur", "vi", "zh"]
LOG = "/tmp/t6-check-batch.log"
# Check if we're resuming
RESUME = "/tmp/t6-check-batch-resume.json"

SKIP_KEYS = {"ce", "ul", "fcc", "no"}
SKIP_KEYNAMES = {"reportFooterEmail", "reportFooterName", "reportFooterAddress", "reportFooterWebsite"}
SKIP_TEXTS = {"david@sinotradecompliance.com", "Jing'an District, Shanghai, China", "SinoTrade Compliance"}

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

# Load resume state
resume = {}
if os.path.exists(RESUME):
    try:
        resume = json.load(open(RESUME))
        log(f"🔄 Resuming from checkpoint: {len(resume)} languages partially done")
    except:
        pass

start = time.time()
total = 0

for lang in TARGETS:
    path = f"messages/{lang}.json"
    d = json.load(open(path))
    check = d.get("Check", {})
    
    # Find what still needs translation
    todo = [(k, v) for k, v in en["Check"].items()
            if not should_skip(k, v) and (k not in check or not check[k] or check[k] == v)]
    
    if not todo:
        log(f"⏭️ {lang}: nothing to do")
        continue
    
    # Resume from last position
    done_keys = set(resume.get(lang, {}).get("done", []))
    todo = [(k, v) for k, v in todo if k not in done_keys]
    
    if not todo:
        log(f"⏭️ {lang}: all {len(done_keys)} already done (from resume)")
        total += len(done_keys)
        continue
    
    log(f"📝 {lang}: {len(todo)} keys to translate")
    
    cnt = 0
    batch = []
    for idx, (k, v) in enumerate(todo):
        try:
            r = engine.translate(v, tgt=lang)
            if r and r != v:
                check[k] = r
                cnt += 1
                batch.append(k)
                log(f"  {lang}/{k}: \"{str(v)[:40]}\" -> \"{str(r)[:40]}\"")
            else:
                check[k] = v
        except Exception as e:
            log(f"  ⚠️ {lang}/{k} failed: {e}")
            check[k] = v
        
        # Save checkpoint every 10 keys
        if len(batch) >= 10 or idx == len(todo) - 1:
            d["Check"] = check
            json.dump(d, open(path, "w"), indent=2, ensure_ascii=False)
            # Update resume
            resume.setdefault(lang, {"done": []})["done"].extend(batch)
            json.dump(resume, open(RESUME, "w"))
            batch = []
            log(f"  💾 {lang}: saved ({idx+1}/{len(todo)})")
    
    total += cnt
    log(f"✅ {lang}: +{cnt}")

# Cleanup resume
if os.path.exists(RESUME):
    os.unlink(RESUME)

elapsed = (time.time() - start) / 60
log(f"\n🎉 DONE! {total} translations in {elapsed:.0f}m")
