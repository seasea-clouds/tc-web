# -*- coding: utf-8 -*-
"""P10：正文不得出现相邻重复单词（the the / и и / los los）

站方回执口径是「相邻重复词一律改写，即使语法成立」。部分语言的重叠副词
（tr ayrı ayrı、ur باری باری）是固定搭配，逐词组放行；德语逗号引出的关系
从句同形（…, das das …）只放行逗号紧跟的形状。

白名单分层：词形载荷进策略库 lexicons（L1，另一路维护）；本插件文件内
`_PLUGIN_REPEAT_OK` 是判据层临时放行层——只收「结构同形、语法必需」的成对
词形，条目须带实证；不进 core、不进 `_lexicon` 访问层（A9 守卫）。
"""
import re

from core.consts import REDUPLICATION_REWRITE_HINT, _MD_PH
from core.textutil import _line_of
from plugins._health import repeat_pair_hits
from plugins._shared import fmt_hits

RULE = "P10"
RULES = [RULE]
PHASE = 40
CATEGORY = "text"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["body"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['body']}

RATIONALE = {
    RULE: "v1.14 站方回执口径「相邻重复词一律改写」；v1.58 升 error 前先两头修平："
                    "一边消掉结合字母切词的假阳性（词内被 \\b 切开），一边补上元音符"
                    "结尾词的盲区（进不了 \\w{2,}），否则升档要么判红正确稿件、要么根本"
                    "抓不全。存量按新口径改了 F2 7 处、F3 24 处、F4 26 处，六包＋sample "
                    "归零后才升档。报错附本域实证改写词形（REDUPLICATION_REWRITE_HINT），"
                    "做到「报错即给改法」。"
                    "REG89 阶段 5-a 回流：审计曾报 sw「动词词尾 + 介词」类形状（kutamkwa "
                    "kwa njia ya …）被判重复词。全库探针 6868 份 mdx 实测：sw 语向 P10 命中"
                    "为 0（bn/si/tr/ur 的命中都是既有重叠副词族，已在 consts 白名单口径内），"
                    "该假阳性形状在当前成稿语料不可复现。为防同形回潮，插件内置白名单过滤层"
                    "（`_PLUGIN_REPEAT_OK`，lang→成对词形集合）：命中后先过 consts 既有"
                    "白名单，再过本层；机制落在判据插件内，不进 core/consts 与词表访问层。",
}

# 判据层临时放行：{语向: {成对词形（空格分隔）}}；入表条目必须附语料实证，
# 与 consts.REDUPLICATION_OK 同一口径——只收词典化/语法必需形状，不做整类豁免。
_PLUGIN_REPEAT_OK = {}


def _whitelisted(lang, shape):
    return shape.casefold() in _PLUGIN_REPEAT_OK.get(lang, ())


def run(view, emit):
    for art in view.articles:
        for lg in sorted(art.parsed):
            body = art.body(lg) or ""
            bare = re.sub(r"!\[[^\]]*\]\([^)]*\)", _MD_PH, body)
            bare = re.sub(r"\[[^\]]*\]\([^)]*\)", _MD_PH, bare)
            hits = []
            for a, b, shape in repeat_pair_hits(bare, lg):
                if _whitelisted(lg, shape):
                    continue
                hits.append((_line_of(bare, a), "%r" % shape))
            if not hits:
                continue
            msg = "出现重复单词: " + fmt_hits(hits)
            hint = REDUPLICATION_REWRITE_HINT.get(lg)
            if hint:
                msg += "（本域「逐一/分步」重叠习语实证改写: %s）" % hint
            emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug), msg)


def review(finding, view):
    return finding
