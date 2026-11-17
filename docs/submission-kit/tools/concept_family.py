# -*- coding: utf-8 -*-
"""把「候选词形」坐实成**词族**（concept-family 的输入），并自动识别语言合并。

词库（term-zh）要求「有据且唯一」；但多数概念在不同语向有多个合法形态，
甚至某些语言用同一个词表达两个对立概念。本工具做三件事：

1. **坐实**：候选词形逐个到该语向语料里计数，0 次的一律丢弃
   （不写「构造成形」——这是词族与词库共同的第一原则）。
2. **合并识别**：同一语向里两族共享的词形即「无区分力词形」，从两族同时
   剔除，并把该语向标 `mode=merged`（P75 会整体跳过该语向，不判红）。
3. **留痕**：每个语向输出保留词形及其实频，写进 report 供人工复核。

输入 spec（JSON）：
    {"免税": {"de": ["Befreiung", "Steuerbefreiung"], "bg": ["освобождаване"]},
     "放行": {"de": ["Freigabe"], "bg": ["освобождаване"]}}

候选怎么来：`tools/term_candidates.py`（中文概念 → 各语锚定窗口 n-gram），
或用 `tmp` 里的数字锚/题录标题通道人工取几个，再交给本工具坐实。

用法：
    python submit.py tools concept_family --spec spec.json --pairs 免税=放行 \
        --out family.json [--min-count 1] [--report family_report.txt]
"""
# 治理声明：本文件属机制层，不承载策略数据；改动须走 README「治理」节的 L3 流程
#（先登记理由 → 行为级等价断言 → selftest --kit 全量），提交说明带 [arch]
#（commit-msg 钩子强制）。策略变更请改 plugins/ 判据或经 submit.py glossary 改库。
import argparse
import glob
import io
import json
import os
import sys
import unicodedata

KIT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.dirname(KIT)


def norm(s):
    return unicodedata.normalize("NFKC", s)


def load_corpus():
    """语向 → 全文（拼接）；读不到的文件跳过（并行会话会删改文件）。"""
    out = {}
    for f in glob.glob(os.path.join(ROOT, "submission/**/content/*/*.mdx"),
                       recursive=True):
        lg = os.path.basename(os.path.dirname(f))
        try:
            out.setdefault(lg, []).append(io.open(f, encoding="utf-8").read())
        except OSError:
            continue
    return {k: norm("\n".join(v)).lower() for k, v in out.items()}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default="",
                    help="含 submission/ 的项目根（缺省=工具包同级）")
    ap.add_argument("--spec", required=True, help="候选词形 JSON")
    ap.add_argument("--out", required=True, help="词族 JSON")
    ap.add_argument("--pairs", default="", help="对立概念对，如 免税=放行,注册=备案")
    ap.add_argument("--min-count", type=int, default=1)
    ap.add_argument("--report", default="", help="逐语向保留/丢弃明细")
    ap.add_argument("--drift", action="store_true",
                    help="漂移体检：只报告该语向族里**全库 0 命中**的词形（可能换了写法）")
    a = ap.parse_args()
    if a.root:
        global ROOT
        ROOT = os.path.abspath(a.root)

    spec = json.load(io.open(a.spec, encoding="utf-8"))
    pair_of = {}
    for chunk in [x for x in a.pairs.split(",") if x.strip()]:
        left, _, right = chunk.partition("=")
        pair_of[left.strip()] = right.strip()
        pair_of[right.strip()] = left.strip()

    corp = load_corpus()
    if a.drift:
        drift = []
        for concept, per_lg in sorted(spec.items()):
            for lg, forms in sorted(per_lg.items()):
                text = corp.get(lg, "")
                if not text:
                    drift.append("%-8s %-3s 该语向无语料" % (concept, lg))
                    continue
                dead = [f for f in forms if text.count(norm(f).lower()) < a.min_count]
                if dead and len(dead) == len(forms):
                    drift.append("%-8s %-3s 全部形态 0 命中：%s（疑似换了写法）"
                                 % (concept, lg, "、".join(dead)))
        io.open(a.out, "w", encoding="utf-8", newline="\n").write("\n".join(drift))
        print("漂移体检：%d 条疑点 → %s" % (len(drift), a.out))
        return 0

    fam, report = {}, []
    for concept, per_lg in spec.items():
        for lg, forms in sorted(per_lg.items()):
            text = corp.get(lg, "")
            keep, drop = [], []
            for f in forms:
                n = text.count(norm(f).lower())
                if n >= a.min_count:
                    keep.append((f, n))
                else:
                    drop.append(f)
            fam.setdefault(concept, {})[lg] = [f for f, _ in keep]
            report.append("%-8s %-3s keep=%s drop=%s" % (
                concept, lg, ", ".join("%s(%d)" % kv for kv in keep),
                ", ".join(drop) or "-"))

    # 合并识别：对立两族共享的词形无区分力，剔除并标 merged
    merged = {}
    for concept, other in sorted(pair_of.items()):
        if concept > other:
            continue
        fam_a, fam_b = fam.get(concept, {}), fam.get(other, {})
        for lg in sorted(set(fam_a) & set(fam_b)):
            shared = {f.lower() for f in fam_a[lg]} & {f.lower() for f in fam_b[lg]}
            if not shared:
                continue
            merged[(concept, lg)] = merged[(other, lg)] = sorted(shared)
            fam_a[lg] = [f for f in fam_a[lg] if f.lower() not in shared]
            fam_b[lg] = [f for f in fam_b[lg] if f.lower() not in shared]

    out = {}
    for concept, per_lg in fam.items():
        out[concept] = {}
        for lg, forms in per_lg.items():
            out[concept][lg] = {"forms": forms,
                                "mode": "merged" if (concept, lg) in merged else "check",
                                "pair": pair_of.get(concept, "")}
    for concept, lg in sorted(merged):
        report.append("MERGED   %-8s %-3s 共享 %s" % (concept, lg, "、".join(merged[(concept, lg)])))

    io.open(a.out, "w", encoding="utf-8", newline="\n").write(
        json.dumps(out, ensure_ascii=False, indent=1))
    if a.report:
        io.open(a.report, "w", encoding="utf-8", newline="\n").write("\n".join(report))
    empty = sum(1 for c in out.values() for v in c.values() if not v["forms"])
    print("写出 %s｜概念 %d｜空族 %d｜合并 %d 处"
          % (a.out, len(out), empty, len(merged)))
    return 0


if __name__ == "__main__":
    import os as _os
    import sys as _sys
    _sys.path.insert(0, _os.path.dirname(_os.path.dirname(
        _os.path.abspath(__file__))))
    from tools import require_entry
    require_entry("concept_family")
    sys.exit(main())
