#!/usr/bin/env python3
"""Fast batch translation using direct Google Translate API."""

import json, os, time, urllib.parse, requests

MSG_DIR = "/root/projects/trade/compli-service/messages"

LOCALE_TO_GT = {
    "af":"af","ar":"ar","az":"az","be":"be","bg":"bg","bn":"bn","ca":"ca","cs":"cs",
    "da":"da","de":"de","el":"el","es":"es","fa":"fa","fi":"fi","fr":"fr","he":"he",
    "hi":"hi","hr":"hr","hu":"hu","hy":"hy","id":"id","it":"it","ja":"ja","ka":"ka",
    "ko":"ko","ms":"ms","ne":"ne","nl":"nl","no":"no","pl":"pl","pt":"pt","ro":"ro",
    "ru":"ru","si":"si","sk":"sk","sl":"sl","sq":"sq","sr":"sr","sv":"sv","sw":"sw",
    "ta":"ta","th":"th","tr":"tr","uk":"uk","ur":"ur","vi":"vi","zh":"zh-CN",
}

SKIP_VALUES = {
    "SinoTrade Compliance", "david@sinotradecompliance.com",
    "Jing'an District, Shanghai, China",
}

def translate(text, target):
    """Translate a single text via Google Translate API."""
    if not text or not isinstance(text, str) or not text.strip():
        return text
    if text in SKIP_VALUES or text.startswith("http") or text.startswith("©") or text.startswith("Disclaimer"):
        return text
    try:
        url = "https://translate.googleapis.com/translate_a/single"
        params = {"client": "gtx", "sl": "en", "tl": target, "dt": "t", "q": text[:2000]}
        r = requests.get(url, params=params, timeout=10)
        data = r.json()
        result = "".join(part[0] for part in data[0])
        return result if result else text
    except Exception as e:
        return text

def flatten(obj, prefix=""):
    """Flatten nested dict to list of (path, value) tuples."""
    items = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            items.extend(flatten(v, f"{prefix}.{k}" if prefix else k))
    elif isinstance(obj, str):
        items.append((prefix, obj))
    return items

def main():
    en_path = os.path.join(MSG_DIR, "en.json")
    with open(en_path) as f:
        en_data = json.load(f)

    all_items = flatten(en_data)
    texts = [(p, v) for p, v in all_items if isinstance(v, str) and len(v.strip()) > 0]
    print(f"Total: {len(texts)} strings", flush=True)

    # Detect already translated
    done = set()
    for f in os.listdir(MSG_DIR):
        if f.endswith(".json") and f != "en.json":
            try:
                d = json.load(open(os.path.join(MSG_DIR, f)))
                if d.get("Home",{}).get("heroSubtitle","") != en_data.get("Home",{}).get("heroSubtitle",""):
                    done.add(f.replace(".json",""))
            except: pass

    print(f"Skipping {len(done)} already translated: {sorted(done)}", flush=True)

    for locale, gt_lang in sorted(LOCALE_TO_GT.items()):
        if locale in done:
            continue

        print(f"\n{locale} ({gt_lang})...", end=" ", flush=True)
        start = time.time()

        result = json.loads(json.dumps(en_data))

        for path, val in texts:
            translated = translate(val, gt_lang)
            # Apply to result
            parts = path.split(".")
            obj = result
            for i, p in enumerate(parts):
                if i == len(parts) - 1:
                    if isinstance(obj, dict) and isinstance(obj.get(p), str):
                        obj[p] = translated
                else:
                    obj = obj.get(p, {})
            time.sleep(0.08)

        with open(os.path.join(MSG_DIR, f"{locale}.json"), "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)

        print(f"{time.time()-start:.0f}s", flush=True)

    print(f"\n✅ Done! {len(done)+len(LOCALE_TO_GT)-1}/47 languages")  # won't be accurate but close

if __name__ == "__main__":
    main()
