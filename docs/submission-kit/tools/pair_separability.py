# -*- coding: utf-8 -*-
"""概念对**可判别性**体检：这对概念值不值得立判据（建词族之前先问）。

P75 的前提是「母版把 A、B 分开表述，译文却合成了一个词」。这个前提不总成立，
而它不成立时，补词形、调阈值、加自检臂全是空转。本工具只用母版 + 块对齐，
在**建任何词表之前**回答四个问题：

    ① 对照段够不够：母版有没有「只讲 A」和「只讲 B」的段？
       —— REG45 的「退运/销毁」全是「退运或者销毁」固定连用，对照段极薄，
          词族再全也没有可判形态。
    ② 每侧有没有**稳定术语**：某个词覆盖该侧 ≥30% 的块、且在另一侧 ≤10%。
       —— de 税号=`Warennummer`（8/8 段）、归类=`Einreihungsentscheidung`；
          而「备案」在多数语向找不到这样的词，正是它立不起判据的原因。
    ③ 有没有**合并候选**：两侧都出现、比例接近的词（`declaration` 在
          申报/报关单两侧都高频）。嵌套共享就藏在这里——它因为两边都高频而
          进不了任何一侧的特征词，只看特征词会漏。
    ④ 哪一语向分不开：合并候选多、两侧术语互相渗透的语向，先怀疑它本身就
          不区分两概念（merged），而不是词族缺写法。

方法要点（都是踩过的坑）：
- 只统计**两概念共存**的篇目。否则 A 侧段来自 A 主题篇目、B 侧段来自 B 主题
  篇目，特征词反映的是话题差异（`yuan`、`gacc`、年份），不是译法。
- 特征词按**覆盖率**取，不按词频或对数几率：虚词（der/the/und）词频最高，
  对数几率也会因句长偏置浮上来。
- 纯数字排除，编码存活由 P20/P36 负责。

用法：
    python submit.py tools pair_separability --pairs 归类=税号,退运=销毁
    python submit.py tools pair_separability --pairs 发票=合同 --langs de,fr --show 3
"""
# 治理声明：本文件属机制层，不承载策略数据；改动须走 README「治理」节的 L3 流程
#（先登记理由 → 行为级等价断言 → selftest --kit 全量），提交说明带 [arch]
#（commit-msg 钩子强制）。策略变更请改 plugins/ 判据或经 submit.py glossary 改库。
import argparse
import collections
import importlib.util
import os
import re
import sys
import unicodedata

KIT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOOLS = os.path.join(KIT, "tools")

COVER_OWN = 0.30      # 该词覆盖本侧 ≥30% 的块
COVER_OTHER = 0.10    # 且在另一侧 ≤10% 的块
GENERIC_MAX = 0.15    # **全语料**通用度上限：该语向所有块里都高频的词不是术语
SHARED_MIN = 2        # 「合并候选」的最低出现次数


def _load():
    p = os.path.join(TOOLS, "family_audit.py")
    spec = importlib.util.spec_from_file_location("family_audit", p)
    m = importlib.util.module_from_spec(spec)
    sys.modules["family_audit"] = m
    spec.loader.exec_module(m)
    return m


FA = _load()

TOKEN = re.compile(r"[^\s\.,;:!\?\(\)\[\]\{\}\"'«»„“”—–\|/\\]+")
MIN_LEN = 3


def blocks(text):
    return [b for b in re.split(r"\n\s*\n", text or "") if b.strip()]


def tokens(text):
    t = unicodedata.normalize("NFKC", text or "").lower()
    return [w for w in TOKEN.findall(t) if len(w) >= MIN_LEN and not w.isdigit()]


def generic_df(corp, langs):
    """lg → (词 → 覆盖该语向全部块的段数, 总块数)。

    「稳定术语」只看两侧差异不够：`generalzollverwaltung`（海关总署）在归类侧
    很稳、在税号侧不出现，但它在该语向的**所有法规篇目**里都高频，是话题词不是
    术语。把全语料通用度作为第三道闸，候选才干净。
    """
    df = collections.defaultdict(collections.Counter)
    total = collections.Counter()
    for pkg in corp.values():
        for lg in langs:
            tr = (pkg or {}).get(lg) or ""
            if not tr:
                continue
            for bt in blocks(tr):
                total[lg] += 1
                df[lg].update(set(tokens(bt)))
    return df, total


def analyse(corp, ca_txt, cb_txt, langs, gdf=None, gtot=None):
    """→ {lg: dict(stat, cover_a, cover_b, shared)}

    `gdf` 不给就自己算——曾经的坑：调用方漏传会静默**跳过通用度闸**，候选里
    立刻混进 `from`/`general`/`kiinan` 这类词。
    """
    if gdf is None:
        gdf, gtot = generic_df(corp, langs)
    cnt_a = collections.defaultdict(collections.Counter)
    cnt_b = collections.defaultdict(collections.Counter)
    df_a = collections.defaultdict(collections.Counter)     # 出现该词的块数
    df_b = collections.defaultdict(collections.Counter)
    stat = collections.defaultdict(collections.Counter)
    for pkg in sorted(corp):
        texts = corp[pkg] or {}
        zh = texts.get("zh") or ""
        if not zh or not (ca_txt in zh and cb_txt in zh):
            continue                      # 只统计两概念共存的篇目
        zb = blocks(zh)
        for lg in langs:
            tr = texts.get(lg) or ""
            if not tr:
                continue
            tb = blocks(tr)
            if len(zb) != len(tb):
                stat[lg]["misaligned"] += 1
                continue
            for bz, bt in zip(zb, tb):
                has_a, has_b = ca_txt in bz, cb_txt in bz
                if not (has_a or has_b):
                    continue
                toks = tokens(bt)
                if has_a and has_b:
                    stat[lg]["both"] += 1
                elif has_a:
                    stat[lg]["only_a"] += 1
                    cnt_a[lg].update(toks)
                    df_a[lg].update(set(toks))
                else:
                    stat[lg]["only_b"] += 1
                    cnt_b[lg].update(toks)
                    df_b[lg].update(set(toks))
    out = {}
    for lg in stat:
        n_a = max(1, stat[lg]["only_a"])
        n_b = max(1, stat[lg]["only_b"])

        def cover(own_df, other_df, own_n, other_n):
            rows = []
            for w, k in own_df.items():
                if k / float(own_n) < COVER_OWN:
                    continue
                if other_df[w] / float(other_n) > COVER_OTHER:
                    continue
                if gdf is not None and gtot.get(lg):
                    if gdf[lg][w] / float(gtot[lg]) > GENERIC_MAX:
                        continue            # 话题词（海关总署/China/年份）
                rows.append((k / float(own_n), w, k, other_df[w]))
            rows.sort(key=lambda x: -x[0])
            return rows[:3]

        ca = cover(df_a[lg], df_b[lg], n_a, n_b)
        cb = cover(df_b[lg], df_a[lg], n_b, n_a)
        shared = []
        for w in set(df_a[lg]) | set(df_b[lg]):
            x, y = df_a[lg][w], df_b[lg][w]
            if x < SHARED_MIN or y < SHARED_MIN:
                continue
            ra, rb = x / float(n_a), y / float(n_b)
            if rb <= 0 or not (0.5 <= ra / rb <= 2.0):
                continue
            # 虚词同样要过通用度闸：不然 `die`/`der`/`und`/`the` 永远排在最前，
            # 这一列就没有信息量（嵌套共享如 `declaration` 反而排在后面）。
            if gdf is not None and gtot.get(lg):
                if gdf[lg][w] / float(gtot[lg]) > GENERIC_MAX:
                    continue
            shared.append((min(x, y), w, x, y))
        shared.sort(key=lambda t: -t[0])
        out[lg] = dict(lg=lg, stat=stat[lg], cover_a=ca, cover_b=cb,
                       shared=shared[:3])
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pairs", required=True, help="A=B,C=D")
    ap.add_argument("--langs", default="", help="只看这些语向")
    ap.add_argument("--show", type=int, default=3)
    ap.add_argument("--root", default="")
    a = ap.parse_args()

    corp = FA.load_corpus(a.root or None)
    only = {x.strip() for x in a.langs.split(",") if x.strip()}
    langs = sorted({lg for pkg in corp.values() for lg in pkg
                    if lg != "zh" and (not only or lg in only)})
    for spec in [x for x in a.pairs.split(",") if x.strip()]:
        if "=" not in spec:
            raise SystemExit("--pairs 要写成 A=B")
        ca_txt, cb_txt = [x.strip() for x in spec.split("=", 1)]
        res = analyse(corp, ca_txt, cb_txt, langs)
        rows = [v for v in res.values()
                if v["stat"]["only_a"] or v["stat"]["only_b"]]
        ta = sum(v["stat"]["only_a"] for v in rows)
        tb = sum(v["stat"]["only_b"] for v in rows)
        print("\n=== %s / %s ===" % (ca_txt, cb_txt))
        print("  母版对照段（仅共存篇目）：只讲 %s %d 段、只讲 %s %d 段"
              % (ca_txt, ta, cb_txt, tb))
        if not ta or not tb:
            print("  ⚠️ **无从判别**：两概念在母版里几乎不分开表述（多为固定连用），"
                  "词族再全也没有可判形态")
            continue
        no_a = [v["lg"] for v in rows if not v["cover_a"]]
        no_b = [v["lg"] for v in rows if not v["cover_b"]]
        print("  两侧都有稳定术语 %d 语向；缺侧：%s %d %s ｜ %s %d %s"
              % (len(rows) - len(set(no_a) | set(no_b)),
                 ca_txt, len(no_a), no_a[:6], cb_txt, len(no_b), no_b[:6]))
        order = sorted(rows, key=lambda x: -(x["stat"]["only_a"] + x["stat"]["only_b"]))
        for v in order[:a.show]:
            print("  %-3s 段 A/B/共 %2d/%2d/%2d"
                  % (v["lg"], v["stat"]["only_a"], v["stat"]["only_b"],
                     v["stat"]["both"]))
            print("       %s: %s" % (ca_txt, "、".join(
                "%s(%d/%d 段)" % (w, k, ok) for _r, w, k, ok in v["cover_a"])
                or "**无稳定术语**"))
            print("       %s: %s" % (cb_txt, "、".join(
                "%s(%d/%d 段)" % (w, k, ok) for _r, w, k, ok in v["cover_b"])
                or "**无稳定术语**"))
            if v["shared"]:
                print("       两侧共有（合并候选）: %s" % "、".join(
                    "%s(%d/%d 段)" % (w, x, y) for _m, w, x, y in v["shared"]))
        if min(ta, tb) <= 5:
            print("  ⚠️ 对照段过薄（一侧仅 %d 段），结论不稳" % min(ta, tb))
    return 0


if __name__ == "__main__":
    import os as _os
    import sys as _sys
    _sys.path.insert(0, _os.path.dirname(_os.path.dirname(
        _os.path.abspath(__file__))))
    from tools import require_entry
    require_entry("pair_separability")
    sys.exit(main())
