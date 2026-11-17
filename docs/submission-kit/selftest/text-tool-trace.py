# -*- coding: utf-8 -*-
"""自检：R07 —— 正文不得暴露配图制作来源"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def _append_zh(work, para):
    p = H.lang_file(work, "zh", kind="regulation")
    H.write_body(p, H.body_of(p).rstrip("\n") + "\n\n" + para + "\n")


def mutate(work):
    # 页码引用（p15）：来源文档痕迹
    _append_zh(work, "申报要素清单见原培训材料（p15）。")


def mutate_meta(work):
    # 元数据面：imageRights 里点名「演示文稿」，对外字段不该暴露制作来源
    H.patch_json(work, "imageRights", "自行绘制，素材取自内部演示文稿",
                 kind="regulation")


if __name__ == "__main__":
    raise SystemExit(H.main([
        ("R07", mutate, "zh 残留页码引用 p15"),
        ("R07", mutate_meta, "submission.json 点名演示文稿"),
    ]))
