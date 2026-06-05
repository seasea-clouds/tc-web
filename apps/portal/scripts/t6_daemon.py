#!/usr/bin/env python3
"""PID锁翻译守护 — 供OpenClaw cron每5分钟调用。已有进程则跳过。"""
import json, os, sys, time
sys.path.insert(0, "/root/projects/translate-tool")
from lib.translation_engine import TranslationEngine

PID_FILE = "/tmp/t6-translate.pid"
MSG = "/root/projects/trade/web/apps/portal/messages"
LOG = "/tmp/t6-cron.log"
LOCALES = ["af","ar","az","be","bg","bn","ca","cs","da","de","el","es","fa","fi",
    "fr","he","hi","hr","hu","hy","id","it","ja","ka","ko","ms","ne","nl","no",
    "pl","pt","ro","ru","si","sk","sl","sq","sr","sv","sw","ta","th","tr","uk","ur","vi"]

def log(m):
    t = time.strftime("%H:%M:%S")
    with open(LOG, "a") as f: f.write(f"[{t}] {m}\n")

# PID Lock
if os.path.exists(PID_FILE):
    with open(PID_FILE) as f:
        pid = f.read().strip()
    if pid and os.path.exists(f"/proc/{pid}"):
        sys.exit(0)  # 已有进程在跑
    os.unlink(PID_FILE)
with open(PID_FILE, "w") as f:
    f.write(str(os.getpid()))

try:
    engine = TranslationEngine(caller="t6-cron")
    en = json.load(open(f"{MSG}/en.json"))["Check"]
    start = time.time()

    for locale in LOCALES:
        path = f"{MSG}/{locale}.json"
        lang = json.load(open(path))
        exist = lang.get("Check", {}) or {}
        todo = [(k,v) for k,v in en.items() if k not in exist or exist.get(k)==v]
        if not todo: continue
        cnt = 0
        for k,v in todo:
            if not v or len(v)<=2: exist[k]=v; continue
            try:
                r = engine.translate(v, tgt=locale)
                exist[k] = r if r else v; cnt += 1
            except: exist[k] = v
        lang["Check"] = exist
        json.dump(lang, open(path, "w"), indent=2, ensure_ascii=False)
        log(f"{locale}: +{cnt}")

    log(f"✅ ALL DONE! {(time.time()-start)/60:.0f}m")
except Exception as e:
    log(f"❌ {e}")
finally:
    if os.path.exists(PID_FILE): os.unlink(PID_FILE)
