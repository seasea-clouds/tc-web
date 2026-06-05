#!/usr/bin/env python3
"""Batch translate — one POST per language, all 197 keys at once."""
import json, os, sys, time, requests

MSG_DIR = "/root/projects/trade/web/apps/portal/messages"
LOCALE_MAP = {"af":"af","ar":"ar","az":"az","be":"be","bg":"bg","bn":"bn","ca":"ca",
    "cs":"cs","da":"da","de":"de","el":"el","es":"es","fa":"fa","fi":"fi","fr":"fr",
    "he":"he","hi":"hi","hr":"hr","hu":"hu","hy":"hy","id":"id","it":"it","ja":"ja",
    "ka":"ka","ko":"ko","ms":"ms","ne":"ne","nl":"nl","no":"no","pl":"pl","pt":"pt",
    "ro":"ro","ru":"ru","si":"si","sk":"sk","sl":"sl","sq":"sq","sr":"sr","sv":"sv",
    "sw":"sw","ta":"ta","th":"th","tr":"tr","uk":"uk","ur":"ur","vi":"vi"}
SKIP = {"SinoTrade Compliance","SinoTrade","GACC","NMPA","CCC","HS","CE","UL","FCC",
    "ABV","HS Code","GB","Yes","No","None","Other","Partial","Not sure",
    "yes","no","ce","ul","fcc","other","none","Your Product","Loading","Redirecting",
    "Content-Type","e.g.","application/json",
    "https://wa.me/message/HPPZ5X6XZSMLM1","david@sinotradecompliance.com",
    "Jing'an District, Shanghai, China"}
s = requests.Session()

en = json.load(open(os.path.join(MSG_DIR, "en.json")))
en_check = en["Check"]
locales = sorted(LOCALE_MAP.keys())
sys.stdout.reconfigure(line_buffering=True)

print(f"Check: {len(en_check)} keys, {len(locales)} langs", flush=True)

done = 0
for locale in locales:
    path = os.path.join(MSG_DIR, f"{locale}.json")
    lang = json.load(open(path))
    exist = lang.get("Check", {}) or {}
    todo = [(k, v) for k, v in en_check.items() if k not in exist or exist.get(k) == v]
    if not todo:
        done += 1
        continue
    
    # Filter into skip and translate
    translate_texts = []
    translate_keys = []
    for k, v in todo:
        if not v or len(v) <= 2 or v in SKIP or v.startswith("http") or "@" in v:
            exist[k] = v
        else:
            translate_keys.append(k)
            translate_texts.append(v)
    
    if not translate_texts:
        cnt = 0
    else:
        gt = LOCALE_MAP[locale]
        # Split into batches of 50 (API limit)
        all_results = {}
        for i in range(0, len(translate_texts), 50):
            batch = translate_texts[i:i+50]
            batch_keys = translate_keys[i:i+50]
            for attempt in range(5):
                try:
                    url = "https://translate.googleapis.com/translate_a/single"
                    params = {"client":"gtx","sl":"en","tl":gt,"dt":"t"}
                    data = {"q": batch}
                    r = s.post(url, params=params, data=data, timeout=60)
                    if r.status_code == 429:
                        time.sleep(5*(2**attempt))
                        continue
                    r.raise_for_status()
                    resp = r.json()
                    for j, item in enumerate(resp[0]):
                        if isinstance(item, list) and len(item) > 0:
                            all_results[batch_keys[j]] = item[0]
                        else:
                            all_results[batch_keys[j]] = batch[j]
                    break
                except Exception as e:
                    if attempt < 4:
                        time.sleep(3*(2**attempt))
                    else:
                        for kt, vt in zip(batch_keys, batch):
                            all_results[kt] = vt
            time.sleep(2)  # 2s between batches
        
        for k, v in all_results.items():
            exist[k] = v
        cnt = len(translate_texts)
    
    lang["Check"] = exist
    json.dump(lang, open(path, "w"), indent=2, ensure_ascii=False)
    done += 1
    print(f"  [{done:2d}/{len(locales)}] {locale}: {cnt} keys", flush=True)

print(f"\n✅ Done! {done} langs.", flush=True)
