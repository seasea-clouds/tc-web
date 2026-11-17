# -*- coding: utf-8 -*-
"""词族探针：两种「看译文到底怎么写」的姿势，人工判定专用（只读，不写库）。

  align   块对齐：母版含该概念的块 → 对应译文块 → 标出族内是否命中
          比正则猜写法省事——一眼看出是族缺屈折，还是译者换了说法。
  tokens  按词干列**完整词形**与实频，把「事实形」原样抄进 spec

为什么 tokens 不能用 `[^\\W\\d_]` 切词：印度系、僧伽罗、泰文的组合符是 Mn 类，
不在 Python 的 `\\w` 里，那样切会把一个词切成碎片（v420 实测 si/bn/th 全 0
命中）。本工具按空白与常见标点切，宁可留长也不切碎。

用法：
    python submit.py tools family_probe align --concept 放行 --lang no --miss-only
    python submit.py tools family_probe tokens --concept 发票 --lang ru --stem "фактур|рахунок"
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
import unicodedata

KIT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.dirname(KIT)
sys.path.insert(0, KIT)
from core import db  # noqa: E402
DB = os.path.join(KIT, "data", "glossary.db")


def _load(name):
    p = os.path.join(KIT, "tools", name + ".py")
    spec = importlib.util.spec_from_file_location(name, p)
    m = importlib.util.module_from_spec(spec)
    sys.modules[name] = m
    spec.loader.exec_module(m)
    return m


def _forms(concept, lg):
    conn = db.connect(DB, readonly=True)
    try:
        row = conn.execute(
            "select target from lexicons where id='concept-family' and key=? "
            "and value=?", (concept, lg)).fetchone()
    finally:
        conn.close()
    return json.loads(row[0]) if row else []


def cmd_align(a):
    FP = _load("family_precision")
    forms = _forms(a.concept, a.lang)
    rx = [(f, FP.rx_of(f, a.lang)) for f in forms]
    corp = FP.FA.load_corpus(ROOT)
    shown = 0
    blocks_seen = 0

    def _summary():
        # 「0 命中必须自证」：没输出也要说清是「没有对齐块」还是「块里没命中」
        print("\n[汇总] %s/%s：对齐块 %d 条，输出 %d 条%s"
              % (a.concept, a.lang, blocks_seen, shown,
                 "" if shown else "（0 条 = 无对齐块 / 块内无该概念，不是静默通过）"))

    for pkg, texts in sorted(corp.items()):
        zh, tr = texts.get("zh") or "", texts.get(a.lang) or ""
        if not zh or not tr or a.concept not in zh:
            continue
        zb, tb = FP.blocks(zh), FP.blocks(tr)
        if len(zb) != len(tb):
            continue
        for bz, bt in zip(zb, tb):
            if a.concept not in bz:
                continue
            blocks_seen += 1
            hits = [f for f, r in rx if r and r.search(bt)]
            if a.miss_only and hits:
                continue
            shown += 1
            if shown > a.limit:
                _summary()
                return 0
            print("— %s" % pkg.split(os.sep)[-1][:56])
            print("  中: %s" % bz.strip().replace("\n", " ")[:a.width])
            print("  译: %s" % bt.strip().replace("\n", " ")[:a.width])
            print("  命中: %s" % ("、".join(hits) if hits else "（无）"))
    _summary()
    return 0


def _tokens(text):
    raw = re.findall(r"[^\s\.,;:!\?\(\)\[\]\{\}\"'«»„“”—–\|/\\]+", text,
                     re.UNICODE)
    return [t for t in raw if len(t) > 1]


def cmd_tokens(a):
    rx = re.compile(a.stem, re.I | re.U)
    c = collections.Counter()
    n_ev = 0
    for f in glob.glob(os.path.join(ROOT, "submission/**/content/*/*.mdx"),
                       recursive=True):
        if os.path.basename(os.path.dirname(f)) != a.lang:
            continue
        try:
            text = io.open(f, encoding="utf-8").read()
        except OSError:
            continue
        zh = f.replace(os.sep + a.lang + os.sep, os.sep + "zh" + os.sep)
        try:
            zt = io.open(zh, encoding="utf-8").read() if zh != f else ""
        except OSError:
            zt = ""
        if zt.count(a.concept) < 1:
            continue
        n_ev += 1
        for t in _tokens(unicodedata.normalize("NFKC", text)):
            if rx.search(t):
                c[t] += 1
    print("证据篇目 %d｜命中 %d 次 / %d 种词形"
          % (n_ev, sum(c.values()), len(c)))
    for t, n in c.most_common(a.show):
        if n >= a.min:
            print("  %-30s %d" % (t, n))
    print(json.dumps([t for t, n in c.most_common() if n >= a.min],
                     ensure_ascii=False))
    return 0


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--root", default="",
                    help="含 submission/ 的项目根（缺省=工具包同级）")
    sub = ap.add_subparsers(dest="cmd")
    al = sub.add_parser("align")
    al.add_argument("--concept", required=True)
    al.add_argument("--lang", required=True)
    al.add_argument("--limit", type=int, default=10)
    al.add_argument("--miss-only", action="store_true")
    al.add_argument("--width", type=int, default=150)
    al.set_defaults(func=cmd_align)
    tk = sub.add_parser("tokens")
    tk.add_argument("--concept", required=True)
    tk.add_argument("--lang", required=True)
    tk.add_argument("--stem", required=True, help="词干正则（不含边界）")
    tk.add_argument("--min", type=int, default=1)
    tk.add_argument("--show", type=int, default=12)
    tk.set_defaults(func=cmd_tokens)
    a = ap.parse_args()
    if a.root:
        global ROOT
        ROOT = os.path.abspath(a.root)
    if not getattr(a, "func", None):
        ap.print_help()
        return 2
    return a.func(a)


if __name__ == "__main__":
    import os as _os
    import sys as _sys
    _sys.path.insert(0, _os.path.dirname(_os.path.dirname(
        _os.path.abspath(__file__))))
    from tools import require_entry
    require_entry("family_probe")
    sys.exit(main())
