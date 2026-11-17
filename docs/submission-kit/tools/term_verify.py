# -*- coding: utf-8 -*-
"""术语定稿回读：确认「某概念某语向的标准译法」在该语向语料里真实存在。

两级判定：
  ① 整串命中（NFKC + 小写 + 撇号归一）——最强证据；
  ② 未命中时看**最长词干**在该语向语料里的实频，>0 即认——屈折语的专名在
     正文里必然以斜格出现（cs 正文只有 «Státní rady»），lemma 不可能整串命中。

⚠️ 不要用「3-gram 覆盖率」：全库语料太大，任何常见词的 3-gram 集合都会被
覆盖，实测恒 ≈1.00，没有分辨力。

用法：
  python submit.py tools term_verify --terms tmp/terms.json [--show 3]

tmp/terms.json 形如 {"植物检疫证书": {"en": "phytosanitary certificate", ...}}；
值也可以是 {"kind": "...", "note": "...", "langs": {...}}。
"""
# 治理声明：本文件属机制层，不承载策略数据；改动须走 README「治理」节的 L3 流程
#（先登记理由 → 行为级等价断言 → selftest --kit 全量），提交说明带 [arch]
#（commit-msg 钩子强制）。策略变更请改 plugins/ 判据或经 submit.py glossary 改库。
import argparse
import glob
import io
import json
import os
import re
import sys
import unicodedata

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, HERE)


def norm(s):
    s = unicodedata.normalize("NFKC", s).lower()
    s = s.replace("’", "'").replace("‘", "'")
    return " ".join(s.split())


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=os.path.dirname(HERE))
    ap.add_argument("--terms", required=True)
    ap.add_argument("--show", type=int, default=1,
                    help="每条非整串命中打印几例语境")
    args = ap.parse_args(argv)

    data = json.load(io.open(args.terms, encoding="utf-8"))
    terms = {k: (v["langs"] if isinstance(v, dict) and "langs" in v else v)
             for k, v in data.items()}

    corpus = {}
    for p in glob.glob(os.path.join(args.root, "submission", "**", "content"),
                       recursive=True):
        if not os.path.isdir(p):
            continue
        for lg in os.listdir(p):
            sub = os.path.join(p, lg)
            if not os.path.isdir(sub):
                continue
            for f in glob.glob(os.path.join(sub, "*.mdx")):
                try:
                    corpus[lg] = corpus.get(lg, "") + open(
                        f, encoding="utf-8").read()
                except OSError:
                    continue
    normed = {lg: norm(t) for lg, t in corpus.items()}
    bad = 0
    for term, langs in terms.items():
        exact = stem_ok = 0
        rows = []
        for lg, form in sorted(langs.items()):
            nf = norm(form)
            body = normed.get(lg, "")
            n_exact = body.count(nf)
            if n_exact:
                exact += 1
                rows.append((lg, "OK", "整串×%d" % n_exact))
                continue
            toks = sorted(nf.split(), key=len, reverse=True)
            stem = toks[0][:6] if toks else ""
            n = body.count(stem) if stem else 0
            if n:
                stem_ok += 1
                rows.append((lg, "词干", "×%d" % n))
            else:
                bad += 1
                rows.append((lg, "可疑", "0"))
        print("== %-8s 整串 %d/%d，词干补 %d，可疑 %d"
              % (term, exact, len(langs), stem_ok, len(langs) - exact - stem_ok))
        for lg, flag, info in rows:
            if flag == "OK":
                continue
            print("   %-4s %-4s %-8s %s" % (lg, flag, info, langs[lg][:58]))
            if flag == "可疑" and args.show:
                body = corpus.get(lg, "")
                toks = sorted(langs[lg].split(), key=len, reverse=True)
                stem = toks[0][:5] if toks else ""
                m = re.search(re.escape(stem), body, re.I) if stem else None
                if m:
                    print("      …%s…" % body[max(0, m.start() - 55):m.end() + 45]
                          .replace("\n", " "))
    print("\n可疑合计 %d 条" % bad)
    return 1 if bad else 0


if __name__ == "__main__":
    import os as _os
    import sys as _sys
    _sys.path.insert(0, _os.path.dirname(_os.path.dirname(
        _os.path.abspath(__file__))))
    from tools import require_entry
    require_entry("term_verify")
    sys.exit(main())
