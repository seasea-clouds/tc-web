# -*- coding: utf-8 -*-
"""自检：S14 —— 译文块数不足，契约无法执行

块数不足时静默跳过会出问题：契约登记了、全库回归全绿、实际一条都没跑。
这里删掉 fr 一个小节，块数少于母版，契约必须显式报「无法执行」。
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402

GL = {
    "version": "selftest",
    "terms": [{
        "id": "selftest-blocks",
        "zh": "决定食品能否顺利清关",
        "shared": False,
        "require": {"fr": ["passe la douane"]},
    }],
}


def mutate(work):
    # 删掉 fr 的「## Étape suivante」整块 → 块数 < 母版，契约无法按块对齐
    p = H.lang_file(work, "fr")
    body = H.body_of(p)
    parts = body.split("\n\n")
    keep = [x for x in parts if not x.lstrip().startswith("## Étape suivante")]
    if len(keep) == len(parts):
        raise RuntimeError("注入点不存在：fr 正文没有 Étape suivante 小节")
    H.write_body(p, "\n\n".join(keep))


if __name__ == "__main__":
    raise SystemExit(H.main([("S14", mutate, "fr 删一个小节，块数不足", "blog", "red", GL)]))
