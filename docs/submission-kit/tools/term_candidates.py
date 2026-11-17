# -*- coding: utf-8 -*-
"""术语候选提取：从全库已交付译文里反推「中文概念 → 各语实际写法」。

为什么不用块级直取：zh 块多是长段落，整块取回来会把定义、谓语一起带进
候选（«Anforderungen an das …zeugnis» vs «…zeugnis»）。这里改用**相对位置
锚定**：中文名在 zh 块内的相对中心位置 → 译文块同位置 ±25% 窗口，窗口内
1..5 元词串按**跨篇出现次数**排序。专名每篇都出现、噪声只在个别篇出现，
所以重复度本身就是信号，不依赖大小写（法律文本正文多小写）。

用法：
  python submit.py tools term_candidates --concepts tmp/terms.json [--out tmp/cand.txt]

tmp/terms.json 形如 {"gacc-short": "海关总署", "mofcom": "商务部"}。
输出每个语向 3 个候选，供人工定稿（候选不是答案，必须逐语判定）。
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
import unicodedata

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, HERE)

from core.textutil import blocks as split_blocks                 # noqa: E402

HAN = re.compile(r"[\u4e00-\u9fff\u3400-\u4dbf]{2,12}")
KOR = re.compile(r"[\uac00-\ud7af\u4e00-\u9fff]{2,12}")


def _is_word_char(ch):
    c = unicodedata.category(ch)
    return c[0] in "LM" or c[0] == "N"


def units(text, lg):
    """→ [(start, end, token)]：CJK 语向按汉字/谚文串，其余按词。"""
    if lg == "ja":
        return [(m.start(), m.end(), m.group(0)) for m in HAN.finditer(text)]
    if lg == "ko":
        return [(m.start(), m.end(), m.group(0)) for m in KOR.finditer(text)]
    out, i, n = [], 0, len(text)
    while i < n:
        if not _is_word_char(text[i]):
            i += 1
            continue
        j = i
        while j < n and _is_word_char(text[j]):
            j += 1
        out.append((i, j, text[i:j].lower()))
        i = j
    return out


def content_dirs(root):
    for p in glob.glob(os.path.join(root, "submission", "**", "content"),
                       recursive=True):
        if os.path.isdir(p) and os.path.isdir(os.path.join(p, "zh")):
            yield p


def load(d):
    out = {}
    for lg in sorted(os.listdir(d)):
        sub = os.path.join(d, lg)
        if not os.path.isdir(sub):
            continue
        fs = glob.glob(os.path.join(sub, "*.mdx"))
        if not fs:
            continue
        s = io.open(fs[0], encoding="utf-8").read()
        m = re.match(r"\A---\n.*?\n---\n+", s, re.S)
        out[lg] = s[m.end():] if m else s
    return out


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=os.path.dirname(HERE),
                    help="含 submission/ 的项目根")
    ap.add_argument("--concepts", required=True, help="JSON：{id: 中文串}")
    ap.add_argument("--out", default="", help="输出文件（默认打印）")
    ap.add_argument("--window", type=float, default=0.25)
    ap.add_argument("--max-n", type=int, default=5,
                    help="最长词串长度；长法规名用 12")
    args = ap.parse_args(argv)

    concepts = json.load(io.open(args.concepts, encoding="utf-8"))
    seen = collections.defaultdict(
        lambda: collections.defaultdict(collections.Counter))
    langs = set()
    for d in content_dirs(args.root):
        bodies = load(d)
        if "zh" not in bodies:
            continue
        langs |= set(bodies)
        zbl = split_blocks(bodies["zh"])
        for cid, needle in concepts.items():
            local = collections.defaultdict(collections.Counter)
            for bi, zblk in enumerate(zbl):
                if needle not in zblk:
                    continue
                zpos = (zblk.index(needle) + len(needle) / 2) / max(len(zblk), 1)
                for lg, body in bodies.items():
                    if lg == "zh":
                        continue
                    bl = split_blocks(body)
                    if bi >= len(bl):
                        continue
                    t = bl[bi]
                    anchor = zpos * len(t)
                    half = args.window * len(t) + 25
                    us = units(t, lg)
                    for n in range(1, args.max_n + 1):
                        for i in range(len(us) - n + 1):
                            s, e = us[i][0], us[i + n - 1][1]
                            c = (s + e) / 2
                            if c < anchor - half or c > anchor + half:
                                continue
                            if n == 1 and len(us[i][2]) < 4:
                                continue
                            local[lg][" ".join(u[2] for u in us[i:i + n])] += 1
                break
            for lg, c in local.items():
                for g, n in c.items():
                    seen[cid][lg][g] += n

    langs.discard("zh")
    lines = []
    for cid in concepts:
        lines.append("\n## %s  (%s)" % (cid, concepts[cid]))
        for lg in sorted(langs):
            c = seen[cid][lg]
            if not c:
                lines.append("  %-4s —— 缺" % lg)
                continue
            scored = [(n * (1 + 0.25 * (len(g.split()) - 1)), n, g)
                      for g, n in c.items()]
            scored.sort(key=lambda x: (-x[0], -x[1]))
            keep = []
            for _s, n, g in scored:
                if any(g in k for k in keep):
                    continue
                keep.append(g)
                if len(keep) >= 3:
                    break
            lines.append("  %-4s %s" % (lg, " ‖ ".join(
                "%s(%d)" % (g, c[g]) for g in keep)[:140]))
    text = "\n".join(lines)
    if args.out:
        io.open(args.out, "w", encoding="utf-8", newline="\n").write(text)
        print("写出 %s（%d 个语向）" % (args.out, len(langs)))
    else:
        print(text)
    return 0


if __name__ == "__main__":
    import os as _os
    import sys as _sys
    _sys.path.insert(0, _os.path.dirname(_os.path.dirname(
        _os.path.abspath(__file__))))
    from tools import require_entry
    require_entry("term_candidates")
    sys.exit(main())
