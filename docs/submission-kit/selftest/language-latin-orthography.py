# -*- coding: utf-8 -*-
"""自检：P71 —— 整篇被写成无变音 ASCII 转写"""
import sys
import unicodedata
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def _strip_diacritics(text):
    d = unicodedata.normalize("NFD", text)
    return "".join(c for c in d if not unicodedata.combining(c))


def mutate(work):
    # cs 整篇剥掉变音符（říční → ricni）：词形/结构/长度全合规，正字法全错
    p = H.lang_file(work, "cs")
    raw = p.read_text(encoding="utf-8")
    p.write_text(_strip_diacritics(raw), encoding="utf-8", newline="\n")


def af_silent():
    """负向控制：af 正字法不要求变音符号，整篇剥离后必须**静默**。

    v345 裁决（2026-11-14）：`latin-required` 曾收 af（v2.25 REG36 回流时
    按「全库存量 100% 含变音」入表），但那条统计来自同源机翻的习惯性
    trema，不是南非荷兰语的正字法事实——af 只用 26 个拉丁字母，标准文本
    可以是纯 ASCII（仅 reëel/geëerd 一类分音符，不能作为整篇判据）。
    入表的直接后果是官方尺 `template/regulation` 的 af 样例被判红，
    `check template` 从 README 承诺的 PASS 掉到 FAIL 1e/2w。
    本臂钉住「移出后不得回潮」：官方尺 af 剥成纯 ASCII 也不许报。
    """
    dest, work = H._copy_fixture("regulation")
    try:
        p = H.lang_file(work, "af", kind="regulation")
        raw = p.read_text(encoding="utf-8")
        p.write_text(_strip_diacritics(raw), encoding="utf-8", newline="\n")
        hits = [f for f in H._findings(work) if f.rule == "P71"]
        assert not hits, (
            "af 已从 latin-required 移除，整篇无变音仍被 P71 判红：%s"
            % [(h.slug, h.detail[:60]) for h in hits])
    finally:
        H._archive(dest)
    print("  P71  af 无变音负向控制 OK（af 不在 latin-required）")


if __name__ == "__main__":
    af_silent()
    raise SystemExit(H.main([
        ("P71", mutate, "cs 整篇剥离变音符"),
    ]))
