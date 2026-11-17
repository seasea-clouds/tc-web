# -*- coding: utf-8 -*-
"""自检：S08 —— 块级术语契约（锚定块缺 require 词形）

夹具自带一条隔离契约（shared: False），不读共享库：共享库的 937 条契约按篇/
语向绑定，官方尺上没有对应锚点，臂在共享库上既构造不出来、也不该为了自检去
改线上契约。
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402

GL = {
    "version": "selftest",
    "terms": [{
        "id": "selftest-block",
        "zh": "决定食品能否顺利清关",
        "shared": False,
        "require": {"fr": ["passe la douane"]},
    }],
}


def mutate(work):
    # 把母版对应块的关键词形换成泛称：语法、长度、结构全对，只有术语层能拦
    p = H.lang_file(work, "fr")
    body = H.body_of(p)
    new = body.replace("passe la douane chinoise", "franchit le contrôle douanier")
    if new == body:
        raise RuntimeError("注入点不存在：fr 正文没有 passe la douane chinoise")
    H.write_body(p, new)


if __name__ == "__main__":
    raise SystemExit(H.main([("S08", mutate, "fr 锚块换掉 douane 词形", "blog", "red", GL)]))
