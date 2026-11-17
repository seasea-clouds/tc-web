# -*- coding: utf-8 -*-
"""自检：写入口收窄（2026-11-16 架构梳理的三条治理铁律之一）。

铁律：glossary.db 的**合法写路径**只有两条——
  A. submit.py 的子命令（glossary / plugin sync 等入口，DML 一律经 core/db.py
     的写函数：lexicon_write / lexicon_replace_bulk / lexicon_patch_meta /
     term_meta_update / glossary_write / import_changeset / sync_plugin_meta）；
  B. core/schema.py 的 migrate（前向建表/迁移）。
除这两处外，**任何文件出现裸 SQL 写即 FAIL**——历史上 tools/family_* 各自
裸写 DELETE+INSERT+commit，绕过 BEGIN IMMEDIATE（并行会话互踩）、绕过统一
bump、绕开 changeset 留痕；写入口散掉之后，「谁改过库」就无法回答。

五条断言：
  ① plugins/ 与 tools/ 无裸 SQL 写（INSERT/DELETE/REPLACE INTO/
     UPDATE..SET/commit/executescript/BEGIN IMMEDIATE）；
  ② plugins/ 与 tools/ 不直接调用 core.db._bump（bump 属写路径，
     只能在 core/db.py 写函数内部发生）；
  ③ plugins/ 不 import sqlite3（插件只读 PolicyView / 经 plugins._lexicon
     取数，永不摸库文件）；
  ④ core/db.py 六个写函数齐全（收敛后的唯一 DML 实现面）；
  ⑤ submit.py 透传表齐全：tools 写库工具（family_import / family_recheck /
     family_trim / pair_open）各有 glossary action 入口，且模块可导入。
"""
import io
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.dirname(HERE)

WRITE_PAT = re.compile(
    r"\bINSERT\s+INTO\b|\bDELETE\s+FROM\b|\bREPLACE\s+INTO\b|"
    r"\bUPDATE\s+\w+\s+SET\b|\.commit\(\)|\bexecutescript\b|"
    r"BEGIN\s+IMMEDIATE", re.I)
BUMP_PAT = re.compile(r"\b_bump\b")
SQLITE_IMPORT_PAT = re.compile(r"^\s*import\s+sqlite3\b", re.M)

DB_FUNCS = ("lexicon_write", "lexicon_replace_bulk", "lexicon_patch_meta",
            "term_meta_update", "glossary_write", "import_changeset")
PASSTHROUGH = {"family-import": "family_import",
               "family-recheck": "family_recheck",
               "family-trim": "family_trim",
               "pair-open": "pair_open"}


def read(p):
    return io.open(p, encoding="utf-8").read()


def scan_dirty(sub):
    """sub 下每个 .py：含裸 SQL 写 / 直调 _bump / import sqlite3 的文件列表。"""
    d = os.path.join(KIT, sub)
    sql_hits, bump_hits, sqlmod = [], [], []
    for f in sorted(os.listdir(d)):
        if not f.endswith(".py"):
            continue
        p = os.path.join(d, f)
        src = read(p)
        if WRITE_PAT.search(src):
            sql_hits.append(f)
        if BUMP_PAT.search(src):
            bump_hits.append(f)
        if SQLITE_IMPORT_PAT.search(src):
            sqlmod.append(f)
    return sql_hits, bump_hits, sqlmod


def main():
    fails = 0

    # ①② 生产代码零裸写
    for sub in ("plugins", "tools"):
        sql_hits, bump_hits, _ = scan_dirty(sub)
        ok = not sql_hits and not bump_hits
        print("  %-4s %-34s %s" % (
            "OK" if ok else "FAIL",
            "① %s/ 无裸 SQL 写" % sub,
            "" if ok else "违例 %s / _bump %s" % (sql_hits, bump_hits)))
        fails += 0 if ok else 1

    # ③ plugins 不摸库文件
    _, _, sqlmod = scan_dirty("plugins")
    ok = not sqlmod
    print("  %-4s %-34s %s" % (
        "OK" if ok else "FAIL", "③ plugins/ 不 import sqlite3",
        "" if ok else "违例 %s" % sqlmod))
    fails += 0 if ok else 1

    # ④ core/db.py 写函数齐全
    src = read(os.path.join(KIT, "core", "db.py"))
    missing = [f for f in DB_FUNCS if ("def %s(" % f) not in src]
    ok = not missing
    print("  %-4s %-34s %s" % (
        "OK" if ok else "FAIL", "④ core/db.py 六写函数齐全",
        "" if ok else "缺 %s" % missing))
    fails += 0 if ok else 1

    # ⑤ submit.py 透传入口齐全且目标模块存在
    sub_src = read(os.path.join(KIT, "submit.py"))
    missing = [a for a in PASSTHROUGH if ('"%s"' % a) not in sub_src]
    bad_mod = []
    for action, mod in PASSTHROUGH.items():
        p = os.path.join(KIT, "tools", "%s.py" % mod)
        if not os.path.exists(p) or ("def main(argv" not in read(p)):
            bad_mod.append(mod)
    ok = not missing and not bad_mod
    print("  %-4s %-34s %s" % (
        "OK" if ok else "FAIL", "⑤ glossary 透传入口齐全",
        "" if ok else "缺 action %s / 模块异常 %s" % (missing, bad_mod)))
    fails += 0 if ok else 1

    print("写入口收窄：5 个断言，FAIL %d" % fails)
    return 0 if not fails else 1


if __name__ == "__main__":
    sys.exit(main())
