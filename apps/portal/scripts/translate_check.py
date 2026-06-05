#!/usr/bin/env python3
"""Translate Check namespace — single-threaded, mobile endpoint, regex parse."""
import json, os, sys, time, re, requests

MSG_DIR = "/root/projects/trade/web/apps/portal/messages"
SKIP = {"SinoTrade Compliance","SinoTrade","GACC","NMPA","CCC","HS","CE","UL","FCC",
    "ABV","HS Code","GB","Yes","No","None","Other","Partial","Not sure",
    "yes","no","ce","ul","fcc","other","none","Your Product","Loading","Redirecting",
    "Content-Type","e.g.","application/json",
    "https://wa.me/message/HPPZ5X6XZSMLM1","david@sinotradecompliance.com",
    "Jing'an District, Shanghai, China"}
LOCALES = ["af","ar","az","be","bg","bn","ca","cs","da","de","el","es","fa","fi",
    "fr","he","hi","hr","hu","hy","id","it","ja","ka","ko","ms","ne","nl","no",
    "pl","pt","ro","ru","si","sk","sl","sq","sr","sv","sw","ta","th","tr","uk","ur","vi"]
PAT = re.compile(r'class="(?:t0|result-container)"[^>]*>([^<]+)')
sys.stdout = open(sys.stdout.fileno(), 'w', buffering=1)

en = json.load(open(os.path.join(MSG_DIR, "en.json")))
en_check = en["Check"]
total = len(LOCALES)
print(f"Check: {len(en_check)} keys, {total} langs", flush=True)

s = requests.Session()
s.headers.update({"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"})

done = 0
for locale in LOCALES:
    path = os.path.join(MSG_DIR, f"{locale}.json")
    lang = json.load(open(path))
    exist = lang.get("Check", {}) or {}
    todo = [(k, v) for k, v in en_check.items() if k not in exist or exist.get(k) == v]
    if not todo: done += 1; continue
    
    cnt = 0
    for k, v in todo:
        if not v or len(v) <= 2 or v in SKIP or v.startswith("http") or "@" in v:
            exist[k] = v
        else:
            try:
                r = s.get("https://translate.google.com/m",
                    params={"sl":"en","tl":locale,"q":v[:5000]}, timeout=30)
                m = PAT.search(r.text)
                exist[k] = m.group(1) if m else v
                cnt += 1
            except:
                exist[k] = v
            time.sleep(1.0)
    
    lang["Check"] = exist
    json.dump(lang, open(path, "w"), indent=2, ensure_ascii=False)
    done += 1
    eta = (total - done) * 200 // 60
    print(f"  [{done:2d}/{total}] {locale}: {cnt} keys (~{eta}m left)", flush=True)

print(f"\n✅ ALL {done} LANGUAGES DONE!", flush=True)
