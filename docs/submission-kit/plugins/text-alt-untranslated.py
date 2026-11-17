# -*- coding: utf-8 -*-
"""P11：图片 alt 文本跨语言完全相同＝未翻译

alt 是对外文案（读屏器与搜索引擎都读），48 语里同一串 alt 说明图片说明没译。
只比长度 >12 的 alt：短串（"cover"、"图 1"）本来就该一致。
"""
import re

RULE = "P11"
RULES = [RULE]
PHASE = 40
CATEGORY = "text"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed"]
SEVERITY = "warning"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['body']}

RATIONALE = {
    RULE: "v1.12 实测：C1 篇 48 语的图片 alt 全部沿用英文 \"checklist on desk\"，"
                    "读者用读屏器听到的是英文，搜索引擎也把同一串英文归到 48 个"
                    "语向页面。P23 的图片维度只比文件名与 alt 是否存在，不比 alt 内容，"
                    "所以这条必须单列。档位 warning：alt 是辅助信息，不阻断打包；"
                    "但 48 语同串是明确的未翻译信号，必须报出来。",
}


def run(view, emit):
    for art in view.articles:
        if not art.parity_on:
            continue
        alt_map = {}
        for lg in sorted(art.parsed):
            for a in re.findall(r"!\[([^\]]+)\]\(", art.body(lg) or ""):
                a = a.strip()
                if len(a) > 12:
                    alt_map.setdefault(a, []).append(lg)
        for a, lgs in sorted(alt_map.items()):
            if len(lgs) > 1:
                emit(RULE, SEVERITY, art.slug,
                     "alt 未翻译（%s 相同）: %s" % (",".join(lgs), a[:40]))


def review(finding, view):
    return finding
