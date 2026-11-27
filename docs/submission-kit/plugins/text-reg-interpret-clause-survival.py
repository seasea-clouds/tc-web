# -*- coding: utf-8 -*-
"""P92（草稿，待规则维护者 rules import）：法规解读首块「准入判断层」整层丢失

REG221（2026-11-19，GACC 公告 78 无人机出口申报）阶段 4 回流：zh 解读第 1 块是
「结论层（能出口但要先报准）+ 日期 + 责任」三层（按句切）。因 R21 上限 1000 字符
压缩时，13 语（en/es/fr/pt/cs/da/el/hr/hu/ja/ko/nl/ru/sk）把结论层整句压没，
b1 直接从「From 30 June 2026…」开始；机检全绿（P77 只看压缩比 80% 下沿与数字
锚，删一句修饰性短句仍在线上；R21 只管上限），靠逐语直读才发现。

判据形状（保守代理，不判语义）：母版解读第 1 块按句切（。！？；/ . ! ? ;）
得 N 句，译语同序块句数 M 若 ≤ N-2（整层丢失两整句以上）报 warning；
N≤2 不判（短块不适用）。只对法规解读第 1 块，正文与其余块不判。
warning 给人工回读清单，不代替逐语终审。
"""
import re

RULE = "P92"
RULES = [RULE]
PHASE = 40
CATEGORY = "text"
APPLIES_TO = ["regulation"]
NEEDS = ["parsed", "master"]
SEVERITY = "warning"
ENABLED = True

COVERAGE = {"langs": "all", "zones": ['body']}

_MARK = "<!-- original -->"
# 句末：全角句读 + ASCII !?; + ASCII 句点（仅后跟空白/行尾，排除 n.º / 1.5）
# + 亚美尼亚 ։(U+0589) + 乌尔都 ۔(U+06D4)
# v2（REG218 实测修正）：初版只收 。！？；!?; ，漏 ASCII 句点与 ։/۔，
# ar/el/nl/pt/ro/ru/sq/fa/ko 整段被算 1 句，在语义完整的 REG218 上误报 10 语。
_SENT_SPLIT = r"[。！？；!?;।։۔]+|\.(?=\s|$)"
# P40 明定泰语句末标点豁免（用空格分隔小句、无句点），按句切恒为 1 句，出射程
_NO_STOP_LANGS = {"th"}


def _clauses(s):
    return [x.strip() for x in re.split(_SENT_SPLIT, s) if len(x.strip()) >= 4]


def _head(text):
    return text.split(_MARK, 1)[0] if _MARK in text else text


def _blocks(text):
    return [b.strip() for b in re.split(r"\n\s*\n", text) if b.strip()]


RATIONALE = {
    RULE: "REG221（2026-11-19，GACC 公告 78）回流：zh 解读第 1 块「能出口但要先"
                    "报准。2026年6月30日起…出口经营者须如实申报并担责。」按句切 3 句，"
                    "13 语因 R21 压缩把结论层整句压没，b1 直接从日期开头，机检 0 error"
                    "（P77 压缩比仍在线上、数字锚都在，R21 只管上限）。本条用「首块句数"
                    "下沿」做保守代理：母版≥3 句、译语 ≤N-2 句才报 warning，只给人工"
                    "回读清单；语种断句习惯不同可能误报，故不设 error、只设 warning，"
                    "且不判正文块。REG218 同类问题（港澳归属裸写）另立 P91。"
                    "v2（同日实测修正）：初版切句只认 。！？；!?; ，漏 ASCII 句点与"
                    "亚美尼亚 ։、乌尔都 ۔，在语义完整的 REG218 上把 ar/el/nl/pt/ro/ru/"
                    "sq/fa/ko 等 10 语误报（这些语用 `.` 断句，整段被算 1 句）；"
                    "泰语按 P40 句末标点豁免，硬切恒为 1 句，加入 _NO_STOP_LANGS 出射程；"
                    "v5：补天城文 ।(U+0964)——bn/hi/ne 句末用它，漏收导致 12 篇存量稿误报 26 条。"
                    "修正后在 REG218（10 语全绿）与 REG221（13 语已修复）上零误报。",
}


def run(view, emit):
    for art in view.articles:
        if not art.is_reg:
            continue
        ctx = getattr(art.pkg, "ctx", None)
        ml = (getattr(ctx, "master_lang", None)
              or ("zh" if "zh" in art.parsed else "en" if "en" in art.parsed
                  else (sorted(art.parsed)[0] if art.parsed else "zh")))
        m_body = art.body(ml) or ""
        if not m_body:
            continue
        mb = _blocks(_head(m_body))
        if not mb:
            continue
        zc = _clauses(mb[0])
        if len(zc) < 3:
            continue
        for lg in sorted(art.parsed):
            if lg == ml or lg in _NO_STOP_LANGS:
                continue
            body = art.body(lg) or ""
            if not body:
                continue
            tb = _blocks(_head(body))
            if not tb:
                continue
            tc = _clauses(tb[0])
            if len(tc) <= len(zc) - 2:
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "解读第 1 块句数偏少：母版 %d 句、译文 %d 句（下沿 %d）；"
                     "R21 压缩可能把结论/例外整层压没，请回读中文母版同序块"
                     % (len(zc), len(tc), len(zc) - 1))


def review(finding, view):
    return finding
