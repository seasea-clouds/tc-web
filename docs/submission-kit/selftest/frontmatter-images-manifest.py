# -*- coding: utf-8 -*-
"""自检：M08 —— 题录 images 多写一张不存在的图"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    import json
    p = H.sub_json(work)
    d = json.loads(p.read_text(encoding="utf-8"))
    d["images"] = list(d["images"]) + ["ghost.webp"]
    p.write_text(json.dumps(d, ensure_ascii=False, indent=2) + "\n",
                 encoding="utf-8", newline="\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("M08", mutate, "images 追加 ghost.webp")]))
