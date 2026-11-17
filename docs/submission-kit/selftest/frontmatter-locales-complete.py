# -*- coding: utf-8 -*-
"""自检：M07 —— 题录 locales 少一个语向"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    import json
    p = H.sub_json(work)
    d = json.loads(p.read_text(encoding="utf-8"))
    d["locales"] = [x for x in d["locales"] if x != "si"]
    p.write_text(json.dumps(d, ensure_ascii=False, indent=2) + "\n",
                 encoding="utf-8", newline="\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("M07", mutate, "locales 去掉 si")]))
