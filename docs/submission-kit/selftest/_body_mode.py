# -*- coding: utf-8 -*-
"""工具级自检：`check <file> --body` 的两种输入形态都必须干净。

`_` 前缀：验的是 CLI 的草稿速检入口（submit.py _body_mode），没有对应插件。

背景（2026-11-14 实测）：`--body` 不做 frontmatter 剥离，于是把一篇**正常
稿件**（任何 content/<lang>/<slug>.mdx）传进去时，frontmatter 收尾的 `---`
被 B03 判成「正文出现 --- 分隔线」，恒红 1 error。而「拿刚写完的 mdx 做
文风速检」正是这个子命令最自然的用法。

四臂：
  1. 带 frontmatter 的完整 mdx → 0 error（不得误报 B03）；
  2. 纯正文草稿 → 0 error（剥离逻辑不得吃掉正文）；
  3. frontmatter 被剥掉后正文照常判：注入真 `---` 分隔线仍报 B03；
  4. `--until` 与 frontmatter 剥离共存（截断后仍不误报）。
"""
import os
import sys
from types import SimpleNamespace

_HERE = os.path.dirname(os.path.abspath(__file__))
_KIT = os.path.dirname(_HERE)
if _KIT not in sys.path:
    sys.path.insert(0, _KIT)

import submit as S                                              # noqa: E402
import _harness as H                                            # noqa: E402

FM = """---
title: "探针"
slug: "probe"
---

## 小节

正文一段，没有缺陷。
"""

PLAIN = "## 小节\n\n正文一段，没有缺陷。\n"


def _run(text, until=None):
    import tempfile
    tmp = H.tmp_root()
    os.makedirs(tmp, exist_ok=True)
    fd, fp = tempfile.mkstemp(suffix=".md", dir=str(tmp))
    try:
        os.close(fd)
        with open(fp, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(text)
        args = SimpleNamespace(until=until)
        findings, err = S._body_mode(fp, args, None)
        return findings, err
    finally:
        try:
            os.unlink(fp)
        except OSError:
            pass


def main():
    cases = []

    fs, err = _run(FM)
    cases.append(("完整 mdx 不误报 B03",
                  err is None and not [f for f in fs if f.rule == "B03"]))
    cases.append(("完整 mdx 0 error", err is None and not fs))

    fs, err = _run(PLAIN)
    cases.append(("纯正文草稿 0 error", err is None and not fs))

    bad = FM + "\n---\n\n分隔线之后的正文。\n"
    fs, err = _run(bad)
    cases.append(("正文真分隔线仍报 B03",
                  err is None and any(f.rule == "B03" for f in fs)))

    fs, err = _run(FM, until="正文一段")
    cases.append(("--until 与剥离共存不误报",
                  err is None and not [f for f in fs if f.rule == "B03"]))

    fails = 0
    for name, ok in cases:
        print("  %-4s %s" % ("OK" if ok else "FAIL", name))
        fails += 0 if ok else 1
    print("草稿速检输入形态：%d 臂，FAIL %d" % (len(cases), fails))
    return 0 if fails == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
