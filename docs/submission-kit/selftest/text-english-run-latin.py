# -*- coding: utf-8 -*-
"""自检：P87 —— 拉丁语种整段英文残留"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def _official_literal_layer():
    """官方逐字英文串免报层：登记串放行、未登记整段英文仍报。

    台架 red 模式只能表达「注入报红 / 还原归零」，表达不了「该形状放行」；
    这里直接调插件 `_english_runs` 做对照断言。REG122 实测：es/de 的
    32 词附加声明与 11 词包装标识被 P87 误判为整段未翻译，故正向登记
    official-en-literal 后必须归零，同时不能把普通英文段落一起放行。
    """
    import importlib.util as _ilu
    spec = _ilu.spec_from_file_location(
        "enrun", Path(H.KIT) / "plugins" / "text-english-run-latin.py")
    mod = _ilu.module_from_spec(spec)
    spec.loader.exec_module(mod)
    decl = ("This consignment complies with the phytosanitary requirements "
            "provided in the Protocol of Phytosanitary Requirements for the "
            "Maize Exported from Pakistan to China and is free from the pests "
            "of concern to China")
    label = "This product will be exported to the People's Republic of China"
    ordinary = ("The import of biological materials shall be subject to the "
                "approval of the competent authority and the measures set out "
                "in this announcement.")
    return (not mod._english_runs(decl)
            and not mod._english_runs(label)
            and bool(mod._english_runs(ordinary)))


def mutate(work):
    p = H.lang_file(work, "fr", kind="regulation")
    body = H.body_of(p)
    english = ("The import of biological materials shall be subject to the "
               "approval of the competent authority and the measures set out "
               "in this announcement.")
    H.write_body(p, body.rstrip() + "\n\n" + english + "\n")


if __name__ == "__main__":
    rc = H.main([("P87", mutate, "fr 注入整段英文", "regulation")])
    ok = _official_literal_layer()
    print("  %-4s P87 官方逐字英文串免报层（登记串放行 / 未登记仍报）"
          % ("OK" if ok else "FAIL"))
    raise SystemExit(rc or (0 if ok else 1))
