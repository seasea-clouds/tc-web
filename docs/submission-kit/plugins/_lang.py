# -*- coding: utf-8 -*-
"""plugins/_lang.py — 语向级文本工具（术语本地化、拉丁残留、法规条号、亚美尼亚句点、韩语量词、引号跨族、富字段压缩）。

文件名以 `_` 开头：loader 不装载，A6 不计入插件名单。
"""
# 治理声明：本文件属机制层，不承载策略数据；改动须走 README「治理」节的 L3 流程
#（先登记理由 → 行为级等价断言 → selftest --kit 全量），提交说明带 [arch]
#（commit-msg 钩子强制）。策略变更请改 plugins/ 判据或经 submit.py glossary 改库。
import re

from core.textutil import _block_kind
from plugins._lexicon import latin_allow

from core.consts import (
    P41_LABEL_SEP_RE,
    P41_LIST_RE,
    P42_CODE_RE,
    P42_DECIMAL_RE,
    P42_LATIN_QUOTE_RE,
    P42_MDLINK_DEST_RE,
    P42_ROMAN_HEAD_RE,
    P42_TAXON_ABBR_RE,
    P42_TAXON_JOIN_RE,
    P42_TH_RE,
    P42_URL_RE,
    P44_KO_COUNTER_RE,
    SPACE_PUNCT_RE,
    P67_ABS_RATIO,
    P67_FIELD_SEPS,
    P67_MIN_ALIGNED,
    P67_MIN_FIELD_DENSITY,
    P67_MIN_ROWS,
    P67_REL_RATIO,
    _DIGIT_NEAR_RE,
    _LATIN_WORD_RE,
    _OFFICIAL_EN_RE,
    _P63_NATIVE_U201D,
    _P63_OPEN,
    _P63_STR_OPEN,
    re,
)


_TERM_RE_CACHE = {}

# 2026-11-14：P30 的引文剥离（详见 latin_residue 内注释）。
# ① 连续 ≥4 个拉丁词＝页名/章名整句引用；② 全大写版面串＝页眉引文。
# `from` 是官方议定书名（Protocol of … from Kyrgyz Republic to China）里的
# 高频连接词，缺它会把 `from Kyrgyz Republic to China` 断成碎片，碎片里的
# 国名（Kyrgyz/Peru/Myanmar/Cambodia）就被当成英文残留报出来。
_CITE_SMALL = (r"(?:to|and|of|the|for|in|on|with|by|from|an|a|at|as|or)"
               r"(?![A-Za-z])")
_CITE_RUN_RE = re.compile(
    r"[A-Z][A-Za-z'’\-]*(?:[\s:,]+(?:%s|[A-Z][A-Za-z'’\-]*))+" % _CITE_SMALL)
_CAPS_RUN_RE = re.compile(
    r"(?<![A-Za-z])[A-Z]{2,}(?:[ \t|&]+[A-Z0-9]+){1,}(?![A-Za-z])")

# 连续 ≥6 个拉丁词的整句：官方声明/引文（`Chia seed to be exported to China
# shall be packed using clean and unused materials…`）。判定用**结构**而非
# 逐条登记字面量——`OFFICIAL_EN_LITERALS` 每来一篇新公告就要加一条，且
# 「This consignment」与「The consignment」差一个词就整串失配。
# 6 词是下限：正常译文不会连写 6 个英文词；而未本地化的短片段（G2 的
# `paid media acquisitio module seeding` 5 词）仍会被报出来。
_RUN_EN_RE = re.compile(
    r"(?<![A-Za-z])[A-Za-z][A-Za-z'’\-]*"
    r"(?:[ \t,;:]+[A-Za-z][A-Za-z'’\-]*){5,}(?![A-Za-z])")


def long_latin_runs(body, min_words=6):
    """返回正文里连续 ≥min_words 个拉丁词的整句片段（原文形态）。

    P30 用它区分「法定英文声明」与「整段未翻译」：前者在 zh 母版里逐字存在，
    后者不该静默放行。
    """
    out = []
    for m in _RUN_EN_RE.finditer(body or ""):
        seg = m.group(0)
        if len(seg.split()) >= min_words:
            out.append(seg)
    return out

# 2026-11-15：拉丁学名结构剥离（取代 480 条按篇逐词放行）。
# 学名是官方检疫/法规文本的法定标识，48 语一律逐字保留；它不是「未本地化
# 残留」，但也不能靠「这一篇放行这 400 个词」来表达——同属名在下一批公告里
# 照样出现。这里按**结构**识别：属名（必须在 latin-taxon 词表）后接种加词、
# 命名人、命名人缩写、var./subsp./f./pv./spp./pathovar/race 与括号异名。
_TAXON_TOKEN_RE = re.compile(
    r"\s*(?:"
    r"\([A-Z][A-Za-z.\- ]{0,14}\)"                       # (L.) (Bunge)
    r"|[A-Z]\.[A-Z]?\.?"                                 # H. F.
    r"|(?:var|subsp|f|pv|spp|sp|pathovar|race|ex|et)\b\.?"   # 分类学标记
    r"|[A-Z][a-z]+(?:[.\-]+[A-Za-z]+)*\.?"                 # Mill. Bunge Hand.-Mazz.
    r"|[a-z][a-z\-']{2,}"                                # 种加词 epithet
    r"|\d{1,2}"                                          # race 2
    r")")
_TAXON_GENUS_RE = re.compile(r"\b[A-Z][A-Za-z\-]{2,}\b")
# 分类学阶元名：国际命名法规的硬性后缀——植物科 -aceae、动物科 -idae、
# 亚科 -oideae/-ineae/-inae。这不是「某篇出现过的词」，而是形态可判的
# 词类，任何一篇出现 `Fabaceae` / `Zingiberaceae` 都是学名而非残留。
# 不收 -ales（目）：`Sales` / `Tales` 一类普通英文词会被误剥。
_TAXON_RANK_RE = re.compile(
    r"\b[A-Z][a-z]+(?:aceae|oideae|ineae|idae|inae)\b")
# 附件名：`…检验要求.docx` / `report.pdf`——文件名不是正文用词。
_ATTACH_RE = re.compile(
    r"[^\s（）()\[\]、，,。；;]{1,80}\.(?:docx|doc|xlsx|xls|pptx|ppt|pdf|zip|rar|7z)\b",
    re.I)
# 半角/全角括号：法定双语名标注「（学名 X，英文名 Y）」整段是官方格式。
_PAREN_RE = re.compile(r"[（(]([^（）()]{1,200})[）)]")

# 双语名的语种标签：不同语向的「学名 / 英文名」字样差异太大，不靠标签词，
# 改判「括号内出现学名段」——官方标注必然把学名和英文俗名放在同一括号里。


def _strip_taxon(text, taxa):
    """剥离文本里的拉丁学名段（属名必须在 taxa 词表内）。"""
    if not taxa or not text:
        return text
    out = []
    pos = 0
    for m in _TAXON_GENUS_RE.finditer(text):
        if m.start() < pos:
            continue
        if m.group(0).lower() not in taxa:
            continue
        end = m.end()
        for _ in range(40):                 # 学名段长度上限，防跑飞
            t = _TAXON_TOKEN_RE.match(text, end)
            if not t or t.end() == end:
                break
            end = t.end()
        out.append(text[pos:m.start()])
        out.append(" ")
        pos = end
    if not out:
        return text
    out.append(text[pos:])
    return "".join(out)


def _strip_taxon_parens(text, taxa):
    """括号内出现学名 → 整括号剥离（法定「学名 + 英文俗名」标注）。

    `(الاسم العلمي Prunus armeniaca، الاسم الإنجليزي Apricot)` 里 Apricot 不是
    残留；`（详见 Annex 3）` 这类不含学名的括号原样保留，里面的英文照旧受检。
    """
    if not taxa or not text:
        return text

    def repl(m):
        for g in _TAXON_GENUS_RE.finditer(m.group(1)):
            if g.group(0).lower() in taxa:
                return " "
        return m.group(0)

    return _PAREN_RE.sub(repl, text)


def term_localization_hits(table, lang, body):
    """English terms still used where this language has its own word.

    `table` = {英文术语: {语向: 本语词形}}，来自策略库 lexicons 表。
    Image references are stripped first: a slug like
    bonded-ecommerce-export-china-guide must not be flagged.
    Returns [(english_term, local_form), ...].
    """
    t = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", body)
    out = []
    for eng, per_lang in table.items():
        local = per_lang.get(lang)
        if not local:
            continue
        pat = _TERM_RE_CACHE.get(eng)
        if pat is None:
            pat = _TERM_RE_CACHE[eng] = re.compile(
                r"(?<![A-Za-z])%s(?![A-Za-z])" % re.escape(eng), re.I)
        if pat.search(t):
            out.append((eng, local))
    return out


def latin_residue(body, min_count=2, allow=None, taxa=None):
    """Latin-alphabet words left in a non-Latin-script body.

    Image references, URLs, inline code, official protocol titles, statutory
    bilingual names and Latin binomials are stripped first: those are verbatim
    official strings, not untranslated prose.

    `taxa` = 属名/种加词词表（latin-taxon）；为空时学名结构不剥离，
    只做其余结构剥离（自检臂可显式传入以测结构边界）。
    Returns a {word: count} dict for words seen at least min_count times.
    """
    t = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", body)
    # 2026-11-14：普通链接与裸站内路径同样整段剥离。旧版只剥 `![alt](path)`，
    # `[文字](/blog/…)` 和裸 `/blog/…` 会漏进词频——sr 语向实测 `tri`×10 全部
    # 来自 /blog/restructuring-… 路径切片，被当成「正文夹用英文原词」报了
    # 21 条 warning；同一批还有 well/protected/clear/accounts 等页名碎片。
    t = re.sub(r"\[[^\]]*\]\([^)]*\)", "", t)
    # 裸站内路径：含 /images/blog/<slug>/ 前缀形态（缩略图/封面引用）
    t = re.sub(r"(?<![\w])/[\w./\-]*blog/[\w./\-]+", " ", t)
    t = re.sub(r"https?://\S+", "", t)
    t = re.sub(r"`[^`]*`", "", t)
    # 2026-11-15：附件名（`…适载检验要求.docx`）整段剥离。旧版把后缀当普通
    # 拉丁词，`docx` 在 zh 母版被计一次残留；文件名不是正文用词，判据不该管。
    t = _ATTACH_RE.sub(" ", t)
    # v2.00：法规线站方要求逐字保留的英文串（植物检疫证书附加声明整句 +
    # 包装标签串 Exported to the People's Republic of China）先剥离，
    # 免得声明里的 the/china/requirements/pests 等被当「未本地化残留」
    # 报 P30 假阳（REG10 实测 21 条 warning 基线，REG8/9 同型）。掩码
    # 失败安全：找不到目标串就原样保留，不吞正文。
    # v2.13/I16：旧掩码 `This consignment[\s\S]{0,400}?China.` 在声明以
    # 逗号接续时会吞掉后续 ≤400 字符正文，P30 对那段英文残留完全失明。
    # 改为整串剥离：每条字面量都是完整句，空白可跨行，但绝不跨句通配。
    t = _OFFICIAL_EN_RE.sub(" ", t)
    # 2026-11-15：法定双语名标注与拉丁学名（详见文件头 2026-11-15 注释）。
    # 顺序有意义：先剥「含学名的整个括号」，剩下的裸学名段再由结构规则剥；
    # 反过来会把括号里的英文俗名（Apricot/Jackfruit）留给词频。
    t = _strip_taxon_parens(t, taxa)
    t = _strip_taxon(t, taxa)
    t = _TAXON_RANK_RE.sub(" ", t)
    # 2026-11-14：引用串剥离（两类，都是「照抄站方英文」而非「未本地化」）：
    #   ① ≥4 个连续拉丁词 = 页名/章名/图内标题的整句引用。正常译文不会连写
    #      4 个英文词；G2 实测 `Acquisition and Growth: Architecture for
    #      Converting Demand` 在 21 个非拉丁语向照抄，`and`×62 就是这么来的。
    #   ② 全大写版面串 = `CHAPTER 8 | WELL PROTECTED` 一类页眉引文（R2 实测
    #      21 语向一致），只剥全大写形态，普通大小写混排的正文词不受影响。
    t = _CITE_RUN_RE.sub(" ", t)
    t = _CAPS_RUN_RE.sub(" ", t)
    t = _RUN_EN_RE.sub(" ", t)
    # v2.12：法规线**第三个**官方逐字保留英文串——证书「途中冷处理」标注
    # `Cold treatment in transit`（REG12/13/15 共 3 篇 × 47 语逐字保留）。
    # 按完整串剥离而非放行 cold/treatment/transit 三个单词：孤立出现的普通
    # 英文词仍受 P30 约束，只有组成官方标注串时才豁免（REG15 实测 21 条
    # warning 里的 cold/treatment/transit 由此归零，旧篇同串噪声一并消除）。
    freq = {}
    allow = allow or frozenset()
    for w in _LATIN_WORD_RE.findall(t):
        # v1.71：本地格后缀会把连字符留在拉丁侧（Georgian/Armenian 的
        # "Hat-ის"/"Hat-ի" 被切成 "Hat-"），先去掉尾部连字符再查白名单；
        # bonded- 的尾部连字符同样去掉，仍按 bonded 计——不会放过词根。
        w = w.lower().rstrip("-")
        if w in allow:
            continue
        freq[w] = freq.get(w, 0) + 1
    return dict((w, n) for w, n in freq.items() if n >= min_count)


def _digit_adjacent(body, start, end, span=3):
    """True when a digit sits right next to the [start:end) slice.

    A wide window is what produced false positives: Korean
    "\uad6d\ubb34\uc6d0\ub839 443\ud638" (State Council decree No. 443) puts a number
    near the won-shaped \uc6d0 that is really "won/\uc6d0" as in "source/council".
    Requiring the digit to touch the word keeps those out while still catching
    5000\u5186, 360 yuan and 5000 \uc6d0.
    """
    return bool(_DIGIT_NEAR_RE.search(body[max(0, start - span):start]) or
                _DIGIT_NEAR_RE.search(body[end:end + span]))


def _p41_table_bullet_errors(body):
    """P41：返回错误串列表；没有 S0–S13 表时返回 []（该文章不适用）。

    口径：表必须是连续、顺序完整的 S0–S13 十四行；表前最近 13 条「带标签
    列表项」必须与 S1–S13 的表格名逐字相同。标签 = 列表项正文到第一个
    `:` / `：` / 亚美尼亚 `՝` 之前的部分（英/日/亚美尼亚三种现有分隔形状）。
    """
    lines = body.split("\n")
    start = next((i for i, l in enumerate(lines)
                  if re.match(r"^\|\s*S0\s*\|", l)), None)
    if start is None:
        return []
    rows = []
    i = start
    while i < len(lines) and lines[i].lstrip().startswith("|"):
        cells = [c.strip() for c in lines[i].strip().strip("|").split("|")]
        if cells and re.fullmatch(r"S\d{1,2}", cells[0]):
            rows.append(cells)
        i += 1
    codes = [r[0] for r in rows]
    want = ["S%d" % n for n in range(14)]
    if codes != want:
        return ["工作包表格行不完整或乱序（应有 S0–S13，实得 %s）"
                % (", ".join(codes) or "无")]
    names = []
    for r in rows[1:]:
        if len(r) < 2 or not _p41_norm(r[1]):
            return ["工作包表格 %s 行缺少包名列" % r[0]]
        names.append(_p41_norm(r[1]))
    labels = []
    for l in lines[:start]:
        m = P41_LIST_RE.match(l)
        if not m:
            continue
        sep = P41_LABEL_SEP_RE.search(m.group(1))
        if not sep:
            continue
        label = m.group(1)[:sep.start()].strip().strip("*_ ").strip()
        if label:
            labels.append(_p41_norm(label))
    if len(labels) < 13:
        return ["表前带标签的列表项只有 %d 条，无法对应 S1–S13（应为 13 条包名）"
                % len(labels)]
    tail = labels[-13:]
    bad = [(n, names[n - 1], tail[n - 1]) for n in range(1, 14)
           if names[n - 1] != tail[n - 1]]
    if not bad:
        return []
    msg = "工作包表格 S1–S13 与表前最近 13 条包名列表不一致："
    msg += "；".join("S%d 表格「%s」/ 列表「%s」" % x for x in bad[:4])
    if len(bad) > 4:
        msg += "；等共 %d 处" % len(bad)
    return [msg]


def _p41_norm(s):
    return re.sub(r"\s+", " ", s).strip()


# v2.26（REG40 回流）：官方附件文件后缀里的 ASCII 句点属逐字串标点，不是
# hy 句末句点。S08 verbatim 与 P30 拉丁放行都保护这类串，P42 此前只掩
# 链接/代码/小数/官方英文声明，把「…պահանջներ.docx」判成英文残留
# （REG40 136 号公告 hy 实测 2 处 error）。按缺陷族整体豁免「点 + 2~5 个
# 拉丁字母」的文件后缀形态（.docx / .pdf / .xls / .html），不按篇登记词形；
# 点后紧跟空格或亚美尼亚字母的句末句点照旧报红，未登记的形近串也照旧报红。
_P42_FILE_EXT_RE = re.compile(r"\.[A-Za-z]{2,5}(?![A-Za-z])")


# v2.27（REG69 回流）：官方附件后缀「前的空格」是 README 明确要求的
# 拉丁串留白，不是「标点前多余空格」。SPACE_PUNCT_RE 把后缀的点当句读标点，
# 导致 144 号公告 47 语整层 P15 假红（每语 B07 一行）。与 P42 同一缺陷族：
# 只豁免「空格 + 点 + 2~5 拉丁字母 + 非字母」这一官方文件后缀形态，
# 「fin .」的句末句点、单字母 .x、6 字母形近串 .docxxx 照旧报红。
_P15_FILE_EXT_SPACE_RE = re.compile(r"[ \t]+\.[A-Za-z]{2,5}(?![A-Za-z])")


def _p15_space_punct_hits(bare):
    """返回 (start, matched) 列表；官方文件后缀前的空格已按缺陷族豁免。"""
    out = []
    for m in SPACE_PUNCT_RE.finditer(bare):
        if (m.group(0).endswith(".")
                and _P15_FILE_EXT_SPACE_RE.match(bare[m.start():])):
            continue
        out.append((m.start(), m.group(0)))
    return out


def _p42_hy_ascii_periods(text):
    """返回仍裸露的 ASCII 句点上下文列表（已掩掉链接/代码/小数/թ./文件后缀）。"""
    masked = _p42_mask(text)
    out = []
    for m in re.finditer(r"\.", masked):
        a, b = max(0, m.start() - 24), min(len(text), m.end() + 24)
        out.append(text[a:b].replace("\n", " "))
    return out


def _p42_mask(text):
    chars = list(text)
    # v2.25（REG27 回流）：法规线官方英文逐字串（证书附加声明整句 /
    # 包装标识串）整串先剥离。这类串受 S08 verbatim 契约保护、不得逐字改动，
    # 串内部的 ASCII 句点（如 "…by Spain and China. The consignment…"）不是
    # 亚美尼亚文正字法缺陷；P30 早已按 _OFFICIAL_EN_RE 整串剥离，P42 此前
    # 只豁免「引语收尾句点」（P42_LATIN_QUOTE_RE，引号前紧邻的那个点），
    # 对整串中间的分句点失明，hy 语向实证 2 处假阳。与 P30 同口径复用
    # 同一条正则，不新增按篇白名单：官方串之外的 ASCII 句点照旧报红。
    for rx in (P42_MDLINK_DEST_RE, P42_URL_RE, P42_CODE_RE,
               P42_DECIMAL_RE, P42_TH_RE, P42_LATIN_QUOTE_RE,
               P42_TAXON_ABBR_RE, P42_TAXON_JOIN_RE,
               P42_ROMAN_HEAD_RE, _OFFICIAL_EN_RE,
               _P42_FILE_EXT_RE):
        for m in rx.finditer(text):
            for i in range(m.start(), m.end()):
                if chars[i] != "\n":
                    chars[i] = " "
    return "".join(chars)


def _p44_ko_counter_hits(src):
    return [(ln, m.group(0)) for ln, line in enumerate(src.split("\n"), 1)
            for m in P44_KO_COUNTER_RE.finditer(line)]


def _p35_quote_exempt(blk):
    """A20：站方要求逐字保留的英文原引文，两个 P35 分支对称豁免。

    只认引用块里以法定声明/标签开头的英文原句，不粗暴豁免所有 QUOTE
    （本应翻译的引用仍要判未翻译）。
    """
    if _block_kind(blk) != "QUOTE":
        return False
    s = re.sub(r"^\s*>\s?", "", blk.strip())
    return bool(re.match(r"^(This consignment|Exported to the People|CHIA SEED FROM)", s))


def _p63_cross_family(lang, blk):
    """一个正文块内「X 族开引号的洞被别族闭引号关上」的命中 [(开, 闭)]。

    逐字符栈状态机：开引号入栈；闭引号与栈顶同族弹出，异族记一条并
    弹出（同洞只报一次，避免连环误报）。ASCII " 只自开自闭（„…” 的
    ASCII 闭由 P60 专管，此处不重复计数）；“ 与 ” 是歧义字符——栈顶
    认它就当闭引号，否则当开引号（” 的开洞仅限北欧 ”…” 本位语种），
    消解不了的落空栈/别族洞口不判（不成对尺 v1.97 已否）。"""
    native = lang in _P63_NATIVE_U201D
    str_open = lang in _P63_STR_OPEN
    stack = []
    out = []
    for ch in blk:
        if ch == "\u0022":                    # ASCII " 自开自闭
            if stack and stack[-1] == "\u0022":
                stack.pop()
            else:
                stack.append(ch)
            continue
        if ch == "\u201c":                    # “：„ 洞的规范闭，否则是开引号
            if stack and stack[-1] == "\u201e":
                stack.pop()
            else:
                stack.append(ch)
            continue
        if ch == "\u201d":                    # ” 歧义字符
            if stack and stack[-1] == "\u201e" and native:
                stack.pop()                   # „…” 本位闭（pl/ro/hu/hr/sr/da/no）
            elif stack and stack[-1] == "\u201c":
                stack.pop()                   # “… 规范闭
            elif str_open:
                if stack and stack[-1] == "\u201d":
                    stack.pop()               # ”…” 自闭
                else:
                    stack.append(ch)          # 北欧 ” 开洞
            # 其余语种落空栈/别族洞口：不判
            continue
        if ch in _P63_OPEN:
            stack.append(ch)
            continue
        if ch in "\u00bb\u300d\u300f" and stack:   # » 」 』
            op = stack[-1]
            if ch in _P63_OPEN.get(op, ""):
                stack.pop()                   # 同族规范闭
            else:
                out.append((op, ch))          # 跨族（hu „…» 形）
                stack.pop()                   # 同洞只报一次
            continue
        # 其余字符不管
    return out


def _p67_field_density(block):
    """P67：列表块每行的字段分隔符密度（只用来挑候选块，不做跨语比较）。

    分隔符只作「母版这个块是不是多字段台账」的判据；跨语比较一律用字符
    长度比，因为 th/ar/ja 等语向本来就不靠逗号分字段，直接比字段数会
    把整类语言判成漏译（D2 b05/b23 实测 ar/th 密度都是 1.0 却信息完整）。
    """
    lines = [l for l in block.splitlines() if l.strip()]
    if not lines:
        return 0.0
    return sum(sum(l.count(c) for c in P67_FIELD_SEPS)
               for l in lines) / len(lines)


def _p67_compression_hits(base_blocks, lang_blocks):
    """P67 纯判据：返回 [(lang, block_index, ratio, median, rows, density)]。

    只挑「母版富字段多行列表」块；中位数取自与母版块数完全对齐的语向，
    因此天然吸收各语系标点与正字法差异。电池直接调本函数，不复制整包。
    """
    if not base_blocks or len(lang_blocks) < P67_MIN_ALIGNED:
        return []
    aligned = {lg: bs for lg, bs in lang_blocks.items()
               if len(bs) == len(base_blocks)}
    if len(aligned) < P67_MIN_ALIGNED:
        return []
    hits = []
    for bi, blk in enumerate(base_blocks):
        if _block_kind(blk) != "LIST":
            continue
        rows = len([l for l in blk.splitlines() if l.strip()])
        if rows < P67_MIN_ROWS:
            continue
        density = _p67_field_density(blk)
        if density < P67_MIN_FIELD_DENSITY:
            continue
        zlen = max(1, len(blk))
        ratios = {lg: len(bs[bi]) / zlen for lg, bs in aligned.items()}
        if not ratios:
            continue
        ordered = sorted(ratios.values())
        n = len(ordered)
        median = (ordered[n // 2] if n % 2
                  else (ordered[n // 2 - 1] + ordered[n // 2]) / 2.0)
        for lg in sorted(ratios):
            r = ratios[lg]
            if r < P67_ABS_RATIO and r < P67_REL_RATIO * median:
                hits.append((lg, bi + 1, round(r, 3), round(median, 3),
                             rows, round(density, 1)))
    return hits
