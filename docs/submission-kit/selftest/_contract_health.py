# -*- coding: utf-8 -*-
"""自检：core/contract_health.py —— 契约健康门禁（E1/E2/E3/E4 + W2）

为什么是 `_` 前缀：A6/A7 要求 `plugins/` 与 `selftest/` 文件名严格 1:1，
而这个模块没有对应插件（它是 core 只读审计），所以不能占用正名。`submit.py
selftest --kit` 会把这些 `_` 臂单独跑一遍。

为什么必须有这条臂：`contract_health` 平时只对线上契约实跑，那是巡检，
不是注入式回归——如果有人把 E2 的正则编译校验删掉，线上契约本来都合法，
doctor 照样全绿，缺陷要到某天有人写坏正则才暴露。

做法：`VACUUM INTO` 复制线上库到 `--tmp` 下的临时目录，逐类注入一个坏契约，
断言对应 error 出现；基线副本必须 0 error。全程不碰 `data/glossary.db`。
"""
import os
import sqlite3
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
_KIT = os.path.dirname(_HERE)
sys.path.insert(0, _KIT)

from core import contract_health                                # noqa: E402

DB = os.path.join(_KIT, "data", "glossary.db")


def _argv_tmp():
    for i, a in enumerate(sys.argv):
        if a == "--tmp" and i + 1 < len(sys.argv):
            return sys.argv[i + 1]
        if a.startswith("--tmp="):
            return a.split("=", 1)[1]
    return None


def _clone(dst):
    """VACUUM INTO 出一份净化快照（不带 -wal/-shm，改它不影响线上库）。"""
    if os.path.exists(dst):
        os.remove(dst)
    src = sqlite3.connect(DB)
    try:
        src.execute("VACUUM INTO ?", (dst,))
    finally:
        src.close()
    return dst


def _add_form(conn, cid, assertion, lang, value, mode="literal"):
    conn.execute(
        "INSERT INTO forms(term_id,assertion,lang,value,match_mode,scalar,ord) "
        "VALUES (?,?,?,?,?,0,999)", (cid, assertion, lang, value, mode))


def _first_id(conn, section="body"):
    """取一条带锚点的 body 契约（v3：锚点在 anchors 表）。"""
    row = conn.execute(
        "SELECT t.id FROM terms t JOIN anchors a ON a.term_id=t.id "
        "WHERE t.section=? ORDER BY t.id LIMIT 1", (section,)).fetchone()
    return row[0] if row else None


def _fake_repo(root):
    """造一份只含一句 zh 母版的仓库根，用来让 E1 的孤儿锚判定成立。"""
    d = os.path.join(root, "submission", "blogs", "zz-probe", "work", "blog",
                     "zz-probe", "content", "zh")
    os.makedirs(d, exist_ok=True)
    p = os.path.join(d, "zz-probe.mdx")
    with open(p, "w", encoding="utf-8", newline="\n") as fh:
        fh.write("---\ntitle: probe\n---\n\n这一句是唯一存在的母版正文。\n")
    return os.path.join(root, "submission")


CASES = []


def case(name, inject, expect):
    def deco(fn):
        CASES.append((name, fn, expect))
        return fn
    return deco


@case("E2 失效正则", "forbid_re", "E2 失效正则")
def _e2(conn, cid):
    _add_form(conn, cid, "forbid", "fr", "(unclosed", "regex")


@case("E3 词形自碰", "require/forbid 同形", "E3 词形自碰")
def _e3(conn, cid):
    _add_form(conn, cid, "require", "fr", "zzprobe")
    _add_form(conn, cid, "forbid", "fr", "zzprobe")


@case("E4 非法 section", "section=bogus", "E4 非法 section")
def _e4(conn, cid):
    conn.execute("UPDATE terms SET section='bogus' WHERE id=?", (cid,))


@case("E1 孤儿锚", "zh_anchor 换成本篇不存在的话", "E1 孤儿锚")
def _e1(conn, cid):
    conn.execute("UPDATE anchors SET zh_anchor=? WHERE term_id=?",
                 ("这句话在任何一份 zh 母版里都不存在", cid))


def main():
    tmp = _argv_tmp()
    if not tmp:
        print("需要 --tmp <目录>：本臂要造临时库，不允许落到工具包内")
        return 2
    base = os.path.join(os.path.abspath(tmp), "contract-health")
    os.makedirs(base, exist_ok=True)

    fails = 0
    # ① 基线：未改动的快照必须 0 error
    db0 = _clone(os.path.join(base, "baseline.db"))
    r0 = contract_health.audit(db0)
    ok0 = not r0["errors"]
    print("  %-4s %-28s %s" % ("OK" if ok0 else "FAIL",
                               "基线（线上库快照）",
                               "%d contracts / %d error" %
                               (r0["stats"]["contracts"], len(r0["errors"]))))
    if not ok0:
        for e in r0["errors"][:3]:
            print("         ", e[:140])
        fails += 1

    # ② 逐类注入
    for i, (name, inject, expect) in enumerate(CASES, 1):
        db = _clone(os.path.join(base, "case%d.db" % i))
        conn = sqlite3.connect(db)
        try:
            cid = _first_id(conn)
            if not cid:
                print("  FAIL %-28s 库里没有可注入的带锚 body 契约" % name)
                fails += 1
                continue
            inject(conn, cid)
            conn.commit()
        finally:
            conn.close()
        # E1 需要语料：先用「只有一句母版」的假仓库证明孤儿锚会被抓，
        # 再用真实 submission/ 证明只抓注入的那一条（其余 431 条锚都在）。
        root = None
        if expect.startswith("E1"):
            root = _fake_repo(os.path.join(base, "repo%d" % i))
        r = contract_health.audit(db, repo_root=root)
        hit = [e for e in r["errors"] if expect in e]
        ok = bool(hit)
        extra = ""
        if ok and expect.startswith("E1"):
            real = os.path.join(os.path.dirname(_KIT), "submission")
            r2 = contract_health.audit(db, repo_root=real)
            hit2 = [e for e in r2["errors"] if expect in e]
            ok = len(hit2) == 1
            extra = "；真实语料下命中 %d（应为 1）" % len(hit2)
        elif ok:
            ok = len(hit) == 1
            extra = "；error 总数 %d（应为 1）" % len(r["errors"])
        print("  %-4s %-28s 注入=%d 命中=%d%s" %
              ("OK" if ok else "FAIL", name, 1, len(hit), extra))
        if not hit:
            print("         实际 error：%s" %
                  ("；".join(e[:70] for e in r["errors"][:3]) or "（无）"))
            fails += 1

    # ②b 结构校验（core/schema.verify）：把一条词形的语向改成未注册码 = 结构非法
    from core import schema as _schema
    db = _clone(os.path.join(base, "case_shape.db"))
    conn = sqlite3.connect(db)
    try:
        cid = _first_id(conn)
        conn.execute("UPDATE forms SET lang='zz' WHERE id=(SELECT id FROM "
                     "forms WHERE term_id=? LIMIT 1)", (cid,))
        conn.commit()
    finally:
        conn.close()
    v = _schema.verify(sqlite3.connect(db))
    hit = [e for e in v["errors"] if "E5 未注册语向" in e]
    print("  %-4s %-28s 注入=1 命中=%d"
          % ("OK" if hit else "FAIL", "E5 结构（未注册语向）", len(hit)))
    if not hit:
        print("         实际 error：%s"
              % ("；".join(e[:70] for e in v["errors"][:3]) or "（无）"))
        fails += 1

    print("契约健康：%d 个用例，FAIL %d" % (2 + len(CASES), fails))
    return 0 if not fails else 1


if __name__ == "__main__":
    raise SystemExit(main())
