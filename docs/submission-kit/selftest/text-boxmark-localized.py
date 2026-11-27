# -*- coding: utf-8 -*-
"""自检：P101 —— 非英语语向包装标识缺本语译形必须报红。"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H  # noqa: E402


def mutate(work):
    en = "Exported to the People’s Republic of China"
    line = "(2) Chaque colis doit porter la mention \u201c%s\u201d.\n" % en
    pfr = H.lang_file(work, "fr", kind="regulation")
    pfr.write_text(pfr.read_text(encoding="utf-8").rstrip() + "\n\n" + line,
                   encoding="utf-8", newline="\n")


if __name__ == "__main__":
    rc = H.main([("P101", mutate, "fr 包装标识只有英文串、缺本语译形", "regulation")])
    raise SystemExit(rc)
