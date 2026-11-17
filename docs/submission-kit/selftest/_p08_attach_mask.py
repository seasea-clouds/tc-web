# -*- coding: utf-8 -*-
"""工具级自检：P08 官方法定附件名豁免闭环（v420 回流 / REG47）。

`_` 前缀：本臂测的是插件内部共享函数 `_hits_in_body`，不占正名臂
（`selftest/text-mixed-script.py` 仍负责「注入裸混写词必报红」），由
`submit.py selftest --kit` 单独计数。

覆盖 REG47（107 号孟加拉鲜食菠萝蜜）实测缺陷：官方法定附件名
`…套袋技术规范.docx` 的 `.docx` 后缀须逐字保留，本语译名与后缀连写是
文件名形态；P08 逐 token 判「同一 token 拉丁字母＋本语字母并存」，在 18 个
非拉丁语向把 `Китай.docx` / `الصين.docx` / `პირობები.docx` 等报为混写词。
P30 的 `latin_residue` 早已按 `_ATTACH_RE` 剥离同一形态，本回流让 P08 复用
该机制（插件与自检臂共用 `_hits_in_body`，单一真值）。改稿加空格会破坏
文件名，故按判据口径回流而非单篇改稿。

双向断言：① 剥离依据存在；② 剥离前该 token 确属混写；③ 5 个语系的法定
附件名剥离后不报；④ 裸混写词仍报；⑤ 未列入剥离表的后缀仍报（防整表放开）。
"""
import importlib.util
import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
_KIT = os.path.dirname(_HERE)
sys.path.insert(0, _KIT)

# 文件名含连字符，按路径装载；装载后与 checker 用的是同一模块对象语义
_spec = importlib.util.spec_from_file_location(
    "p08_text_mixed_script",
    os.path.join(_KIT, "plugins", "text-mixed-script.py"))
P08 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(P08)

from core import db as _db  # noqa: E402
from plugins._health import _token_scripts  # noqa: E402
from plugins._lang import _ATTACH_RE        # noqa: E402


def _p08_sets():
    """P08 词干集合从库取（v458 迁库后 `_hits_in_body` 需要调用方传入）。"""
    con = _db.connect(os.path.join(_KIT, "data", "glossary.db"),
                      readonly=True)
    try:
        q = ("SELECT value FROM lexicons WHERE id='phrase-block' AND key=?")
        cores = {v for (v,) in con.execute(q, ("p08-unit-core|*",))}
        stems = {v for (v,) in con.execute(q, ("p08-latin-stem|*",))}
    finally:
        con.close()
    return cores, stems

ATTACH = {
    "ru": "Приложение: Технические условия на пакетирование джекфрута из Бангладеш, экспортируемого в Китай.docx",
    "ar": "المرفق: المواصفات الفنية لتكييس الجاكا المصدرة إلى الصين.docx",
    "el": "Παράρτημα: Τεχνικές προδιαγραφές σακούλιασματος για την Κίνα.docx",
    "ka": "დანართი: ტომრების ტექნიკური პირობები ჩინეთისთვის.docx",
    "th": "เอกสารแนบ: ข้อกำหนดทางเทคนิคการสวมถุงขนุนส่งจีน.docx",
}
BARE_MIXED = "Проверьте лицензияlizenz перед отправкой."
UNLISTED_EXT = "Приложение: Технические условия для Китай.txt"


def main():
    cases = []

    def chk(name, ok):
        cases.append((name, bool(ok)))

    allow = frozenset()
    cores, stems = _p08_sets()

    # ① 剥离依据：P30 同源正则确实命中法定附件名
    chk("_ATTACH_RE 命中 ru 法定附件名", bool(_ATTACH_RE.search(ATTACH["ru"])))

    # ② 负向前提：未剥离时该 token 确属混写（否则豁免无意义）
    tok = ATTACH["ru"].split()[-1]
    sc = _token_scripts(tok)
    chk("剥离前 %r 确属混文字系统词" % tok,
        "LATIN" in sc and (sc - {"LATIN"}))

    # ③ 5 个语系：剥离后 P08 不报
    for lg, text in ATTACH.items():
        chk("%s 法定附件名不报混写词" % lg,
            len(P08._hits_in_body(text, lg, allow, cores, stems)) == 0)

    # ④ 裸混写词仍报（正名臂同型注入点）
    chk("裸混写词 лицензияlizenz 仍报红",
        len(P08._hits_in_body(BARE_MIXED, "ru", allow, cores, stems)) >= 1)

    # ⑤ 未列入剥离表的后缀仍报，防止「见到本语词＋点后缀就整表放开」
    chk("未登记后缀 .txt 仍报红",
        len(P08._hits_in_body(UNLISTED_EXT, "ru", allow, cores, stems)) >= 1)

    fails = 0
    for name, ok in cases:
        print("  %-4s %s" % ("OK" if ok else "FAIL", name))
        if not ok:
            fails += 1
    print("P08 附件名豁免闭环：%d 个用例，FAIL %d" % (len(cases), fails))
    return 0 if not fails else 1


if __name__ == "__main__":
    raise SystemExit(main())
