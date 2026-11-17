# -*- coding: utf-8 -*-
"""自检：P28 —— frontmatter 结构必须与母版一致"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def _drop_last_ref(path):
    """删掉 frontmatter 里 references 的最后一条（保留其余字节不变）。"""
    s = Path(path).read_text(encoding="utf-8")
    i = s.find("\n---", 3)
    if i < 0:
        raise RuntimeError("frontmatter 未闭合：%s" % path)
    parts = re.split(r"(?m)^  - title:", s[:i])
    if len(parts) < 2:
        raise RuntimeError("references 少于一条：%s" % path)
    fm = parts[0] + "".join("  - title:" + x for x in parts[1:-1])
    Path(path).write_text(fm + s[i:], encoding="utf-8", newline="\n")


def mutate(work):
    _drop_last_ref(H.lang_file(work, "fr"))


if __name__ == "__main__":
    raise SystemExit(H.main([("P28", mutate, "fr 少一条 references")]))
