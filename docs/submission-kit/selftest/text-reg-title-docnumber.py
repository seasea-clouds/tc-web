# -*- coding: utf-8 -*-
"""自检：R15 —— 标题不得重复写文号"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    # 标题里把 doc_number 再写一遍：列表页文号列与标题列重复展示
    p = H.lang_file(work, "zh", kind="regulation")
    docn = H.fm_value(p, "doc_number")
    if not docn:
        raise RuntimeError("官方尺法规 frontmatter 没有 doc_number")
    H.patch_fm(p, "title", "%s 境外食品生产企业注册规定" % docn)


if __name__ == "__main__":
    raise SystemExit(H.main([("R15", mutate, "zh 标题重复写文号")]))
