# -*- coding: utf-8 -*-
"""P75 射程体检：规则在多少（篇目 × 语向）上**具备开火条件**。

为什么需要它：全库 P75 = 0 有两种解释——「译文都对」和「根本没机会判」。
只有知道有多少格子双侧次数达闸（计数 ≥MIN_ATTR / 对举 ≥2 段），才知道这个
0 是**证据**还是**空白**。这是「0 命中必须自证」在规则层面的应用：自检臂证明
「逻辑能报」，端到端注入证明「管线会报」，射程体检证明「语料给不给机会」。

射程只看母版（zh），与译文无关：
    计数闸  zh_a ≥ MIN_ATTR(5) 且 zh_b ≥ MIN_ATTR
    块级闸  zh_a ≥ MIN_N(3) 且 zh_b ≥ MIN_N 且 同段共现 ≥2 段
另外两侧在该语向都必须是 `check`，否则规则不进那一格（语向数按交集算）。

用法：
    python submit.py tools rule_p75_reach [--tsv out.tsv] [--root 项目根] [--family fam.json]
"""
# 治理声明：本文件属机制层，不承载策略数据；改动须走 README「治理」节的 L3 流程
#（先登记理由 → 行为级等价断言 → selftest --kit 全量），提交说明带 [arch]
#（commit-msg 钩子强制）。策略变更请改 plugins/ 判据或经 submit.py glossary 改库。
import argparse
import io
import importlib.util
import os
import re
import sys

KIT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOOLS = os.path.join(KIT, "tools")


def _load_audit():
    p = os.path.join(TOOLS, "family_audit.py")
    spec = importlib.util.spec_from_file_location("family_audit", p)
    m = importlib.util.module_from_spec(spec)
    sys.modules["family_audit"] = m
    spec.loader.exec_module(m)
    return m


FA = _load_audit()

MIN_ATTR = 5      # 与 plugins/text-concept-contrast.py 保持一致
MIN_N = 3
MIN_BLOCK = 2


def cn_blocks(text):
    return [b for b in re.split(r"\n\s*\n", text or "") if b.strip()]


def concepts_pairs(fam):
    """→ [(A, B), …]，每对只出一次。pair 字段双向记录，用排序去重。"""
    pair = {}
    for concept, per_lg in fam.items():
        for cell in per_lg.values():
            if isinstance(cell, dict) and cell.get("pair"):
                pair[concept] = cell["pair"]
                break
    seen, out = set(), []
    for c, p in sorted(pair.items()):
        key = tuple(sorted((c, p)))
        if key in seen:
            continue
        seen.add(key)
        out.append((c, p))
    return out


def reach(fam, corp, concept, pair):
    rows = []
    for pkg in sorted(corp):
        zh = (corp[pkg] or {}).get("zh") or ""
        if not zh:
            continue
        na, nb = zh.count(concept), zh.count(pair)
        if not (na and nb):
            continue
        both = len([b for b in cn_blocks(zh) if concept in b and pair in b])
        langs = [lg for lg, cell in (fam.get(concept) or {}).items()
                 if isinstance(cell, dict) and cell.get("mode") == "check"
                 and ((fam.get(pair) or {}).get(lg) or {}).get("mode") == "check"]
        rows.append(dict(kind="REG" if os.sep + "regulations" + os.sep in pkg
                         else "BLOG",
                         pkg=pkg.split(os.sep)[-1],
                         na=na, nb=nb, both=both, langs=len(langs),
                         attr=na >= MIN_ATTR and nb >= MIN_ATTR,
                         block=(na >= MIN_N and nb >= MIN_N
                                and both >= MIN_BLOCK)))
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tsv", default="")
    ap.add_argument("--root", default="", help="含 submission/ 的项目根")
    ap.add_argument("--family", default="", help="词族 JSON（默认读库）")
    a = ap.parse_args()

    fam = (FA.family_from_json(a.family, set()) if a.family
           else FA.family_from_db(set()))
    corp = FA.load_corpus(a.root or None)
    duo = concepts_pairs(fam)

    all_rows = []
    print("语料篇目 %d｜概念对 %d 对" % (len(corp), len(duo)))
    for concept, pair in duo:
        rows = reach(fam, corp, concept, pair)
        all_rows.extend([(concept, pair) + tuple(r.values()) for r in rows])
        live = [r for r in rows if r["attr"] or r["block"]]
        if not live:
            print("  %-5s/%-5s 共存 %2d 篇 → **射程 0 篇**（判据无从开火）"
                  % (concept, pair, len(rows)))
            continue
        langs = max(r["langs"] for r in live)
        cells = sum(r["langs"] for r in live)
        print("  %-5s/%-5s 共存 %2d 篇 → 射程 %2d 篇（REG %d / BLOG %d）"
              "× 可判语向 %d ≈ **%d 格**"
              % (concept, pair, len(rows), len(live),
                 len([r for r in live if r["kind"] == "REG"]),
                 len([r for r in live if r["kind"] == "BLOG"]), langs, cells))
        for r in sorted(live, key=lambda x: -(x["na"] + x["nb"]))[:4]:
            gates = " ".join(g for g, ok in (("计数闸", r["attr"]),
                                             ("块级闸", r["block"])) if ok)
            print("      %-4s %-44s 母版 %s=%d/%s=%d 对举段=%d 语向=%d [%s]"
                  % (r["kind"], r["pkg"][:44], concept, r["na"], pair, r["nb"],
                     r["both"], r["langs"], gates))
    if a.tsv:
        with io.open(a.tsv, "w", encoding="utf-8", newline="\n") as fh:
            fh.write("concept\tpair\tkind\tpkg\tzh_a\tzh_b\tboth_blocks\tlangs"
                     "\tattr_ok\tblock_ok\n")
            for r in all_rows:
                fh.write("%s\t%s\t%s\t%s\t%d\t%d\t%d\t%d\t%d\t%d\n" % r)
        print("\n明细 → %s（%d 行）" % (a.tsv, len(all_rows)))
    return 0


if __name__ == "__main__":
    import os as _os
    import sys as _sys
    _sys.path.insert(0, _os.path.dirname(_os.path.dirname(
        _os.path.abspath(__file__))))
    from tools import require_entry
    require_entry("rule_p75_reach")
    sys.exit(main())
