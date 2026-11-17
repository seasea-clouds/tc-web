# -*- coding: utf-8 -*-
"""term-zh 字系与漏译臂：防「把英语词填进 ru 槽」这类串行错填。

两条判据（都在现有 1081 行上零误报）：
1. **字系相符**：ru/uk/be/bg/sr 必须西里尔、ar/fa/ur 必须阿拉伯、he 必须希伯来、
   hi/ne 天城、bn 孟加拉、ta 泰米尔、si 僧伽罗、th 泰、ka 格鲁吉亚、hy 亚美尼亚、
   el 希腊、ko 谚文、ja 假名或汉字。判据是**词形中至少出现一次该字系**，不是
   「出现最多的字系」——贸易术语合法地混入拉丁缩写（ko `HS 코드`、ja `HSコード`、
   ru `код ТН ВЭД`），按主导字系判会把它们全判红（v411 实测 2 条假红）。
2. **无汉字残留**：除 ja 外任何语向出现汉字即判红（`ja` 允许汉字，`zh` 不入表）。

刻意不做的：**跨语向同形检查**——af/nl、da/no/sv、cs/sk、id/ms、hi/ne、ca/es/pt
本来就有大量同形词（ministerie van handel / statsrådet / registrering /
importador），按同形判红只会天天误报。
"""
import argparse
import collections
import os
import re
import sqlite3
import sys
import unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.dirname(HERE)
sys.path.insert(0, KIT)

SCRIPT = {
    "ru": "CYRILLIC", "uk": "CYRILLIC", "be": "CYRILLIC", "bg": "CYRILLIC",
    "sr": "CYRILLIC", "ar": "ARABIC", "fa": "ARABIC", "ur": "ARABIC",
    "he": "HEBREW", "hi": "DEVANAGARI", "ne": "DEVANAGARI", "bn": "BENGALI",
    "ta": "TAMIL", "si": "SINHALA", "th": "THAI", "ka": "GEORGIAN",
    "hy": "ARMENIAN", "el": "GREEK", "ko": "HANGUL",
}
ALT = {"ja": {"CJK", "HIRAGANA", "KATAKANA", "IDEOGRAPHIC"}}
HAN = re.compile(r"[\u4e00-\u9fff]")


def scripts_in(text):
    """词形里出现过的 Unicode 字系集合（按字符名首词判）。"""
    out = set()
    for ch in text:
        if ch.isalpha():
            try:
                out.add(unicodedata.name(ch).split()[0])
            except ValueError:
                continue
    return out


def script_of(text):
    c = collections.Counter()
    for ch in text:
        if ch.isalpha():
            try:
                c[unicodedata.name(ch).split()[0]] += 1
            except ValueError:
                continue
    return c.most_common(1)[0][0] if c else ""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tmp", default="")
    ap.parse_args()

    conn = sqlite3.connect(os.path.join(KIT, "data", "glossary.db"))
    rows = conn.execute("SELECT key,value,target FROM lexicons WHERE id='term-zh'").fetchall()
    fails, checked = [], 0
    for key, lg, form in rows:
        form = form or ""
        if lg != "ja" and HAN.search(form):
            fails.append("%s/%s 汉字残留（非 ja）→ %r" % (key, lg, form))
        want = SCRIPT.get(lg)
        seen = scripts_in(form)
        if want:
            checked += 1
            if want not in seen:
                fails.append("%s/%s 字系应 %s，实为 %s → %r"
                             % (key, lg, want, sorted(seen) or "（无字母）", form))
        elif lg == "ja":
            checked += 1
            if not (seen & ALT["ja"]):
                fails.append("%s/ja 应为汉字或假名，实为 %s → %r"
                             % (key, sorted(seen), form))

    # 负向控制：把英语词塞进 ru 槽、把汉语词塞进 ko 槽，都必须被判红
    neg = [("ru", "customs administration"), ("ko", "注册"), ("ja", "Customs Law")]
    for lg, form in neg:
        want = SCRIPT.get(lg)
        seen = scripts_in(form)
        ok = (lg != "ja" and HAN.search(form)) or (want and want not in seen) or \
             (lg == "ja" and not (seen & ALT["ja"]))
        if not ok:
            fails.append("负向控制失效：%s/%r 未被判红" % (lg, form))

    print("term-zh 字系：检查 %d 行（%d 行有字系要求）" % (len(rows), checked))
    for f in fails[:15]:
        print("  FAIL %s" % f)
    if fails:
        print("失败 %d 项" % len(fails))
        return 1
    print("OK 字系与语向相符、无汉字残留（ja 例外）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
