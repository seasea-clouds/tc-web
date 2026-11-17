# -*- coding: utf-8 -*-
"""自检：P66 —— 中文「我国」被译成读者本国视角

两条臂：
  ① fr `notre pays`（v2.19 原始注入点）
  ② bg/fa/sr/ta 四语族的「我国」词形（REG88 阶段 4 实证漏判族）——
     bg `нашата държава`、fa `کشور ما`、sr `наше земље`、ta `எங்கள் நாட்டின்`
     在补表前机检 0 error 全绿，逐语直读才抓出；补表后必须报红。
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402

ZH_SELF = "我国对进口食品实施注册管理。"

# REG88 实证：四语族把「我国」写成读者本国视角
SELF_FORMS = {
    "bg": "Нашата държава прилага регистрация на вноса на фураж.",
    "fa": "کشور ما ثبت واردات خوراک را اعمال می‌کند.",
    "sr": "Наше земље примењује регистрацију увоза хране за животиње.",
    "ta": "எங்கள் நாட்டின் சட்டங்கள் இறக்குமதிப் பதிவை நடைமுறைப்படுத்துகின்றன.",
}


def mutate(work):
    # zh 母版含「我国」；fr 同位置译成 notre pays（读者本国视角）
    zh = H.lang_file(work, "zh")
    H.write_body(zh, H.body_of(zh).rstrip("\n")
                 + "\n\n" + ZH_SELF + "\n")
    fr = H.lang_file(work, "fr")
    H.write_body(fr, H.body_of(fr).rstrip("\n")
                 + "\n\nLa réglementation de notre pays s'applique aux "
                   "produits importés.\n")


def mutate_family(work):
    """REG88 缺陷族：bg/fa/sr/ta 各自把「我国」写成读者本国视角。"""
    zh = H.lang_file(work, "zh")
    H.write_body(zh, H.body_of(zh).rstrip("\n")
                 + "\n\n" + ZH_SELF + "\n")
    for lg, line in SELF_FORMS.items():
        f = H.lang_file(work, lg)
        H.write_body(f, H.body_of(f).rstrip("\n") + "\n\n" + line + "\n")


if __name__ == "__main__":
    raise SystemExit(H.main([
        ("P66", mutate, "fr 把「我国」译成 notre pays"),
        ("P66", mutate_family,
         "bg/fa/sr/ta 把「我国」译成读者本国视角（REG88 缺陷族）"),
    ]))
