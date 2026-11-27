# -*- coding: utf-8 -*-
"""plugins/_writing.py — 写作契约判据工具（WR01–WR05，由术语库 writing 段驱动）。

文件名以 `_` 开头：loader 不装载，A6 不计入插件名单。
"""
# 治理声明：本文件属机制层，不承载策略数据；改动须走 README「治理」节的 L3 流程
#（先登记理由 → 行为级等价断言 → selftest --kit 全量），提交说明带 [arch]
#（commit-msg 钩子强制）。策略变更请改 plugins/ 判据或经 submit.py glossary 改库。
import re

from core.textutil import _line_of

from core.consts import (
    KNOWN_RULES,
    WR_MD_LINK_RE,
    ORIGINAL_MARKER,
)


def check_writing_rules(tag, lang, body, fm, slug, add, writing,
                        is_reg=False, view=None):
    """WR01–WR05：README「写作要求」段的通用机检层（2026-11-10 全量回流）。

    现状盘点：README 391 行里的金额、破折号、CTA、摘要/标题、交付周期承诺、
    绝对否定、制作来源话术，早已由 P32/P33/R03（报价，词表在库）/R04（交付周期，词表在库）/
    R05 的 negation 词族/ST01/ST02/B09/F07 等判据覆盖；但下列条款此前**只写在文档里**：
      * 不写范围声明小节（README 235–238 硬规则，10-30 曾定禁令、11-07
        只删「要求写」条款没留显式禁令，导致 C4/D2 照抄存量母版复发）；
      * 独立成文：无元话语、无系列导览、篇间零互链（232–234）；
      * 第一手口径不写「据说」、具体压倒形容词（225–227）；
      * 清单预告句与 Overview 一类抽象小节标题（214–215 / 231）；
      * frontmatter 3–4 条 references（260，旧判据只拦 >6）。
    这些都不是某一篇的语义绑定，故按 README「问题通用化」写进 writing 段，
    射程由契约的 langs / scope 声明，不绑任何篇目锚点。

    射程与误报控制（对存量 53 包 / 2411 份 mdx / 48 语实测）：
      * WR01 只扫 `##`/`###` 小节标题，不扫正文——正文里 "out of scope"、
        "not covered here" 是合法实义陈述，全文扫会误伤 A8/C1 等篇；
      * WR03 的 zh「据说」用 (?<!数) 排除「演示数据说明」的子串假阳
        （O1 实抓一处：数-据-说-明）；navigate 只收比喻义短语（ST03 同口径）；
      * WR02 的非 CTA 链接扫描排除 `![...](...)` 配图语法与 `/packages/` CTA，
        存量 48 语全部 0 命中；
      * 已交付存量按「不追溯」铁律由契约 legacy 名单降级 warning，
        一律 error。
    """
    if not writing or not isinstance(writing, list) or not lang:
        return
    heads = "\n".join(re.findall(r"(?m)^#{2,3}\s+(.+?)\s*$", body))
    meta = (str((fm or {}).get("title") or "") + "\n"
            + str((fm or {}).get("excerpt") or ""))
    links = [u for u in WR_MD_LINK_RE.findall(body) if "/packages/" not in u]
    for c in writing:
        if not isinstance(c, dict):
            continue
        rid = str(c.get("rule") or "")
        if rid not in KNOWN_RULES:
            continue
        langs = c.get("langs") or []
        if langs != "*" and lang not in langs:
            continue
        scope = str(c.get("scope") or "body")
        level = str(c.get("level") or "error")
        if level not in ("error", "warning"):
            level = "error"
        legacy = c.get("legacy") or []
        if isinstance(legacy, str):
            legacy = [legacy]
        if slug in legacy:
            level = "warning"
        cid = str(c.get("id") or rid)
        if scope == "refs":
            if is_reg:                 # 法规 frontmatter 是 10 字段，不适用文章线口径
                continue
            refs = (fm or {}).get("references")
            # 空 references（start 骨架按设计清空样例）与 S02 缺语 / I02 缺
            # cover 同属「起手待补项」：WR05 在此报 error 是刻意的提前提示，
            # README 117-119 的验收口径「除缺语/待补项外内容判据 0 error」
            # 已把它算在内。negative_test_v4_templates.py 的
            # START_EXPECTED_ERRORS = [I02, S02, WR05] 钉住这一口径。
            if refs is None:
                continue
            n = len(refs) if isinstance(refs, list) else 0
            lo, hi = int(c.get("min", 3)), int(c.get("max", 4))
            if not lo <= n <= hi:
                add(rid, level, tag,
                    "frontmatter references %d 条，应为 %d–%d 条（契约 %s）"
                    % (n, lo, hi, cid))
            continue
        if scope == "link":
            if links:
                add(rid, level, tag,
                    "正文出现非 CTA 链接 %d 处（独立成文：篇间零互链，全文唯一"
                    "链接是文末 CTA；契约 %s）: %r"
                    % (len(links), cid, links[0][:80]))
            continue
        target = {"heading": heads, "body": body, "meta": meta}.get(scope)
        if target is None:
            continue
        pats = (c.get("patterns") or {}).get(lang) \
            or (c.get("patterns") or {}).get("*") or []
        if isinstance(pats, str):
            pats = [pats]
        for pat in pats:
            m = re.search(str(pat), target)
            if not m:
                continue
            where = _line_of(target, m.start()) if scope == "body" else 0
            add(rid, level, tag,
                "%s命中禁用形态（契约 %s，README 写作要求）: %r%s"
                % ("小节标题" if scope == "heading" else
                   "元数据" if scope == "meta" else "正文",
                   cid, m.group(0)[:60],
                   " 第 %d 行" % where if where else ""))
            break                     # 同契约同语只报首处，避免刷屏


# ------------------------------------------------------------------ 收集器
#
# WR01–WR05 由术语库 writing 段契约驱动（rule/scope/patterns 都写在契约里），
# 一条函数发五条规则。五条插件共用一次扫，按 RULE 过滤。
#
# 口径与 check_body 逐字一致：tag = "lang/slug"；body 取法规 marker 之前的
# 「解读」段（官方译本不受写作风格约束）；fm 取该语向 frontmatter。
# 契约未加载 → 不产出。


def writing_findings(view):
    """返回 [(rule, severity, loc, detail)]；一次 check 内只算一遍。"""
    cache = getattr(view, "cache", None)
    if cache is not None and "writing.findings" in cache:
        return cache["writing.findings"]

    out = []
    ctx = getattr(view, "ctx", None)
    writing = (getattr(ctx, "glossary", None) or {}).get("writing") \
        if ctx is not None else None
    if writing:
        def _add(rule, sev, loc, detail):
            out.append((rule, sev, loc, detail))

        for art in view.articles:
            is_reg = art.is_reg
            for lg in art.langs:
                body = art.body(lg) or ""
                style_body = body
                if is_reg and ORIGINAL_MARKER in body:
                    style_body = body.split(ORIGINAL_MARKER, 1)[0]
                check_writing_rules("%s/%s" % (lg, art.slug), lg, style_body,
                                    art.fm(lg) or {}, art.slug, _add, writing,
                                    is_reg=is_reg, view=view)

    if cache is not None:
        cache["writing.findings"] = out
    return out
