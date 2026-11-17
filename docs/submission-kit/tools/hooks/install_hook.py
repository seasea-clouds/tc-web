# -*- coding: utf-8 -*-
"""安装 commit-msg 钩子（写 .git/hooks/commit-msg，Python 转发）。

钩子本体在 tools/hooks/commit_msg_scope.py（入库、可评审）；.git/hooks 下
只放一个薄转发器（不入库，git 不会跟踪 hooks 目录）。

唯一入口：`python submit.py hooks install`（v468 起不接受直接运行）。
"""
import io
import os
import stat
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = subprocess.run(["git", "rev-parse", "--show-toplevel"],
                      capture_output=True, text=True).stdout.strip()
TARGET = os.path.join(REPO, ".git", "hooks", "commit-msg")

FORWARDER = """#!/bin/sh
# 自动生成：tools/hooks/install_hook.py —— 转发到入库的钩子实现
'%s' '%s' "$1"
""" % (sys.executable.replace("\\", "/"),
       os.path.join(HERE, "commit_msg_scope.py").replace("\\", "/"))


def main():
    if not REPO:
        sys.stderr.write("不在 git 仓库内：找不到 .git/hooks\n")
        return 2
    with io.open(TARGET, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(FORWARDER)
    os.chmod(TARGET, os.stat(TARGET).st_mode | stat.S_IXUSR | stat.S_IXGRP)
    print("已安装 commit-msg 钩子：", TARGET)
    print("效果：机制层文件（core/、submit.py、tools/hooks/、submission_queue.py）"
          "的提交说明必须含 [arch]，否则拒绝。越过 = --no-verify（留痕）。")
    return 0


if __name__ == "__main__":
    import os as _os
    import sys as _sys
    _sys.path.insert(0, _os.path.dirname(_os.path.dirname(
        _os.path.dirname(_os.path.abspath(__file__)))))
    from tools import require_entry
    require_entry("hooks/install_hook", cmd="hooks install")
    sys.exit(main())
