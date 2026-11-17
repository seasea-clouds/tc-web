# -*- coding: utf-8 -*-
"""工具级自检：条目根清场的射程（只搬内容残留，绝不动版本控制元数据）。

`_` 前缀：验的是 core.checker.purge_entry_extras，没有对应插件。

背景（2026-11-14 全库复审）：清场对 `os.listdir` 的每一项都判「不在白名单
就归档」，点开头的也不例外。条目根一旦有 `.git`（临时 `git init` 做对照、
或把条目单独托管），`check` 会把整个仓库元数据搬到 `tmp/待删除/`——工作
副本直接变成无版本目录。用户明确要求「维持自动清场，那就要求目录绝对
干净」，因此这里把射程钉死：**点开头的一律不碰**。

四臂（用桩函数记录调用，不实际移动文件）：
  1. 名单外普通文件 → 进归档清单；
  2. `.git` 目录 → 不碰；
  3. `work/` 与 `preview_zh.html` → 不碰（白名单）；
  4. 返回值只包含真正被搬走的项。
"""
import os
import shutil
import sys
from pathlib import Path

_HERE = os.path.dirname(os.path.abspath(__file__))
_KIT = os.path.dirname(_HERE)
if _KIT not in sys.path:
    sys.path.insert(0, _KIT)

import _harness as H                                            # noqa: E402
from core import checker as _checker                            # noqa: E402
from core import tmp_root as _tmp_root                          # noqa: E402


def main():
    tmp = Path(H.tmp_root())
    os.makedirs(tmp, exist_ok=True)
    root = tmp / ("purge-%d" % os.getpid())
    if root.exists():
        shutil.rmtree(root, ignore_errors=True)
    work = root / "work" / "blog" / "probe"
    work.mkdir(parents=True)
    (root / "sources.md").write_text("原始资料\n", encoding="utf-8")
    (root / "preview_zh.html").write_text("<html></html>", encoding="utf-8")
    (root / ".git").mkdir()
    (root / ".git" / "config").write_text("[core]\n", encoding="utf-8")
    (root / ".DS_Store").write_text("x", encoding="utf-8")

    moved = []
    orig = _tmp_root.archive_delete

    def _stub(p, label=""):
        moved.append(os.path.basename(p.rstrip("\\/")))

    _tmp_root.archive_delete = _stub
    try:
        out = _checker.purge_entry_extras(str(root))
    finally:
        _tmp_root.archive_delete = orig

    names = set(moved)
    returned = set(out.get(str(root.resolve()), []))

    cases = [
        ("名单外普通文件被归档", "sources.md" in names),
        (".git 目录不碰", ".git" not in names),
        (".DS_Store 不碰（点开头一律跳过）", ".DS_Store" not in names),
        ("work/ 不碰", "work" not in names),
        ("preview_zh.html 不碰", "preview_zh.html" not in names),
        ("返回值与实搬清单一致", returned == names),
    ]

    shutil.rmtree(root, ignore_errors=True)

    fails = 0
    for name, ok in cases:
        print("  %-4s %s" % ("OK" if ok else "FAIL", name))
        fails += 0 if ok else 1
    print("条目清场射程：%d 臂，FAIL %d" % (len(cases), fails))
    return 0 if fails == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
