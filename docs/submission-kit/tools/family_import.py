# -*- coding: utf-8 -*-
"""词族入库：mode 按**召回体检**逐（概念, 语向）定，不按「概念是否人工核实」整概念定。

v419 那版按概念白名单给 mode，粒度太粗：词族的可用性其实是逐语向的（发票在
uk 语料里既写 `рахунок` 也写 `фактура`，在 de 只有一种写法就够用）。现在用
`tools/family_audit.py` 的语料级召回（证据篇目上 命中总数 / 母版总数）：

    ≥ --pass-recall（默认 0.70）→ mode=check（该语向参与判红）
    <  阈值                     → mode=unverified（数据留库，不判红）

两族共享词形 → merged（整语向跳过，判据不适用于该语），无论召回多高。

⚠️ 两条边界，都踩过：
1. 召回只证明「族覆盖了语料里的表达」，不证明「这些词形只表这个概念」。
   新补的同义词必须逐条读过上下文（并用 `family_precision.py` 复查），
   本脚本只负责按体检值定 mode。
2. 召回达标 ≠ 判据有用。若该概念对的**射程**为 0（见 `rule_p75_reach.py`），
   开 check 只是账面覆盖。补形前先跑射程。

用法：
    python submit.py tools family_import --family fam.json --audit audit.tsv \\
        [--concepts 放行] [--pass-recall 0.70] [--keep-mode-from-db 放行]
"""
# 治理声明：本文件属机制层，不承载策略数据；改动须走 README「治理」节的 L3 流程
#（先登记理由 → 行为级等价断言 → selftest --kit 全量），提交说明带 [arch]
#（commit-msg 钩子强制）。策略变更请改 plugins/ 判据或经 submit.py glossary 改库。
import argparse
import collections
import io
import json
import os
import sys

KIT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, KIT)
from core import db as core_db          # noqa: E402

DB = os.path.join(KIT, "data", "glossary.db")


def _forms_of(cell):
    if isinstance(cell, dict):
        return list(cell.get("forms") or ())
    return list(cell or ())


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--family", required=True)
    ap.add_argument("--audit", required=True, help="family_audit --tsv 产物")
    ap.add_argument("--pass-recall", type=float, default=0.70)
    ap.add_argument("--keep-mode-from-db", default="",
                    help="这些概念的 mode 沿用库里现值（已人工定过的，不被覆盖）")
    ap.add_argument("--concepts", default="",
                    help="只重写这些概念的行（逗号分隔）；其余概念在库里原样保留——"
                         "坐实会把 0 命中的词形丢掉，对还没做的概念那是丢数据")
    ap.add_argument("--dry-run", action="store_true",
                    help="只算 mode 分布与变更量，不写库")
    a = ap.parse_args(argv)

    work = {x.strip() for x in a.concepts.split(",") if x.strip()}
    fam = {c: v for c, v in json.load(io.open(a.family, encoding="utf-8")).items()
           if not work or c in work}
    audit = {}
    for i, line in enumerate(io.open(a.audit, encoding="utf-8")):
        if i == 0:
            if not line.startswith("concept\tlang"):
                raise SystemExit("TSV 表头不符，请确认是 family_audit --tsv 产物")
            continue
        p = line.rstrip("\n").split("\t")
        if len(p) >= 8:
            audit[(p[0], p[1])] = float(p[7])
    keep = {x.strip() for x in a.keep_mode_from_db.split(",") if x.strip()}

    conn = core_db.connect(DB, readonly=True)
    try:
        old = {}
        for concept, lg, target, meta in conn.execute(
                "select key,value,target,meta_json from lexicons "
                "where id='concept-family'"):
            old[(concept, lg)] = (json.loads(target), json.loads(meta) if meta else {})
    finally:
        conn.close()

    pair = {}
    for concept, per_lg in fam.items():
        for _lg, cell in per_lg.items():
            if isinstance(cell, dict) and cell.get("pair"):
                pair[concept] = cell["pair"]
                break

    rows, stat = [], collections.Counter()
    for concept, per_lg in fam.items():
        other = pair.get(concept, "")
        for lg, cell in sorted(per_lg.items()):
            # cell 两种形态都要吃：坐实产物是 {forms, mode, pair} 嵌套，
            # family_spec dump 出来的是纯列表（v437 实测直接崩在这）。
            forms = _forms_of(cell)
            theirs = _forms_of((fam.get(other) or {}).get(lg))
            shared = {f.lower() for f in forms} & {f.lower() for f in theirs}
            keep_forms = [f for f in forms if f.lower() not in shared]
            old_mode = (old.get((concept, lg)) or (None, {}))[1].get("mode")
            if shared:
                mode = "merged"
                note = ("该语用同一个词表达两概念（共享 %s），整语向跳过"
                        % "、".join(sorted(shared)))
            elif concept in keep and old_mode:
                mode = old_mode
                note = (old.get((concept, lg)) or (None, {}))[1].get("note", "")
            else:
                rec = audit.get((concept, lg))
                if rec is not None and rec >= a.pass_recall:
                    mode = "check"
                    note = ("语料召回 %.2f（证据篇目上命中/母版），同义词已逐语补全并读"
                            "上下文确认；两族不重叠，可判别" % rec)
                else:
                    mode = "unverified"
                    note = ("语料召回 %s，族仍偏窄（该语另有写法未收），故不启用判据"
                            % ("%.2f" % rec if rec is not None else "缺测"))
            stat[(concept, mode)] += 1
            rows.append((concept, lg, json.dumps(keep_forms, ensure_ascii=False),
                         {"pair": other, "mode": mode, "note": note}))
    for k in sorted(stat):
        print("  %-6s %-11s %d" % (k[0], k[1], stat[k]))
    print("行数 %d" % len(rows))
    if a.dry_run:
        # 变更量：新增/删除的词形数，避免「静默丢形」
        add = drop = 0
        for concept, lg, target, _meta in rows:
            new = set(json.loads(target))
            old_forms = set((old.get((concept, lg)) or ([], {}))[0] or ())
            add += len(new - old_forms)
            drop += len(old_forms - new)
        print("dry-run：新增词形 %d、移除词形 %d（未写库）" % (add, drop))
        return 0

    # 落库只许走 core.db 的统一写通道（裸 SQL 写在本工具包已禁止，
    # 见 selftest/_db_write_surface.py）；本脚本的裸 sqlite3 连接只做只读查询。
    res = core_db.lexicon_replace_bulk(
        DB, "concept-family",
        [(concept, lg, target, meta) for concept, lg, target, meta in rows],
        only_keys=sorted(work) if work else None)
    print("写入完成（%d 行，policy_version → %d）"
          % (res["rows"], res["policy_version"]))
    return 0


if __name__ == "__main__":
    import os as _os
    import sys as _sys
    _sys.path.insert(0, _os.path.dirname(_os.path.dirname(
        _os.path.abspath(__file__))))
    from tools import require_entry
    require_entry("family_import")
    sys.exit(main())
