# -*- coding: utf-8 -*-
"""term-zh 标题式规范化臂（用户「A. 标题式规范化」定调的机检部分）。

「标题式规范化」不是把英语 Title Case 套到 47 语，而是按本语标题惯例：
- en：实词首字母大写，of/on/the/and 等虚词小写（首个词除外）；
- de：虚词必须小写（德语形容词/分词本就小写，不要求非虚词全大写）；
- da/no/sv/nl/af/ms/fr/es/it/pt/ca/ro 等句首大写语言：只保证首词大写；
- 无大小写文字（ar/he/hi/bn/ne/si/ta/th/ka/ja/ko/zh/…）：不判。

大小写只查 `kind ∈ {org, law}` 的**专名**：`doc`/`permit` 是普通名词
（en「phytosanitary certificate」、af「fitosanitêre sertifikaat」本就小写），
`term` 类同理。

夹具含负向控制：故意写错的 en/de 词形必须被判红，否则臂自身失效。
"""
import argparse
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.dirname(HERE)
sys.path.insert(0, KIT)

from core import db                                               # noqa: E402

SMALL_EN = {"a", "an", "the", "and", "or", "but", "of", "on", "in", "for",
            "to", "from", "with", "by", "at", "as", "per", "via", "into",
            "over", "under", "upon", "than", "nor"}
FUNC_DE = {"der", "die", "das", "des", "dem", "den", "und", "oder", "über",
           "ueber", "von", "für", "fuer", "im", "in", "zur", "zum", "bei",
           "mit", "aus", "auf", "sowie", "als", "nach", "vor", "an", "am"}
ENTITY = ("org", "law", "doc", "permit")
# 无大小写区分的文字：不参与任何大小写判定（str.isupper 对这些脚本恒假）
CASELESS = {"ar", "he", "fa", "hi", "bn", "ne", "si", "ta", "th", "ka",
            "ja", "ko", "ur", "zh"}
# 只有法规名/机构名是专名；证单名与许可证名是普通名词（af/az/ca 本就小写）
PROPER = ("org", "law")
WORD = re.compile(r"[^\W\d_][^\s]*", re.U)


def _words(form):
    """→ [(词, 是否落在括号内)]；括号内的补充说明不参与判定。"""
    out, depth = [], 0
    for tok in form.split():
        if tok.startswith("(") or tok.startswith("（"):
            depth += 1
        if depth == 0 and WORD.match(tok):
            out.append(tok)
        if tok.endswith(")") or tok.endswith("）"):
            depth = max(0, depth - 1)
    return out


def check(form, lg):
    """→ 违规词列表（空 = 合规）。"""
    bad = []
    ws = _words(form)
    for i, w in enumerate(ws):
        core = w.strip(".,;:!?«»\"'„“”()[]{}")
        if not core:
            continue
        head = core[0]
        upper = head.isupper()
        if lg == "en":
            if i > 0 and core.lower() in SMALL_EN:
                if upper:
                    bad.append("%s（虚词应小写）" % core)
            elif not upper:
                bad.append("%s（实词应大写）" % core)
        elif lg == "de":
            # 只查虚词误大写：德语形容词/分词本就小写（„die biologische
            # Sicherheit"），要求「非虚词必大写」会大面积误判。
            if core.lower() in FUNC_DE and upper:
                bad.append("%s（虚词应小写）" % core)
        else:
            if i == 0 and not upper:
                bad.append("%s（首词应大写）" % core)
            if len(core) > 4 and core.isupper():
                bad.append("%s（非缩写不应全大写）" % core)
    return bad


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tmp", default="")
    a = ap.parse_args()
    del a

    pv = db.current_policy(os.path.join(KIT, "data", "glossary.db"), KIT)
    rows = [r for r in pv.lexicons.get("term-zh", ()) if r.get("value")]
    fails, checked = [], 0
    for r in rows:
        try:
            meta = json.loads(r.get("meta_json") or "{}")
        except ValueError:
            continue
        if meta.get("kind") not in ENTITY:
            continue
        lg, form = r["value"], (r.get("target") or "")
        if lg in CASELESS:
            continue
        if lg not in ("en", "de"):
            bad = [b for b in check(form, lg)
                   if ("首词" in b and meta.get("kind") in PROPER) or "全大写" in b]
        elif meta.get("kind") not in PROPER:
            bad = []        # 证单/许可证是普通名词，en 小写、de 首词大写即可
        else:
            bad = check(form, lg)
        checked += 1
        if bad:
            fails.append("%s/%s %s ← %s" % (r["key"], lg, "；".join(bad), form))

    # 负向控制：写错的词形必须被判红（否则本臂等于没跑）
    neg = [("Law on the inspection of Import and Export Commodities", "en"),
           ("Direct selling Regulations", "en"),
           ("Gesetz Über den Direktvertrieb", "de")]
    for form, lg in neg:
        if not check(form, lg):
            fails.append("负向控制失效：%r 未被判红" % form)

    print("term-zh 标题式：检查 %d 行（专名 %s）" % (checked, "/".join(ENTITY)))
    for f in fails[:15]:
        print("  FAIL %s" % f)
    if fails:
        print("失败 %d 项" % len(fails))
        return 1
    print("OK en Title Case / de 虚词小写 / 其余首词大写与缩写例外")
    return 0


if __name__ == "__main__":
    sys.exit(main())
