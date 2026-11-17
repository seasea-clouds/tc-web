# -*- coding: utf-8 -*-
"""自检：B03 —— `---` 在 mdx 里可能被当成 frontmatter 分隔符，且在站点样式下与章节标题重复。"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    p = H.lang_file(work, "fr")
    H.write_body(p, H.body_of(p) + "\n---\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("B03", mutate, "`---` 在 mdx 里可能被当成 frontmatter 分隔符，且在站点样式下与章节标题重复。")]))
