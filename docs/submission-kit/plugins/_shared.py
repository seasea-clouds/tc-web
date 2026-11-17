# -*- coding: utf-8 -*-
"""plugins/_shared.py — 插件间共用的纯工具（不含任何判据）。

按「一规则一插件」的约定，插件之间不互相 import；只允许从这里取无判据
含义的展示/格式化工具。文件名以 `_` 开头，loader 不会把它当插件装载，
arch_health 的 A6（插件与自检 1:1）也不会把它算进名单。
"""
# 治理声明：本文件属机制层，不承载策略数据；改动须走 README「治理」节的 L3 流程
#（先登记理由 → 行为级等价断言 → selftest --kit 全量），提交说明带 [arch]
#（commit-msg 钩子强制）。策略变更请改 plugins/ 判据或经 submit.py glossary 改库。


def fmt_hits(items, limit=4):
    """把 [(行号, 显示文本), ...] 聚合成人读消息。

    例：第 5 行 'the the'；第 9 行 'и и'；等共 7 处。
    图片/链接占位符不含换行，所以 bare 与 body 的行号逐一对齐、行号精确。
    """
    parts = ["第 %d 行 %s" % (ln, it) for ln, it in items[:limit]]
    if len(items) > limit:
        parts.append("等共 %d 处" % len(items))
    return "；".join(parts)


def baseline_of(view, rule, slug):
    """→ frozenset(detail) / None。None = 该篇无欠账登记。

    空 frozenset = 整篇豁免（整篇性欠账，如「我国」误译、句号字符选错）；
    非空 = 只豁免列出的对象（如某几个配图名）。

    2026-11-15：此前是 core/consts 里的 SELF_COUNTRY_LEGACY 一类 slug 常量，
    判据源码里直接写着篇名。现在判据只由「语向 + 词类 + 结构」决定，欠账
    作为数据存在 baseline 表里：可见、可清、可审计，改判据不会漏改名单。
    """
    ctx = getattr(view, "ctx", None)
    if ctx is None:
        return None
    per_rule = (getattr(ctx, "baseline", None) or {}).get(rule)
    if not per_rule:
        return None
    return per_rule.get(slug)
