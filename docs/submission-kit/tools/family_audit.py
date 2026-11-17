# -*- coding: utf-8 -*-
"""词族**召回体检**：拿母版当尺子，量每个语向的词族是否「够用」。

问题：词族（concept-family）的 `mode` 要么整语向开判据、要么整语向关，但
「够不够用」过去只能靠人工读 47 语上下文——单对概念 47 次核对，6 对就是
282 次，实际推不动。

本工具把「够不够用」变成可量化、可复现的量：

    对每个（概念, 语向），取「zh 母版出现该概念 ≥ --min-zh 次」的篇目作证据集，
    逐篇比 `译文命中数 / 母版次数`：
        ok_pkg   比率 ≥ --pass（默认 0.5）的篇目数
        zero_pkg 译文 0 命中的篇目数
        recall   ok_pkg / 总篇目
    召回低 = 该语向表达这个概念还有别的词形没进族（同义改写），或该语真的
    不用这个词（那就该判 merged/不适用，而不是硬塞词形）。

**这不是语义终审**：召回高只能证明「族覆盖了语料里的表达」，不能证明「这些
词形只表这个概念」。语义仍要读上下文——本工具的价值是把 282 次人工核对
压缩到「召回不达标的那些格子」，其余格子抽样即可。

用法：
    python submit.py tools family_audit --concepts 归类,税号 [--langs es,no] [--min-zh 2]
    python submit.py tools family_audit --family tmp/x/family.json --tsv tmp/x/audit.tsv
"""
# 治理声明：本文件属机制层，不承载策略数据；改动须走 README「治理」节的 L3 流程
#（先登记理由 → 行为级等价断言 → selftest --kit 全量），提交说明带 [arch]
#（commit-msg 钩子强制）。策略变更请改 plugins/ 判据或经 submit.py glossary 改库。
import argparse
import collections
import glob
import importlib.util
import io
import json
import os
import re
import sys

KIT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.dirname(KIT)
DB = os.path.join(KIT, "data", "glossary.db")
sys.path.insert(0, KIT)
from core import db  # noqa: E402
if KIT not in sys.path:            # 插件里 `from core.textutil import ...`
    sys.path.insert(0, KIT)


def _load_plugin():
    p = os.path.join(KIT, "plugins", "text-concept-contrast.py")
    spec = importlib.util.spec_from_file_location("p75", p)
    mod = importlib.util.module_from_spec(spec)
    sys.modules["p75"] = mod
    spec.loader.exec_module(mod)
    return mod


# 射程闸门常量与 plugins/text-concept-contrast.py 保持一致
MIN_ATTR = 5      # 计数（归因）口径
MIN_N = 3         # 块级口径
MIN_BLOCK = 2     # 块级口径要求的同段共现段数


def _blocks_of(text):
    return [b for b in re.split(r"\n\s*\n", text or "") if b.strip()]


def reach_of(concept, pair, corp):
    """→ (共存篇目数, 射程篇目数)。射程只看母版：语料给不给判据开火的机会。

    v437 加这一列的理由：`免税/放行` 的 82 个 check 格射程为 0——母版从不在一
    篇里同时讨论这两个概念。召回体检再漂亮也没用，判据根本没机会跑。把射程
    放进汇总，读到「召回 1.44」的人同时会看到「射程 0 篇」。
    """
    if not pair:
        return 0, 0
    co = live = 0
    for _pkg, texts in corp.items():
        zh = texts.get("zh") or ""
        if not zh:
            continue
        na, nb = zh.count(concept), zh.count(pair)
        if not (na and nb):
            continue
        co += 1
        if na >= MIN_ATTR and nb >= MIN_ATTR:
            live += 1
            continue
        if na >= MIN_N and nb >= MIN_N:
            both = len([b for b in _blocks_of(zh) if concept in b and pair in b])
            if both >= MIN_BLOCK:
                live += 1
    return co, live


def load_corpus(root=None):
    """→ {篇目: {语向: 全文}}；读不到的文件跳过（并行会话会删改文件）。

    `root` 可指向任意含 submission/ 的目录——自检臂 `_family_audit` 用它
    在一个假语料树上验证召回算法本身。
    """
    root = root or ROOT
    pk = collections.defaultdict(dict)
    for f in glob.glob(os.path.join(root, "submission/**/content/*/*.mdx"),
                       recursive=True):
        lg = os.path.basename(os.path.dirname(f))
        pkg = f.split(os.sep + "content" + os.sep)[0].replace(root + os.sep, "")
        try:
            pk[pkg][lg] = io.open(f, encoding="utf-8").read()
        except OSError:
            continue
    return dict(pk)


def family_from_db(concepts):
    c = db.connect(DB, readonly=True)
    q = "select key,value,target,meta_json from lexicons where id='concept-family'"
    out = collections.defaultdict(dict)
    for concept, lg, forms, meta in c.execute(q):
        if concepts and concept not in concepts:
            continue
        m = json.loads(meta) if meta else {}
        out[concept][lg] = {"forms": json.loads(forms),
                            "mode": m.get("mode", "unverified"),
                            "pair": m.get("pair", "")}
    return dict(out)


def family_from_json(path, concepts):
    spec = json.load(io.open(path, encoding="utf-8"))
    out = collections.defaultdict(dict)
    for concept, per_lg in spec.items():
        if concepts and concept not in concepts:
            continue
        for lg, cell in per_lg.items():
            if isinstance(cell, list):
                out[concept][lg] = {"forms": cell, "mode": "check", "pair": ""}
            else:
                out[concept][lg] = cell
    return dict(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--concepts", default="", help="逗号分隔；空=全族")
    ap.add_argument("--langs", default="", help="逗号分隔；空=全部")
    ap.add_argument("--family", default="", help="候选族 JSON；空=读库")
    ap.add_argument("--min-zh", type=int, default=2, help="母版最少出现次数")
    ap.add_argument("--pass-ratio", type=float, default=0.5)
    ap.add_argument("--tsv", default="", help="逐格明细落盘")
    ap.add_argument("--weak", type=int, default=15, help="列出最弱的 N 个格子")
    ap.add_argument("--root", default="", help="含 submission/ 的项目根（默认工具包父目录）")
    ap.add_argument("--collisions", action="store_true",
                    help="只查**跨概念同形**：同一词形同时属于两个不同概念对时，"
                         "两边的计数互相污染（同对共享是 merged 的判据，不算错）")
    a = ap.parse_args()

    concepts = {x.strip() for x in a.concepts.split(",") if x.strip()}
    want_lg = {x.strip() for x in a.langs.split(",") if x.strip()}
    fam = (family_from_json(a.family, concepts) if a.family
           else family_from_db(concepts))
    if not fam:
        print("无词族可取")
        return 2
    if a.collisions:
        import unicodedata as _ud
        pair = {}
        for concept, per_lg in fam.items():
            for _lg, cell in per_lg.items():
                if isinstance(cell, dict) and cell.get("pair"):
                    pair[concept] = cell["pair"]
                    break
        rows = []
        for lg in sorted({l for c in fam for l in fam[c]}):
            idx = collections.defaultdict(list)
            for concept in fam:
                for f in (fam[concept].get(lg) or {}).get("forms") or ():
                    idx[_ud.normalize("NFKC", f).lower()].append(concept)
            for f, cs in idx.items():
                cs = sorted(set(cs))
                if len(cs) < 2:
                    continue
                same_pair = all(pair.get(cs[0]) == c or pair.get(c) == cs[0]
                                for c in cs[1:])
                if same_pair:
                    continue          # 同一对里共享 = merged 判据，正常
                rows.append((lg, f, cs))
        for r in rows:
            print("  同形 %-3s %-24s %s" % r)
        print("跨概念同形 %d 处" % len(rows))
        return 0 if not rows else 1
    mod = _load_plugin()
    corp = load_corpus(a.root or None)

    # 证据集：zh 里概念出现 ≥ min_zh 的篇目
    evid = {}
    for pkg, texts in corp.items():
        zh = texts.get("zh") or ""
        if not zh:
            continue
        for concept in fam:
            n = mod._count((concept,), zh)
            if n >= a.min_zh:
                evid.setdefault(concept, []).append((pkg, n))

    rows, agg, detail = [], collections.defaultdict(list), []
    for concept in sorted(fam):
        pkgs = evid.get(concept) or []
        for lg, cell in sorted(fam[concept].items()):
            if want_lg and lg not in want_lg:
                continue
            forms = tuple(cell.get("forms") or ())
            # 上位/下位概念（申报 ⊂ 报关单）：对立族词形里的本族词不该算本族，
            # 否则「申报」在 17/47 语向上永远有命中，召回虚高。
            pair = cell.get("pair") or ""
            rival = tuple((((fam.get(pair) or {}).get(lg)) or {}).get("forms") or ())
            ok = zero = 0
            sum_hit = sum_zh = 0
            ratios = []
            for pkg, zh_n in pkgs:
                text = (corp.get(pkg) or {}).get(lg) or ""
                if not text:
                    continue
                hit = (mod._pair_counts(forms, rival, text, lg)[0]
                       if forms and rival else
                       (mod._count(forms, text, lg) if forms else 0))
                sum_hit += hit
                sum_zh += zh_n
                ratios.append((hit / float(zh_n), pkg, zh_n, hit))
                if hit == 0:
                    zero += 1
                if hit >= a.pass_ratio * zh_n:
                    ok += 1
                if hit == 0 or hit < a.pass_ratio * zh_n:
                    detail.append((concept, lg, pkg.split(os.sep)[-1], zh_n,
                                   hit, "%.2f" % (hit / float(zh_n))))
            n = len(ratios)
            rec = ok / float(n) if n else 0.0
            # 语料级召回：全部证据篇目上 命中总数 / 母版总数。比逐篇比率稳——
            # 逐篇比在小计数（zh=2/命中1）上抖动大，会把「够用」判成「不够」。
            tot = sum_hit / float(sum_zh) if sum_zh else 0.0
            rows.append((concept, lg, cell.get("mode", ""), n, ok, zero, rec, tot))
            agg[concept].append((rec, lg, n, zero, cell.get("mode", ""), tot))
    # 汇总
    for concept in sorted(agg):
        cells = agg[concept]
        bad = [c for c in cells if c[5] < 0.6]
        n_pkg = len(evid.get(concept) or [])
        # v430：证据篇目数必须**在汇总里**可见。v429 就是因为它只躺在 TSV 的
        # 第 4 列，35 格降级里 14 格其实只有 2~3 篇证据，没人当场看出来。
        flag = "  ⚠️ 样本不足(<5)" if n_pkg < 5 else ""
        pair = ""
        for _c in (fam.get(concept) or {}).values():
            if isinstance(_c, dict) and _c.get("pair"):
                pair = _c["pair"]
                break
        co, live = reach_of(concept, pair, corp)
        reach = ("射程=%d/%d 篇" % (live, co)) if pair else "射程=—"
        if pair and not live:
            reach += "  ⚠️ 射程 0（族再全也不会开火）"
        print("%-8s 格子=%2d 证据篇目=%2d%s %s 语料级召<0.6 的格子=%2d | 最弱：%s"
              % (concept, len(cells), n_pkg, flag, reach, len(bad),
                 "、".join("%s(%.2f)" % (c[1], c[5]) for c in sorted(bad, key=lambda x: x[5])[:8]) or "-"))
    weak = sorted(rows, key=lambda x: (x[7], x[6]))[:a.weak]
    print("\n最弱格子（概念/语向/模式/篇目/达标/零命中/逐篇召回/语料召回）：")
    for r in weak:
        print("  %-8s %-3s %-10s 篇目=%2d 达标=%2d 零=%2d 逐篇=%.2f 语料=%.2f" % r)
    if a.tsv:
        with io.open(a.tsv, "w", encoding="utf-8", newline="\n") as fh:
            fh.write("concept\tlang\tmode\tn_pkg\tok\tzero\trecall\ttotal\n")
            for r in rows:
                fh.write("%s\t%s\t%s\t%d\t%d\t%d\t%.3f\t%.3f\n" % r)
        wp = a.tsv + ".weak"
        with io.open(wp, "w", encoding="utf-8", newline="\n") as fh:
            fh.write("concept\tlang\tpkg\tzh_n\thit\tratio\n")
            for d in detail:
                fh.write("%s\t%s\t%s\t%d\t%d\t%s\n" % d)
        print("\n明细 → %s（%d 行）｜不达标篇目 → %s（%d 行）"
              % (a.tsv, len(rows), wp, len(detail)))
    return 0


if __name__ == "__main__":
    import os as _os
    import sys as _sys
    _sys.path.insert(0, _os.path.dirname(_os.path.dirname(
        _os.path.abspath(__file__))))
    from tools import require_entry
    require_entry("family_audit")
    sys.exit(main())
