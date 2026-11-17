# -*- coding: utf-8 -*-
"""自检：W02 —— 超长段落（超母版膨胀系数）"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402

LONG = ("Les documents doivent être présentés au bureau de douane compétent "
        "avant l'expédition, avec la liste des produits et l'attestation. ") * 6

ZH_LONG = ("跨境电子商务零售进口的商品监管要求涉及主体、商品与流向的三重核验，"
           "任何一项缺失都会在清单放行前被退回，企业需要提前把三份文件准备齐。") * 7

# v1.72 表块豁免正向控制：守恒单号/金额撑大的对账表（R5 实证 502 字符）
TBL_ROWS = [
    "| 对账单号 | 账期 | 交易笔数 | 应收（元） | 实收（元） | 差异（元） | 状态 | 操作 |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
    "| DZ202609-01 | 2026-09 | 3165 | 1426500.00 | 1426500.00 | 0.00 | 已对平 | 详情 日志 |",
    "| DZ202609-02 | 2026-09 | 1208 | 544320.00 | 544218.00 | 102.00 | 待核销 | 详情 日志 |",
    "| DZ202608-01 | 2026-08 | 4201 | 1923400.00 | 1923400.00 | 0.00 | 已对平 | 详情 日志 |",
    "| DZ202608-02 | 2026-08 | 962 | 431180.00 | 431180.00 | 0.00 | 已对平 | 详情 日志 |",
    "| DZ202607-01 | 2026-07 | 3846 | 1755900.00 | 1755868.00 | 32.00 | 已对平 | 详情 日志 |",
]


def mutate(work):
    # fr 首段写到 700+ 字符：母版段长 × 6.0 也放不下
    p = H.lang_file(work, "fr")
    blocks = H.body_of(p).split("\n\n")
    for i, b in enumerate(blocks):
        if b.strip() and not b.strip().startswith(("#", "-", "!")):
            blocks[i] = LONG.strip()
            break
    H.write_body(p, "\n\n".join(blocks))


def mutate_zh(work):
    # zh 母版散文块 400+ 字符：母版对齐恒为 False，按 CJK 绝对阈值 340 必报
    p = H.lang_file(work, "zh")
    blocks = H.body_of(p).split("\n\n")
    for i, b in enumerate(blocks):
        if b.strip() and not b.strip().startswith(("#", "-", "!", "|")):
            blocks[i] = ZH_LONG.strip()
            break
    H.write_body(p, "\n\n".join(blocks))


def table_exempt():
    """正向控制：zh 母版注入 7 行 md 表（>340 字符，单号金额守恒形态），
    W02 必须静默——表格不是散文，膨胀判据不适用（v1.72）。"""
    tbl = "\n".join(TBL_ROWS)
    assert len(tbl) > 340, len(tbl)
    dest, work = H._copy_fixture("blog")
    try:
        p = H.lang_file(work, "zh")
        H.write_body(p, H.body_of(p).rstrip("\n") + "\n\n" + tbl + "\n")
        hits = [f for f in H._findings(work) if f.rule == "W02"]
        assert not hits, "表块未豁免（v1.72 失效）：%s" % hits
    finally:
        H._archive(dest)
    print("  W02  表块豁免正向控制 OK（zh 母版 %d 字符 md 表静默）" % len(tbl))


if __name__ == "__main__":
    table_exempt()
    raise SystemExit(H.main([("W02", mutate, "fr 首段 700+ 字符"),
                             ("W02", mutate_zh, "zh 母版散文 400+ 字符绝对阈值")]))
