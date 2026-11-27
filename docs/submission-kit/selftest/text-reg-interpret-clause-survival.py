# -*- coding: utf-8 -*-
"""自检：P92 —— 法规解读首块结论层整句丢失（REG221 回流）

注入点必须在 `<!-- original -->` 之前的解读段（同 P77 正名臂写法）。
每个臂都是「注入丢层 -> 必须报红」的正向形态；「保留结论层不误报」由真实
稿件与既有 100+ 篇法规 check 全绿侧证。
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402

MARK = "<!-- original -->"

ZH3 = ("能出口但要先报准。2026年6月30日起，第78号公告规范无人机出口申报。"
       "出口经营者须如实申报并承担责任。")


def _set_head(work, lang, head):
    """把某语 body 的解读段（MARK 之前）替换为 head。"""
    p = H.lang_file(work, lang, kind="regulation")
    body = H.body_of(p)
    _, tail = body.split(MARK, 1)
    H.write_body(p, head + "\n\n" + MARK + tail)


def mutate_en_drop(work):
    """REG221 实证：en 把「能出口但要先报准」整句压没，只剩 2 句。"""
    _set_head(work, "zh", ZH3)
    _set_head(work, "en",
              "From 30 June 2026, Announcement No. 78 regulates the export "
              "declaration of drones. Exporters must declare truthfully.")


def mutate_fr_drop(work):
    """fr 同类丢层（REG221 13 语之一）。"""
    _set_head(work, "zh", ZH3)
    _set_head(work, "fr",
              "Depuis le 30 juin 2026, l'avis n° 78 régit la déclaration "
              "d'exportation des drones. Les exportateurs déclarent et répondent.")


def mutate_ko_drop(work):
    """ko 同类丢层（REG221 13 语之一）。"""
    _set_head(work, "zh", ZH3)
    _set_head(work, "ko",
              "제78호 공고 2026년 6월 30일 시행. 수출업자는 사실대로 신고·책임진다.")


if __name__ == "__main__":
    raise SystemExit(H.main([
        ("P92", mutate_en_drop, "en 压没结论层（REG221 实证）", "regulation"),
        ("P92", mutate_fr_drop, "fr 压没结论层（REG221 13 语）", "regulation"),
        ("P92", mutate_ko_drop, "ko 压没结论层（REG221 13 语）", "regulation"),
    ]))
