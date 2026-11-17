# -*- coding: utf-8 -*-
"""工具级自检：de-flow-not-river 的射程精确性（语言级 + 词类级，不绑篇目）。

`_` 前缀：验的是策略库契约的正则射程，没有对应插件。

背景（2026-11-14 全库复审）：该契约原 note 写「Fluss 单用默认河义」，实测
96 篇 de 共 39 处命中——14 处是合法复合词（Informationsfluss /
Compliance-Fluss / Belegfluss），25 处裸形全部是「数量词/限定词 + 裸形」
结构。判定结果没错，但契约没把「合法形态」写进判据，`im Fluss`
这类习语将来会误伤。

现在把射程钉成词类：正则来自**库里**（不硬编码），六条语料各验一侧：
  合法（必须静默）：im Fluss 习语 / 复合词 / 连字符复合词 / Strom-Ablauf 替代
  非法（必须命中）：数量词+裸形 / 限定词+裸形
"""
import os
import re
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
_KIT = os.path.dirname(_HERE)
if _KIT not in sys.path:
    sys.path.insert(0, _KIT)

from core import db as _db                                      # noqa: E402

CID = "body:de-flow-not-river"

LEGAL = [
    ("im Fluss 习语（in Bewegung）", "Der Vorgang ist im Fluss."),
    ("复合词 Informationsfluss", "Der Informationsfluss läuft getrennt."),
    ("连字符复合词 Compliance-Fluss", "Der Compliance-Fluss prüft sechs Punkte."),
    ("Strom/Ablauf 替代", "Die drei Ströme und die Abläufe sind getrennt."),
]
ILLEGAL = [
    ("数量词 + 裸形", "Die drei Flüsse Bestellung, Ware und Provision sind getrennt."),
    ("限定词 + 裸形", "Prüfpunkte sitzen in jedem Fluss."),
]


def main():
    pv = _db.current_policy(os.path.join(_KIT, "data", "glossary.db"))
    term = next((c for c in pv.contracts if c.get("id") == CID), None)
    if not term:
        print("  FAIL 契约 %s 不在策略库里" % CID)
        return 1
    pats = ((term.get("payload") or {}).get("forbid_re") or {}).get("de") or []
    if not pats:
        print("  FAIL 契约缺 forbid_re[de]")
        return 1
    rx = re.compile(pats[0])

    fails = 0
    for name, text in LEGAL:
        ok = not rx.search(text)
        print("  %-4s 静默：%s" % ("OK" if ok else "FAIL", name))
        fails += 0 if ok else 1
    for name, text in ILLEGAL:
        ok = bool(rx.search(text))
        print("  %-4s 命中：%s" % ("OK" if ok else "FAIL", name))
        fails += 0 if ok else 1
    print("de 流程契约射程：%d 臂，FAIL %d" % (len(LEGAL) + len(ILLEGAL), fails))
    return 0 if fails == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
