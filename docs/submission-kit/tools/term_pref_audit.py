# -*- coding: utf-8 -*-
"""term-zh 首选形实频体检：词表登记的形，语料里到底用不用。

**为什么先查这个再谈 P74 的数据**：P74 判的是「出现了词表登记的禁用形」与
「同篇混用两个都被接受的形」，两者都以 `term-zh.target`（首选形）为基准。
如果首选形本身不是语料实形，那么：

  · 登记禁用形时没有可信参照（「这不是首选形」不等于「这是错的」）；
  · 首选形与禁用形可能根本不是同一句话里的替代关系。

实测（2026-11-16，129 包 × 47 语向）：**169 行的首选形 0 命中**、196 行 ≤2 次，
其余 1703 行 ≥3 次。0 命中的绝大多数是法律法规全称——译文普遍省略
「中华人民共和国」前缀或换语序，而词表登记的是字面全称。

两种处置，本工具只负责**量**与**列清单**：

1. 首选形对齐语料实形（重新挖词，逐语向人工过目）；
2. 或者承认这一行是「官方全称」而非「语料实形」，在 `meta.source` 里写明，
   不让它充当判据基准。

用法：
    python submit.py tools term_pref_audit                 # 汇总
    python submit.py tools term_pref_audit --zero          # 列 0 命中的行
    python submit.py tools term_pref_audit --baseline 169  # 超过基线 rc=1（自检臂用）
    python submit.py tools term_pref_audit --json
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

_KIT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_ROOT = os.path.dirname(_KIT)
sys.path.insert(0, _KIT)
from core import db

DB = os.path.join(_KIT, "data", "glossary.db")
CONTENT = os.path.join(_ROOT, "submission")

_PAREN_TAIL = re.compile(r"\s*[（(][^）)]*[）)]\s*$")


def load_rows(db_path=DB):
    conn = db.connect(db_path, readonly=True)
    try:
        return conn.execute(
            "SELECT key, target, value, meta_json FROM lexicons "
            "WHERE id='term-zh'").fetchall()
    finally:
        conn.close()


def corpus_texts(langs, root=CONTENT):
    """语向 → 该语向全部正文（只读一次，47 语各拼接成一段）。"""
    out = {}
    for lg in sorted(langs):
        buf = []
        for f in glob.glob(os.path.join(root, "**", "content", lg, "*.mdx"),
                           recursive=True):
            buf.append(io.open(f, encoding="utf-8").read())
        out[lg] = "\n".join(buf)
    return out


def audit(rows, texts):
    """→ [{concept, lang, kind, preferred, core, hits, hits_core, note}]。

    `core` 是剥掉尾部括号注释后的主干（`… of China (GACC)` → `… of China`）：
    词表里带缩写的形在正文里几乎不会原样出现，直接用整串统计会把「括号注释
    写法」误差当成「首选形不存在」。
    """
    out = []
    for concept, preferred, lang, meta in rows:
        try:
            m = json.loads(meta or "{}")
        except ValueError:
            m = {}
        form = (preferred or "").strip()
        if not form:
            continue
        text = texts.get(lang, "")
        core = _PAREN_TAIL.sub("", form).strip()
        n = text.count(form)
        n_core = text.count(core) if core and core != form else n
        out.append({"concept": concept, "lang": lang,
                    "kind": m.get("kind", ""), "preferred": form,
                    "core": core, "hits": n, "hits_core": n_core,
                    "best": max(n, n_core)})
    return out


def summarise(items):
    zero = [x for x in items if x["best"] == 0]
    low = [x for x in items if 0 < x["best"] <= 2]
    ok = len(items) - len(zero) - len(low)
    by_kind = {}
    for x in zero:
        by_kind[x["kind"] or "-"] = by_kind.get(x["kind"] or "-", 0) + 1
    by_lang = {}
    for x in zero:
        by_lang[x["lang"]] = by_lang.get(x["lang"], 0) + 1
    return {"total": len(items), "ok": ok, "low": len(low),
            "zero": len(zero), "zero_by_kind": by_kind,
            "zero_by_lang": by_lang, "zero_items": zero}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--zero", action="store_true", help="列 0 命中的行")
    ap.add_argument("--baseline", type=int, default=None,
                    help="0 命中的行数上限；超过则 rc=1（自检臂用）")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--db", default=DB)
    ap.add_argument("--root", default=CONTENT)
    a = ap.parse_args()

    rows = load_rows(a.db)
    texts = corpus_texts({r[2] for r in rows}, a.root)
    items = audit(rows, texts)
    s = summarise(items)

    if a.json:
        print(json.dumps(s, ensure_ascii=False, indent=2))
    else:
        print("term-zh %d 行：首选形命中 ≥3 次 %d ｜ ≤2 次 %d ｜ **0 次 %d**"
              % (s["total"], s["ok"], s["low"], s["zero"]))
        print("  0 命中按类别：" + "，".join(
            "%s %d" % (k, v) for k, v in sorted(s["zero_by_kind"].items(),
                                                key=lambda x: -x[1])))
        print("  0 命中按语向（前 8）：" + "，".join(
            "%s %d" % (k, v) for k, v in sorted(s["zero_by_lang"].items(),
                                                key=lambda x: -x[1])[:8]))
        if a.zero:
            for x in s["zero_items"]:
                print("  [%s] %-16s %r" % (x["lang"], x["concept"][:16],
                                           x["preferred"][:70]))

    if a.baseline is not None and s["zero"] > a.baseline:
        print("FAIL 首选形 0 命中的行 %d > 基线 %d（新增行没对齐语料）"
              % (s["zero"], a.baseline))
        return 1
    return 0


if __name__ == "__main__":
    import os as _os
    import sys as _sys
    _sys.path.insert(0, _os.path.dirname(_os.path.dirname(
        _os.path.abspath(__file__))))
    from tools import require_entry
    require_entry("term_pref_audit")
    sys.exit(main())
