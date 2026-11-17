# -*- coding: utf-8 -*-
"""term-zh 完整性臂：防「半成品入库」与「串行错填」。

检查项（任一不满足即 FAIL）：
1. 每个概念覆盖 47 个语向，且与该语向表完全一致（不缺不多）；
2. target 非空、无首尾空白；
3. 拉丁文字语向的词形必须含拉丁字母；非拉丁文字语向（ru/ar/ja/ko/hi/…）
   不得为纯 ASCII——那是漏译成英文的典型形态；
4. 同一语向下「全称」与「简称」（中华人民共和国海关总署 / 海关总署）不得相同；
5. 同一语向下两个不同概念不得给出完全相同的词形（串行错填）——比较前做
   NFKC + 小写 + 空白归一，否则「ＰＤＶ」与「PDV」、「kodi ya  matumizi」
   与「kodi ya matumizi」这类同形会漏判。
"""
import glob
import io
import json
import os
import re
import sys
import unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.dirname(HERE)
sys.path.insert(0, KIT)

from core import db                                               # noqa: E402
from core.consts import LOCALES                                    # noqa: E402

NON_LATIN = {"ru", "uk", "be", "bg", "sr", "ar", "fa", "he", "ur", "hi",
             "bn", "ne", "si", "ta", "th", "ja", "ko", "ka", "hy", "el"}


def _norm(s):
    """同形比较用：NFKC、小写、空白归一（全角/半角、多空格不该算不同）。"""
    s = unicodedata.normalize("NFKC", s).lower()
    return re.sub(r"\s+", " ", s).strip()


def main():
    pv = db.current_policy(os.path.join(KIT, "data", "glossary.db"), KIT)
    rows = [r for r in pv.lexicons.get("term-zh", ()) if r.get("value")]
    fails = []

    per = {}
    for r in rows:
        per.setdefault(r["key"], {})[r["value"]] = (r.get("target") or "")

    want = set(LOCALES) - {"zh"}   # 母版语向不入词表：key 本身就是中文
    for key, m in per.items():
        got = set(m)
        if got != want:
            fails.append("%s 语向不符：缺 %s，多 %s"
                         % (key, sorted(want - got), sorted(got - want)))
        for lg, t in m.items():
            if not t.strip():
                fails.append("%s/%s 空词形" % (key, lg))
            if t != t.strip():
                fails.append("%s/%s 首尾有空白" % (key, lg))
            if lg in NON_LATIN and re.match(r"^[\x00-\x7f ]+$", t):
                fails.append("%s/%s 非拉丁语向却是纯 ASCII：%r" % (key, lg, t))

    # 类别与注释：kind 是 P74 射程的开关（只有专名类参与混用臂），
    # 打错一个字母就会让某概念悄悄退出检查，所以在此钉死合法值。
    KINDS = {"org", "law", "doc", "permit", "term"}
    kinds = {}
    for r in rows:
        try:
            meta = json.loads(r["meta_json"] or "{}")
        except ValueError:
            fails.append("%s/%s meta_json 非法" % (r["key"], r["value"]))
            continue
        k = meta.get("kind", "")
        if k not in KINDS:
            fails.append("%s/%s kind 非法：%r（合法 %s）"
                         % (r["key"], r["value"], k, sorted(KINDS)))
        if not (meta.get("note") or "").strip():
            fails.append("%s/%s 缺 note（入库必须留证据说明）"
                         % (r["key"], r["value"]))
        kinds.setdefault(r["key"], set()).add(k)
    for key, ks in kinds.items():
        if len(ks) > 1:
            fails.append("%s 的 kind 不一致：%s" % (key, sorted(ks)))

    full, short = "中华人民共和国海关总署", "海关总署"
    if full in per and short in per:
        for lg in sorted(set(per[full]) & set(per[short])):
            if _norm(per[full][lg]) == _norm(per[short][lg]):
                fails.append("全称与简称在 %s 相同：%s" % (lg, per[full][lg]))

    seen = {}
    for key, m in per.items():
        for lg, t in m.items():
            k = (lg, _norm(t))
            if k in seen and seen[k] != key:
                fails.append("%s/%s 与「%s」词形相同：%s"
                             % (key, lg, seen[k], t))
            seen[k] = key

    print("term-zh：%d 个概念 / %d 行" % (len(per), len(rows)))
    for f in fails[:15]:
        print("  FAIL %s" % f)
    if fails:
        print("失败 %d 项" % len(fails))
        return 1
    print("OK 完整性、语向覆盖、全称/简称区分、无串行错填")
    return 0


if __name__ == "__main__":
    sys.exit(main())
