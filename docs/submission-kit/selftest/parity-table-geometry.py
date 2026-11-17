# -*- coding: utf-8 -*-
"""自检：P24 —— 表格几何必须与母版逐表一致"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402

ZH_TABLE = "\n| 项目 | 要求 | 备注 |\n| --- | --- | --- |\n| 注册 | 必需 | 无 |\n"
FR_TABLE = "\n| 项目 | 要求 |\n| --- | --- |\n| 注册 | 必需 |\n"


def _append_table(work, lang, table):
    p = H.lang_file(work, lang)
    H.write_body(p, H.body_of(p).rstrip("\n") + "\n" + table)


def mutate(work):
    # 母版 3 列表格，本语同位置只写 2 列：列数与各行列数都应报红
    _append_table(work, "zh", ZH_TABLE)
    _append_table(work, "fr", FR_TABLE)


if __name__ == "__main__":
    raise SystemExit(H.main([("P24", mutate, "fr 表格比母版少一列")]))
