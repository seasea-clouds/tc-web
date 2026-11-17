# -*- coding: utf-8 -*-
"""自检：WR02 —— 独立成文（篇间零互链）

夹具自带一条 link 契约：正文除 /packages/ CTA 外不允许任何链接。
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402

GL = {
    "version": "selftest",
    "writing": [{
        "id": "selftest-wr-link",
        "rule": "WR02",
        "scope": "link",
        "langs": "*",
        "level": "error",
    }],
}


def mutate(work):
    # 正文里塞一条站内互链（非 CTA）：读者点走就离开本文
    p = H.lang_file(work, "fr")
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + "\n\nPour aller plus loin, lisez [notre guide](/fr/blog/guide/).\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("WR02", mutate, "fr 正文加站内互链", "blog", "red", GL)]))
