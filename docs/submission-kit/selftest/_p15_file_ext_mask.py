# -*- coding: utf-8 -*-
"""工具级自检：P15 官方附件文件后缀前的空格掩码（v2.27 回流，REG69 144 号）。

`_` 前缀：后缀形态是 `_lang.py` 里的通用共享函数，没有独立插件文件，
按 A6/A7 不占用正名臂；由 `submit.py selftest --kit` 单独计数。

覆盖 REG69 实测缺陷：47 语 B07 都在官方附件名与 `.docx` 之间留了一个空格
（README：非拉丁语向的拉丁串前后留空白，避免 P08 混文字 token）。P15 把
后缀的 ASCII 句点当句读标点，整层 47 条假红。官方逐字串不能改稿了事，
只能按缺陷族豁免。

双向断言：① 官方后缀前的空格不报红；② 句末句点、逗号、单字母后缀、
6 字母形近串仍报红（负向对照，证明防线依赖这条豁免，而非放过所有句点）。
只读共享匹配函数，不建官方尺副本、不改线上契约。
"""
import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
_KIT = os.path.dirname(_HERE)
sys.path.insert(0, _KIT)

from plugins._lang import _p15_space_punct_hits  # noqa: E402


def main():
    cases = []

    def chk(name, ok):
        cases.append((name, bool(ok)))

    def hits(s):
        return [tok for _, tok in _p15_space_punct_hits(s)]

    # ① 正向：REG69 的官方附件行形态（拉丁串前留空格）
    chk("REG69 B07 形态 `(New) .docx` 豁免",
        not hits("Annex: Key Indicator Requirements for Recycled Pulp (New) .docx"))
    chk("西里尔语向 `требования (новые) .docx` 豁免",
        not hits("Приложение: Требования к ключевым показателям (новые) .docx"))
    chk("阿拉伯语向 `المضافة) .docx` 豁免",
        not hits("المرفق: متطلبات المؤشرات الرئيسية (المضافة) .docx"))

    # ② 按缺陷族：常见官方附件/页面后缀同样豁免
    for ext in (".pdf", ".xls", ".html", ".doc", ".xlsx", ".csv"):
        chk("后缀 %s 豁免" % ext,
            not hits("Annex: official requirements (new) " + ext))

    # ③ 负向对照 A：真正的「标点前多余空格」仍报红
    chk("句末 `fin .` 仍报红", hits("La fin .\n") == [" ."])
    chk("句末 `fin .` 后接下一句仍报红",
        bool(hits("La fin . Le reste du texte.\n")))
    chk("逗号前空格仍报红", hits("Mot , suite\n") == [" ,"])
    chk("单字母后缀 `.x` 仍报红", bool(hits("Annex: requirements .x\n")))
    chk("6 字母形近串 `.docxxx` 仍报红",
        bool(hits("Annex: requirements .docxxx\n")))

    # ④ 负向对照 B：数字后的空格＋符号不受影响（SPACE_PUNCT_RE 的千分位保护）
    chk("数字后 `1 .` 不误报（原正则的 (?<![0-9]) 保护）",
        not hits("Wert 1 . 000 Einheiten"))

    fails = 0
    for name, ok in cases:
        print("  %-4s %s" % ("OK" if ok else "FAIL", name))
        if not ok:
            fails += 1
    print("P15 文件后缀空格掩码：%d 个用例，FAIL %d" % (len(cases), fails))
    return 0 if not fails else 1


if __name__ == "__main__":
    raise SystemExit(main())
