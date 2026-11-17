# -*- coding: utf-8 -*-
"""自检：F09 —— heredoc 损坏签名 /n"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402

# 早期做法是把 core.frontmatter._pyyaml 全局置 None 来走兜底解析——但
# PyYAML 缺装时整条命令已在 core/deps 层退出（rc=2），兜底解析器已删除。
# 现在臂直接注入两类真实缺陷：/n 签名与裸 ': ' 未加引号。


def mutate_sig(work):
    H.add_fm_line(H.lang_file(work, "fr"), "bogus:/n value")


def mutate_colon(work):
    # 裸值里含 ': ' —— 最高频根因（枚举式摘要在 42 个语向一次击中过）。
    H.patch_fm_raw(H.lang_file(work, "fr"), "excerpt", "Vier lae: Mwangi")


if __name__ == "__main__":
    raise SystemExit(H.main([("F09", mutate_sig, "fr 插入 /n 损坏签名"),
                             ("F09", mutate_colon, "fr 摘要裸值含 ': '")]))
