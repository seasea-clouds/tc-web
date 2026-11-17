# -*- coding: utf-8 -*-
"""自检：P49 —— 母版「清单扩至 1476」时不得写成清单缩减"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402

ZH = "\n2022 年起监管条件调整，清单扩至 1476 个税号。\n"
DE_BAD = "\nSeit 2022 wird die Liste enger, sie umfasst 1476 Zolltarifnummern.\n"


def _append(work, lang, para):
    p = H.lang_file(work, lang)
    H.write_body(p, H.body_of(p).rstrip("\n") + "\n" + para)


def mutate(work):
    # 同一句里既有扩容数字 1476、又有「清单变窄」：自相矛盾
    _append(work, "zh", ZH)
    _append(work, "de", DE_BAD)


if __name__ == "__main__":
    raise SystemExit(H.main([("P49", mutate, "de 把扩容写成清单变窄")]))
