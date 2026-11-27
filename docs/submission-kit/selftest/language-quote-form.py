# -*- coding: utf-8 -*-
"""自检：P81 —— 引号形制不合本语正字法"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def _check_negative_controls():
    """负向对照（台架 red 模式表达不了「该形状放行」）：直接调判据函数断言。"""
    import importlib.util as _ilu
    spec = _ilu.spec_from_file_location(
        "qform", Path(H.KIT) / "plugins" / "language-quote-form.py")
    mod = _ilu.module_from_spec(spec)
    spec.loader.exec_module(mod)
    cases = [
        # be 原生撇号放行；he 音译词内撇号报；es 带空格直引号放行；es 词内直引号报
        ("суб'екты і дакументы", "be", 0),
        ("מס' 486", "he", 1),
        ('el "pago por internet"', "es", 0),
        ('casa"coche', "es", 1),
        ("d'ús de la plataforma", "ca", 0),
    ]
    for text, lg, want in cases:
        got = len(mod._ascii_quote_hits(text, lg))
        if got != want:
            print("FAIL P81 负向对照 %s/%s：期望 %d 命中，实得 %d"
                  % (lg, text, want, got))
            return False
    return True


def mutate_he_ascii_apostrophe(work):
    # 希伯来语词内缩写：ASCII ' 应为 geresh ׳（U+05F3）
    p = H.lang_file(work, "he", kind="regulation")
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + "\n\nמס' 486 号公告应当予以公示。\n")


def mutate_he_ascii_double_quote(work):
    # scripted 语向正文出现 ASCII 双引号即红
    p = H.lang_file(work, "he", kind="regulation")
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + "\n\nטיינג\"ין הוא נמל מרכזי.\n")


def mutate_es_tight_double_quote(work):
    # 拉丁语向：词内紧贴形状（左右无空格）才报；带空格的直引号合法
    p = H.lang_file(work, "es", kind="regulation")
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + "\n\nLa solicitud casa\"coche debe presentarse en línea.\n")


if __name__ == "__main__":
    if not _check_negative_controls():
        raise SystemExit(1)
    raise SystemExit(H.main([
        ("P81", mutate_he_ascii_apostrophe,
         "he 词内 ASCII 单引号（应为 geresh ׳）", "regulation"),
        ("P81", mutate_he_ascii_double_quote,
         "he 词内 ASCII 双引号音译形", "regulation"),
        ("P81", mutate_es_tight_double_quote,
         "es 词内紧贴 ASCII 双引号", "regulation"),
    ]))
