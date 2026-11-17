# -*- coding: utf-8 -*-
"""自检：WR03 —— 第一手口径（不写「据说」）

夹具自带一条 body 契约：命中二手口径词形即报。
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402

GL = {
    "version": "selftest",
    "writing": [{
        "id": "selftest-wr-firsthand",
        "rule": "WR03",
        "scope": "body",
        "langs": "*",
        "level": "error",
        "patterns": {"*": ["on dit que"]},
    }],
}


def mutate(work):
    # 「据说」式二手口径：读者无法据此行动，也没法核对
    p = H.lang_file(work, "fr")
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + "\n\nAu port de Shanghai, on dit que le bureau exige un certificat.\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("WR03", mutate, "fr 正文写「据说」", "blog", "red", GL)]))
