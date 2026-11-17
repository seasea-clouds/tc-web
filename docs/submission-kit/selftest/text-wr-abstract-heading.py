# -*- coding: utf-8 -*-
"""自检：WR04 —— 抽象小节标题

夹具自带一条 heading 契约：出现「Aperçu」一类抽象标题即报。
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402

GL = {
    "version": "selftest",
    "writing": [{
        "id": "selftest-wr-abstract",
        "rule": "WR04",
        "scope": "heading",
        "langs": "*",
        "level": "error",
        "patterns": {"*": ["Aperçu"]},
    }],
}


def mutate(work):
    # 抽象小节标题：列表卡片只显示标题，这一行没有信息量等于浪费唯一展示位
    p = H.lang_file(work, "fr")
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + "\n\n## Aperçu\n\nQuelques éléments de contexte.\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("WR04", mutate, "fr 加抽象小节标题", "blog", "red", GL)]))
