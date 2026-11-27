# -*- coding: utf-8 -*-
"""自检：P91 —— 港澳地名归属同篇一致性（REG218 回流）

v3 语义：仅当「≥3 段带中国归属且 ≤2 段裸写」（新体例已建立、个别漏写）才报；
全不带（存量体例）或带得少裸得多（存量稿偶含「中国」字样）均放行。
每个臂都是「注入该形状 -> 必须报红」的正向形态。
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402

ZH_HK = "为进一步规范供香港或澳门特别行政区蔬菜检验检疫管理，现公告如下。"


def _seed_zh(work):
    zh = H.lang_file(work, "zh", kind="regulation")
    H.write_body(zh, H.body_of(zh).rstrip("\n") + "\n\n" + ZH_HK + "\n")


def _append(work, lang, text):
    p = H.lang_file(work, lang, kind="regulation")
    H.write_body(p, H.body_of(p).rstrip("\n") + "\n\n" + text + "\n")


def mutate_id_mixed(work):
    """REG218 实证形状：多段带 Tiongkok、一处裸写。"""
    _seed_zh(work)
    for t in ["Sayuran untuk Hong Kong, Tiongkok dan Makau, Tiongkok wajib dicatat.",
              "Pengiriman ke Hong Kong, Tiongkok harus diperiksa.",
              "Makau, Tiongkok menerima sertifikat elektronik.",
              "Pengiriman ke Hong Kong dan Makau perlu dicatat."]:
        _append(work, "id", t)


def mutate_en_mixed(work):
    _seed_zh(work)
    for t in ["Vegetables to Hong Kong, China must be filed.",
              "Macao, China accepts electronic certificates.",
              "Produce to Hong Kong, China is inspected.",
              "Vegetables supplied to Hong Kong and Macao are covered."]:
        _append(work, "en", t)


def mutate_ja_mixed(work):
    _seed_zh(work)
    for t in ["中国香港向け野菜は届出が必要。",
              "中国澳門向け野菜は検査される。",
              "中国香港・中国澳門の証明書は電子化。",
              "香港・澳門向け野菜を規範する。"]:
        _append(work, "ja", t)


if __name__ == "__main__":
    raise SystemExit(H.main([
        ("P91", mutate_id_mixed, "id 归属不一致（REG218 实证形状）", "regulation"),
        ("P91", mutate_en_mixed, "en 归属不一致", "regulation"),
        ("P91", mutate_ja_mixed, "ja 归属不一致（新字体）", "regulation"),
    ]))
