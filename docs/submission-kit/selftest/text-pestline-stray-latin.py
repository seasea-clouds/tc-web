# -*- coding: utf-8 -*-
"""自检：P89 —— 名录行学名剥离后残留孤立拉丁词"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def _pestline_shape_layer():
    """行级形态边界直调断言（学名结构剥离/分类后缀/≥4 词专名串/官方声明串）。

    taxa=None 时 latin_residue 不剥学名结构——这里只测插件自身预剥层：
    T AXON_EXT（pv./race 后缀）、_RUN4（≥4 词病毒名）、官方声明串（结构豁免）
    与「无学名结构早退」；学名结构剥离由 mutate→red→revert→green 全链
    （真 check 带真词表）保证。
    """
    import importlib.util as _ilu
    spec = _ilu.spec_from_file_location(
        "pestline", Path(H.KIT) / "plugins" / "text-pestline-stray-latin.py")
    mod = _ilu.module_from_spec(spec)
    spec.loader.exec_module(mod)
    allow = frozenset({"ispm", "gap", "ipm", "gacc"})
    # 种加词校验在 taxa 之前——直调传构造集合（真词表由 mutate 全链覆盖）
    taxa = frozenset({"lepelleyi", "umbrosa", "stripe", "syringae",
                      "actinidiae", "barometz", "consignment"})
    ok_stray = mod._pestline_stray(
        "(2) เพลี้ยแป้งสีเทา Lepelley Dysmicoccus lepelleyi", allow, taxa)
    ok_clean_pv = not mod._pestline_stray(
        "(1) ควิ Pseudomonas syringae pv. actinidiae", allow, taxa)
    ok_clean_virus = not mod._pestline_stray(
        "(1) โรคใบด่างข้าวบาร์เลย์ Barley stripe mosaic virus", allow, taxa)
    ok_clean_decl = not mod._pestline_stray(
        "(1) ใบรับรอง This consignment complies with the requirements "
        "specified in the Protocol of Phytosanitary Requirements for Export "
        "of Fresh Jackfruits from Vietnam to China, and is free from "
        "quarantine pests of concern to China. Artocarpus heterophyllus",
        allow, taxa)
    ok_skip_plain = not mod._pestline_stray(
        "(1) ผู้ส่งออกต้องใช้ ISPM 15 สำหรับบรรจุภัณฑ์ไม้", allow, taxa)
    return (bool(ok_stray) and "lepelley" in [w.lower() for w in ok_stray]
            and ok_clean_pv and ok_clean_virus and ok_clean_decl
            and ok_skip_plain)


def mutate(work):
    p = H.lang_file(work, "th", kind="regulation")
    body = H.body_of(p)
    stray = "(2) เพลี้ยแป้งสีเทา Lepelley Dysmicoccus lepelleyi\n"
    H.write_body(p, body.rstrip() + "\n" + stray)


if __name__ == "__main__":
    rc = H.main([("P89", mutate, "th 注入名录行拉丁杂串 Lepelley", "regulation")])
    ok = _pestline_shape_layer()
    print("  %-4s P89 行级形态边界（pv./race 后缀、≥4 词病毒名、官方声明串、"
          "无学名早退、杂串命中）" % ("OK" if ok else "FAIL"))
    raise SystemExit(rc or (0 if ok else 1))
