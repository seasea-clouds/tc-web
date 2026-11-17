# -*- coding: utf-8 -*-
"""自检：B09 —— 结尾 10 行内必须有一个 `[<本语 Contact us>](/<lang>/packages/)`；法规线豁免。"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    p = H.lang_file(work, "fr")
    b = H.body_of(p)
    assert "](/fr/packages/)" in b, b[-300:]
    H.write_body(p, b.replace("](/fr/packages/)", "](/fr/packages-old/)"))


if __name__ == "__main__":
    raise SystemExit(H.main([("B09", mutate, "结尾 10 行内必须有一个 `[<本语 Contact us>](/<lang>/packages/)`；法规线豁免。")]))
