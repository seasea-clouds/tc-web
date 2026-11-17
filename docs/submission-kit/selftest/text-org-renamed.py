# -*- coding: utf-8 -*-
"""自检：R02 —— 已撤销机构不得当作现行机构"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def _append_zh(work, para):
    p = H.lang_file(work, "zh", kind="regulation")
    H.write_body(p, H.body_of(p).rstrip("\n") + "\n\n" + para + "\n")


def mutate(work):
    # 无沿革词的直陈句：MOA 被当作现行主管部门
    _append_zh(work, "上述出口注册事务由 MOA 受理并出证。")


if __name__ == "__main__":
    raise SystemExit(H.main([("R02", mutate, "zh 把 MOA 写成现行机构")]))
