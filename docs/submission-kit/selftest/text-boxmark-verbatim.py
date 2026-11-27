# -*- coding: utf-8 -*-
"""自检：P90 —— 盒标英文原样串与母版逐字节一致（撇号防线）"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def _apostrophe_shape_layer():
    """_apostrophe_diff 直调断言：母版基准、两派兼容、无串跳过。"""
    import importlib.util as _ilu
    spec = _ilu.spec_from_file_location(
        "boxmark", Path(H.KIT) / "plugins" / "text-boxmark-verbatim.py")
    mod = _ilu.module_from_spec(spec)
    spec.loader.exec_module(mod)
    curly = "\u00ab Exported to the People\u2019s Republic of China \u00bb"
    ascii_ = "\u00ab Exported to the People's Republic of China \u00bb"
    no_mark = "正文里没有盒标串的普通段落"
    same = not mod._apostrophe_diff(curly, curly)
    same_ascii = not mod._apostrophe_diff(ascii_, ascii_)
    diff = mod._apostrophe_diff(curly, ascii_)
    no_base = not mod._apostrophe_diff(no_mark, ascii_)
    return (same and same_ascii and no_base
            and diff == {"'"})


def mutate(work):
    # 台架样板（sample-import-food-producer-registration）无盒标段——zh/fr 双侧
    # 注入同形 ’ 串建立母版基准，再把 fr 改写成 '（与母版不一致）。
    curly = "Exported to the People\u2019s Republic of China"
    ascii_ = "Exported to the People's Republic of China"
    line = "（2）每个包装箱和托盘需用中文或英文标出 \u201c%s\u201d。\n" % curly
    pzh = H.lang_file(work, "zh", kind="regulation")
    bzh = H.body_of(pzh)
    H.write_body(pzh, bzh.rstrip() + "\n\n" + line)
    pfr = H.lang_file(work, "fr", kind="regulation")
    bfr = H.body_of(pfr)
    H.write_body(pfr, bfr.rstrip() + "\n\n" + line)
    H.write_body(pfr, H.body_of(pfr).replace(curly, ascii_))


if __name__ == "__main__":
    rc = H.main([("P90", mutate, "fr 盒标串撇号 ’→'（与母版不一致）", "regulation")])
    ok = _apostrophe_shape_layer()
    print("  %-4s P90 形态边界（同撇号绿 / 异撇号红 / 母版无串跳过）"
          % ("OK" if ok else "FAIL"))
    raise SystemExit(rc or (0 if ok else 1))
