# -*- coding: utf-8 -*-
"""自检：P61 —— 希腊语「;」被当作分号"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    # 「;」后跟希腊小写字母：分号位误用问号（分号应为 ·）
    p = H.lang_file(work, "el")
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + "\n\nΗ αίτηση υποβάλλεται; η έγκριση εκδίδεται αργότερα.\n")


def mutate_list(work):
    # 行尾「;」作列表分隔：非末项以问号形收尾，读者把三项都读成问句。
    # v2.26 新射程；C1 el 第 18 行是负控（本行不是列表项，不点火）。
    p = H.lang_file(work, "el")
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + "\n\n- Πρώτος έλεγχος παραστατικών;\n"
                   "- Δεύτερος έλεγχος ποσού;\n"
                   "- Τρίτος έλεγχος υπογραφής.\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("P61", mutate, "el 用「;」作分号"),
                             ("P61", mutate_list, "el 用「;」作列表分隔")]))
