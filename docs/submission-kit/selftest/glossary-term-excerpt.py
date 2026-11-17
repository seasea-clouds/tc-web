# -*- coding: utf-8 -*-
"""自检：S09 —— 摘要术语契约（摘要缺 require 词形）

夹具自带隔离摘要契约（zh 锚命中官方尺 zh 摘要才激活），不读共享库。
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402

GL = {
    "version": "selftest",
    "excerpt": [{
        "id": "selftest-excerpt",
        "zh": "决定食品",
        "shared": False,
        "require": {"fr": ["vérifications"]},
    }],
}


def mutate(work):
    # 摘要把「四项核查」写成「四道手续」：长度合规、方向不错，只有术语层能拦
    p = H.lang_file(work, "fr")
    old = "Quatre vérifications décident"
    s = Path(p).read_text(encoding="utf-8")
    if old not in s:
        raise RuntimeError("注入点不存在：fr 摘要没有 Quatre vérifications")
    Path(p).write_text(s.replace(old, "Quatre formalités décident"),
                       encoding="utf-8", newline="\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("S09", mutate, "fr 摘要换掉 vérifications", "blog", "red", GL)]))
