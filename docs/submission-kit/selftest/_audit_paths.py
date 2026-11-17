# -*- coding: utf-8 -*-
"""自检：glossary audit 的投稿目录解析（工具级臂，`selftest --kit` 才跑）。

为什么必须有这条臂：术语准入预检原先把工作区根算成「工具包上两级」，
且 `--roots` 默认写死 `blogs,regulations`；扁平布局改成
`submission/{blogs,regulations}` 之后，README 给的默认用法会扫到 **0 篇**，
却仍能输出 `ACCEPT`（旧逻辑只在指定条款零展开时才 REJECT）。这类缺陷
不会让任何判据变红，只有把「能扫到稿件」本身做成断言才拦得住。

四个断言（全部在 --tmp 下造最小稿件树，不碰真实 submission/）：
  ① 工作区根解析 = 工具包目录上一级；
  ② 默认 roots 探测出扁平布局 submission/{blogs,regulations}；
  ③ find_articles 在该布局下发现博客 + 法规两篇、四个语面；
  ④ 负向：投稿目录不存在时明确 REJECT，不静默 ACCEPT。
"""
import contextlib
import io
import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
_KIT = os.path.dirname(_HERE)
sys.path.insert(0, _KIT)

from plugins import _glossary_audit as audit                        # noqa: E402

_MDX = """---
title: "测试标题"
excerpt: "测试摘要"
---

这是中文母版正文，用于验证准入预检能找到稿件。
"""


def _argv_tmp():
    for i, a in enumerate(sys.argv):
        if a == "--tmp" and i + 1 < len(sys.argv):
            return sys.argv[i + 1]
        if a.startswith("--tmp="):
            return a.split("=", 1)[1]
    return None


def _mdx(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(_MDX)


def _build(ws):
    b = os.path.join(ws, "submission", "blogs", "B1", "work", "blog",
                     "b1", "content")
    r = os.path.join(ws, "submission", "regulations", "R1", "work",
                     "regulation", "r1", "content")
    for base, stem in ((b, "b1"), (r, "r1")):
        _mdx(os.path.join(base, "zh", stem + ".mdx"))
        _mdx(os.path.join(base, "en", stem + ".mdx"))
    return [os.path.join(ws, "submission", x) for x in ("blogs", "regulations")]


def main():
    tmp = _argv_tmp()
    if not tmp:
        print("需要 --tmp <目录>：本臂要造临时投稿树，不允许落到工具包内")
        return 2
    base = os.path.join(os.path.abspath(tmp), "audit-paths")
    ws = os.path.join(base, "workspace")
    roots = _build(ws)
    empty = os.path.join(base, "empty-workspace")
    os.makedirs(empty, exist_ok=True)
    fails = 0

    ok1 = os.path.normcase(os.path.abspath(audit.POSTS)) == \
        os.path.normcase(os.path.abspath(os.path.dirname(_KIT)))
    print("  %-4s %-30s %s" % ("OK" if ok1 else "FAIL",
                               "① 工作区根 = 工具包上一级", audit.POSTS))
    fails += 0 if ok1 else 1

    dflt = audit._default_roots(ws)
    ok2 = dflt == ["submission/blogs", "submission/regulations"]
    print("  %-4s %-30s %s" % ("OK" if ok2 else "FAIL",
                               "② 默认 roots 探测扁平布局", ",".join(dflt)))
    fails += 0 if ok2 else 1

    arts = audit.find_articles(roots, "work")
    nface = sum(len(p) for _, p in arts)
    ok3 = len(arts) == 2 and nface == 4
    print("  %-4s %-30s 篇目 %d / 语面 %d"
          % ("OK" if ok3 else "FAIL", "③ 发现博客与法规稿件", len(arts), nface))
    fails += 0 if ok3 else 1

    # ④ 负向：无投稿目录时不得静默 ACCEPT
    argv = ["--roots=" + os.path.join(empty, "nowhere"),
            "--db=" + os.path.join(_KIT, "data", "glossary.db"),
            "--face=work", "--json"]
    so, se = io.StringIO(), io.StringIO()
    try:
        with contextlib.redirect_stdout(so), contextlib.redirect_stderr(se):
            rc = audit.main(argv, repo_root=empty)
    except Exception as exc:
        rc, se = -1, io.StringIO(str(exc))
    text = so.getvalue() + se.getvalue()
    rejects_no_articles = "未发现任何稿件" in text and "拒绝 ACCEPT" in text
    ok4 = rc == 1 and rejects_no_articles
    print("  %-4s %-30s rc=%d，明确拒绝=%s"
          % ("OK" if ok4 else "FAIL", "④ 零稿件时拒绝 ACCEPT",
             rc, rejects_no_articles))
    fails += 0 if ok4 else 1

    print("准入预检路径：4 个断言，FAIL %d" % fails)
    return 0 if not fails else 1


if __name__ == "__main__":
    raise SystemExit(main())
