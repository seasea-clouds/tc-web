#!/usr/bin/env python3
"""Translate portal Check namespace - robust, resume-capable."""
import json, os, sys, time
from deep_translator import GoogleTranslator

MSG_DIR = "/root/projects/trade/web/apps/portal/messages"
SKIP = {"SinoTrade Compliance","SinoTrade","GACC","NMPA","CCC","HS","CE","UL","FCC",
    "ABV","HS Code","GB","Yes","No","None","Other","Partial","Not sure",
    "yes","no","ce","ul","fcc","other","none","Your Product","Loading","Redirecting",
    "Content-Type","e.g.","application/json",
    "https://wa.me/message/HPPZ5X6XZSMLM1","david@sinotradecompliance.com",
    "Jing'an District, Shanghai, China"}
LOCALE_MAP = {"af":"af","ar":"ar","az":"az","be":"be","bg":"bg","bn":"bn","ca":"ca",
    "cs":"cs","da":"da","de":"de","el":"el","es":"es","fa":"fa","fi":"fi","fr":"fr",
    "he":"he","hi":"hi","hr":"hr","hu":"hu","hy":"hy","id":"id","it":"it","ja":"ja",
    "ka":"ka","ko":"ko","ms":"ms","ne":"ne","nl":"nl","no":"no","pl":"pl","pt":"pt",
    "ro":"ro","ru":"ru","si":"si","sk":"sk","sl":"sl","sq":"sq","sr":"sr","sv":"sv",
    "sw":"sw","ta":"ta","th":"th","tr":"tr","uk":"uk","ur":"ur","vi":"vi"}
sys.stdout.reconfigure(line_buffering=True)

en = json.load(open(os.path.join(MSG_DIR, "en.json")))
en_check = en["Check"]
locales = sorted(LOCALE_MAP.keys())
total = len(locales)

print(f"Check: {len(en_check)} keys, {total} languages", flush=True)

done = 0
for locale in locales:
    path = os.path.join(MSG_DIR, f"{locale}.json")
    lang = json.load(open(path))
    exist = lang.get("Check", {}) or {}
    todo = [(k, v) for k, v in en_check.items() if k not in exist or exist.get(k) == v]
    
    if not todo:
        done += 1
        continue
    
    cnt = 0
    for k, v in todo:
        if not v or len(v) <= 2 or v in SKIP or v.startswith("http") or "@" in v:
            exist[k] = v
        else:
            try:
                t = GoogleTranslator(source="en", target=LOCALE_MAP[locale])
                exist[k] = t.translate(v) or v
                cnt += 1
                time.sleep(1.0)
            except:
                exist[k] = v
                time.sleep(3)
    
    lang["Check"] = exist
    json.dump(lang, open(path, "w"), indent=2, ensure_ascii=False)
    done += 1
    pct = done * 100 // total
    print(f"  [{done:2d}/{total} {pct}%] {locale}: {cnt} keys", flush=True)

print(f"\n✅ All {done} languages done!", flush=True)
