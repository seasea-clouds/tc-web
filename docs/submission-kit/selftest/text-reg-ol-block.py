# -*- coding: utf-8 -*-
"""自检：R22 —— 法规正文禁用数字列表块"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate_zh_ol(work):
    # 官方序号写成 markdown 有序列表；并注入 sr 无空格日期「24.Децембар」
    # （P86/R22 实测盲区：点后无空格时旧 _OL_RE 漏放）
    p = H.lang_file(work, "zh", kind="regulation")
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + "\n\n1. 境外企业应当在出口前办理注册。\n"
                 + "2. 未办理注册的批次不予受理。\n"
                 + "\n24.Децембар 2025\n")


def mutate_pl_date(work):
    # REG121 实证：落款「17. sierpnia 2026」行首数字点被当成有序列表
    p = H.lang_file(work, "pl", kind="regulation")
    H.write_body(p, H.body_of(p).rstrip("\n") + "\n\n17. sierpnia 2026\n")


def mutate_ur_exotic(work):
    # REG236 阶段5回流：ur 乌尔都点 U+06D4 序号属 _OL_RE 盲区
    p = H.lang_file(work, "ur", kind="regulation")
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + "\n\n1۔ برآمد سے پہلے رجسٹریشن ضروری ہے۔\n")


if __name__ == "__main__":
    raise SystemExit(H.main([
        ("R22", mutate_zh_ol, "zh 出现 1./2. 数字列表"),
        ("R22", mutate_pl_date, "pl 落款日 17. sierpnia", "regulation"),
        ("R22", mutate_ur_exotic, "ur 乌尔都点 1۔ 异形序号", "regulation"),
    ]))
