# -*- coding: utf-8 -*-
"""plugins/_health.py — 文本健康判据的共用提取工具（不含档位/发射）。

文件名以 `_` 开头：loader 不装载，A6 不计入插件名单。
"""
# 治理声明：本文件属机制层，不承载策略数据；改动须走 README「治理」节的 L3 流程
#（先登记理由 → 行为级等价断言 → selftest --kit 全量），提交说明带 [arch]
#（commit-msg 钩子强制）。策略变更请改 plugins/ 判据或经 submit.py glossary 改库。
import re
import unicodedata



from core.consts import (
    BN_CANDRABINDU,
    BN_CB_ALLOW,
    BN_CONSONANT_LO,
    EXCERPT_CLOSERS,
    EXCERPT_TERMINAL,
    P08_ACRONYM_RE,
    P08_LOCAL_PREFIX,
    P08_LOCAL_SUFFIX,
    P56_LANG_SCRIPTS,
    P56_SCRIPT_RANGES,
    P58_ABBR,
    P58_ABBR_ARM,
    P58_CASED_SCRIPTS,
    P58_FENCE_RE,
    P58_INLINE_RE,
    P58_LANG_TERMS,
    P58_NO_CAP_LANGS,
    P58_TERMS,
    REDUPLICATION_OK,
    REPEAT_LEXEME_NEXT,
    _CODE_PART_RE,
    _LATIN_ROMAN_SEQ,
    _MIX_SCRIPT_KEYS,
    _REPEAT_NEXT_RE,
    re,
)


def repeat_words(src):
    """切出「字母＋结合段」成串的词，返回 [(词, 起, 止), ...]；非结合字母满 2 个才算词。"""
    out = []
    i, n = 0, len(src)
    while i < n:
        if _repeat_is_word_ch(src[i]):
            j, core = i, 0
            while j < n and _repeat_is_word_ch(src[j]):
                if not unicodedata.category(src[j]).startswith("M"):
                    core += 1
                j += 1
            if core >= 2:
                out.append((src[i:j], i, j))
            i = j
        else:
            i += 1
    return out


def repeat_pair_hits(src, lang):
    """相邻同形词 ⇒ [(起, 止, 词形), ...]；白名单、de 逗号关系从句、续词 lexeme 放行。"""
    words = repeat_words(src)
    redup = REDUPLICATION_OK.get(lang, ())
    lex = REPEAT_LEXEME_NEXT.get(lang, {})
    out = []
    for k in range(len(words) - 1):
        w1, a1, b1 = words[k]
        w2, a2, b2 = words[k + 1]
        if w1.casefold() != w2.casefold():
            continue
        # v1.77：两个纯数字 token 的相邻同形不算词重复——法/俄/捷等以空格
        # 作千分位的语言里，「100 000 000」切出的「000 000」是同一个数的
        # 相邻两段（C1 fr 实测 5 处）。数字完整性由 P36/P04 管，不归本条。
        if w1.isdigit() and w2.isdigit():
            continue
        gap = src[b1:a2]
        if not gap or gap.strip(" \t"):
            continue          # 只认空格/制表符分隔；ZWNJ/连字符相连的不算两词
        shape = w1 + gap + w2
        if shape.casefold() in redup:
            continue
        if lang == "de" and w1.casefold() in ("das", "die", "der") \
                and src[:a1].rstrip().endswith(","):
            continue
        # v1.59 法语反身结构：主语＋反身代词同形（nous nous / vous vous，
        # REG1 首轮实抓）是语法必需形状——je me / tu te / il se 都不同形，
        # 同形的只有这两个；同 de „das das" 关系从句口径，整词对放行。
        if lang == "fr" and w1.casefold() in ("nous", "vous"):
            continue
        # v1.79 阿尔巴尼亚语小品词结构：非限定动词链与复合名词的引导词 të
        # 与下一词的 të 起首同形（të të ardhurave「的收入」、për të të
        # informuar「为了通知你」）是语法必需形状，同 fr nous nous 口径整对放行。
        if lang == "sq" and w1.casefold() == "të" \
                and w2.casefold().startswith("të"):
            continue
        # v2.23 欧洲葡萄牙语连词＋反身代词同形：「Se se constatar」（如果发现）
        # ＝连词 se（如果）＋动词反身代词 se，语法必需形状——同 fr nous nous /
        # sq të të 口径整对放行（REG23 阶段 3 机检实抓 2 处；全库探针真对仅
        # REG23，已交付面只有 se separam 类跨词子串，不构成同形对）。
        if lang == "pt" and w1.casefold() == "se" \
                and w2.casefold() == "se":
            continue
        nxt_m = _REPEAT_NEXT_RE.match(src, b2)
        # 续词必须按**原文**取下一个空白分隔词，不能取词表里的下一条：
        # hi「पहले पहले दो देखिए」的 दो＝单元音＋母音记号，core=1 进不了词表，
        # 用 words[k+2] 会拿到 देखिए，lexeme 放行永远不生效（v1.58b F4 hi 实测）。
        nxt = nxt_m.group(1) if nxt_m else ""
        prefs = lex.get(w1.casefold())
        if prefs and nxt.casefold().startswith(tuple(
                p.casefold() for p in prefs)):
            continue
        out.append((a1, b2, shape))
    return out


def _code_hyphen_ok(tok, allow=None):
    """True for number/code hyphenated with a local suffix: S1-ից, S1-მდე, ל-US.

    One side being a bare identifier (S1, 1210, US) means the hyphen carries a
    grammatical case suffix or a preposition, not a mixed-script accident.
    The Hebrew maqaf (U+05BE) counts as a hyphen too.
    """
    if "-" not in tok and "\u05be" not in tok.lower():
        return False
    allow = allow or frozenset()
    for part in re.split(r"[-\u05be\u2013]", tok):
        part = part.strip("()\[\]{}.,;:!?\u00ab\u00bb\u201c\u201d")
        if part and _CODE_PART_RE.match(part):
            return True
        # 俗称 + 本地格后缀（blue hat-ի / blue hat-ის）：拉丁侧命中
        # P30 的允许词表同样放行——那是登记过的保留用语
        low_part = part.lower()
        if part and ((len(part) >= 3 and low_part in allow)
                     or low_part in _LATIN_ROMAN_SEQ):
            return True
    return False


def _p08_affix_ok(tok, lang):
    cores = re.findall(r"[A-Za-z0-9]+", tok)
    if not cores:
        return False
    core = max(cores, key=len)
    if not P08_ACRONYM_RE.match(core):
        return False
    rest = tok.replace(core, "")
    rest = re.sub(r"[-\u05be\u2013\s]", "", rest)
    rest = rest.strip("()[]{}.,:!?«»“”‘’؛،۔؟ًٌٍَُِْ")
    if not rest:
        return True
    sfx = P08_LOCAL_SUFFIX.get(lang, ())
    pfx = P08_LOCAL_PREFIX.get(lang, ())
    if any(rest == s or rest.startswith(s) for s in sfx):
        return True
    if any(rest == p or rest.startswith(p) for p in pfx):
        return True
    return False


def _p08_unit_ok(tok, cores):
    # v2.22b：句尾标点随词粘连（REG20 实抓 ka `°C-მდე,`，core 带着
    # 尾逗号永远进不了表）——core 提取补标点剥离，只保留单位字符。
    # 单位词干集合从库取（phrase-block 用途 p08-unit-core）。
    core = re.sub(r"[^\x00-\x7f°³²/]+", "", tok)
    core = core.strip("-/.,;:!?\"'()[]{}«»“”‘’")
    return core in cores


def _p08_latin_stem_ok(tok, stems):
    """学名词干集合从库取（phrase-block 用途 p08-latin-stem）；普通英文词
    + 本地词尾不在表内照旧判红。"""
    m = re.match(r"^([A-Za-z][A-Za-z-]*?)(?:-|[^\x00-\x7f])", tok)
    if not m:
        return False
    return m.group(1).rstrip("-").casefold() in stems


def _fmt_p38(hits):
    return "；".join("第 %d 行 %r（裸辅音 %s 后紧跟 CANDRABINDU，该行第 %d 码位）"
                     % (ln, w, pred, k) for ln, k, w, pred in hits[:4]) + \
        ("；等共 %d 处" % len(hits) if len(hits) > 4 else "")


def _p39_hits(src, pat):
    """P39：返回 [(行号, 命中文本), ...]。正则由调用方从库取（phrase-block
    用途 ecommerce-spaced），本函数只管逐行扫描——元数据与正文共用同一
    predicate。"""
    out = []
    for ln, line in enumerate(src.split("\n"), 1):
        for m in pat.finditer(line):
            out.append((ln, m.group(0)))
    return out


def _bn_chandrabindu_hits(src):
    """P38：返回 [(行号, 码位序号, 词形, 前一位码点串), ...]。

    形状：CANDRABINDU(U+0981) 紧跟在裸辅音字母（U+0995..U+09B9, Lo）之后。
   孟加拉文里ঁ 只能跟在元音字母/元音符号之后（辅音无কার时要写 ং），所以这
    个形状不是风格问题而是**不成立**；它几乎总意味着一个元音符号（如 U+09C1）
    被批量替换打成了 U+0981。
    只管 Bengali 区段：同一形状在 Devanagari 里合法（ne 后置词 सँग、hi
    महँगा），实测会误伤 29 处，所以不许扩到 hi/ne。
    """
    out = []
    for i, ln in enumerate(src.split("\n"), 1):
        for k, ch in enumerate(ln):
            if ch != BN_CANDRABINDU or k == 0:
                continue
            prev = ln[k - 1]
            o = ord(prev)
            if not (BN_CONSONANT_LO[0] <= o <= BN_CONSONANT_LO[1]):
                continue
            if unicodedata.category(prev) != "Lo":
                continue
            w = _bn_word_at(ln, k)
            if w in BN_CB_ALLOW:
                continue
            out.append((i, k, w, "U+%04X" % o))
    return out


def _p56_wrong_script_hits(src, lang):
    """返回 [(行号, 字符, 脚本名)]；未登记语言返回空表。"""
    allowed = P56_LANG_SCRIPTS.get(lang)
    if not allowed:
        return []
    out = []
    for i, ln in enumerate(src.split("\n"), 1):
        for ch in ln:
            if unicodedata.category(ch)[0] != "L":
                continue
            sc = _p56_script_of(ch)
            if sc is None or sc == "LATIN" or sc in allowed:
                continue
            out.append((i, ch, sc))
    return out


def _p56_message(hits):
    by = {}
    for ln, ch, sc in hits:
        by.setdefault(sc, []).append((ln, ch))
    parts = []
    for sc in sorted(by):
        items = by[sc]
        shown = "、".join("第%d行 %r(U+%04X)" % (ln, ch, ord(ch))
                         for ln, ch in items[:3])
        parts.append("%s %d 处：%s" % (sc, len(items), shown))
    return "；".join(parts)


def _p58_in_scope(lang):
    """本语文字有大小写范畴且该语有句首大写规范 ⇒ 进射程。"""
    if not lang or lang in P58_NO_CAP_LANGS:
        return False
    scripts = P56_LANG_SCRIPTS.get(lang)
    return bool(scripts) and bool(scripts & P58_CASED_SCRIPTS)


def _p58_terms(lang):
    return P58_TERMS + P58_LANG_TERMS.get(lang, "")


def _p58_prev_word(text, i):
    """句末标记前那个**词**：先跳过收尾引号/括号再往回收。
    旧写法直接从标记位往回吃，`…(2026)։ դրանք` 这类「点前是右括号」的形状
    收到空串，`_p58_is_abbrev("")` 恒真 ⇒ 整类被当缩写吞掉（严/宽对账实测）。"""
    j = i
    while j > 0 and text[j - 1] in " \t”»)]}„“":
        j -= 1
    k = j
    while k > 0 and (text[k - 1].isalnum() or text[k - 1] in ".-'’"):
        k -= 1
    return text[k:j]


def _p58_word_end(ch):
    """句末标记前面那个字符是否算「词尾」：字母/结合段/右引号右括号都行，
    数字与空白不算（日期与序号的点不是句末）。"""
    return bool(ch) and not ch.isdigit() and not ch.isspace()


def _p58_is_abbrev(word, arm):
    if not word:
        # 收不到词＝标记前是 `%`／符号（实测形状 `- 9.1%։ մաքսային տուրք`）。
        # 旧写法在这里返回 True（「没有证据就不出声」），于是符号收尾的句末整类
        # 隐身；672 份 mdx 严/宽对账只找到 1 处，判红代价可忽略 ⇒ 改成按句末处理。
        return False
    if arm == "B":
        return word.lower() in P58_ABBR_ARM
    if "." in word:
        return True
    w = word.lower().strip(".-’'")
    if w in P58_ABBR:
        return True
    return len(w) <= 3 and w.isalpha()


def _p58_mask_fences(src):
    """代码围栏内容换成等长空格：偏移与换行数不变，行号照旧对得上原文。"""
    out = list(src)
    for m in P58_FENCE_RE.finditer(src):
        for k in range(m.start(), m.end()):
            if out[k] != "\n":
                out[k] = " "
    return "".join(out)


def _p58_case_hits(src, lang):
    """返回 [(行号, 列, 字符, 臂名)]；不在射程的语言返回空表。"""
    if not _p58_in_scope(lang):
        return []
    terms = _p58_terms(lang)
    text = _p58_mask_fences(src)
    found = {}                      # 位置 -> 臂名；同一处多臂只留先见的
    for m in P58_INLINE_RE.finditer(text):
        dot = m.start() - 1
        ch = m.group(2)
        if not _p58_word_end(text[dot - 1] if dot >= 1 else "") or not ch.islower():
            continue
        if _p58_is_abbrev(_p58_prev_word(text, dot), "A"):
            continue
        found.setdefault(m.start(2), "A")
    for extra in P58_LANG_TERMS.get(lang, ""):
        for m in re.finditer(re.escape(extra) + r"([ \t]+)([^\W\d_])", text):
            dot = m.start()
            ch = m.group(2)
            if not _p58_word_end(text[dot - 1] if dot >= 1 else "") or not ch.islower():
                continue
            if _p58_is_abbrev(_p58_prev_word(text, dot), "B"):
                continue
            found.setdefault(m.start(2), "B")
    lines = src.split("\n")
    starts = []                     # 每行起始偏移累计求得（text.index 会取到首现位置）
    off = 0
    for ln in lines:
        starts.append(off)
        off += len(ln) + 1
    prev_nonblank = None
    for n, ln in enumerate(lines):
        if not ln.strip():
            continue
        if n > 0 and prev_nonblank is not None:
            c = ln[0]
            pl = prev_nonblank.rstrip()
            # `len(pl) - 1` 不是笔误：取整行末位会把句末标记本身并进「前一个词」，
            # `_p58_is_abbrev` 的「词内带点＝缩写」那条于是对**每一行**成立，
            # C 臂按构造永远不点火（注入正对照实测：脏串读 0）。
            tail = pl[-1] if pl else ""
            if (c.isalpha() and c.islower() and tail in terms
                    and not (len(pl) >= 2 and pl[-2].isdigit())
                    and not _p58_is_abbrev(_p58_prev_word(pl, len(pl) - 1),
                                           "B" if tail in P58_LANG_TERMS.get(lang, "") else "A")
                    and starts[n] not in found):
                found[starts[n]] = "C"
        prev_nonblank = ln
    out = []
    for pos in sorted(found):
        out.append((src.count("\n", 0, pos) + 1, pos - src.rfind("\n", 0, pos),
                    src[pos], found[pos]))
    return out


def _p58_message(hits):
    by = {}
    for ln, col, ch, arm in hits:
        by.setdefault(arm, []).append((ln, col, ch))
    name = {"A": "行内句末后", "B": "亚美尼亚 verjet 后", "C": "行首（上行句号收尾）"}
    parts = []
    for arm in sorted(by):
        items = by[arm]
        shown = "、".join("第%d行第%d列 %r" % (ln, col, ch) for ln, col, ch in items[:3])
        parts.append("%s %d 处：%s" % (name[arm], len(items), shown))
    return "；".join(parts)


def _token_scripts(tok):
    """返回 token 内出现的文字系统集合（LATIN + 受监控脚本）。"""
    names = set()
    for ch in tok:
        if not ch.isalpha():
            continue
        try:
            n = unicodedata.name(ch)
        except ValueError:
            continue
        if "LATIN" in n:
            names.add("LATIN")
            continue
        for key in _MIX_SCRIPT_KEYS:
            if key in n:
                names.add(key)
                break
    return names


def _p40_bad_end(lang, excerpt):
    """P40：返回 (是否不合格, 剥完收尾符后的末字符)。

    th 整语豁免（泰文不以句末标点断句）。v1.40 起 hy 不再允许 ASCII ":"：
    P0 的摘要已改用亚美尼亚句号 ։。空摘要返回 (False, "")，由 F02/F07
    与 S09 管，本条不重复出声。
    """
    if lang == "th" or not excerpt.strip():
        return (False, "")
    s = excerpt.rstrip()
    while s and s[-1] in EXCERPT_CLOSERS:
        s = s[:-1].rstrip()
    last = s[-1:] if s else ""
    if last in EXCERPT_TERMINAL:
        return (False, last)
    return (True, last)


def _repeat_is_word_ch(ch):
    cat = unicodedata.category(ch)
    return cat[0] in ("L", "N", "M") or ch.isalnum()


def _bn_word_at(line, i):
    """第 i 位所在的「词」：按 Unicode 类别（Lo/Mn/Mc）连成一片。
    不用 \\w —— 它会在元音符号处把孟加拉词切碎，报告里的词形不可读，
    而词形正是这一条要给人眼复核的东西（v1.37 踩过：切碎的词形让审计脚本
    把「无第二例」报成了假绿）。"""
    lo = i
    while lo > 0 and unicodedata.category(line[lo - 1]) in ("Lo", "Mn", "Mc"):
        lo -= 1
    hi = i
    while hi + 1 < len(line) and unicodedata.category(line[hi + 1]) in ("Lo", "Mn", "Mc"):
        hi += 1
    return line[lo:hi + 1]


def _p56_script_of(ch):
    o = ord(ch)
    for name, ranges in P56_SCRIPT_RANGES:
        for lo, hi in ranges:
            if lo <= o <= hi:
                return name
    return None
