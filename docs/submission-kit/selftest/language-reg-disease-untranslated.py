# -*- coding: utf-8 -*-
"""自检：P94 —— 官方病名清单整串未本地化"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def _check_parenthetical_layer():
    """括注层机制自检：括号内的官方病名不计数，括号外的才计数。

    台架只能表达「注入报红 / 还原归零」，表达不了「合规写法放过」；
    这里直接调插件内的 _PAT 做对照断言，失败即 FAIL。
    """
    import importlib.util as _ilu
    spec = _ilu.spec_from_file_location(
        "regd94", Path(H.KIT) / "plugins" / "language-reg-disease-untranslated.py")
    mod = _ilu.module_from_spec(spec)
    spec.loader.exec_module(mod)
    ok_text = ("murtaja e gjedhit (Rinderpest), lipa (Sheep pox and Goat pox), "
               "skrapie (Scrapie), tuberkulozi bovin (Bovine Tuberculosis)")
    bad_text = ("Bovine Tuberculosis, Rinderpest, Sheep pox and Goat pox, "
                "Scrapie, Paratuberculosis")
    return (len(mod._PAT.findall(ok_text)) == 0
            and len(mod._PAT.findall(bad_text)) == 5)


def mutate(work):
    """注入 REG211 sq 的真实缺陷形状：整块把九个疫病名裸列成英文。"""
    p = H.lang_file(work, "sq", "regulation")
    body = H.body_of(p).rstrip("\n")
    H.write_body(p, body
                 + "\n\n(3) Në fermën e bagëtisë nuk janë konstatuar Bovine Tuberculosis,"
                   " Paratuberculosis, Rinderpest, Rift Valley fever,"
                   " Peste des petits ruminants, Sheep pox and Goat pox, Scrapie dhe"
                   " Contagious bovine pleuropneumonia.\n")


if __name__ == "__main__":
    if not _check_parenthetical_layer():
        print("FAIL P94 括注层断言失败")
        raise SystemExit(1)
    raise SystemExit(H.main([
        ("P94", mutate, "sq 九个疫病名裸列英文", "regulation"),
    ]))
