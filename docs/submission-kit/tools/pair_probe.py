# -*- coding: utf-8 -*-
"""按**数字锚**取对齐片段：给一对互相对立的概念，逐语向摘出「母版同句对举」
对应的译文原句，供人读词形。

为什么需要它：`family_mine.py` 用篇级共现，对「整批稿件同题材」的语料几乎没有
分辨力——13 篇证据集全在讲跨境电商，`kategorie`/`depósito`/`zolllager` 的
特异性都是 0.8 上下，全是题材词。补同义词真正可靠的通道是**同句对举**：
母版「退回或销毁」「免税放行」这类句子里两个概念一定同现，译文里那句的
两个词形也就一定同现——只要能定位到那句。

定位靠**数字**：母版句子里的长数字串（0404.9000 / 26000 / 9610）在译文里
通常逐字保留，用它把译文块找出来，比块序号可靠（块序号早已实证不对齐）。

用法：
    python submit.py tools pair_probe --pairs 销毁=退运 --out tmp/term6/probe_destroy.txt
    python submit.py tools pair_probe --pairs 销毁=退运 --langs ru,de --full
"""
# 治理声明：本文件属机制层，不承载策略数据；改动须走 README「治理」节的 L3 流程
#（先登记理由 → 行为级等价断言 → selftest --kit 全量），提交说明带 [arch]
#（commit-msg 钩子强制）。策略变更请改 plugins/ 判据或经 submit.py glossary 改库。
import argparse
import glob
import io
import os
import re
import sys

KIT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.dirname(KIT)
sys.path.insert(0, KIT)

from core.textutil import blocks as _blocks      # noqa: E402

NUM = re.compile(r"\d[\d.,]{3,}")


def load():
    """→ {篇目: {语向: 正文}}"""
    pk = {}
    for f in glob.glob(os.path.join(ROOT, "submission/**/content/*/*.mdx"),
                       recursive=True):
        lg = os.path.basename(os.path.dirname(f))
        pkg = f.split(os.sep + "content" + os.sep)[0].replace(ROOT + os.sep, "")
        try:
            pk.setdefault(pkg, {})[lg] = io.open(f, encoding="utf-8").read()
        except OSError:
            continue
    return pk


def digits(blk):
    """块里的长数字串（≥5 位，去分隔符）。4 位的 `2020`（文号年份）在译文里
    到处都是，做锚会命中 frontmatter 或相邻段落，v420 实测第一版就锚到了
    frontmatter 块。"""
    out = []
    for m in NUM.finditer(blk):
        d = re.sub(r"[.,]", "", m.group(0))
        if len(d) >= 5:
            out.append((d, m.group(0)))
    out.sort(key=lambda x: -len(x[0]))
    return out


def body_blocks(text):
    """去掉 frontmatter 的块（frontmatter 里的 slug/doc_number 全是数字锚误源）。"""
    out = []
    for blk in _blocks(text):
        if blk.startswith("---"):
            continue
        out.append(blk)
    return out


def trim(blk, limit):
    blk = " ".join(blk.split())
    return blk if len(blk) <= limit else blk[:limit] + "…"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default="",
                    help="含 submission/ 的项目根（缺省=工具包同级）")
    ap.add_argument("--pairs", required=True, help="A=B 形式，逗号分隔")
    ap.add_argument("--langs", default="")
    ap.add_argument("--out", required=True)
    ap.add_argument("--limit", type=int, default=260, help="每侧摘录字符上限")
    ap.add_argument("--max-per-lang", type=int, default=1)
    a = ap.parse_args()
    if a.root:
        global ROOT
        ROOT = os.path.abspath(a.root)

    pairs = [tuple(x.split("=", 1)) for x in a.pairs.split(",") if "=" in x]
    want = {x.strip() for x in a.langs.split(",") if x.strip()}
    corp = load()
    lines = []
    for A, B in pairs:
        lines.append("=== %s ↔ %s" % (A, B))
        # 证据：母版同块含两概念、且块里有 ≥4 位数字
        ev = []
        for pkg, texts in corp.items():
            for blk in body_blocks(texts.get("zh", "")):
                if A in blk and B in blk:
                    ds = digits(blk)
                    if ds:
                        ev.append((pkg, blk, ds))
        lines.append("  证据块 %d 个（%d 篇）" %
                     (len(ev), len({e[0] for e in ev})))
        if not ev:
            continue
        langs = want or sorted({lg for t in corp.values() for lg in t
                                if lg != "zh"})
        for lg in langs:
            got = 0
            for pkg, zblk, ds in ev:
                text = corp[pkg].get(lg) or ""
                if not text:
                    continue
                hit = None
                for d, raw in ds:
                    for blk in body_blocks(text):
                        squeeze = re.sub(r"[.,]", "", blk)
                        if d in squeeze or raw in blk:
                            hit = blk
                            break
                    if hit:
                        break
                if not hit:
                    continue
                lines.append("  [%s] %s  │%s" % (lg, pkg.split(os.sep)[-1],
                                                 trim(zblk, a.limit)))
                lines.append("  [%s] %s  │%s" % (lg, "  " * 4, trim(hit, a.limit)))
                got += 1
                if got >= a.max_per_lang:
                    break
            if not got:
                lines.append("  [%s] <无数字锚命中>" % lg)
    io.open(a.out, "w", encoding="utf-8", newline="\n").write("\n".join(lines))
    print("摘录 %d 行 → %s" % (len(lines), a.out))
    return 0


if __name__ == "__main__":
    import os as _os
    import sys as _sys
    _sys.path.insert(0, _os.path.dirname(_os.path.dirname(
        _os.path.abspath(__file__))))
    from tools import require_entry
    require_entry("pair_probe")
    sys.exit(main())
