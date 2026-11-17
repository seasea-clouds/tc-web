# -*- coding: utf-8 -*-
"""自检：`_lexicon` 匹配层的行为契约（六档模式 + 四档词边界 + P75 词干）。

数据层断言（`_word_data` / `_lexicon_contract`）管「词形在不在库里、归属对
不对」；本臂管**匹配行为本身**——六档（word/regex/regex-cs/template/
substring/phrase）各自的边界语义、`term_rx` 的 letter/script/particle/
spaceless 四档、P75 的 `*` 词干前缀。这些行为是几十个插件的共同地基，一处
回归会同时改变所有词表判据的口径，必须行为级钉死。

关键语义（历史上按「子串直觉」写断言会误判成 bug）：
  * `script` 档：**同文字连写才算词内**。`保税` 不命中 `综合保税区`（两侧
    都是汉字=连写词内）；`申告` 命中 `申告する`（假名是语法胶水，允许紧贴）。
  * `word` 档是 `\\w` 边界，`regex-cs` 是原文大小写敏感，`template` 由调用方
    替换 `{N}` 后原样编译，`phrase` 只放宽空白不改词形。

24 项断言 = 六档 10 项 + term_rx 四档 10 项 + 词干 4 项。
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(KIT, "plugins"))
sys.path.insert(0, KIT)

import _lexicon  # noqa: E402
import importlib  # noqa: E402

p75 = importlib.import_module("text-concept-contrast")

CASES = [
    # --- 六档模式（hits） ---
    ("word 整词：delved 不算 delve", _lexicon, "hits", ("delve", "word", "we delved into it"), 0),
    ("word 整词：delve 命中", _lexicon, "hits", ("delve", "word", "we delve into it"), 1),
    ("regex 原样编译", _lexicon, "hits", (r"abc\d+", "regex", "xx abc123 yy"), 1),
    ("regex-cs：Moreover 不算 moreover", _lexicon, "hits", ("moreover", "regex-cs", "Moreover, we note"), 0),
    ("regex-cs 小写命中", _lexicon, "hits", ("moreover", "regex-cs", "moreover, we note"), 1),
    ("regex 大小写不敏感", _lexicon, "hits", ("moreover", "regex", "Moreover, we note"), 1),
    ("template 调用方已替换 {N}", _lexicon, "hits", (r"threshold\s+500\s+tons", "template", "the threshold 500 tons applies"), 1),
    ("substring：保税 ⊂ 综合保税区", _lexicon, "hits", ("保税", "substring", "综合保税区管理办法"), 1),
    ("phrase 容多空格/换行", _lexicon, "hits", ("comprehensive bonded zone", "phrase", "a comprehensive  bonded\nzone here"), 1),
    ("phrase 不容词形断裂", _lexicon, "hits", ("bonded zone", "phrase", "bondedzones"), 0),
    # --- term_rx 四档词边界 ---
    ("en letter：delve 不命中 delved", _lexicon, "term_rx_rx", ("delve", "en", "we delved"), False),
    ("en letter：delve 命中 delve", _lexicon, "term_rx_rx", ("delve", "en", "we delve"), True),
    ("zh script：保税 不命中 综合保税区（汉字连写=词内）", _lexicon, "term_rx_rx", ("保税", "zh", "综合保税区"), False),
    ("zh script：保税 命中 保税，是指（独立成词）", _lexicon, "term_rx_rx", ("保税", "zh", "保税，是指经批准设立的"), True),
    ("zh script：保税 命中 保税abc（右侧拉丁）", _lexicon, "term_rx_rx", ("保税", "zh", "保税abc"), True),
    ("ja script：申告 命中 申告する（假名是胶水）", _lexicon, "term_rx_rx", ("申告", "ja", "税関に申告する"), True),
    ("ja script：関税 不命中 関税庁（汉字连写=词内）", _lexicon, "term_rx_rx", ("関税", "ja", "関税庁の決定"), False),
    ("ko particle：통관 命中 통관은", _lexicon, "term_rx_rx", ("통관", "ko", "통관은 어렵다"), True),
    ("ko particle：통관 不命中 통관절차（后接实词）", _lexicon, "term_rx_rx", ("통관", "ko", "통관절차"), False),
    ("th spaceless：ใบขน 命中 ใบขนสินค้า", _lexicon, "term_rx_rx", ("ใบขน", "th", "ใบขนสินค้า"), True),
    # --- P75 复合词词干 ---
    ("* 词干：Einreihung* 命中 Einreihungsentscheidung", p75, "rx", ("Einreihung*", "de", "die Einreihungsentscheidung"), True),
    ("无 * 时词边界失效", p75, "rx", ("Einreihung", "de", "die Einreihungsentscheidung"), False),
    ("* 词干（fi）：luokitus* 命中 luokituspäätös", p75, "rx", ("luokitus*", "fi", "luokituspäätös"), True),
    ("* 词干（nl）：indeling* 命中 indelingsbeslissing", p75, "rx", ("indeling*", "nl", "de indelingsbeslissing"), True),
]


def _apply(fn_owner, fn, args):
    if fn == "hits":
        return len(_lexicon.hits(*args))
    if fn == "term_rx_rx":
        return bool(_lexicon.term_rx(args[0], args[1]).search(args[2]))
    if fn == "rx":
        return bool(p75._rx(args[0], args[1]).search(args[2]))
    raise SystemExit("未知探针 %s" % fn)


def main():
    fails = 0
    for label, owner, fn, args, want in CASES:
        got = _apply(owner, fn, args)
        ok = got == want
        fails += 0 if ok else 1
        print("  %-4s %-44s %s" % ("OK" if ok else "FAIL", label,
                                   "" if ok else "got=%r want=%r" % (got, want)))
    print("词表匹配行为契约：%d 项断言，FAIL %d" % (len(CASES), fails))
    return 0 if not fails else 1


if __name__ == "__main__":
    sys.exit(main())
