# -*- coding: utf-8 -*-
"""自检：分层契约（工具级臂）。

钉死三件事：
  ① `LOCALES`（代码常量）与 `locales` 表（库）是同一份语言清单，不得漂移；
  ② 迁库后的词表在库里非空（judge-forms / currency-symbol / issuer /
     family-*），否则判据会静默零命中。

`LOCALES` 保留在 consts 是机制需要（schema 校验、打包清单）；数据真源在库，
两边必须一致。本臂是这条一致性契约的唯一执行点。
"""
import os
import sqlite3
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.dirname(HERE)
if KIT not in sys.path:
    sys.path.insert(0, KIT)

from core.consts import metadata as META          # noqa: E402

fails = []
total = [0]


def chk(name, ok, detail=""):
    total[0] += 1
    print("%-4s %-46s %s" % ("PASS" if ok else "FAIL", name, detail))
    if not ok:
        fails.append(name)


def _db_rows(lid):
    c = sqlite3.connect("file:%s?mode=ro" % os.path.join(
        KIT, "data", "glossary.db"), uri=True)
    try:
        return [r[0] for r in c.execute(
            "SELECT value FROM lexicons WHERE id=?", (lid,))]
    finally:
        c.close()


def _db_tables():
    c = sqlite3.connect("file:%s?mode=ro" % os.path.join(
        KIT, "data", "glossary.db"), uri=True)
    try:
        return [r[0] for r in c.execute(
            "SELECT name FROM sqlite_master WHERE type='table'")]
    finally:
        c.close()


def _db_cols(table):
    c = sqlite3.connect("file:%s?mode=ro" % os.path.join(
        KIT, "data", "glossary.db"), uri=True)
    try:
        return [r[1] for r in c.execute("PRAGMA table_info(%s)" % table)]
    finally:
        c.close()


def _db_langs():
    c = sqlite3.connect("file:%s?mode=ro" % os.path.join(
        KIT, "data", "glossary.db"), uri=True)
    try:
        return [r[0] for r in c.execute("SELECT lang FROM locales")]
    finally:
        c.close()


def main():
    tables = set(_db_tables())
    chk("schema 7：无 plugin_meta / baseline，表集合正确",
        tables == {"meta", "terms", "anchors", "forms", "lexicons", "locales"},
        str(sorted(tables)))
    chk("locales 只保留 lang 列", _db_cols("locales") == ["lang"],
        str(_db_cols("locales")))

    langs_db = set(_db_langs())
    chk("LOCALES 与 locales 表一致（%d 语）" % len(langs_db),
        set(META.LOCALES) == langs_db,
        "差集 consts-only=%s db-only=%s"
        % (sorted(set(META.LOCALES) - langs_db)[:5],
           sorted(langs_db - set(META.LOCALES))[:5]))

    for lid, least in (("judge-forms", 400), ("currency-symbol", 70),
                       ("issuer", 10), ("family-stop", 70),
                       ("family-deriv", 50), ("family-suffix", 500),
                       ("official-en-literal", 40)):
        n = len(_db_rows(lid))
        chk("%s 非空（%d 行）" % (lid, n), n >= least, "期望 ≥%d" % least)

    print("\nFAIL %d / 断言 %d" % (len(fails), total[0]))
    return 0 if not fails else 1


if __name__ == "__main__":
    sys.exit(main())
