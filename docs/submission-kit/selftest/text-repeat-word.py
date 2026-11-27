# -*- coding: utf-8 -*-
"""自检：P10 —— 相邻重复单词"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def _check_whitelist_layer():
    """白名单过滤层机制自检：登记成对词形放行、未登记仍判重复。

    台架 red 模式只能表达「注入报红 / 还原归零」，表达不了「该形状放行」；
    这里直接调插件内 `_whitelisted` 做对照断言，失败即 FAIL。
    """
    import importlib.util as _ilu
    spec = _ilu.spec_from_file_location(
        "repw", Path(H.KIT) / "plugins" / "text-repeat-word.py")
    mod = _ilu.module_from_spec(spec)
    spec.loader.exec_module(mod)
    mod._PLUGIN_REPEAT_OK["sw"] = {"kutamkwa kwa"}
    ok = (mod._whitelisted("sw", "kutamkwa kwa")
          and not mod._whitelisted("sw", "mawe mawe")
          and not mod._whitelisted("en", "the the"))
    return ok


def mutate(work):
    # 「the the」：批量产稿的常见痕迹（复制粘贴半句）
    p = H.lang_file(work, "en")
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + "\n\nPlease check the the form before filing.\n")


def mutate_ur_real_defect(work):
    """负向控制：ur 词典化搭配 ساتھ ساتھ 已放行，但「逐一」重叠
    ایک ایک 是真缺陷，必须仍报红（防白名单扩表时误伤放水）。"""
    p = H.lang_file(work, "ur")
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + "\n\nپھل ایک ایک کر کے دھوئے جاتے ہیں۔\n")


def mutate_sw_demonstrative_redup(work):
    """负向控制（REG43 阶段 3 实证，2026-11-14）：sw 指示词强调重叠
    `kundi hilo hilo na shamba hilo hilo`（同一批次及同一农场）虽是合法
    语法形态，但站方口径「相邻重复词一律改写，即使语法成立」；本篇可用
    回指 `kundi hilo na shamba hilo` 承载「同一」而不丢义，故改稿、不扩
    REDUPLICATION_OK。此臂锁死「不得把 sw 指示词重叠族整类豁免」。"""
    p = H.lang_file(work, "sw")
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + "\n\nMawe kutoka kundi hilo hilo na shamba hilo hilo.\n")


def mutate_sw_plain_repeat(work):
    """负向控制：非指示词的普通同形重复仍报红（防白名单扩表放水）。"""
    p = H.lang_file(work, "sw")
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + "\n\nMawe mawe yalikusanywa leo.\n")


if __name__ == "__main__":
    if not _check_whitelist_layer():
        print("FAIL P10 白名单过滤层断言失败")
        raise SystemExit(1)
    raise SystemExit(H.main([
        ("P10", mutate, "en 出现 the the"),
        ("P10", mutate_ur_real_defect,
         "ur 逐一重叠 ایک ایک 仍报红", "blog"),
        ("P10", mutate_sw_demonstrative_redup,
         "sw 指示词重叠 hilo hilo 仍报红（REG43 改稿不扩白名单）", "blog"),
        ("P10", mutate_sw_plain_repeat,
         "sw 普通同形重复仍报红", "blog"),
    ]))
