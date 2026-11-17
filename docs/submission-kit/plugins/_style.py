# -*- coding: utf-8 -*-
"""plugins/_style.py — 文风判据工具（ST01–ST08：AI 腔、破折号、开场套话、句首填充）。

文件名以 `_` 开头：loader 不装载，A6 不计入插件名单。

ST03/ST04/ST08 的三张词表在 `lexicons` 的 `phrase-block`（用途 `ai-phrase-en`
/ `ai-phrase-zh` / `ai-phrase-locale`），增补套话不必改代码；匹配语义由
`_lexicon.hits` 统一（`word` / `substring` / `phrase` 三档各有理由：
英文按词边界、中文按子串、多词短语放宽空白）。
"""
# 治理声明：本文件属机制层，不承载策略数据；改动须走 README「治理」节的 L3 流程
#（先登记理由 → 行为级等价断言 → selftest --kit 全量），提交说明带 [arch]
#（commit-msg 钩子强制）。策略变更请改 plugins/ 判据或经 submit.py glossary 改库。
import re
import types

from core.textutil import _line_of

from core.consts import (
    _ST8_EDGE_RE,
    _ST8_FILLER_AFTER_RE,
    _ST8_QUOTE_PAIRS,
    ORIGINAL_MARKER,
)
from plugins._lexicon import hits as _hits
from plugins._lexicon import phrase_block


def phrase_tables(ctx):
    """一次取出 ST03/ST04/ST08 三张表 + ST05/ST06 两份句式清单。

    没有 ctx（`--body` 草稿模式只有 ctx 没有 PackageView）时返回空表——
    空表不是「判据放宽」，是「没有库可查」；`doctor` 会校验这两个用途非空，
    所以「库坏了」不会伪装成「这稿很干净」。
    """
    if ctx is None:
        return {"en": (), "zh": (), "locale": {}, "reversal": (),
                "para": ()}
    view = types.SimpleNamespace(ctx=ctx)
    return {"en": phrase_block(view, "ai-phrase-en").get("*", ()),
            "zh": phrase_block(view, "ai-phrase-zh").get("*", ()),
            "locale": phrase_block(view, "ai-phrase-locale"),
            "reversal": phrase_block(view, "reversal-hook").get("*", ()),
            "para": phrase_block(view, "para-opener").get("*", ())}


def check_style(tag, src, add, lang=None, ctx=None):
    """ST01–ST08：去 AI 味与格式纪律。方案 3.1（禁用词/破折号）与 3.1a（序号段落列表化）的可执行版。
    v1.17：ST08 各语言 AI 套话需 lang 上下文（--body 草稿模式 lang=None 时跳过）。
    v442：三张套话表移入 lexicons，ctx 为查表入口。"""
    lines = src.split("\n")
    # ST01 em dash 清零
    for i, ln in enumerate(lines, 1):
        if "—" in ln:
            add("ST01", "error", tag,
                "第 %d 行出现 em dash（——或—）：正文禁用，改冒号、拆句或括号" % i)
            break
    # ST02 en dash 只能夹在数字/编号之间（2–4、S0–S13、p01–p06）
    for i, ln in enumerate(lines, 1):
        if re.search(r"(?:^|\s)–|–(?:\s|$)", ln):
            add("ST02", "error", tag,
                "第 %d 行 en dash 未用于区间（只允许 数字/编号–数字/编号）" % i)
            break
    # ST03 / ST04 AI 高频词
    _tables = phrase_tables(ctx)
    for w, meta in _tables["en"]:
        found = _hits(w, meta["mode"], src)
        if found:
            add("ST03", "error", tag,
                "第 %d 行 AI 高频词（EN）: %r"
                % (_line_of(src, found[0][1]), found[0][0]))
    for w, meta in _tables["zh"]:
        found = _hits(w, meta["mode"], src)
        if found:
            add("ST04", "error", tag,
                "第 %d 行 AI 高频词（zh）: %r"
                % (_line_of(src, found[0][1]), w))
    # ST08 其余 46 语言 AI 套话（v1.17；warning；v1.34 改为大小写不敏感、逐处报告）
    # v1.58 两处射程修正（口径收窄，不是放宽——判据仍逐条命中，只是先问「这是套话
    # 形状吗」）：
    #   (a) 总结套话族的缺陷形状是**句首填充语**（"Kesimpulannya, …"／"Závěrem, …"）。
    #       同一串词落在句中是本语言的正常实义形：id/ms「apa kesimpulannya」＝
    #       「它的结论是什么」、cs「závěr za závěrem」＝「结论跟着结论」、
    #       ne「पाँच निष्कर्षमा」＝「归入五条结论」。五篇实测 12 处全是这类。
    #       按语言逐条登记（与 REDUPLICATION_OK/LATIN_ALLOWLIST 同一口径：不做整类豁免），
    #       只有登记过的词形才受句首限制，其余词条照旧全文命中。
    #   (b) 整个命中被一对引号包住＝文中在**讨论这个词本身**（F4 vi：进度表不要把
    #       "thường lệ" 写成 "chắc chắn"），不是套话使用。
    if lang:
        for w, meta in _tables["locale"].get(lang, ()):
            for text, pos in _hits(w, meta["mode"], src):
                end = pos + len(text)
                if _st8_quoted_mention(src, pos, end):
                    continue
                if meta.get("openers"):
                    if not _st8_at_sentence_start(src, pos):
                        continue
                    # v1.71：句首但后接实义词＝正常主/状语，不是填充语
                    if not _st8_opener_filler(src, end):
                        continue
                add("ST08", "warning", tag,
                    "第 %d 行 AI 套话（%s）: %r" % (_line_of(src, pos), lang, text))
    # ST05 反转钩子 / 设问自答
    for pat, meta in _tables["reversal"]:
        found = _hits(pat, meta["mode"], src)
        if found:
            add("ST05", "error", tag,
                "第 %d 行反转钩子句式: %r"
                % (_line_of(src, found[0][1]), found[0][0][:40]))
    # ST06 段首 AI 连接词（warning：单次可保留，堆叠即改写）
    for pat, meta in _tables["para"]:
        found = _hits(pat, meta["mode"], src)
        if found:
            add("ST06", "warning", tag,
                "第 %d 行%s: %r"
                % (_line_of(src, found[0][1]), meta.get("label", ""),
                   found[0][0].strip()))
    # ST07 段内序号连排 → 提示按方案 3.1a 评估拆为列表（warning）
    for p_i, para in enumerate(src.split("\n\n"), 1):
        if para.strip().startswith(("-", "*", "#")):
            continue
        hits = len(re.findall(r"[①②③④⑤⑥⑦⑧⑨⑩]", para))
        hits += len(re.findall(r"第[一二三四五六七八九十]+(?:[件步条项个])?[，,、]", para))
        hits += len(re.findall(r"(?i)\b(?:first|second|third|fourth|fifth),", para))
        if hits >= 3:
            add("ST07", "warning", tag,
                "第 %d 段内含 %d 个序号标记，按方案 3.1a 评估拆为列表" % (p_i, hits))
            break


def _st8_opener_filler(src, b):
    return bool(_ST8_FILLER_AFTER_RE.match(src[b:b + 4]))


def _st8_at_sentence_start(src, a):
    return bool(_ST8_EDGE_RE.search(src[:a]))


def _st8_quoted_mention(src, a, b):
    """整个命中被一对引号包住 ⇒ 文中在讨论这个词本身，不是在使用套话。"""
    prev = src[a - 1] if a > 0 else ""
    nxt = src[b] if b < len(src) else ""
    return any(prev == o and nxt == c for o, c in _ST8_QUOTE_PAIRS)


# ------------------------------------------------------------------ 收集器
#
# 八条 ST 判据同属一次「全文扫」，按插件各跑一遍等于同一段正文扫八次。
# 按 PackageView 记忆化一次，各插件只按自己的 RULE 过滤。
#
# 口径与 check_body 逐字一致：tag = "lang/slug"；法规的官方文本译本段
# （<!-- original --> 之后）不受风格纪律约束，先截断再判。


def style_findings(view):
    """返回 [(rule, severity, loc, detail)]；一次 check 内只算一遍。"""
    cache = getattr(view, "cache", None)
    if cache is not None and "style.findings" in cache:
        return cache["style.findings"]

    out = []

    def _add(rule, sev, loc, detail):
        out.append((rule, sev, loc, detail))

    for art in view.articles:
        is_reg = art.is_reg
        for lg in art.langs:
            body = art.body(lg) or ""
            style_body = body
            if is_reg and ORIGINAL_MARKER in body:
                style_body = body.split(ORIGINAL_MARKER, 1)[0]
            check_style("%s/%s" % (lg, art.slug), style_body, _add, lang=lg,
                        ctx=view.ctx)

    if cache is not None:
        cache["style.findings"] = out
    return out
