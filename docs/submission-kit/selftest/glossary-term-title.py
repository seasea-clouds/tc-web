# -*- coding: utf-8 -*-
"""自检：S11 —— 标题术语契约（标题缺 require 词形）

夹具自带隔离标题契约（zh 锚命中官方尺 zh 标题才激活），不读共享库。
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402

GL = {
    "version": "selftest",
    "title": [{
        "id": "selftest-title",
        "zh": "入境自查清单",
        "shared": False,
        "require": {"fr": ["Liste de contrôle"]},
    }],
}


def mutate(work):
    # 标题退成「对华出口须知」：动作还在，但清单这个交付物消失了
    p = H.lang_file(work, "fr")
    H.patch_fm(p, "title", "Contrôle pour exporter des aliments vers la Chine")


if __name__ == "__main__":
    raise SystemExit(H.main([("S11", mutate, "fr 标题去掉 Liste de contrôle", "blog", "red", GL)]))
