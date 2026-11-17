# -*- coding: utf-8 -*-
"""自检：判据的数据源必须真的能开火（工具级臂，`selftest --kit` 才跑）。

**为什么必须有这条臂**：判据的失效方式几乎都是静默的——词表 id 拼错、用途名
拼错、数据没落地，三种都让规则「零命中」，而机检显示干净。P74 就是活例：
插件、自检、射程声明全都齐，读的那两个字段全库 0 条，47 语一条也判不出来。

六个断言：

  ① 插件请求的词表 id 都在 `schema.LEXICON_IDS` 里（拼错就是永远空表）；
  ② 插件请求的 `phrase-block` 用途都在库里存在（拼错同理）；
  ③ **有效行为 0** 的规则必须登记 `DATA_PENDING`（承认「机制在、数据空」）；
  ④ 反向：登记了 `DATA_PENDING` 的规则必须真的还是空的（数据落地后忘了删标记）；
  ⑤ 负向：把某条规则的用途名改错 → ② 必须报；
  ⑥ `COVERAGE.langs` 与数据实际语向**双向**一致（少一个=该语向空跑，
     多一个=声明说谎；`zh` 是母版侧、`*` 是全语向，都不参与比较）。
"""
import ast
import os
import sqlite3
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
_KIT = os.path.dirname(_HERE)
sys.path.insert(0, _KIT)
sys.path.insert(0, os.path.join(_KIT, "tools"))

import rule_data_audit as RDA                                   # noqa: E402
from core import schema                                          # noqa: E402

DB = os.path.join(_KIT, "data", "glossary.db")


def pending_of(path):
    """→ DATA_PENDING 的说明文字；没登记返回 None。"""
    tree = ast.parse(open(path, encoding="utf-8").read(), path)
    for node in tree.body:
        if (isinstance(node, ast.Assign) and len(node.targets) == 1
                and isinstance(node.targets[0], ast.Name)
                and node.targets[0].id == "DATA_PENDING"
                and isinstance(node.value, ast.Constant)):
            return node.value.value
    return None


def check_ids(reads):
    """① 词表 id 必须是 schema 里登记过的。"""
    problems = []
    for lid in sorted({r.split(":", 1)[0] for r in reads}):
        if lid not in schema.LEXICON_IDS:
            problems.append("W1 插件请求了不存在的词表 id %r（永远空表）" % lid)
    return problems


def check_uses(reads, db):
    """② phrase-block 的用途必须是库里真实存在的。"""
    conn = sqlite3.connect(db)
    try:
        have = {k.split("|", 1)[0] for (k,) in conn.execute(
            "SELECT DISTINCT key FROM lexicons WHERE id='phrase-block'")}
    finally:
        conn.close()
    problems = []
    for r in sorted(reads):
        if not r.startswith("phrase-block:"):
            continue
        use = r.split(":", 1)[1]
        if use in ("", "*"):
            continue                     # 未写死用途，跳过（不是拼错）
        if use not in have:
            problems.append("W2 插件请求的用途 %r 在库里不存在（判据静默零命中）"
                            % use)
    return problems


def check_coverage(rule_langs, data_langs, rule, source):
    """⑥ 声明语向 vs 数据语向：两个方向都要对得上。

    少一个：规则声称判这个语向，但表里没有它的词形 → 该语向永远零命中。
    多一个：表里有这个词形，规则却没声明 → 已经按它判红了，而射程声明不认。
    两种都是「声明与事实不一致」，而机检只会照规则声明的射程去核对。
    """
    if not rule_langs or rule_langs == "all":
        return []
    declared = {x for x in rule_langs if x not in ("zh", "*")}
    if not data_langs or "*" in data_langs:
        return []
    problems = []
    missing = sorted(declared - data_langs)
    extra = sorted(data_langs - declared)
    if missing:
        problems.append("W6 %s 的 %s 声明含 %s，但表里没有这些语向（空跑）"
                        % (rule, source, ",".join(missing[:8])))
    if extra:
        problems.append("W6 %s 的 %s 表里有 %s，但 COVERAGE 没声明（声明说谎）"
                        % (rule, source, ",".join(extra[:8])))
    return problems


def check_pending(rows, pending_map):
    """③④ 空转必须有标记、有标记必须真的空转。"""
    problems = []
    empty = {r["plugin"] for r in rows if r["empty"]}
    for fn in sorted(empty):
        if fn not in pending_map:
            problems.append(
                "W3 %s 的数据源有效行为 0，但没有登记 DATA_PENDING："
                "要么补数据，要么在插件里写明「机制在、数据空」" % fn)
    for fn, note in sorted(pending_map.items()):
        if fn not in empty:
            problems.append(
                "W4 %s 登记了 DATA_PENDING（%s），但数据源已有数据——"
                "删掉这行标记，否则「待办」永远挂着" % (fn, note))
    return problems


def main():
    reads = {}
    expanded = RDA.analyse()
    for fn in sorted(expanded):
        if fn.startswith("_"):
            continue
        reads[fn] = expanded[fn]

    all_reads = set().union(*reads.values()) if reads else set()
    problems = []
    problems += check_ids(all_reads)
    problems += check_uses(all_reads, DB)

    conn = sqlite3.connect(DB)
    stats = RDA.data_stats(conn)
    eff = RDA.effective_rows(conn)
    conn.close()

    rows = []
    for fn, srcs in reads.items():
        for src in srcs:
            lid, _, use = src.partition(":")
            n, _have = stats.get((lid, use or None), (0, set()))
            n_eff = eff[lid][0] if lid in eff else n
            rows.append({"plugin": fn, "source": src, "rows": n,
                         "rows_effective": n_eff, "empty": n_eff == 0})

    pending_map = {}
    for fn in sorted(os.listdir(os.path.join(_KIT, "plugins"))):
        if fn.startswith("_") or not fn.endswith(".py"):
            continue
        note = pending_of(os.path.join(_KIT, "plugins", fn))
        if note:
            pending_map[fn] = note

    problems += check_pending(rows, pending_map)

    # ⑥ 声明语向 ↔ 数据语向
    for fn, srcs in sorted(reads.items()):
        rule, _ids, langs = RDA.rules_of(os.path.join(_KIT, "plugins", fn))
        for src in sorted(srcs):
            lid, _, use = src.partition(":")
            _n, have = stats.get((lid, use or None), (0, set()))
            problems += check_coverage(langs, have, rule or fn, src)

    # ⑤ 负向：把一个真实用途名改错，② 必须报
    fake = "paragraph-opener"            # 库里是 para-opener
    if not check_uses({"phrase-block:%s" % fake}, DB):
        problems.append("W5 拼错的用途 %r 未被发现（用途校验失效）" % fake)

    for p in problems:
        print("  FAIL", p)
    print("判据数据源：6 断言（id 合法 / 用途存在 / 空转有标记 / 标记不悬空 / "
          "负向 / 语向双向一致），规则 %d 条、空转 %d 条，FAIL %d"
          % (len(reads), len({r["plugin"] for r in rows if r["empty"]}),
             len(problems)))
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
