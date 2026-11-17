# -*- coding: utf-8 -*-
"""词族**精度体检**：`family_audit.py` 量「够不够用」（召回），这里量
「是不是只表这个概念」（精度）。

为什么需要它：召回高只证明族里覆盖了语料中的表达，不证明这些词形**只**表
这个概念。`family_expand` 曾把 de `Rechnung`（发票）的词干剥成 `rechn`，再
加屈折后缀造出 `rechnen`（计算）、`rechner`（计算器）——三者在语料里都有实
频，召回照样满分，判据却会拿「计算」的次数当成「发票」的次数。这类**误吸**
（同词干不同词）不报错、只让判据悄悄失准，必须机器先筛一遍。

方法（母版当尺子，块级对齐，**全库遍历**）：

    篇目切成块（mdx frontmatter 之后按空行切）。译文块与母版块**逐块对齐**
    （实测多数篇目 1:1；不对齐的只丢块级细分、仍计入篇级信号）。
    词形的每次出现归入四类：
        own      篇内 + 本块母版含概念
        other    篇内 + 本块母版只含对立概念
        neither  篇内 + 本块母版两个都不含（回指、换说法，多为合法噪声）
        offtopic 整篇母版都不含本概念

    两个精度，用途不同：
        precision      = own / 全库命中  —— 综合，受「母版不写字」影响大
        prec_evidence  = own / (own+other+neither) —— **判定误吸看这一列**

读法（重要）：
- 低精度**不是判 red**，是**送人工读上下文**。中文母版常把「发票」写成
  「票据/凭证/账单」，把「放行」写成「通关/提离」，这些块会落进 `neither`；
  整篇不写该字更是常见，会落进 `offtopic`。只看全库精度会把所有词形都判脏。
- 强信号是 **`prec_evidence` 低且命中数不低**：连母版明写该概念的块里都不
  用这个词形，说明它在这个语料里另有含义。`other` 高（对立概念块里频繁出现）
  是第二强信号。
- 反例（实测）：de `rechnen`（计算）全库 14 次，13 次在不提「发票」的篇目，
  证据内精度 0.00；而 `Rechnung` 兼表「算式/验算」，证据内仍有 0.79 —— 后者
  是多义但可用的词形，不该跟着剔除。

实现注记：v428 第一版只遍历「证据篇目」（母版提到该概念的篇目），于是
`rechnen` 这类误吸在旧口径下命中 0，工具对已知错误都报不出来。自检臂
`selftest/_family_precision.py` 的第 ① 条断言专门钉住这个复发。

用法：
    python submit.py tools family_precision                      # 全部 check 格子
    python submit.py tools family_precision --concepts 发票,合同
    python submit.py tools family_precision --langs de,es --samples 2
    python submit.py tools family_precision --family tmp/x/f.json --min-occ 3
"""
# 治理声明：本文件属机制层，不承载策略数据；改动须走 README「治理」节的 L3 流程
#（先登记理由 → 行为级等价断言 → selftest --kit 全量），提交说明带 [arch]
#（commit-msg 钩子强制）。策略变更请改 plugins/ 判据或经 submit.py glossary 改库。
import argparse
import collections
import importlib.util
import io
import json
import os
import sys

KIT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if KIT not in sys.path:
    sys.path.insert(0, KIT)

_spec = importlib.util.spec_from_file_location(
    "family_audit", os.path.join(KIT, "tools", "family_audit.py"))
FA = importlib.util.module_from_spec(_spec)
sys.modules["family_audit"] = FA
_spec.loader.exec_module(FA)


def blocks(text):
    """mdx → 正文块列表（frontmatter 之后按空行切，丢空块）。"""
    t = text or ""
    i = t.find("\n---", 3)
    body = t[i + 3:] if i > 0 else t
    return [b for b in body.split("\n\n") if b.strip()]


_MOD = None
_RX = {}


def rx_of(form, lg):
    """预编译并缓存（插件的 `_rx` 本身不带缓存，热循环里会重复 parse）。"""
    global _MOD
    if _MOD is None:
        _MOD = FA._load_plugin()
    key = (form, lg)
    if key not in _RX:
        _RX[key] = _MOD._rx(form, lg)
    return _RX[key]


def _spans_rx(rxs, text):
    out = []
    for rx in rxs:
        if rx:
            out.extend((m.start(), m.end()) for m in rx.finditer(text))
    return out


def block_hits(mine, rival, text, lg):
    """→ [(词形, 起, 止)]，一块只扫一遍对立族，且两侧都做 ZWNJ 归一。

    v428 之前 `form_spans` 对**每个词形**都重扫一遍对立族的几十个词形，复杂度
    O(本族 × 对立族 × 块数)，全库 4m42s；且块级路径漏了 `_prep`，波斯语
    ZWNJ 连写的词形在精度体检里会误算 0 次。
    """
    if _MOD is None:
        rx_of("__warmup__", lg)        # 只为初始化 _MOD
    t = _MOD._prep(text)
    sb = _spans_rx(rival, t)
    out = []
    for form, rx in mine:
        if not rx:
            continue
        for s, e in _spans_rx([rx], t):
            if any(os_ <= s and e <= oe and (oe - os_) > (e - s)
                   for os_, oe in sb):
                continue
            out.append((form, s, e))
    return out


def clip(blk, s, e, pad=45):
    a, b = max(0, s - pad), min(len(blk), e + pad)
    return ("…" if a else "") + blk[a:b].replace("\n", " ") + ("…" if b < len(blk) else "")


def audit(fam, corp, a):
    """全库口径（见模块 docstring）。

    v428 修掉一个让工具自失效的盲区：第一版只遍历「证据篇目」（母版提到该
    概念的篇目），于是误吸词形在**完全不谈这个概念的篇目**里的出现根本进不了
    统计。实测 de `rechnen`（计算）全库 14 次，13 次落在不提「发票」的篇目，
    旧口径下命中 0 → 工具对已知的误吸都报不出来。

    现在每篇都过，分四类：
        own      篇内 + 本块母版含概念
        other    篇内 + 本块母版只含对立概念
        neither  篇内 + 本块母版两个都不含（回指、换说法，多为合法噪声）
        offtopic 整篇母版都不含本概念 —— **误吸的第一信号**
    """
    rows = []          # (concept, lg, form, n, own, other, neither, offtopic,
                       #  prec, prec_evi)
    samples = collections.defaultdict(list)
    for concept in sorted(fam):
        per_lg = fam[concept]
        pair = ""
        for cell in per_lg.values():
            if cell.get("pair"):
                pair = cell["pair"]
                break
        for lg in sorted(per_lg):
            cell = per_lg[lg]
            if cell.get("mode") != "check":      # 只看已开判据的格子
                continue
            if a.langs and lg not in a.langs:
                continue
            mine = tuple(cell.get("forms") or ())
            if not mine:
                continue
            rival = tuple((((fam.get(pair) or {}).get(lg)) or {}).get("forms") or ())
            mine_rx = [(f, rx_of(f, lg)) for f in mine]
            rival_rx = [rx_of(f, lg) for f in rival]
            stat = collections.defaultdict(lambda: [0, 0, 0, 0, 0])
            bz = ""                     # 供 bump 的 kind==2 分支引用
            for pkg, texts in sorted(corp.items()):
                zh, tr = texts.get("zh") or "", texts.get(lg) or ""
                if not zh or not tr:
                    continue
                tb = blocks(tr)
                pkg_has = concept in zh

                def bump(form, kind, bt=None, s=0, e=0):
                    st = stat[form]
                    st[0] += 1
                    st[kind] += 1
                    key = (concept, lg, form, ("other" if kind == 2 else
                                              "offtopic" if kind == 4 else "neither"))
                    if len(samples[key]) < a.samples and bt is not None:
                        if kind == 4:
                            samples[key].append("篇目 %s｜%s"
                                                % (pkg.split(os.sep)[-1][:42], clip(bt, s, e)))
                        elif kind == 2:
                            samples[key].append("母版:「%s」\n            译文:%s"
                                                % (bz.strip()[:70], clip(bt, s, e)))
                        else:
                            samples[key].append(clip(bt, s, e))

                if not pkg_has:
                    # 不需要块对齐：整篇都不谈这个概念，命中全是离题
                    for bt in tb:
                        for form, s, e in block_hits(mine_rx, rival_rx, bt, lg):
                            bump(form, 4, bt, s, e)
                    continue
                zb = blocks(zh)
                if len(zb) != len(tb):
                    a.skip += 1
                    for bt in tb:
                        for form, s, e in block_hits(mine_rx, rival_rx, bt, lg):
                            bump(form, 3, bt, s, e)
                    continue
                for bz, bt in zip(zb, tb):
                    own_zh = concept in bz
                    other_zh = bool(pair) and pair in bz
                    for form, s, e in block_hits(mine_rx, rival_rx, bt, lg):
                        bump(form, 1 if own_zh else 2 if other_zh else 3,
                             bt, s, e)
            for form, (n, own, other, neither, offtopic) in stat.items():
                if n < a.min_occ:
                    continue
                prec = own / float(n) if n else 0.0
                evi = own + other + neither
                prec_evi = own / float(evi) if evi else 0.0
                rows.append((concept, lg, form, n, own, other,
                             neither, offtopic, prec, prec_evi))
    return rows, samples


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--family", default="", help="词族 JSON（默认读库）")
    ap.add_argument("--concepts", default="", help="逗号分隔，默认全部")
    ap.add_argument("--langs", default="")
    ap.add_argument("--min-occ", type=int, default=3, help="词形最少出现次数")
    ap.add_argument("--min-prec", type=float, default=0.5,
                    help="低于此精度才列出（默认 0.5）")
    ap.add_argument("--samples", type=int, default=0, help="每个可疑词形附几条原文")
    ap.add_argument("--root", default="", help="含 submission/ 的项目根")
    ap.add_argument("--tsv", default="")
    ap.add_argument("--max-offtopic", type=float, default=0.5,
                    help="离题篇目命中占比超过此值即列出（默认 0.5）")
    ap.add_argument("--limit", type=int, default=40,
                    help="控制台最多打印多少条可疑词形（默认 40）")
    a = ap.parse_args()
    a.langs = set(x.strip() for x in a.langs.split(",") if x.strip())
    a.skip = 0
    concepts = set(x.strip() for x in a.concepts.split(",") if x.strip())
    fam = (FA.family_from_json(a.family, concepts) if a.family
           else FA.family_from_db(concepts))
    corp = FA.load_corpus(a.root or None)
    print("语料篇目 %d｜check 格子 %d" % (
        len(corp), sum(1 for c in fam.values() for x in c.values()
                       if x.get("mode") == "check")))
    rows, samples = audit(fam, corp, a)
    print("词形 %d 个（出现 ≥%d 次）｜证据篇目块数不对齐 %d 次\n"
          % (len(rows), a.min_occ, a.skip))

    def suspicious(r):
        return r[8] < a.min_prec or (r[7] / float(r[3]) > a.max_offtopic)

    bad = [r for r in rows if suspicious(r)]
    bad.sort(key=lambda r: (-r[7], r[8]))
    print("可疑词形 %d 个（全库精度 <%.2f 或 离题占比 >%.2f；按离题次数降序）："
          % (len(bad), a.min_prec, a.max_offtopic))
    for (concept, lg, form, n, own, other, neither, offtopic,
         prec, prec_evi) in bad[:a.limit]:
        flag = "★" if offtopic >= own else " "
        print("%s %-6s %-3s %-24s 共%-4d 本概念%-4d 对立%-3d 其余%-3d 离题%-4d 全库=%.2f 证据内=%.2f"
              % (flag, concept, lg, form, n, own, other, neither, offtopic,
                 prec, prec_evi))
        for kind in ("offtopic", "other", "neither"):
            for s in samples.get((concept, lg, form, kind), []):
                print("      · %s" % s)
    if a.limit < len(bad):
        print("（仅显示前 %d 个，完整清单见 TSV）" % a.limit)
    if a.tsv:
        with io.open(a.tsv, "w", encoding="utf-8", newline="\n") as fh:
            fh.write("concept\tlang\tform\tn\town\tother\tneither\tofftopic"
                     "\tprecision\tprec_evidence\n")
            for r in sorted(rows, key=lambda x: (x[0], x[1], x[8])):
                fh.write("%s\t%s\t%s\t%d\t%d\t%d\t%d\t%d\t%.3f\t%.3f\n" % r)
        print("\n明细 → %s（%d 行）" % (a.tsv, len(rows)))
    return 0


if __name__ == "__main__":
    import os as _os
    import sys as _sys
    _sys.path.insert(0, _os.path.dirname(_os.path.dirname(
        _os.path.abspath(__file__))))
    from tools import require_entry
    require_entry("family_precision")
    sys.exit(main())
