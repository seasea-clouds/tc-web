# -*- coding: utf-8 -*-
"""从平行语料里**发现**某概念在某语向的候选表达（补词族同义词用）。

问题：词族（concept-family）的精度取决于「该语向表达这个概念的所有形态」是否齐全。
只从 term-zh 的首选形播种会系统性偏窄——es 语料用 `declaración`（而非
`declaración aduanera`）、no 用 `avtale`（而非 `kontrakt`）、sv 用 `punktskatt`
（而非 `konsumtionsskatt`）。这类**同义改写**不是屈折扩展能补的，必须从语料
里找。

做法（共现一致性，不需要句级对齐）：

1. 取所有「zh 母版出现该概念 ≥2 次」的篇目作为证据集 S。
2. 对目标语向的每个 token t，算三个量：
     p_in(t)  = S 中出现 t 的篇目比例        —— 该词是否随概念出现
     p_out(t) = 其余篇目中出现 t 的比例      —— **特异性对照**（关键）
     r(t)     = sum(t 计数) / sum(概念计数)  —— 量级比（表达长度不同，给区间）
3. 候选须 `p_in - p_out ≥ --min-p`（**不是** p_in 本身）、r 落在
   `--min-r`..`--max-r`、语料总频 ≥ `--min-count`，且不在现有词族里。

⚠️ 只用 p_in 会重犯「3-gram 覆盖率」的错：`importación`/`kräver`/`title` 在
8 篇证据集里篇篇出现，p_in 恒为 1.00，完全没有分辨力（v415 实测）。
4. 输出按 p 降序、r 接近 1 优先。**只提候选，不改库**——每条都要人工读上下文确认。

为什么用篇级而不是句级：句级对齐需要可靠的句切分与一一对应，译文常合并/拆分
句子（本项目已实证块序号不对齐）；篇级一致性对「只在部分篇目出现的同义词」
会漏，但不会造假。

用法：
    python submit.py tools family_mine --concepts 报关单,发票 --langs es,no,sv,ms \
        --out tmp/term6/mine.txt [--min-p 0.6]
"""
# 治理声明：本文件属机制层，不承载策略数据；改动须走 README「治理」节的 L3 流程
#（先登记理由 → 行为级等价断言 → selftest --kit 全量），提交说明带 [arch]
#（commit-msg 钩子强制）。策略变更请改 plugins/ 判据或经 submit.py glossary 改库。
import argparse
import collections
import glob
import io
import os
import re
import sys
import unicodedata

KIT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.dirname(KIT)
sys.path.insert(0, KIT)

from core import db  # noqa: E402

TOKEN = re.compile(r"[^\W\d_]{3,}", re.UNICODE)
SPACELESS = {"ja", "zh", "th", "lo", "my", "km"}
# 高频功能词不做候选（各语向只列最必要的几个，宁可漏也不添噪）
STOP = {
    "the", "and", "for", "with", "that", "this", "from", "have", "shall",
    "der", "die", "das", "und", "für", "ist", "sich", "werden", "nicht",
    "les", "des", "une", "pour", "dans", "est", "que", "qui", "sur",
    "los", "las", "una", "para", "con", "por", "del", "como",
    "o", "a", "os", "as", "de", "do", "da", "em", "um",
    "och", "att", "som", "för", "med", "av", "det",
    "og", "til", "av", "som", "for", "med", "det",
    "en", "et", "til", "af", "som", "for", "med", "den",
    "dan", "yang", "untuk", "dengan", "dari", "pada", "akan",
    "dan", "untuk", "dengan", "dari", "pada", "akan",
    # 模板/元数据残留（frontmatter 与图片名会被计入正文）
    "title", "html", "excerpt", "slug", "image", "https", "www", "com",
    "width", "height", "alt", "src", "jpg", "png", "webp",
}


def norm(s):
    return unicodedata.normalize("NFKC", s)


def docs():
    """→ [(语向, 文本) 按篇目分组]：返回 {(篇目录, 语向): 文本}。"""
    out = {}
    for f in glob.glob(os.path.join(ROOT, "submission/**/content/*/*.mdx"),
                       recursive=True):
        lg = os.path.basename(os.path.dirname(f))
        pkg = f
        for _ in range(3):                      # …/content/<lg>/<file>.mdx
            pkg = os.path.dirname(pkg)
        try:
            out.setdefault((pkg, lg), []).append(io.open(f, encoding="utf-8").read())
        except OSError:
            continue
    return {k: norm("\n".join(v)) for k, v in out.items()}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default="",
                    help="含 submission/ 的项目根（缺省=工具包同级）")
    ap.add_argument("--concepts", required=True, help="中文概念，逗号分隔")
    ap.add_argument("--langs", default="", help="语向，逗号分隔；空=全部有语料的")
    ap.add_argument("--out", required=True)
    ap.add_argument("--min-p", type=float, default=0.6)
    ap.add_argument("--min-r", type=float, default=0.15)
    ap.add_argument("--max-r", type=float, default=3.0)
    ap.add_argument("--min-count", type=int, default=4)
    ap.add_argument("--top", type=int, default=5)
    a = ap.parse_args()
    if a.root:
        global ROOT
        ROOT = os.path.abspath(a.root)

    data = docs()
    pkgs = sorted({p for p, _ in data})
    zh = {p: data.get((p, "zh"), "") for p in pkgs}
    langs = ([x.strip() for x in a.langs.split(",") if x.strip()] or
             sorted({lg for _p, lg in data if lg not in ("zh",)}))
    known = {}
    conn = db.connect(os.path.join(KIT, "data", "glossary.db"),
                           readonly=True)
    for key, lg, target in conn.execute(
            "SELECT key, value, target FROM lexicons WHERE id='concept-family'"):
        try:
            import json
            known.setdefault((key, lg), set()).update(
                x.lower() for x in json.loads(target))
        except ValueError:
            continue
    conn.close()

    lines = []
    for concept in [x.strip() for x in a.concepts.split(",") if x.strip()]:
        S = [p for p in pkgs if zh[p].count(concept) >= 2]
        if len(S) < 3:
            lines.append("== %s：证据集不足（%d 篇）" % (concept, len(S)))
            continue
        lines.append("== %s（证据集 %d 篇）" % (concept, len(S)))
        for lg in langs:
            if lg in SPACELESS:
                continue
            tot_c = sum(zh[p].count(concept) for p in S)
            OUT = [p for p in pkgs if p not in S]
            per = {}
            for p in S:
                txt = data.get((p, lg), "")
                c = collections.Counter(m.group(0).lower()
                                        for m in TOKEN.finditer(txt))
                for t, n in c.items():
                    if t in STOP or len(t) < 4:
                        continue
                    per.setdefault(t, [0, 0])
                    per[t][0] += 1
                    per[t][1] += n
            out_df = collections.Counter()
            for p in OUT:
                txt = data.get((p, lg), "")
                for t in set(m.group(0).lower() for m in TOKEN.finditer(txt)):
                    if t in per:
                        out_df[t] += 1
            scored = []
            for t, (df, cnt) in per.items():
                if cnt < a.min_count:
                    continue
                p_in = df / float(len(S))
                p_out = out_df[t] / float(len(OUT)) if OUT else 0.0
                spec = p_in - p_out
                r_ = cnt / float(tot_c) if tot_c else 0
                if spec < a.min_p or not (a.min_r <= r_ <= a.max_r):
                    continue
                if t in known.get((concept, lg), ()):
                    continue
                scored.append((spec, -abs(r_ - 1.0), t, df, cnt, r_, p_out))
            scored.sort(reverse=True)
            if not scored:
                lines.append("  %-3s <无候选>" % lg)
                continue
            for spec, _s, t, df, cnt, r_, p_out in scored[:a.top]:
                lines.append("  %-3s %-26s 特异=%.2f (对照 %.2f) r=%.2f df=%d n=%d"
                             % (lg, t, spec, p_out, r_, df, cnt))
    # 落盘必须在概念循环**之外**：v420 修——原实现写在循环内，多概念时只留最后一个
    io.open(a.out, "w", encoding="utf-8", newline="\n").write("\n".join(lines))
    print("候选写入 %s（%d 行）" % (a.out, len(lines)))
    return 0


if __name__ == "__main__":
    import os as _os
    import sys as _sys
    _sys.path.insert(0, _os.path.dirname(_os.path.dirname(
        _os.path.abspath(__file__))))
    from tools import require_entry
    require_entry("family_mine")
    sys.exit(main())
