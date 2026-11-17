# -*- coding: utf-8 -*-
"""commit-msg 钩子：受保护文件的改动必须在提交说明里声明 [arch]。

治理铁律（README「治理」节）：策略面 = plugins/ + glossary.db，日常只许改
这两处；`core/`、`submit.py`、钩子自身属于**机制层**，改动必须走 L3 流程
（README 登记 + 等价性门 + selftest 全量）并在提交说明带 `[arch]` 标记——
标记本身不改行为，但把「动了机制层」变成显式、可 grep 的历史事实。

安装（工具包根）：
    python submit.py hooks install
安装后每次 commit 自动生效；`git commit --no-verify` 可越过（需有意为之，
本身也是一条可审计的痕迹）。
"""
import io
import os
import subprocess
import sys

PROTECTED_PREFIXES = (
    "submission-kit/core/",
    "submission-kit/submit.py",
    "submission-kit/tools/hooks/",
    "reference/submission_queue.py",
)
ARCH_TAG = "[arch]"


def staged_protected():
    out = subprocess.run(
        ["git", "diff", "--cached", "--name-only", "--diff-filter=ACMR"],
        capture_output=True, text=True, encoding="utf-8", errors="replace")
    hits = []
    for line in (out.stdout or "").splitlines():
        p = line.strip().replace("\\", "/")
        if any(p.startswith(pre) or p == pre for pre in PROTECTED_PREFIXES):
            hits.append(p)
    return hits


def main(argv):
    msg_path = argv[1] if len(argv) > 1 else ""
    hits = staged_protected()
    if not hits:
        return 0
    msg = ""
    if msg_path and os.path.exists(msg_path):
        msg = io.open(msg_path, encoding="utf-8", errors="replace").read()
    if ARCH_TAG in msg:
        return 0
    sys.stderr.write(
        "commit-msg 拦截：本次提交改动了机制层文件：\n  "
        + "\n  ".join(hits)
        + "\n机制层改动必须走 L3 流程（README 登记 + 等价性门 + "
        "selftest --kit 全量），并在提交说明写明 [arch] 与理由。\n"
        "如确属策略变更，请改为只动 plugins/ 或经 submit.py glossary 改库。\n")
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
