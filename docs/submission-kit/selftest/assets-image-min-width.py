# -*- coding: utf-8 -*-
"""自检：I03 —— 正文图宽度不足"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    art = H.article_root(work, "blog")
    payload = bytearray(10)
    payload[4:7] = (799).to_bytes(3, "little")
    payload[7:10] = (599).to_bytes(3, "little")
    body = b"VP8X" + (10).to_bytes(4, "little") + bytes(payload)
    data = b"RIFF" + (len(body) + 4).to_bytes(4, "little") + b"WEBP" + body
    (art / "images" / art.name / "narrow-shot.webp").write_bytes(data)


if __name__ == "__main__":
    raise SystemExit(H.main([("I03", mutate, "塞一张 800×600 的合成 webp")]))
