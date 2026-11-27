# -*- coding: utf-8 -*-
"""自检：P36 —— 标识型数字逐块存活

两臂：
  1) blog：fr 把母版 1210 写成 1021（缺号 + 近形多出，error）；
  2) regulation：官方全文块母版无数字、fr 多插 244（v2.16 新增 warning 支）。
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402

ZH = "\n监管方式代码 1210 与 9610 分别对应保税电商与直购。\n"
FR = "\nLes codes 1021 et 9610 correspondent au commerce sous douane.\n"


def _append(work, lang, para):
    p = H.lang_file(work, lang)
    H.write_body(p, H.body_of(p).rstrip("\n") + "\n" + para)


def _append_reg(work, lang, para):
    p = H.lang_file(work, lang, kind="regulation")
    H.write_body(p, H.body_of(p).rstrip("\n") + "\n\n" + para)


def mutate(work):
    # fr 把母版的 1210 写成 1021：块结构不变，只有一个编码错位
    _append(work, "zh", ZH)
    _append(work, "fr", FR)


def mutate_official_extra(work):
    # 官方全文块（marker 之后）：zh 两块——块A 无数字、块B 带 244（使母版全篇
    # known 含 244）；fr 块A 多插 244（该块母版没有）→ v2.16 必报 warning。
    # 块B 两侧同有 244，走原逻辑不报，确保臂只验证新增支。
    _append_reg(work, "zh", "本条规定按照有关要求执行。\n\n本公告编号 244。")
    _append_reg(work, "fr",
                "Le présent article s'applique selon l'annonce 244.\n\n"
                "L'annonce porte le numéro 244.")


if __name__ == "__main__":
    raise SystemExit(H.main([
        ("P36", mutate, "fr 编码 1210 写成 1021"),
        ("P36", mutate_official_extra, "官方块多插 244（母版无数字）", "regulation"),
    ]))
