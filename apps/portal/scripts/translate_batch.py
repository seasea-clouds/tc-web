#!/usr/bin/env python3
"""Batch-translate compli-service messages to 47 languages."""

import json
import os
import time
from deep_translator import GoogleTranslator

MSG_DIR = "/root/projects/trade/compli-service/messages"

LOCALE_TO_GT = {
    "af": "af", "ar": "ar", "az": "az", "be": "be", "bg": "bg", "bn": "bn",
    "ca": "ca", "cs": "cs", "da": "da", "de": "de", "el": "el", "es": "es",
    "fa": "fa", "fi": "fi", "fr": "fr", "he": "he", "hi": "hi", "hr": "hr",
    "hu": "hu", "hy": "hy", "id": "id", "it": "it", "ja": "ja", "ka": "ka",
    "ko": "ko", "ms": "ms", "ne": "ne", "nl": "nl", "no": "no", "pl": "pl",
    "pt": "pt", "ro": "ro", "ru": "ru", "si": "si", "sk": "sk", "sl": "sl",
    "sq": "sq", "sr": "sr", "sv": "sv", "sw": "sw", "ta": "ta", "th": "th",
    "tr": "tr", "uk": "uk", "ur": "ur", "vi": "vi", "zh": "zh-CN",
}

SKIP_VALUES = {
    "SinoTrade Compliance", "https://sinotradecompliance.com/en/quote/",
    "david@sinotradecompliance.com", "https://wa.me/message/HPPZ5X6XZSMLM1",
    "Jing'an District, Shanghai, China",
}

def flatten(obj, prefix=""):
    """Flatten nested JSON into list of (path, value) tuples."""
    items = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            items.extend(flatten(v, f"{prefix}.{k}" if prefix else k))
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            items.extend(flatten(v, f"{prefix}[{i}]"))
    elif isinstance(obj, str):
        items.append((prefix, obj))
    return items

def unflatten(items):
    """Restore nested structure from flattened list."""
    result = {}
    for path, value in items:
        parts = path.split(".")
        current = result
        for i, part in enumerate(parts):
            if i == len(parts) - 1:
                current[part] = value
            else:
                if part not in current:
                    # Check if next part is numeric index
                    current[part] = {}
                current = current[part]
    return result

def main():
    en_path = os.path.join(MSG_DIR, "en.json")
    with open(en_path) as f:
        en_data = json.load(f)

    # Flatten English structure to get all value paths
    all_items = flatten(en_data)
    # Get just the string values that need translation
    texts_to_translate = []
    path_map = []
    for path, val in all_items:
        if isinstance(val, str) and val.strip() and val not in SKIP_VALUES and not val.startswith("http") and not val.startswith("©") and not val.startswith("Disclaimer"):
            texts_to_translate.append(val)
            path_map.append(path)

    print(f"Total {len(texts_to_translate)} translatable strings")

    for locale, gt_lang in sorted(LOCALE_TO_GT.items()):
        if locale == "en":
            continue
        
        filepath = os.path.join(MSG_DIR, f"{locale}.json")
        print(f"\n--- {locale} ({gt_lang}) ---", flush=True)

        # Batch translate (Google Translate supports ~5000 chars per call)
        try:
            translator = GoogleTranslator(source="en", target=gt_lang)
            translated_texts = translator.translate_batch(texts_to_translate)
            time.sleep(0.5)
        except Exception as e:
            print(f"  ⚠️ Batch failed: {e}", flush=True)
            # Fall back to individual translation
            translated_texts = []
            for txt in texts_to_translate:
                try:
                    translated_texts.append(GoogleTranslator(source="en", target=gt_lang).translate(txt))
                    time.sleep(0.3)
                except:
                    translated_texts.append(txt)

        # Build result starting from English
        result = json.loads(json.dumps(en_data))  # deep copy

        # Apply translations
        for path, translated in zip(path_map, translated_texts):
            parts = path.split(".")
            obj = result
            for i, part in enumerate(parts):
                if i == len(parts) - 1:
                    if isinstance(obj, dict) and part in obj and isinstance(obj[part], str):
                        obj[part] = translated
                else:
                    obj = obj.get(part, {})

        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)

        print(f"  → Saved ({len(translated_texts)} keys)", flush=True)

    print("\n✅ All languages complete!")

if __name__ == "__main__":
    main()
