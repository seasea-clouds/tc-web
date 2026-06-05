#!/usr/bin/env python3
"""
T6 翻译 — Cron 模式。PID 锁防并行，每5分钟启动一次，运行中的自动跳过。

安全翻译：signal.alarm() 防止 API 无限挂起。
"""
import json, os, sys, time, signal

PID_FILE = "/tmp/t6-translate.pid"
STATUS_FILE = "/tmp/translate-t6.json"
MSG_DIR = "/root/projects/trade/web/apps/portal/messages"
LOG = "/tmp/t6-cron.log"

LOCALES = ["af","ar","az","be","bg","bn","ca","cs","da","de","el","es","fa","fi",
    "fr","he","hi","hr","hu","hy","id","it","ja","ka","ko","ms","ne","nl","no",
    "pl","pt","ro","ru","si","sk","sl","sq","sr","sv","sw","ta","th","tr","uk","ur","vi"]
SKIP = {"SinoTrade Compliance","SinoTrade","GACC","NMPA","CCC","HS","CE","UL","FCC",
    "ABV","HS Code","GB","Yes","No","None","Other","Partial","Not sure",
    "yes","no","ce","ul","fcc","other","none","Your Product","Loading","Redirecting",
    "Content-Type","e.g.","application/json",
    "https://wa.me/message/HPPZ5X6XZSMLM1","david@sinotradecompliance.com","Jing'an District, Shanghai, China",
    "China Trade Compliance Glossary","SinoTrade Compliance Services","SinoTrade Quote Form","SinoTrade Website"}

sys.stdout = open(sys.stdout.fileno(), 'w', buffering=1)
sys.path.insert(0, "/root/projects/translate-tool")
from lib.translation_engine import TranslationEngine

class TranslateTimeout(Exception):
    pass

def _timeout_handler(_sig, _frame):
    raise TranslateTimeout("translation timeout")

def safe_translate(engine, text, locale, timeout=25):
    """调用 engine.translate，timeout 秒未完成则中断并返回原始文本。"""
    old = signal.signal(signal.SIGALRM, _timeout_handler)
    signal.alarm(timeout)
    try:
        return engine.translate(text, tgt=locale)
    except TranslateTimeout:
        return None  # 超时标记
    except Exception:
        raise
    finally:
        signal.alarm(0)
        signal.signal(signal.SIGALRM, old)

def log_msg(msg):
    t = time.strftime("%H:%M:%S")
    line = f"[{t}] {msg}"
    print(line, flush=True)
    with open(LOG, "a") as f:
        f.write(line + "\n")

def acquire_lock():
    if os.path.exists(PID_FILE):
        with open(PID_FILE) as f:
            pid = f.read().strip()
        if pid and os.path.exists(f"/proc/{pid}"):
            return False
        os.unlink(PID_FILE)
    with open(PID_FILE, "w") as f:
        f.write(str(os.getpid()))
    return True

def release_lock():
    if os.path.exists(PID_FILE):
        try:
            os.unlink(PID_FILE)
        except:
            pass

def write_progress(d, t, l, r, loc):
    json.dump({"done": d, "total": t, "langs": l, "remaining": r, "locale": loc,
               "updated": time.strftime("%H:%M:%S")}, open(STATUS_FILE, "w"))

# ── 入口 ──
if not acquire_lock():
    sys.exit(0)

try:
    engine = TranslationEngine(caller="t6-cron")
    en = json.load(open(f"{MSG_DIR}/en.json"))["Check"]
    TOTAL = sum(1 for l in LOCALES for k,v in en.items()
                if v not in SKIP and len(v)>2 and not v.startswith("http") and "@" not in v)

    start = time.time()
    done_total = 0

    for locale in LOCALES:
        path = f"{MSG_DIR}/{locale}.json"
        lang = json.load(open(path))
        exist = lang.get("Check", {}) or {}
        todo = [(k,v) for k,v in en.items() if k not in exist or exist.get(k)==v]
        if not todo:
            continue

        cnt = 0
        for k, v in todo:
            if not v or len(v) <= 2 or v in SKIP or v.startswith("http") or "@" in v:
                exist[k] = v
            else:
                try:
                    out = safe_translate(engine, v, locale)
                    if out is None:
                        # 超时
                        log_msg(f"⏱️ timeout [{locale}] {v[:50]}")
                        exist[k] = v
                    else:
                        exist[k] = out or v
                        cnt += 1
                        done_total += 1
                except Exception as e:
                    log_msg(f"⚠️ error [{locale}] {e}")
                    exist[k] = v
                time.sleep(2)

        lang["Check"] = exist
        json.dump(lang, open(path, "w"), indent=2, ensure_ascii=False)

        elapsed = time.time() - start
        rate = elapsed / max(done_total, 1)
        rem = TOTAL - done_total - cnt
        eta = rem * rate if rem > 0 else 0
        write_progress(done_total, TOTAL, 0, rem, locale)

    elapsed = time.time() - start
    write_progress(TOTAL, TOTAL, 0, 0, "done")
    log_msg(f"✅ 全部完成! {elapsed//60:.0f}分")

except Exception as e:
    log_msg(f"❌ {e}")
finally:
    release_lock()
