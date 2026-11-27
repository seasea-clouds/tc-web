# -*- coding: utf-8 -*-
"""自检：R25 —— 引号契约短语（加热温度/时长）限定词守卫"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402

ZH_ANCHOR = "\n\n须经“中心温度不低于70℃加热至少3.6秒”的有效加热处理。\n"


def _inject_zh_anchor(work):
    p = H.lang_file(work, "zh", kind="regulation")
    H.write_body(p, H.body_of(p).rstrip("\n") + ZH_ANCHOR)


def mutate_en_no_duration(work):
    # REG226 en 实证：温度侧齐全、时长侧掉「至少」（at least 70°C for 3.6 seconds）
    _inject_zh_anchor(work)
    q = H.lang_file(work, "en", kind="regulation")
    H.write_body(q, H.body_of(q).rstrip("\n")
                 + "\n\nHeat to a core temperature of at least 70°C for 3.6 seconds.\n")


def mutate_vi_missing_temp(work):
    # REG226 vi/th 实证：第二处引号掉温度侧限定词
    _inject_zh_anchor(work)
    q = H.lang_file(work, "vi", kind="regulation")
    H.write_body(q, H.body_of(q).rstrip("\n")
                 + "\n\nYêu cầu “nhiệt độ lõi 70 °C trong ít nhất 3,6 giây”.\n")


def mutate_zh_missing_duration(work):
    # 母版自身掉时长侧（zh 词表同样受校验）
    p = H.lang_file(work, "zh", kind="regulation")
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + "\n\n须经“中心温度不低于70℃加热3.6秒”的有效加热处理。\n")


if __name__ == "__main__":
    raise SystemExit(H.main([
        ("R25", mutate_en_no_duration, "en 掉时长侧限定词"),
        ("R25", mutate_vi_missing_temp, "vi 掉温度侧限定词"),
        ("R25", mutate_zh_missing_duration, "zh 母版掉时长侧"),
    ]))
