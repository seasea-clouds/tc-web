#!/usr/bin/env python3
"""
t6_daemon.py — Portal 多语言增量翻译守护脚本

由 cron 每 5 分钟触发（t6-translate）。
PID 锁防止并行。每次运行最多处理 5 个 locale (增量)。
用 requests 直调 Google Translate API（更轻量，不易 timeout）。
"""

import json
import os
import time
import requests

PID_FILE = "/tmp/t6-translate.pid"
MSG_DIR = "/root/projects/trade/web/apps/portal/messages"
LOG_FILE = "/tmp/t6-cron.log"
MAX_LOCALES_PER_RUN = 5  # 每次 cron 触发最多翻译 5 个语言

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
    "SinoTrade Compliance",
    "https://sinotradecompliance.com/en/quote/",
    "david@sinotradecompliance.com",
    "https://wa.me/message/HPPZ5X6XZSMLM1",
    "Jing'an District, Shanghai, China",
}


def log(msg):
    ts = time.strftime("[%H:%M:%S]")
    line = f"{ts} {msg}"
    print(line, flush=True)
    with open(LOG_FILE, "a") as f:
        f.write(line + "\n")


def acquire_lock():
    if os.path.exists(PID_FILE):
        with open(PID_FILE) as f:
            try:
                old_pid = int(f.read().strip())
            except ValueError:
                old_pid = None
        if old_pid:
            try:
                os.kill(old_pid, 0)
                log(f"⚠️  Already running (PID {old_pid}), skipping")
                return False
            except OSError:
                pass  # stale pid
        os.unlink(PID_FILE)
    with open(PID_FILE, "w") as f:
        f.write(str(os.getpid()))
    return True


def release_lock():
    if os.path.exists(PID_FILE):
        try:
            with open(PID_FILE) as f:
                pid = int(f.read().strip())
            if pid == os.getpid():
                os.unlink(PID_FILE)
        except (ValueError, OSError):
            os.unlink(PID_FILE)


def flatten_dict(d, prefix=""):
    items = {}
    if isinstance(d, dict):
        for k, v in d.items():
            p = f"{prefix}.{k}" if prefix else k
            if isinstance(v, dict):
                items.update(flatten_dict(v, p))
            elif isinstance(v, str):
                items[p] = v
    return items


def unflatten_to(flat, target):
    for path, value in flat.items():
        parts = path.split(".")
        obj = target
        for i, part in enumerate(parts):
            if i == len(parts) - 1:
                if isinstance(obj, dict) and part in obj:
                    obj[part] = value
            else:
                obj = obj.get(part, {})


def should_skip(text):
    if not text or not isinstance(text, str) or not text.strip():
        return True
    if text in SKIP_VALUES:
        return True
    if text.startswith("http://") or text.startswith("https://"):
        return True
    if text.startswith("©") or text.startswith("Disclaimer"):
        return True
    return False


def translate_via_google(text, target_lang):
    """Translate single text via Google Translate API over requests."""
    if should_skip(text):
        return text
    try:
        url = "https://translate.googleapis.com/translate_a/single"
        params = {
            "client": "gtx",
            "sl": "en",
            "tl": target_lang,
            "dt": "t",
            "q": text[:2000],
        }
        r = requests.get(url, params=params, timeout=10)
        r.raise_for_status()
        data = r.json()
        result = "".join(part[0] for part in data[0])
        return result if result else text
    except Exception as e:
        log(f"    ⚠️ translate error: {e}")
        return text


def sort_locales_by_priority():
    """Return locales sorted by need (most untranslated first)."""
    en_path = os.path.join(MSG_DIR, "en.json")
    with open(en_path) as f:
        en_data = json.load(f)
    en_flat = flatten_dict(en_data)

    scores = []
    for locale in LOCALE_TO_GT:
        if locale == "en":
            continue
        loc_path = os.path.join(MSG_DIR, f"{locale}.json")
        if not os.path.exists(loc_path):
            scores.append((9999, locale))
            continue
        with open(loc_path) as f:
            loc_data = json.load(f)
        loc_flat = flatten_dict(loc_data)
        untranslated = sum(
            1 for k, v in en_flat.items()
            if loc_flat.get(k, "") == v and not should_skip(v)
        )
        scores.append((untranslated, locale))

    scores.sort(key=lambda x: -x[0])
    return [loc for _, loc in scores]


def main():
    if not acquire_lock():
        return

    start_ts = time.time()
    total_translated = 0
    processed = 0

    try:
        en_path = os.path.join(MSG_DIR, "en.json")
        if not os.path.exists(en_path):
            log("❌ en.json not found")
            return

        with open(en_path) as f:
            en_data = json.load(f)
        en_flat = flatten_dict(en_data)

        # Collect translatable English texts
        en_texts = [(k, v) for k, v in en_flat.items() if not should_skip(v)]

        # Sort locales by most needed first
        locale_order = sort_locales_by_priority()

        for locale in locale_order:
            if processed >= MAX_LOCALES_PER_RUN:
                break

            loc_path = os.path.join(MSG_DIR, f"{locale}.json")
            if not os.path.exists(loc_path):
                log(f"⚠️  {locale}: file missing, skipping")
                continue

            with open(loc_path) as f:
                loc_data = json.load(f)
            loc_flat = flatten_dict(loc_data)

            # Find untranslated keys (still equal to English)
            untranslated = {}
            for key, en_val in en_texts:
                loc_val = loc_flat.get(key, "")
                if loc_val == en_val:
                    untranslated[key] = en_val

            if not untranslated:
                continue

            gt_lang = LOCALE_TO_GT[locale]
            n = len(untranslated)

            log(f"{locale}: {n} keys → {gt_lang}")

            new_vals = {}
            for i, (key, en_val) in enumerate(untranslated.items()):
                translated = translate_via_google(en_val, gt_lang)
                new_vals[key] = translated
                time.sleep(0.1)  # rate limit

            unflatten_to(new_vals, loc_data)

            with open(loc_path, "w", encoding="utf-8") as f:
                json.dump(loc_data, f, ensure_ascii=False, indent=2)

            total_translated += n
            processed += 1
            log(f"  ✅ {locale}: +{n}")

            # Brief pause between locales
            time.sleep(0.5)

    except Exception as e:
        log(f"❌ Error: {e}")
        raise
    finally:
        release_lock()

    elapsed = int(time.time() - start_ts)
    log(f"📊 {processed} locales, {total_translated} translations in {elapsed}s")


if __name__ == "__main__":
    main()
