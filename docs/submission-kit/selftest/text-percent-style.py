# -*- coding: utf-8 -*-
"""自检：P51 —— 百分号体例混用"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    # 同段里「20 %」（带空格）与「21.4%」（不带空格）并存
    p = H.lang_file(work, "fr")
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + "\n\nLe taux passe de 20 % à 21.4% au second trimestre.\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("P51", mutate, "fr 混写 20 % 与 21.4%")]))
