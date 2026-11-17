# -*- coding: utf-8 -*-
"""判据数据源体检：每条规则读哪张词表、那张表里现在有几行。

**为什么需要这个工具**：P74 曾「实现完整、自检全绿、47 语零命中」——因为它读的
`term-zh` 里 `variants`/`forbidden` 全库 0 条，而且当时根本没有写入口。这类缺陷
既不报错也不报红，却让一条判据永远不可能开火。判据的数量与质量都靠「数据落没
落地」决定，所以要把这件事变成可查询的表，而不是靠人记。

它回答三个问题：

1. 每条规则依赖哪些词表（静态分析：插件 → 访问器 → 词表 id，含经 `_*.py` 辅助
   模块的间接依赖）；
2. 这些词表现在有多少行、覆盖多少语向；
3. 规则声明的 `COVERAGE.langs` 与数据实际覆盖的语向是否对得上（对不上意味着
   要么规则声明没跟上数据，要么数据漏了语向——两种都会让判据在部分语向上空跑）。

用法：
    python submit.py tools rule_data_audit                # 全库表格
    python submit.py tools rule_data_audit --empty-only   # 只看空转的
    python submit.py tools rule_data_audit --json         # 机器可读
"""
# 治理声明：本文件属机制层，不承载策略数据；改动须走 README「治理」节的 L3 流程
#（先登记理由 → 行为级等价断言 → selftest --kit 全量），提交说明带 [arch]
#（commit-msg 钩子强制）。策略变更请改 plugins/ 判据或经 submit.py glossary 改库。
import argparse
import ast
import json
import os
import sys

_KIT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, _KIT)
from core import db

from core import schema                                            # noqa: E402

PLUGIN_DIR = os.path.join(_KIT, "plugins")
DB = os.path.join(_KIT, "data", "glossary.db")

# 访问器函数名 → 词表 id（与 plugins/_lexicon.py 的公开函数一一对应）
ACCESSOR_ID = {
    "term_localization": "term-localization",
    "term_zh": "term-zh",
    "concept_family": "concept-family",
    "forbidden_currency": "forbidden-currency",
    "latin_required": "latin-required",
    "latin_allow": "latin-allow",
    "latin_taxon": "latin-taxon",
    "term_variant": "term-variant",
}

# shaped(view)[<键>] → 词表 id（整形缓存里的键名）
SHAPED_KEY_ID = {
    "country": "country",
    "neighbor": "neighbor",
    "ascii": "latin-ascii",
    "required": "latin-required",
    "allow": "latin-allow",
    "taxon": "latin-taxon",
    "term_zh": "term-zh",
    "family": "concept-family",
    "term_loc": "term-localization",
    "currency": "forbidden-currency",
    "term_variant": "term-variant",
}

# 语向字段在哪一列（决定「覆盖多少语向」怎么数）。None＝该表不分语向。
# 这几列**因表而异**（同一个词表类里 key/value/target 的语义并不统一），
# 写错不会报错，只会把「语向数」算成一个荒谬值（首版把 concept-family 的
# 语向算成 635 个，因为它把 forms JSON 当成语向列）。
LANG_COLUMN = {
    "phrase-block": "key",       # key = 用途|语向
    "term-zh": "value",          # key=概念, target=首选形, value=语向
    "concept-family": "value",   # key=概念, target=词形 JSON, value=语向
    "term-variant": "key",       # key=语向, value=错形, target=正形
    "country": "key",
    "neighbor": "key",
    "latin-ascii": "key",
    "latin-required": "value",   # key 为空，语向在 value
    "term-localization": "value",
    "latin-taxon": None,         # 全库
    "latin-allow": None,         # 全库
    "forbidden-currency": None,  # 按货币标签，不分语向
}


# ------------------------------------------------------------------ 静态分析

def _call_name(node):
    """Call → ('phrase_block', [字面量参数]) 这类归一化；认不出返回 (None, [])。"""
    f = node.func
    if isinstance(f, ast.Attribute):
        name = f.attr
    elif isinstance(f, ast.Name):
        name = f.id
    else:
        return None, []
    lits = []
    for a in node.args:
        if isinstance(a, ast.Constant) and isinstance(a.value, str):
            lits.append(a.value)
        else:
            lits.append(None)
    return name, lits


def data_reads(path):
    """→ {词表 id 或 "phrase-block:<用途>"}：单个文件直接读了哪些词表。"""
    src = open(path, encoding="utf-8").read()
    tree = ast.parse(src, path)
    out = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Call):
            name, lits = _call_name(node)
            if name == "phrase_block":
                use = lits[1] if len(lits) > 1 else None
                out.add("phrase-block:%s" % use if use else "phrase-block:*")
            elif name in ACCESSOR_ID:
                out.add(ACCESSOR_ID[name])
        elif isinstance(node, ast.Subscript):
            # _lexicon.shaped(view)["country"]
            val = node.value
            if (isinstance(val, ast.Call)
                    and isinstance(val.func, ast.Attribute)
                    and val.func.attr == "shaped"):
                key = node.slice
                if isinstance(key, ast.Constant) and key.value in SHAPED_KEY_ID:
                    out.add(SHAPED_KEY_ID[key.value])
    return out


def module_name(fn):
    return fn[:-3]


def imports_of(path):
    """→ 本工具关注的目标名：plugins 内部模块 + _lexicon。"""
    out = set()
    for node in ast.walk(ast.parse(open(path, encoding="utf-8").read(), path)):
        if isinstance(node, ast.ImportFrom):
            mod = node.module or ""
            if mod.startswith("plugins."):
                out.add(mod.split(".", 1)[1])
            elif mod == "plugins":
                out.update(a.name for a in node.names)
            for a in node.names:
                out.add(a.name)              # 便于识别 `import _lexicon` 之类
        elif isinstance(node, ast.Import):
            for a in node.names:
                if a.name.startswith("plugins."):
                    out.add(a.name.split(".", 1)[1])
    return out


def analyse():
    """→ {插件文件名: (规则号集合, 数据源集合)}，含经辅助模块的间接依赖。"""
    files = sorted(f for f in os.listdir(PLUGIN_DIR) if f.endswith(".py"))
    direct = {}
    for fn in files:
        direct[fn] = data_reads(os.path.join(PLUGIN_DIR, fn))

    helper = {module_name(f): f for f in files if f.startswith("_")}
    # 辅助模块之间也可能互相 import，做两轮传递足够（当前深度 1）
    expanded = dict(direct)
    for fn in files:
        seen, stack = set(), [fn]
        while stack:
            cur = stack.pop()
            for dep in imports_of(os.path.join(PLUGIN_DIR, cur)):
                if dep in helper and dep not in seen:
                    seen.add(dep)
                    stack.append(helper[dep])
        got = set(direct[fn])
        for h in seen:
            got |= direct[helper[h]]
        expanded[fn] = got
    return expanded


def rules_of(path):
    """→ (RULE, RULES, COVERAGE.langs)；用 AST 取字面量，避免 import 副作用。"""
    tree = ast.parse(open(path, encoding="utf-8").read(), path)
    rule, rules, langs = None, [], None
    for node in tree.body:
        if not isinstance(node, ast.Assign) or len(node.targets) != 1:
            continue
        t = node.targets[0]
        if not isinstance(t, ast.Name):
            continue
        if t.id == "RULE" and isinstance(node.value, ast.Constant):
            rule = node.value.value
        elif t.id == "RULES" and isinstance(node.value, (ast.List, ast.Tuple)):
            rules = [x.value for x in node.value.elts
                     if isinstance(x, ast.Constant)]
        elif t.id == "COVERAGE" and isinstance(node.value, ast.Dict):
            for k, v in zip(node.value.keys, node.value.values):
                if isinstance(k, ast.Constant) and k.value == "langs":
                    if isinstance(v, ast.List):
                        langs = [x.value for x in v.elts
                                 if isinstance(x, ast.Constant)]
                    elif isinstance(v, ast.Constant):
                        langs = v.value            # "all"
    return rule, (rules or ([rule] if rule else [])), langs


# ------------------------------------------------------------------ 数据侧

def data_stats(conn):
    """→ {(id, use|None): (行数, {语向...})}。"""
    out = {}
    for lid in schema.LEXICON_IDS:
        col = LANG_COLUMN.get(lid, "key")
        rows = conn.execute(
            "SELECT key, value, target FROM lexicons WHERE id=?", (lid,)).fetchall()
        if lid == "phrase-block":
            for key, _value, _target in rows:
                use, _, lang = key.partition("|")
                slot = out.setdefault((lid, use), [0, set()])
                slot[0] += 1
                if lang:
                    slot[1].add(lang)
            continue
        slot = out.setdefault((lid, None), [0, set()])
        slot[0] += len(rows)
        if col:
            idx = {"key": 0, "value": 1, "target": 2}[col]
            slot[1] |= {r[idx] for r in rows if r[idx]}
    return {k: (n, langs) for k, (n, langs) in out.items()}


def effective_rows(conn):
    """→ {词表 id: (有效行数, 说明)}：**规则真正能判的那部分**。

    行数不为零不代表判据能开火。两处实测：

      · `term-zh` 2068 行，但 P74 只看每行 meta 里的 `variants`/`forbidden`——
        这两个字段全库 0 条，判据永远零命中，而行数看起来「数据很足」；
      · `concept-family` 658 行，P75 只对 `meta.mode == 'check'` 的格开火，
        `merged`/`unverified` 的格是「有词形但不判」。

    所以「有效行」必须按规则的判读口径算，不能按表的行数算。
    """
    out = {}
    n = conn.execute(
        "SELECT count(*) FROM lexicons WHERE id='term-zh' AND "
        "(meta_json LIKE '%\"variants\"%' OR meta_json LIKE '%\"forbidden\"%')"
    ).fetchone()[0]
    out["term-zh"] = (n, "带 variants/forbidden 的行（P74 只判这两张清单）")

    total = conn.execute(
        "SELECT count(*) FROM lexicons WHERE id='concept-family'").fetchone()[0]
    n2 = conn.execute(
        "SELECT count(*) FROM lexicons WHERE id='concept-family' AND "
        "meta_json LIKE '%\"mode\": \"check\"%'").fetchone()[0]
    out["concept-family"] = (n2, "mode=check %d / 共 %d 格" % (n2, total))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--empty-only", action="store_true",
                    help="只列数据源为空（判据空转）的规则")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()

    conn = db.connect(DB, readonly=True)
    stats = data_stats(conn)
    eff = effective_rows(conn)
    conn.close()

    expanded = analyse()
    rows = []
    for fn in sorted(expanded):
        if fn.startswith("_"):
            continue
        path = os.path.join(PLUGIN_DIR, fn)
        rule, rule_ids, langs = rules_of(path)
        # 一个插件可能承载多条规则（ST01–ST08 共用一个 check_style），
        # 按「插件 × 数据源」归并，规则号合并——逐规则展开只会得到五行
        # 一模一样的数据，看不出任何额外信息。
        for src in sorted(expanded[fn] or ()):
            if ":" in src:
                lid, use = src.split(":", 1)
            else:
                lid, use = src, None
            n, have = stats.get((lid, use), (0, set()))
            n_eff = eff[lid][0] if lid in eff else n
            miss = []
            if langs and langs != "all" and have:
                # zh 是母版侧（触发条件），表里不会有它的目标语形；
                # "*" 是「不限语向」。两者都不算缺口。
                miss = [x for x in langs
                        if x not in have and x not in ("*", "zh")]
            rows.append({"rule": ",".join(rule_ids) or fn, "plugin": fn,
                         "rules": rule_ids, "source": lid,
                         "use": use or "", "rows": n, "rows_effective": n_eff,
                         "effective_note": eff[lid][1] if lid in eff else "",
                         "langs": len(have),
                         "missing_langs": miss,
                         "empty": n_eff == 0})

    if a.json:
        print(json.dumps(rows, ensure_ascii=False, indent=2))
        return 0

    empty = [r for r in rows if r["empty"]]
    if a.empty_only:
        for r in empty:
            print("%-6s %-34s %-18s %s"
                  % (r["rule"], r["plugin"], r["source"],
                     ("用途 " + r["use"]) if r["use"] else ""))
        print("空转数据源 %d 条 / 共 %d 条引用" % (len(empty), len(rows)))
        return 0

    print("%-16s %-30s %-18s %-14s %6s %6s %5s  %s"
          % ("规则", "插件", "数据源", "用途", "行数", "有效", "语向", "缺口"))
    for r in sorted(rows, key=lambda x: (x["empty"], x["rule"], x["source"])):
        flag = "EMPTY" if r["empty"] else ""
        lang_col = LANG_COLUMN.get(r["source"])
        langs_txt = "全局" if lang_col is None else str(r["langs"])
        print("%-16s %-30s %-18s %-14s %6d %6d %5s  %s %s"
              % (r["rule"][:16], r["plugin"][:30], r["source"],
                 r["use"] or "-", r["rows"], r["rows_effective"], langs_txt,
                 ",".join(r["missing_langs"][:6]) or "-", flag))
    print("\n数据源引用 %d 条；其中**有效行为 0** 的 %d 条"
          "（判据在这些数据上永远零命中）" % (len(rows), len(empty)))
    for lid, (n_eff, note) in sorted(eff.items()):
        print("  %-16s 有效 %4d 行 —— %s" % (lid, n_eff, note))
    return 0


if __name__ == "__main__":
    import os as _os
    import sys as _sys
    _sys.path.insert(0, _os.path.dirname(_os.path.dirname(
        _os.path.abspath(__file__))))
    from tools import require_entry
    require_entry("rule_data_audit")
    sys.exit(main())
