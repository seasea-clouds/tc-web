# -*- coding: utf-8 -*-
"""词族 spec 工具：库 ↔ JSON 往返，以及三种格式之间的规整。

为什么要有它：补形流水线长期靠 `tmp/` 里的三个一次性脚本（dump_family /
merge_spec / 手写扁平化），`tmp` 一旦清理就断链。这里把三者固化成子命令，
并把踩过的格式坑写进代码：

    dump     库 → 扁平 spec（`{概念: {语向: [形]}}`），喂给 concept_family
    merge    把人工核过的补形并进现有 spec（只并 forms，不动 mode）
    flatten  把**坐实后**的嵌套格式（`{概念: {语向: {forms, mode, pair}}}`）
             转回扁平——`concept_family --spec` 只吃扁平，直接喂嵌套会产出
             「空族 94 / 合并 94 处」，全库召回 0，看起来像把族搞坏了。

用法：
    python submit.py tools family_spec dump  out.json [--concepts 发票,合同]
    python submit.py tools family_spec merge base.json add.json out.json
    python submit.py tools family_spec flatten nested.json out.json
"""
# 治理声明：本文件属机制层，不承载策略数据；改动须走 README「治理」节的 L3 流程
#（先登记理由 → 行为级等价断言 → selftest --kit 全量），提交说明带 [arch]
#（commit-msg 钩子强制）。策略变更请改 plugins/ 判据或经 submit.py glossary 改库。
import argparse
import io
import json
import os
import sys

KIT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, KIT)
from core import db  # noqa: E402
DB = os.path.join(KIT, "data", "glossary.db")


def cmd_dump(a):
    only = {x.strip() for x in a.concepts.split(",") if x.strip()}
    conn = db.connect(DB, readonly=True)
    try:
        spec = {}
        for concept, lg, forms in conn.execute(
                "select key,value,target from lexicons where id='concept-family'"):
            if only and concept not in only:
                continue
            spec.setdefault(concept, {})[lg] = json.loads(forms)
    finally:
        conn.close()
    with io.open(a.out, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(json.dumps(spec, ensure_ascii=False, indent=1))
    print("导出 %d 概念 / %d 格 → %s"
          % (len(spec), sum(len(v) for v in spec.values()), a.out))
    return 0


def cmd_merge(a):
    base = json.load(io.open(a.base, encoding="utf-8"))
    add = json.load(io.open(a.add, encoding="utf-8"))
    n = 0
    for concept, per_lg in add.items():
        for lg, forms in per_lg.items():
            cell = base.setdefault(concept, {}).setdefault(lg, [])
            if isinstance(cell, dict):
                cell = cell.setdefault("forms", [])
            low = {f.lower() for f in cell}
            for f in forms:
                if f.lower() not in low:
                    cell.append(f)
                    low.add(f.lower())
                    n += 1
    with io.open(a.out, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(json.dumps(base, ensure_ascii=False, indent=1))
    print("并入 %d 个形态 → %s" % (n, a.out))
    return 0


def cmd_flatten(a):
    src = json.load(io.open(a.base, encoding="utf-8"))
    flat, cells = {}, 0
    for concept, per_lg in src.items():
        for lg, cell in per_lg.items():
            forms = cell.get("forms") if isinstance(cell, dict) else cell
            flat.setdefault(concept, {})[lg] = list(forms or ())
            cells += 1
    with io.open(a.out, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(json.dumps(flat, ensure_ascii=False, indent=1))
    print("扁平化 %d 概念 / %d 格 → %s" % (len(flat), cells, a.out))
    return 0


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    sub = ap.add_subparsers(dest="cmd")
    d = sub.add_parser("dump")
    d.add_argument("out")
    d.add_argument("--concepts", default="")
    d.set_defaults(func=cmd_dump)
    m = sub.add_parser("merge")
    m.add_argument("base")
    m.add_argument("add")
    m.add_argument("out")
    m.set_defaults(func=cmd_merge)
    f = sub.add_parser("flatten")
    f.add_argument("base")
    f.add_argument("out")
    f.set_defaults(func=cmd_flatten)
    a = ap.parse_args()
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
    require_entry("family_spec")
    sys.exit(main())
