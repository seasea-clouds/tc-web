# -*- coding: utf-8 -*-
"""自检：P52 —— 拉丁语向残留英文词"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    # nl 正文留着英文语法词 compliant / stakeholder：该译没译
    p = H.lang_file(work, "nl")
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + "\n\nDe compliant stakeholder levert de aanvraag aan.\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("P52", mutate, "nl 残留 compliant/stakeholder")]))
