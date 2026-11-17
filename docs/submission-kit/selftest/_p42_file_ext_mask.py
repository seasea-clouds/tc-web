# -*- coding: utf-8 -*-
"""工具级自检：P42 官方附件文件后缀掩码（v2.26 回流，REG40 136 号公告）。

`_` 前缀：文件后缀形态是 `_lang.py` 里的通用掩码正则，没有独立插件文件，
按 A6/A7 不能占用正名臂；由 `submit.py selftest --kit` 单独计数。

覆盖 REG40 实测缺陷：两份官方附件的 `.docx` 后缀逐字保留（S08 verbatim），
P42 此前只掩链接/代码/小数/官方英文声明，把后缀里的 ASCII 句点判成 hy
句末英文句点（2 处 error）。官方串不能改稿了事，只能按缺陷族豁免。

双向断言：① 官方后缀掩码生效、hy 不报红；② 句末句点与未登记形近串仍报红
（负向对照，证明防线依赖这条豁免，而非把所有句点都放过）。
只读共享匹配函数，不建官方尺副本、不改线上契约。
"""
import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
_KIT = os.path.dirname(_HERE)
sys.path.insert(0, _KIT)

from plugins._lang import _p42_hy_ascii_periods  # noqa: E402

# REG40 hy 的 B12 形态（序号按 hy 正字法用冒号，附件名逐字带后缀）
ATTACH = ("Հավելվածներ՝ 1: Արագ փչացող սննդամթերքի պիտանիության "
          "տեսչման պահանջներ.docx 2: Արտահանման կոնտեյների "
          "համապատասխանության հայտարարություն.docx")


def main():
    cases = []

    def chk(name, ok):
        cases.append((name, bool(ok)))

    # ① 正向：本篇两个 .docx 都不报红
    chk("REG40 附件行 .docx x2 掩码生效（0 命中）",
        not _p42_hy_ascii_periods(ATTACH))

    # ② 按缺陷族：常见官方附件/页面后缀同样豁免
    for ext in (".pdf", ".xls", ".html", ".doc"):
        chk("后缀 %s 豁免" % ext,
            not _p42_hy_ascii_periods("Հավելված՝ փաստաթուղթ" + ext + "։"))

    # ③ 负向对照 A：真正的句末 ASCII 句点仍报红
    chk("句末 ASCII 句点仍报红",
        bool(_p42_hy_ascii_periods("Փաստաթուղթը պատրաստ է.")))
    chk("句末 ASCII 句点后接大写词仍报红",
        bool(_p42_hy_ascii_periods("Փաստաթուղթը պատրաստ է. Դա վերջն է։")))

    # ④ 负向对照 B：超出后缀长度形态的形近串（6 字母）不得被顺带放行
    chk("形近串 .docxxx 仍报红",
        bool(_p42_hy_ascii_periods("Հավելված՝ փաստաթուղթ.docxxx ։")))

    # ⑤ 掩码不得吃掉本语句末标点
    chk("hy 句末 ։ 不产生命中",
        not _p42_hy_ascii_periods("Հավելվածներ՝ երկու փաստաթուղթ։"))

    fails = 0
    for name, ok in cases:
        print("  %-4s %s" % ("OK" if ok else "FAIL", name))
        if not ok:
            fails += 1
    print("P42 文件后缀掩码：%d 个用例，FAIL %d" % (len(cases), fails))
    return 0 if not fails else 1


if __name__ == "__main__":
    raise SystemExit(main())
