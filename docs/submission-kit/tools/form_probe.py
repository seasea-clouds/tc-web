# -*- coding: utf-8 -*-
"""词形探针：给我一个正则，逐语向数命中并打印上下文，供人工判定。

定位：`family_mine.py` 出候选（篇级统计，同题材语料噪声大）、`pair_probe.py`
出对齐原句（只在有数字锚的对举句上可用）。两者覆盖不到的格子，就靠本工具：
人工写出该语向「这个概念可能怎么写」的正则（词干 + 常见同义），工具负责
①数命中 ②打印原句，人只做「是不是这个概念」的判断。

这一步不可省：词形只认语料实形，正则只是**提议**——`--apply` 前必须看上下文。

用法：
    python submit.py tools form_probe --concept 发票 --langs ru,uk --rx "фактур|инвойс"
    python submit.py tools form_probe --concept 发票 --langs ru --rx "сч[её]т" --show 5
    python submit.py tools form_probe --concept 发票 --langs ru --rx "фактур" --json out.json
"""
# 治理声明：本文件属机制层，不承载策略数据；改动须走 README「治理」节的 L3 流程
#（先登记理由 → 行为级等价断言 → selftest --kit 全量），提交说明带 [arch]
#（commit-msg 钩子强制）。策略变更请改 plugins/ 判据或经 submit.py glossary 改库。
import argparse
import collections
import glob
import io
import json
import os
import re
import sys

KIT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.dirname(KIT)
SPACELESS = {"ja", "zh", "th", "lo", "my", "km"}


def load():
    pk = collections.defaultdict(dict)
    for f in glob.glob(os.path.join(ROOT, "submission/**/content/*/*.mdx"),
                       recursive=True):
        lg = os.path.basename(os.path.dirname(f))
        pkg = f.split(os.sep + "content" + os.sep)[0].replace(ROOT + os.sep, "")
        try:
            pk[pkg][lg] = io.open(f, encoding="utf-8").read()
        except OSError:
            continue
    return pk


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default="",
                    help="含 submission/ 的项目根（缺省=工具包同级）")
    ap.add_argument("--concept", required=True, help="中文概念（用于定位证据篇目）")
    ap.add_argument("--langs", required=True)
    ap.add_argument("--rx", required=True, help="该语向的候选正则；可用 --rx 多次？用 | 合并")
    ap.add_argument("--show", type=int, default=2, help="每语向打印几条上下文")
    ap.add_argument("--width", type=int, default=90, help="上下文左右字符数")
    ap.add_argument("--min-zh", type=int, default=2)
    ap.add_argument("--json", default="", help="把 语向→[命中词形] 落盘（严格按正则实匹配）")
    a = ap.parse_args()
    if a.root:
        global ROOT
        ROOT = os.path.abspath(a.root)

    corp = load()
    S = [p for p, t in corp.items() if (t.get("zh") or "").count(a.concept) >= a.min_zh]
    langs = [x.strip() for x in a.langs.split(",") if x.strip()]
    rx = re.compile(a.rx, re.I | re.U)
    out = {}
    print("证据篇目 %d 篇" % len(S))
    for lg in langs:
        forms = collections.Counter()
        snips = []
        for pkg in S:
            text = corp[pkg].get(lg) or ""
            if not text:
                continue
            for m in rx.finditer(text):
                forms[m.group(0).strip()] += 1
                if len(snips) < a.show * 3:
                    lo, hi = max(0, m.start() - a.width), m.end() + a.width
                    snips.append("%s │ …%s…" % (pkg.split(os.sep)[-1][:28],
                                                " ".join(text[lo:hi].split())))
        tot = sum(forms.values())
        print("\n[%s] 命中 %d 次｜词形 %d 种" % (lg, tot, len(forms)))
        if forms:
            print("  高频：%s" % "、".join("%s(%d)" % kv for kv in forms.most_common(8)))
        for s in snips[:a.show]:
            print("  " + s)
        out[lg] = [f for f, _ in forms.most_common()]
    if a.json:
        io.open(a.json, "w", encoding="utf-8", newline="\n").write(
            json.dumps(out, ensure_ascii=False, indent=1))
        print("\n词形 → %s" % a.json)
    return 0


if __name__ == "__main__":
    import os as _os
    import sys as _sys
    _sys.path.insert(0, _os.path.dirname(_os.path.dirname(
        _os.path.abspath(__file__))))
    from tools import require_entry
    require_entry("form_probe")
    sys.exit(main())
