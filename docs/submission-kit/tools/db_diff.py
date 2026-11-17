# -*- coding: utf-8 -*-
"""库逻辑比对：工作区 glossary.db vs HEAD 版本，逐表逐行 sha256。

只读运维工具（架构梳理 2026-11-16 固化）。回答「工作区库的 modified 是内容
变更还是 SQLite 页布局漂移」：逐表导出排序行做哈希，`全部 SAME` 即逻辑内容
与 HEAD 一致，可放心 `git checkout --` 或提交。

安全约定（0 字节事故后固化，见 README 9.6）：
  * 只读输入，HEAD 副本写到独立文件名，结束只清自己的副本；
  * 打开前校验 SQLite 文件头 + size>0，空库不会被误读成「全部差异」；
  * 只读连接（PRAGMA query_only）。

用法（工具包根）：
    python submit.py tools db_diff [--db data/glossary.db]
"""
# 治理声明：本文件属机制层，不承载策略数据；改动须走 README「治理」节的 L3 流程
#（先登记理由 → 行为级等价断言 → selftest --kit 全量），提交说明带 [arch]
#（commit-msg 钩子强制）。策略变更请改 plugins/ 判据或经 submit.py glossary 改库。
import argparse
import hashlib
import os
import sqlite3
import subprocess
import sys

KIT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = os.path.dirname(KIT)
REL = "submission-kit/data/glossary.db"
SQLITE_MAGIC = b"SQLite format 3\x00"


def check_file(path, label):
    if not os.path.exists(path):
        raise SystemExit("FAIL: %s 不存在 %s" % (label, path))
    size = os.path.getsize(path)
    with open(path, "rb") as f:
        magic = f.read(16)
    if size == 0 or magic != SQLITE_MAGIC:
        raise SystemExit("FAIL: %s 不是有效 SQLite 库（size=%d magic=%r）"
                         % (label, size, magic))
    return size


def dump(path):
    con = sqlite3.connect(path)
    con.execute("PRAGMA query_only=ON")
    cur = con.cursor()
    tables = [r[0] for r in cur.execute(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")]
    out = {}
    for t in tables:
        rows = cur.execute('SELECT * FROM "%s"' % t).fetchall()
        norm = sorted(repr(r) for r in rows)
        h = hashlib.sha256("\n".join(norm).encode("utf-8")).hexdigest()[:16]
        out[t] = (len(rows), h)
    others = [r[0] for r in cur.execute(
        "SELECT name FROM sqlite_master WHERE type IN ('index','trigger') "
        "AND name NOT LIKE 'sqlite_%' ORDER BY name")]
    out["__objects__"] = (len(others), ",".join(others))
    con.close()
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--db", default=os.path.join(KIT, "data", "glossary.db"))
    ap.add_argument("--keep-head-copy", action="store_true",
                    help="保留 HEAD 副本到 tmp/（默认比对后删除）")
    a = ap.parse_args()

    check_file(a.db, "工作区库")
    blob = subprocess.run(["git", "show", "HEAD:%s" % REL],
                          cwd=REPO, capture_output=True)
    if blob.returncode != 0:
        print("FAIL: 无法读取 HEAD 版本", blob.stderr[:200])
        return 1
    head_copy = os.path.join(REPO, "tmp", "_head_glossary_diff.db")
    os.makedirs(os.path.dirname(head_copy), exist_ok=True)
    with open(head_copy, "wb") as f:
        f.write(blob.stdout)
    try:
        check_file(head_copy, "HEAD 版本")
        a_tbl = dump(head_copy)
        b_tbl = dump(a.db)
    finally:
        if os.path.exists(head_copy) and not a.keep_head_copy:
            os.remove(head_copy)

    keys = sorted(set(a_tbl) | set(b_tbl))
    diff = 0
    print("%-22s %-34s %-34s %s"
          % ("table", "HEAD(rows,hash)", "WORK(rows,hash)", "状态"))
    for k in keys:
        ra, rb = a_tbl.get(k), b_tbl.get(k)
        same = ra == rb
        diff += 0 if same else 1
        print("%-22s %-34s %-34s %s" % (
            k,
            "%s,%s" % ra if ra else "-",
            "%s,%s" % rb if rb else "-",
            "SAME" if same else "**DIFF**"))
    print("\n逻辑差异表数: %d（0 = 工作区库与 HEAD 逻辑内容一致）" % diff)
    return 0 if diff == 0 else 2


if __name__ == "__main__":
    import os as _os
    import sys as _sys
    _sys.path.insert(0, _os.path.dirname(_os.path.dirname(
        _os.path.abspath(__file__))))
    from tools import require_entry
    require_entry("db_diff")
    sys.exit(main())
