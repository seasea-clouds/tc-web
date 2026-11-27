# -*- coding: utf-8 -*-
"""工具级自检臂：country 词表 el 正则的假阳性回归（REG95 回流）。

背景：country 表 el 的精细正则（νόμ/κανονισμ/... της χώρας）用于抓
「我国法律」本国视角误译（P66 + audit_prep 疑点）。REG95 实证它对
`της χώρας ή περιοχής`（国家或地区）、`τρίτης χώρας`（第三国）等
法规高频正常结构假阳性，导致审校疑点噪声。回流后在负向断言加了
`ή` / `(περιοχή)` 排除项。本臂钉死三件事：

1. 防回归：REG95 的 4 处真实「国家或地区」结构 0 命中；
2. 保真阳性：本国视角「我国法律」（νόμος της χώρας 非排除结构）仍命中；
3. 词形族完整：χώρα μας / χώρας μας 两个直译词形仍在库、仍能命中。

直接读真实 glossary.db（数据+行为双断言），零临时文件。
"""
import os
import sqlite3
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.dirname(HERE)
for p in (os.path.join(KIT, "plugins"), KIT):
    if p not in sys.path:
        sys.path.insert(0, p)

import _lexicon  # noqa: E402

DB = os.path.join(KIT, "data", "glossary.db")
CASES = []


def chk(name, cond):
    CASES.append((name, bool(cond)))


def el_table():
    conn = sqlite3.connect(DB)
    try:
        rows = [{"key": k, "value": v} for k, v in conn.execute(
            "SELECT key,value FROM lexicons WHERE id='country' AND key='el'")]
    finally:
        conn.close()
    return _lexicon.compile_country(rows)


TABLE = el_table()


def hits(text):
    return _lexicon.country_hits_table(TABLE, "el", text)


# ---- 1 防回归：REG95 真实假阳性结构 0 命中 ----
FALSE_POS = [
    "η φυτοϋγειονομική αρχή της τρίτης χώρας ή περιοχής πρέπει να εκδώσει",
    "πιστοποιητικού που εκδόθηκε από τη φυτοϋγειονομική αρχή της χώρας ή περιοχής καταγωγής",
    "αρχή της τρίτης χώρας ή περιοχής οφείλει να ελέγξει τα δείγματα",
    "σύμφωνα με τους νόμους, η αρχή της χώρας ή περιοχής καταγωγής εκδίδει",
]
for i, s in enumerate(FALSE_POS, 1):
    chk("REG95 国家或地区结构 FP%d 零命中" % i, not hits(s))

# ---- 2 保真阳性：本国视角「我国法律」仍命中 ----
TRUE_POS = [
    "σύμφωνα με τον νόμο της χώρας και τον κανονισμό της χώρας",
    "οι διατάξεις της χώρας προβλέπουν την αντιμετώπιση",
]
for i, s in enumerate(TRUE_POS, 1):
    chk("本国视角 νόμ/διάταξ TP%d 仍命中" % i, bool(hits(s)))

# ---- 3 词形族完整：χώρα μας / χώρας μας ----
chk("χώρα μας 命中", bool(hits("η χώρα μας και η παραγωγή μας")))
chk("χώρας μας 命中", bool(hits("η προστασία της χώρας μας")))
chk("el 正则形在库（非表格损坏）",
    any("νόμ" in p.pattern for p in TABLE.get("el", ())))

fails = 0
for name, ok in CASES:
    print("  %-4s %s" % ("OK" if ok else "FAIL", name))
    if not ok:
        fails += 1
print("country el 正则回流臂：%d 个用例，FAIL %d" % (len(CASES), fails))
raise SystemExit(1 if fails else 0)
