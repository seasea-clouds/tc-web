# -*- coding: utf-8 -*-
"""plugins/_language.py — 语向级语言判据工具（我国主体、近缘语言污染、阿拉伯停顿、拉丁正字法）。

文件名以 `_` 开头：loader 不装载，A6 不计入插件名单。
"""
# 治理声明：本文件属机制层，不承载策略数据；改动须走 README「治理」节的 L3 流程
#（先登记理由 → 行为级等价断言 → selftest --kit 全量），提交说明带 [arch]
#（commit-msg 钩子强制）。策略变更请改 plugins/ 判据或经 submit.py glossary 改库。

from plugins import _lexicon
from plugins._shared import baseline_of
from core.textutil import (
    ascii_letter_count as _ascii_letter_count,
    blocks as _blocks,
    latin_diacritic_count as _latin_diacritic_count,
)

from core.consts import (
    ARABIC_STOP,
    ARABIC_STOP_OK,
    LATIN_ASCII_FORMS_MIN_DISTINCT,
    LATIN_DIACRITIC_MIN_LETTERS,
)


def check_self_country(view, m_body, parsed, slug, master_lang, add, legacy=None):
    """P66：中文「我国」= 中国（发布方），各语同序号块不得译成读者本国视角。

    条件完全由 zh 母版内容驱动（任一块含「我国」），跨篇通用、不绑篇目锚点；
    `add` 为 (rule, severity, slug, detail) 回调，便于负向电池用内存串直测。
    某篇是否已交付存量欠账查 baseline 表（`legacy` 可显式注入给自检臂）。
    """
    self_blocks = [bi for bi, blk in enumerate(_blocks(m_body))
                   if "我国" in blk]
    if not self_blocks:
        return
    is_reg = "<!-- original -->" in m_body
    if legacy is not None:
        is_legacy = slug in legacy
    else:
        is_legacy = baseline_of(view, "P66", slug) is not None
    table = _lexicon.shaped(view)["country"]
    flagged = []
    for lg in sorted(parsed):
        if lg == master_lang:
            continue
        lbs = _blocks(parsed[lg][1])
        for bi in self_blocks:
            cur = lbs[bi] if bi < len(lbs) else ""
            hits = _lexicon.country_hits_table(table, lg, cur)
            if not hits:
                continue
            if is_legacy:
                flagged.append(lg)
                continue
            add("P66", "error" if is_reg else "warning",
                "%s/%s" % (lg, slug),
                "第%d块把中文「我国」误译成目标语读者本国视角 %s；公告发布方"
                "为中国，应写该语的「中国」词形"
                % (bi + 1, "、".join(hits[:2])))
    if is_legacy and flagged:
        add("P66", "warning", "package/%s" % slug,
            "已交付成品存留 %d 个语向的「我国」本国视角历史写法（按不追溯铁律"
            "仅登记欠账，不改动成品）；新篇一律 error" % len(set(flagged)))


def check_neighbor_contamination(view, parsed, slug, add):
    """P68（v2.21）：近缘语言正字法污染，词表驱动、跨篇通用。

    与 P66 同型：条件完全由「语向 + 词形」决定，不绑任何篇目锚点，所有
    条目（文章线与法规线）、所有执行人共用；`add` 为 (rule, severity,
    slug, detail) 回调，便于负向电池用内存串直测，不落夹具。

    射程与 P43 一致：正文 + title + excerpt + references[].title。词表在
    策略库 lexicons 表（neighbor），入表门槛（源语向有命中 / 禁用语向存量 0 命中 /
    整词边界 / 同源共用词不收）与实测分母写在模块 docstring。

    D4 实证（2026-11-10，wb-blog-2）：no 稿 15 处 `beløb` 机检全绿，
    全库其余 49 份 no 稿 0 处；此前只能靠逐篇人工横向比对发现。落库时
    no/beløb 已由 `banned:no-danish-belob` 契约管，本判据不重复登记该形，
    改为一次性覆盖 da↔no / hr↔sr / id↔ms / cs↔sk 四对共 9 条词形。
    """
    table = _lexicon.shaped(view)["neighbor"]
    for lg, (fm, body) in parsed.items():
        if lg == "zh":
            continue
        fm = fm or {}
        if not isinstance(fm, dict):
            continue
        fields = [str(fm.get("title") or ""), str(fm.get("excerpt") or "")]
        refs = fm.get("references") or []
        if isinstance(refs, list):
            fields.extend(str(r.get("title") or "") for r in refs
                          if isinstance(r, dict))
        fields.append(str(body or ""))
        text = "\n".join(fields)
        for term, src, correct, n in _lexicon.neighbor_hits_table(table, lg, text):
            add("P68", "error", "%s/%s" % (lg, slug),
                "%s 语向出现 %s 语正字法 %r（%d 处）；本语应写 %r。"
                "近缘语言词形串味，词表见 策略库 lexicons 表（neighbor）"
                % (lg, src, term, n, correct))


def check_arabic_stop(view, parsed, slug, add):
    """P70：ur 以外任何语向出现 U+06D4 即 error（详见 ARABIC_STOP 注释）。

    射程＝title + excerpt + references[].title + 正文（含图注 alt）。
    按语向聚合报一处，红面给出字段与总处数；`parsed` 与 P68/P69 同构，
    `add` 为 (rule, severity, slug, detail) 回调，便于负向电池直测。
    已交付存量欠账查 baseline 表，降级为一条聚合 warning（判据不写 slug）。
    """
    is_legacy = baseline_of(view, "P70", slug) is not None
    flagged = []
    for lg in sorted(parsed):
        if lg in ARABIC_STOP_OK:
            continue
        fm, body = parsed[lg]
        fm = fm or {}
        if not isinstance(fm, dict):
            continue
        fields = [("标题", str(fm.get("title") or "")),
                  ("摘要", str(fm.get("excerpt") or ""))]
        refs = fm.get("references") or []
        if isinstance(refs, list):
            fields.append(("题录", "\n".join(
                str(r.get("title") or "") for r in refs if isinstance(r, dict))))
        fields.append(("正文", str(body or "")))
        hits = [(name, text.count(ARABIC_STOP)) for name, text in fields]
        hits = [(name, n) for name, n in hits if n]
        if not hits:
            continue
        if is_legacy:
            flagged.append(lg)
            continue
        add("P70", "error", "%s/%s" % (lg, slug),
            "%s 处出现阿拉伯句号 U+06D4（۔）；该字符只属乌尔都语正字法，"
            "%s 语句末应写「.」（共 %d 处）"
            % ("、".join(name for name, _ in hits), lg,
               sum(n for _, n in hits)))
    if is_legacy and flagged:
        add("P70", "warning", "package/%s" % slug,
            "已交付成品存留 %d 个语向的乌尔都语句号 U+06D4（۔）历史写法"
            "（按不追溯铁律仅登记欠账，不改动成品）；新篇一律 error"
            % len(flagged))


def check_latin_orthography(view, parsed, slug, add):
    """P71（v2.24）：拉丁变音正字法完整性，两臂、语向级、跨篇通用。

    REG24（GACC 146 号）阶段 3 实证：es/fr/it/pt 整篇被写成无变音 ASCII
    转写，词形/语法/结构/数字/长度/文字系统全合规，机检 0e/0w。此前
    L03 只判「用了本语文字系统没有」、P56 对 LATIN 一律放行、P30/P52
    只管非拉丁语向的拉丁残留——「该带重音的字母被剥成 ASCII」整片无判据。

    与 P66/P68/P69/P70 同型：条件只由「语向 + 文本形状」决定，不依赖
    ctx.glossary、不绑篇目锚点、无 legacy 名单（全库 2698 份 mdx 射程内
    零回归）。两臂互斥：词表臂命中即跳过整体臂，避免同一缺陷双报。

    臂 A 词表聚类（es/fr/it/pt）：命中 >=3 个不同零回归转写词形即 error；
    阈值 3 是消解「合法同形词」风险的工程口径（西语 publico/aun/ira
    本身合法），整篇转写会同时命中数十形，不会被阈值放过。
    臂 B 整体零变音（21 个拉丁语向；v345 移除 af — 南非荷兰语正字法
    不要求变音符号，标准文本可为纯 ASCII，v2.25 入表依据是同源机翻的
    trema 习惯，不是语言事实）：射程内 0 个非 ASCII 拉丁字母/
    组合符且 ASCII 字母 >=200 即 error；语向表与门槛来自全库探针，
    分母与入表硬门槛写在 策略库 lexicons 表（latin-ascii / latin-required） 的 docstring。

    `parsed` 与 P68/P70 同构（{lang: (fm, body)}），`add` 为
    (rule, severity, slug, detail) 回调，便于负向电池直测、不落夹具。
    """
    forms_tbl = _lexicon.shaped(view)["ascii"]
    required = _lexicon.latin_required(view)
    for lg in sorted(parsed):
        fm, body = parsed[lg]
        fm = fm or {}
        if not isinstance(fm, dict):
            continue
        fields = [str(fm.get("title") or ""), str(fm.get("excerpt") or "")]
        refs = fm.get("references") or []
        if isinstance(refs, list):
            fields.extend(str(r.get("title") or "") for r in refs
                          if isinstance(r, dict))
        fields.append(str(body or ""))
        text = "\n".join(fields)

        forms = _lexicon.ascii_hits_table(forms_tbl, lg, text)
        if len(forms) >= LATIN_ASCII_FORMS_MIN_DISTINCT:
            sample = "、".join("%r→%r" % (f, c) for f, c, _ in forms[:4])
            add("P71", "error", "%s/%s" % (lg, slug),
                "%s 语向命中 %d 个不同无变音 ASCII 转写词形（%s%s）；"
                "本语正字法要求带重音/变音字母，词表见 策略库 lexicons 表（latin-ascii / latin-required）"
                % (lg, len(forms), sample, " 等" if len(forms) > 4 else ""))
            continue

        if (lg in required
                and _ascii_letter_count(text) >= LATIN_DIACRITIC_MIN_LETTERS
                and _latin_diacritic_count(text) == 0):
            add("P71", "error", "%s/%s" % (lg, slug),
                "%s 语向标题/摘要/题录/正文合计 0 个非 ASCII 拉丁字母或组合变音符，"
                "疑似整篇无变音 ASCII 转写；该语向在本库存量射程内 100%% 含变音字符。"
                "两条修法：① 译稿被剥了变音符 → 恢复正字法；"
                "② 该语正字法本就允许纯 ASCII（如 af，v345 已移出）→ 用 "
                "submit.py glossary lexicon --id=latin-required --value=%s --remove "
                "改词表，不要为迁就判据改稿" % (lg, lg))
