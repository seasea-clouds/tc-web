# -*- coding: utf-8 -*-
"""自检：WR05 —— frontmatter references 条数越界

夹具自带一条 refs 契约（3–4 条）。官方尺 fr 本有 3 条（合规），删掉一条即越界。
"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402

GL = {
    "version": "selftest",
    "writing": [{
        "id": "selftest-wr-refs",
        "rule": "WR05",
        "scope": "refs",
        "langs": "*",
        "level": "error",
        "min": 3,
        "max": 4,
    }],
}


def mutate(work):
    # 只剩 2 条题录：来源核对没做完，读者无法追溯
    p = H.lang_file(work, "fr")
    s = Path(p).read_text(encoding="utf-8")
    i = s.index("\nreferences:")
    j = s.index("\n---", i + 1)
    block = s[i:j]
    parts = re.split(r"(?m)^  - ", block)
    if len(parts) < 4:
        raise RuntimeError("注入点不存在：fr 题录不足 4 段")
    keep = parts[0].rstrip("\n") + "\n" + "".join(
        "  - " + x if not x.startswith("  - ") else x for x in parts[1:3])
    keep = keep.rstrip("\n")
    Path(p).write_text(s[:i] + keep + s[j:], encoding="utf-8", newline="\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("WR05", mutate, "fr 题录删到 2 条", "blog", "red", GL)]))
