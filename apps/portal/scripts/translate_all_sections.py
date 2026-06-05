#!/usr/bin/env python3
"""
Batch translate all Portal sections to 47 languages.
Handles: Home, Auth, Dashboard, Pricing, Report
Skips: Check (already done), en.json (source)
"""
import json, os, sys, time

PID_FILE = "/tmp/t6-translate.pid"  # reuse lock
MSG = "/root/projects/trade/web/apps/portal/messages"
LOG = "/tmp/t6-all-sections.log"
LOCALES = sorted([
    "af","ar","az","be","bg","bn","ca","cs","da","de","el","es","fa","fi",
    "fr","he","hi","hr","hu","hy","id","it","ja","ka","ko","ms","ne","nl",
    "no","pl","pt","ro","ru","si","sk","sl","sq","sr","sv","sw","ta","th",
    "tr","uk","ur","vi","zh"
])
SECTIONS = ["Home", "Auth", "Dashboard", "Pricing", "Report"]

# Items that should NEVER be translated
SKIP_VALUES = {
    "david@sinotradecompliance.com",
    "Jing'an District, Shanghai, China",
    "SinoTrade Compliance",
}
# Skip specific keys
SKIP_KEYS = {
    "reportFooterEmail",
    "reportFooterName",
    "reportFooterAddress",
    "reportFooterWebsite",
}

sys.path.insert(0, "/root/projects/translate-tool")
from lib.translation_engine import TranslationEngine

def log(m):
    t = time.strftime("%H:%M:%S")
    with open(LOG, "a") as f:
        f.write(f"[{t}] {m}\n")
    print(f"[{t}] {m}", flush=True)

# PID lock
if os.path.exists(PID_FILE):
    with open(PID_FILE) as f:
        pid = f.read().strip()
    if pid and os.path.exists(f"/proc/{pid}"):
        log("❌ Another process is running")
        sys.exit(1)
    os.unlink(PID_FILE)
with open(PID_FILE, "w") as f:
    f.write(str(os.getpid()))

try:
    engine = TranslationEngine(caller="t6-all-sections")
    en = json.load(open(f"{MSG}/en.json"))
    start = time.time()
    total_translated = 0

    for locale in LOCALES:
        path = f"{MSG}/{locale}.json"
        lang = json.load(open(path))
        lang_changed = False

        for section in SECTIONS:
            en_sec = en.get(section, {})
            lang_sec = lang.get(section, {})

            todo = []
            for k, v in en_sec.items():
                if k in SKIP_KEYS:
                    continue
                if isinstance(v, str) and v in SKIP_VALUES:
                    continue
                # Skip prices and emails
                if isinstance(v, str) and (v.startswith("$") or "@" in v):
                    continue
                existing = lang_sec.get(k, "")
                if not existing or existing == v:
                    todo.append((k, v))

            if not todo:
                continue

            cnt = 0
            for k, v in todo:
                if not v or len(v) <= 2:
                    lang_sec[k] = v
                    continue
                try:
                    r = engine.translate(v, tgt=locale)
                    lang_sec[k] = r if r else v
                    cnt += 1
                except Exception as e:
                    log(f"⚠️ {locale}.{section}.{k} failed: {e}")
                    lang_sec[k] = v

            lang[section] = lang_sec
            if cnt:
                lang_changed = True
                log(f"{locale}/{section}: +{cnt}")

        if lang_changed:
            json.dump(lang, open(path, "w"), indent=2, ensure_ascii=False)
            total_translated += 1

    elapsed = (time.time() - start) / 60
    log(f"✅ ALL DONE! {elapsed:.0f}m, {total_translated} languages touched")

except Exception as e:
    log(f"❌ Fatal: {e}")
finally:
    if os.path.exists(PID_FILE):
        os.unlink(PID_FILE)
