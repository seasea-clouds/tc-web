# -*- coding: utf-8 -*-
"""core/textutil.py — 判据共用的纯文本工具（零业务规则）。

存在的理由：规则实现从 engine 迁到 core/rules/ 后，若各自复制切块逻辑，
语义会随实现漂移（同一篇稿在两条判据里块号不同，红面无法对齐）。
这里只放**无状态、无判据**的纯函数（切块、数字归一、结构度量、语言形态辅助）；
任何带规则编号的判断都不许进来——判据一律进 core/rules/<rule>.py，
由 plugins/ 的判据插件调用。
"""
# 治理声明：本文件属机制层，不承载策略数据；改动须走 README「治理」节的 L3 流程
#（先登记理由 → 行为级等价断言 → selftest --kit 全量），提交说明带 [arch]
#（commit-msg 钩子强制）。策略变更请改 plugins/ 判据或经 submit.py glossary 改库。


import re
import unicodedata
import functools
from datetime import datetime
from core.consts import (
    NUM_SEP, NUMBER_WORDS,
    P57_DECIMAL_COMMA, P57_DEC_RE, P57_THOU_RE, P57_THOUSANDS,
    P59_NEGWORDS, _BLOCK_MISALIGN_H2_HINT, _BLOCK_MISALIGN_H2_RE,
    _BLOCK_MISALIGN_NUM_HINT, _BLOCK_MISALIGN_ORPHAN_HINT, _BLOCK_MISALIGN_ORPHAN_RE, _CN_DIGITS,
    _CN_DIGIT_CHARS, _CN_NUM_RE, _CN_UNITS, _CN_UNIT_MULT,
    _CN_UNIT_RE, _DETAIL_LABELS, _GROUP_SEP_RE, _OL_RE, _P47_FREE_STEM, _P47_STEMS, _P47_WORDS,
    _SP_GROUP, _TH_GROUP, _TH_TENS_PREFIXES,
    _TH_UNIT_WORDS, _UL_RE, _UNIT_WORD_MULT, _UNIT_WORD_RE, _WAN_RE, _YI_RE,
)


def blocks(body):
    """按空行切块，trim 后去空。

    CRLF 会让本函数失效（`\\r\\n\\r\\n` 不含 `\\n\\n`），整篇粘成一块；
    行尾由 S07 统一把关，本函数不替 S07 兜底。
    """
    return [b.strip() for b in (body or "").split("\n\n") if b.strip()]


# 别名：插件统一 import blocks as _blocks
_blocks = blocks


def _enclosing_paragraph(text, pos):
    """取 pos 所在的段落（以空行为界），用于判断"这段在讲什么"。"""
    start = text.rfind("\n\n", 0, pos)
    end = text.find("\n\n", pos)
    return text[(start + 2 if start >= 0 else 0):(end if end >= 0 else len(text))]


def _valid_iso_date(s):
    """A02：真实日期（2026-99-99 不算），且落在绝对合法区间 2000–2100。

    I06：不再与 datetime.now() 比较——同一份稿件在任何时间、任何时区重跑，
    结论都必须一致。区间是绝对上/下界，不含「运行时刻」这一变量。
    """
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", str(s or "").strip()):
        return False
    try:
        d = datetime.strptime(str(s).strip(), "%Y-%m-%d").date()
    except ValueError:
        return False
    return 2000 <= d.year <= 2100


def is_latin_diacritic(ch):
    """非 ASCII 的拉丁字母族字符或组合变音符。

    只认 Unicode 名称以 ``LATIN `` 开头（á/ñ/ç/ş/ı/ß/œ/ă…）与 Mn 组合符；
    弯引号、em dash、全角标点、天城文附标均不计入。
    """
    if ord(ch) < 128:
        return False
    name = unicodedata.name(ch, "")
    return name.startswith("LATIN ") or unicodedata.category(ch) == "Mn"


def latin_diacritic_count(text):
    return sum(1 for ch in text if is_latin_diacritic(ch))


def ascii_letter_count(text):
    return sum(1 for ch in text if ch.isascii() and ch.isalpha())


def extract_fact_numbers(body):
    """从基准语言正文提取关键数字：≥1000 的独立整数 + 带小数点的数。
    排除紧邻字母/数字编码的（W2020-29、S0-S13、fig-01 中的 01 等）。"""
    out = []
    for m in re.finditer(r"(?<![\w])\d+(?:\.\d+)?(?![\w])", body):
        s = m.group(0)
        if "." in s:
            if len(s.split(".", 1)[1]) > 0:
                out.append(s)
        elif s.isdigit() and int(s) >= 1000:
            out.append(s)
    return sorted(set(out))


def normalize_unit_numbers(s):
    """把「10 万」「3 万亿」「10만」「100 bin」换成等值阿拉伯整数。"""
    def repl_cn(m):
        return str(int(m.group(1)) * _CN_UNIT_MULT[m.group(2)])

    def repl_word(m):
        return str(int(m.group(1)) * _UNIT_WORD_MULT[m.group(2).lower()])

    s = _CN_UNIT_RE.sub(repl_cn, s)
    return _UNIT_WORD_RE.sub(repl_word, s)


@functools.lru_cache(maxsize=4096)
def _num_pattern(s):
    """生成跨书写习惯的数字匹配 pattern：允许千分位/小数点分隔符变体。"""
    if "." in s:
        ip, fp = s.split(".", 1)
        # v1.84：小数的整数部同样允许千分位分组（A5 首检实证 46 语假阳——
        # de/fr/ru 等按 P57 本语规范写 «5 280,00»/«5,280.00» 也被判缺，
        # 与整数分支口径不对称；这里与整数分支同构地折组）。
        groups = []
        t = ip
        while len(t) > 3:
            groups.insert(0, t[-3:])
            t = t[:-3]
        groups.insert(0, t)
        return re.escape(groups[0]) + "".join(
            "(?:%s)?%s" % (NUM_SEP, re.escape(g)) for g in groups[1:]
        ) + NUM_SEP + re.escape(fp)
    groups = []
    t = s
    while len(t) > 3:
        groups.insert(0, t[-3:])
        t = t[:-3]
    groups.insert(0, t)
    return re.escape(groups[0]) + "".join(
        "(?:%s)?%s" % (NUM_SEP, re.escape(g)) for g in groups[1:])


def find_number(normalized_body, s):
    """A07/I04：只认完整数值 token，不允许「169% 满足 69」「0.69 满足 0.6」。

    左边界挡住数字与小数分隔符前缀，右边界挡住更长的小数与相邻数字；
    不能用 \\b，因为「共69项」这类数字紧邻汉字的合法写法会被误伤。
    千分位/小数分隔符变体仍由 _num_pattern 负责。
    """
    pat = r"(?<![\d])" + _num_pattern(s) + r"(?![\d])"
    return re.search(pat, normalized_body) is not None


def text(data):
    """严格 UTF-8：非法字节一律抛 UnicodeDecodeError，由调用点报 F10/C01。

    v2.12 的 errors="replace" 会把编码损坏变成 U+FFFD 后继续判绿，是审计
    A01/I02 的根因。check() 已在读包后做一次全量预扫并给出字节偏移；
    这里让库直调、--glossary、术语表自动加载三条路径也不再有静默面。
    """
    return data.decode("utf-8")


@functools.lru_cache(maxsize=4096)
def normalize_digits(s):
    out = []
    for ch in s:
        if ch.isdigit():
            try:
                d = unicodedata.digit(ch)
            except (TypeError, ValueError):
                out.append(ch)
                continue
            out.append(str(d))
        else:
            out.append(ch)
    return "".join(out)


def cn_number_to_int(text):
    """把一段汉字数字转成整数；无法解析时返回 None。

    支持「十四」「二十」「三十」「两百五十」「一千二百」等常见写法。
    """
    if not text:
        return None
    total = 0
    section = 0
    current = 0
    seen = False
    for ch in text:
        if ch in _CN_DIGITS:
            current = _CN_DIGITS[ch]
            seen = True
        elif ch in _CN_UNITS:
            unit = _CN_UNITS[ch]
            seen = True
            if current == 0:
                current = 1          # 「十四」= 10 + 4
            if unit >= 100:
                section += current * unit
                current = 0
            else:
                section += current * unit
                current = 0
        else:
            return None
    if not seen:
        return None
    total = section + current
    return total if total > 0 else None


def normalize_cn_numbers(s):
    """把正文里的汉字数字串替换成等值的阿拉伯数字（保留原文其余部分）。"""
    def repl(m):
        v = cn_number_to_int(m.group(0))
        return str(v) if v is not None else m.group(0)
    return _CN_NUM_RE.sub(repl, s)


def ngrams(s, n=4):
    s = re.sub(r"\s+", " ", s.lower())
    s = re.sub(r"[^\w\u0400-\u04FF\u0600-\u06FF\u0900-\u0DFF\u3040-\u30FF\u4E00-\u9FFF ]", "", s)
    return {s[i:i + n] for i in range(max(0, len(s) - n + 1))}


def jaccard(a, b):
    if not a or not b:
        return 0.0
    return len(a & b) / float(len(a | b))


def _block_kind(b):
    """Classify one block: H2 / H3 / H4 / IMG / TABLE / LIST / QUOTE / CODE / PARA.

    TABLE = a markdown pipe table (a header row plus a separator row).
    LIST  = any markdown list marker: '-', '*', '+' or an ordered '1.' / '1)'.
    QUOTE = a block quote ('>').
    CODE  = a fenced code block (```).
    """
    if b.startswith("#### "):
        return "H4"
    if b.startswith("### "):
        return "H3"
    if b.startswith("## "):
        return "H2"
    if b.startswith("!"):
        return "IMG"
    if b.startswith("|"):
        return "TABLE"
    if b.startswith(">"):
        return "QUOTE"
    if b.startswith("```"):
        return "CODE"
    if _UL_RE.match(b) or _OL_RE.match(b):
        return "LIST"
    return "PARA"


def _norm_copy(b):
    """P35 归一化：折叠空白、去掉行首列表符、统一大小写。

    只做这三步，不做词形与标点模糊处理——P35 判的是「逐字相同」，
    任何相似度计算都会把「恰好接近」误判成「未翻译」，与 L05 的职责重叠。
    """
    s = re.sub(r"\s+", " ", b.strip())
    s = re.sub(r"^(?:[-*+]|\d+[.)])\s+", "", s)
    return s.casefold()


def _ascii_digits(s):
    """把任意文字系统的十进制数字折叠成 ASCII，供 P36 比对。

    fa 用 ۱۲۱۰、ar 用 ١٢١٠、hi 用 १२१० 都是正字法，不算改数字；
    折叠后与母版一致即可。
    """
    out = []
    for ch in s:
        d = unicodedata.digit(ch, None)
        out.append(str(d) if d is not None else ch)
    return "".join(out)


def _norm_num(tok):
    """把 1,200 / 1.200 / 32,8 / 32.8 统一成同一种写法。

    千分位与小数点在不同语言里正好互换，直接删逗号会把 af 的 32,8 读成 328。
    判定顺序：两种符号都有 → 最后出现的那个是小数点；只有一种且右侧恰好 3 位
    且左侧 1–3 位 → 视为千分位，否则视为小数点。
    """
    s = tok.strip(".,")
    if "," in s and "." in s:
        if s.rfind(",") > s.rfind("."):
            return s.replace(".", "").replace(",", ".")
        return s.replace(",", "")
    sep = "," if "," in s else ("." if "." in s else None)
    if not sep:
        return s
    left, right = s.split(sep, 1)
    if sep in right:                      # 多个分隔符 → 全部按千分位去掉
        return s.replace(sep, "")
    if len(right) == 3 and 1 <= len(left) <= 3:
        return left + right               # 1,200 / 1.200 → 1200
    return left + "." + right             # 32,8 → 32.8


def _fold_thousands(s):
    """折掉千分位分隔符：`129,600` / `129.600` → `129600`。
    `1,234,567` / `1.234.567` 一次整组折完。只做这一件事，不改数字本身。
    P19 专用：基准侧原先没折、目标侧 8 个变体早折过，口径不对称 ⇒
    母版 `129,600` 被切成 129 与 600，每个译语都判缺三段中的两段。
    """
    prev = None
    while prev != s:
        prev = s
        s = _TH_GROUP.sub(lambda m: re.sub(r"[,.]", "", m.group(1)), s)
    return s


def _strip_group_seps(s):
    def repl(m):
        return m.group(1) + re.sub(r"[.,'\u066C\u066B\u00A0\u202F ]", "",
                                   m.group(2))
    return _GROUP_SEP_RE.sub(repl, s)


def _number_word_in(form, text, lang):
    if not form:
        return False
    if lang in ("ja", "zh"):
        # 两侧都挡数位字：既防「二十四」替 14 顶包，也防「十四」替 10 顶包
        pat = r"(?<![%s])%s(?![%s])" % (
            _CN_DIGIT_CHARS, re.escape(form), _CN_DIGIT_CHARS)
        return re.search(pat, text) is not None
    if lang == "th":
        for m in re.finditer(re.escape(form), text):
            if any(text[:m.start()].endswith(t) for t in _TH_TENS_PREFIXES):
                continue
            if text[m.end():].startswith(_TH_UNIT_WORDS):
                continue
            return True
        return False
    return re.search(r"(?<!\w)%s(?!\w)" % re.escape(form), text) is not None


def _near_num(a, b):
    """数字近形：等长恰差一位，或长度差一且互为前/后缀。

    1476↔1477、0404.9000↔0404.9900（等长错一位）；100000↔10000、
    26000↔2600（差一个数量级位）。P36 extra 侧分级用。
    """
    if a == b:
        return False
    if len(a) == len(b):
        return sum(1 for x, y in zip(a, b) if x != y) == 1
    if abs(len(a) - len(b)) == 1:
        s, t = (a, b) if len(a) < len(b) else (b, a)
        return t.startswith(s) or t.endswith(s)
    return False


def _list_items(b):
    """Number of list items in a list block.

    Counts every markdown list marker, not just '- ', so a list written
    with '*' or '1.' is measured on the same footing.
    """
    return sum(1 for ln in b.split("\n")
               if _UL_RE.match(ln) or _OL_RE.match(ln))


def _table_rows(b):
    """Number of rows in a markdown table (header + separator + body)."""
    rows = [ln for ln in b.split("\n") if ln.strip().startswith("|")]
    # drop the separator row (|---|---|)
    body_rows = [r for r in rows
                 if not re.match(r"^\|[\s:\-|]+\|$", r.strip())]
    return len(body_rows)


def section_list_counts(body):
    """Map each H2 section (in order) to the number of list items it carries.

    Sections are keyed by '1', '2', ... in document order. The leading
    material before the first H2 is keyed as '0'.
    """
    counts = {}
    idx = 0
    cur = "0"
    for b in _blocks(body):
        k = _block_kind(b)
        if k == "H2":
            idx += 1
            cur = str(idx)
            counts.setdefault(cur, 0)
            continue
        if k == "LIST":
            counts[cur] = counts.get(cur, 0) + _list_items(b)
    return counts


def block_signature(body):
    """Ordered tuple of block kinds, list blocks collapsed to 'LIST'.

    Two languages that carry the same material in the same order produce the
    same signature, regardless of how many items each list holds.
    """
    return tuple(_block_kind(b) for b in _blocks(body))


def _list_marker_kinds(b):
    """Ordered list of marker kinds for a list block.

    Each entry is one of '-', '*', '+', 'OL.' (ordered with dot) or
    'OL)' (ordered with parenthesis). Comparing this across languages
    catches a translator who switched bullets to dashes or to numbers.
    """
    kinds = []
    for ln in b.split("\n"):
        m = _OL_RE.match(ln)
        if m:
            kinds.append("OL" + m.group(2))
            continue
        m = _UL_RE.match(ln)
        if m:
            kinds.append(m.group(2))
    return tuple(kinds)


def _list_item_emphasis(b):
    """Per-item emphasis counts for a list block.

    Returns a tuple with one (bold, italic, code) triple per list item,
    in document order. Comparing this across languages catches emphasis
    that was moved from one item to another: the block total stays the
    same, but the visual emphasis lands on the wrong item.
    """
    out = []
    for ln in b.split("\n"):
        if _UL_RE.match(ln) or _OL_RE.match(ln):
            out.append(_emphasis_counts(ln))
    return tuple(out)


def _list_indent_levels(b):
    """Ordered tuple of indent levels (in spaces) for a list block."""
    out = []
    for ln in b.split("\n"):
        m = _UL_RE.match(ln) or _OL_RE.match(ln)
        if m:
            out.append(len(m.group(1)))
    return tuple(out)


def _table_cols(b):
    """Column count of a markdown table, taken from its header row.

    Returns 0 when the table has no parsable header.
    """
    for ln in b.split("\n"):
        s = ln.strip()
        if not s.startswith("|"):
            continue
        if re.match(r"^\|[\s:\-|]+\|$", s):
            continue
        body = s[1:] if s.startswith("|") else s
        body = body[:-1] if body.endswith("|") else body
        return len(body.split("|"))
    return 0


def _table_row_col_counts(b):
    """Column count of every row of a table, in order.

    A well-formed table has the same count in every row; this catches a
    translator who dropped a cell in one row only.
    """
    out = []
    for ln in b.split("\n"):
        s = ln.strip()
        if not s.startswith("|"):
            continue
        body = s[1:] if s.startswith("|") else s
        body = body[:-1] if body.endswith("|") else body
        out.append(len(body.split("|")))
    return tuple(out)


def _emphasis_counts(t):
    """Counts of inline emphasis markers in a text fragment.

    Returns (bold, italic, code). Bold is counted first and its markers
    removed, so that ***text*** does not inflate the italic count.
    """
    t = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", t)
    bold = len(re.findall(r"\*\*(?=\S)(?:[^*]|\*(?!\*))+\*\*", t))
    t2 = re.sub(r"\*\*(?=\S)(?:[^*]|\*(?!\*))+\*\*", "", t)
    code = len(re.findall(r"`[^`\n]+`", t2))
    t3 = re.sub(r"`[^`\n]+`", "", t2)
    italic = len(re.findall(r"(?<![*\w])\*[^*\n]+\*(?!\*)", t3))
    italic += len(re.findall(r"(?<![_\w])_[^_\n]+_(?![_\w])", t3))
    return bold, italic, code


def _inline_links(t):
    """Ordered list of link targets in a text fragment (images excluded)."""
    t = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", t)
    return tuple(re.findall(r"(?<!!)\[[^\]]*\]\(([^)]*)\)", t))


def _link_shape(t):
    """Link targets reduced to a language-neutral shape.

    A CTA link is written as /<lang>/packages/ in every language, so the
    locale prefix has to be stripped before targets can be compared.
    """
    out = []
    for tgt in _inline_links(t):
        out.append(re.sub(r"^/[a-z]{2}(?=/|$)", "/<lang>", tgt))
    return tuple(out)


def _block_misalign_hints(body):
    """P21/P26 报「块结构错位」时，从正文直接探测高频根因（v1.59）。"""
    hints = []
    if _BLOCK_MISALIGN_ORPHAN_RE.search(body):
        hints.append(_BLOCK_MISALIGN_ORPHAN_HINT)
    if _BLOCK_MISALIGN_H2_RE.search(body):
        hints.append(_BLOCK_MISALIGN_H2_HINT)
    first = next((b for b in body.split("\n\n") if b.strip()), "")
    if re.match(r"\s*\d+[.、]\s", first):
        hints.append(_BLOCK_MISALIGN_NUM_HINT)
    return ("〔根因提示：" + "；".join(hints) + "〕") if hints else ""


def block_outline(body):
    """One-to-one outline of a body: one entry per block.

    Each entry is (kind, detail) where detail carries everything that must
    match across languages for that block:

        H2/H3/H4 -> (level, bold, italic, code)
        LIST     -> (items, markers, indents, bold, italic, code)
        TABLE    -> (rows, cols, row_cols, bold, italic, code)
        IMG      -> (file name, alt present, link shape)
        PARA     -> (bold, italic, code, link shape, line breaks)

    Two languages whose outline is identical carry exactly the same material
    in exactly the same order, with the same block sizes, the same list
    markers, the same table geometry and the same inline emphasis.
    """
    out = []
    for b in _blocks(body):
        k = _block_kind(b)
        if k in ("H2", "H3", "H4"):
            bold, ital, code = _emphasis_counts(b)
            out.append((k, (int(k[1]), bold, ital, code)))
        elif k == "LIST":
            bold, ital, code = _emphasis_counts(b)
            out.append((k, (_list_items(b), _list_marker_kinds(b),
                            _list_indent_levels(b), bold, ital, code,
                            _list_item_emphasis(b))))
        elif k == "TABLE":
            bold, ital, code = _emphasis_counts(b)
            out.append((k, (_table_rows(b), _table_cols(b),
                            _table_row_col_counts(b), bold, ital, code)))
        elif k == "QUOTE":
            bold, ital, code = _emphasis_counts(b)
            out.append((k, (b.count("\n") + 1, bold, ital, code)))
        elif k == "CODE":
            out.append((k, (b.count("\n") + 1, )))
        elif k == "IMG":
            m = re.search(r"/([^/\s]+\.webp)", b)
            alt = re.search(r"!\[([^\]]*)\]", b)
            out.append((k, (m.group(1) if m else "",
                            1 if (alt and alt.group(1).strip()) else 0,
                            _link_shape(b))))
        else:
            bold, ital, code = _emphasis_counts(b)
            out.append((k, (bold, ital, code, _link_shape(b),
                            b.count("\n"))))
    return tuple(out)


def outline_diff(base, cur):
    """Describe how two outlines differ, block by block.

    Returns a list of human-readable differences, one per block position.
    """
    diffs = []
    n = max(len(base), len(cur))
    for i in range(n):
        b = base[i] if i < len(base) else None
        c = cur[i] if i < len(cur) else None
        if b == c:
            continue
        if b is None:
            diffs.append("第%d块 本语言多出 %s/%s" % (i + 1, c[0], c[1]))
        elif c is None:
            diffs.append("第%d块 本语言缺少 %s/%s" % (i + 1, b[0], b[1]))
        elif b[0] != c[0]:
            diffs.append("第%d块 类型不同：基准 %s，本语言 %s" % (i + 1, b[0], c[0]))
        elif isinstance(b[1], tuple) and isinstance(c[1], tuple):
            labels = _DETAIL_LABELS.get(b[0], [])
            for j, (x, y) in enumerate(zip(b[1], c[1])):
                if x == y:
                    continue
                lab = labels[j] if j < len(labels) else "维度%d" % j
                diffs.append("第%d块 %s 的%s不同：基准 %s，本语言 %s"
                             % (i + 1, b[0], lab, _fmt_val(x), _fmt_val(y)))
            if len(b[1]) != len(c[1]):
                diffs.append("第%d块 %s 的维度数不同：基准 %d，本语言 %d"
                             % (i + 1, b[0], len(b[1]), len(c[1])))
        else:
            diffs.append("第%d块 %s 规模不同：基准 %s，本语言 %s"
                         % (i + 1, b[0], b[1], c[1]))
    return diffs


def _blocks_by_kind(outline):
    """Group an outline's blocks by kind, keeping document order within a kind.

    Returns {kind: [(index, detail), ...]}. Pairing blocks by kind and by
    order-within-kind makes a comparison robust against blocks being added
    or removed elsewhere in the document: one extra table elsewhere must not
    shift the column comparison of every later table.
    """
    buckets = {}
    for i, (k, d) in enumerate(outline):
        buckets.setdefault(k, []).append((i, d))
    return buckets


def _link_dim(detail, kind):
    """Extract the link-target dimension from a block detail tuple."""
    if not isinstance(detail, tuple):
        return ()
    if kind == "IMG":
        return detail[2] if len(detail) > 2 else ()
    if kind == "PARA":
        return detail[3] if len(detail) > 3 else ()
    return ()


def _fmt_val(v):
    """Render a detail value compactly for an error message."""
    if isinstance(v, tuple):
        return "/".join(str(x) for x in v)
    return str(v)


def _line_of(src, pos):
    return src.count("\n", 0, pos) + 1


# ---------------------------------------------------------------- 数字事实提取
#
# 以下函数只做「文本 → 数字事实」，供 plugins/numbers-*.py 共用同一份提取
# 口径：词表在 core/consts/，这里不含任何档位或是否报红的判断（判断在插件内）。
# 命名不带规则编号前缀，避免把判据语义带进事实层。


def id_numbers(block):
    """块内「标识型数字」集合：含小数点的编码，或 ≥3 位数字。"""
    out = set()
    s = _ascii_digits(block)
    prev = None
    while prev != s:                       # 空格分组：`100 000` → `100000`
        prev = s
        s = _SP_GROUP.sub(lambda m: m.group(1)
                          .replace(" ", "")
                          .replace("\u00a0", "")
                          .replace("\u202f", ""), s)
    for tok in re.findall(r"\d[\d.,]*", s):
        tok = _norm_num(tok)
        if "." in tok or len(re.sub(r"\D", "", tok)) >= 3:
            out.add(tok)
    for m in _WAN_RE.finditer(_ascii_digits(block)):
        v = int(m.group(1))
        out.add(str(v * 10000))
        out.add(str(v * 10))               # v*10 ＝ 千位读法（100 万 → 1000）
    for m in _YI_RE.finditer(_ascii_digits(block)):
        v = int(m.group(1))
        out.add(str(v * 100000000))
        out.add(str(v * 100))              # 百万位读法（1 亿 → 100 million）
    return out


def wan_face_groups(block):
    """「N 万 / N 亿」的同义数字面分组（缺号判定按组放行）。"""
    out = []
    for m in _WAN_RE.finditer(_ascii_digits(block)):
        v = int(m.group(1))
        out.append({str(v), str(v * 10000), str(v * 10)})
    for m in _YI_RE.finditer(_ascii_digits(block)):
        v = int(m.group(1))
        out.append({str(v), str(v * 100000000), str(v * 100)})
    return out


def separator_shapes(master_text):
    """母版里「带分隔符的数字」的分组形状集合，digits 一律折成 #。"""
    out = set()
    for m in re.finditer(r"\d+(?:[ .,\u00A0\u202F]\d+)+", master_text or ""):
        out.add(re.sub(r"\d", "#", m.group(0)))
    return out


def _mirror_tag(num, mirror):
    if not mirror:
        return ""
    shape = re.sub(r"\d", "#", num)
    return "；镜像母版形，本地化即可、不撞跨语数字判据" if shape in mirror else ""


def separator_hits(lang, text, mirror=None, exempt=None):
    """返回 [(数字串, 说明)]：小数点或千分位不符合该语种规范。"""
    if not lang:
        return []
    dec = "," if lang in P57_DECIMAL_COMMA else "."
    thou = P57_THOUSANDS.get(lang)
    out = []
    for m in P57_THOU_RE.finditer(text):
        sep = m.group(1)
        if thou == " ":
            ok = sep in (" ", "\u00A0", "\u202F")
        elif thou:
            ok = (sep == thou)
        else:
            ok = True
        if not ok:
            out.append((m.group(0), "千分位应为 %r%s"
                        % (thou, _mirror_tag(m.group(0), mirror))))
    for m in P57_DEC_RE.finditer(text):
        if exempt and m.group(0) in exempt:
            continue                      # 条款编号：标识符，不是小数
        if m.group(1) != dec:
            out.append((m.group(0), "小数点应为 %r%s"
                        % (dec, _mirror_tag(m.group(0), mirror))))
    return out


def digit_word_present(lang, n, folded, low):
    """块内 N 是否以数字 / 词干 / 数词任一形态在场（「N 位」类描述位）。"""
    if re.search(r"(?<!\d)%d(?!\d)" % n, folded):
        return True
    if n == 8:                            # 词干表只覆盖「八」
        for s in _P47_STEMS.get(lang, ()):
            lb = "" if lang in _P47_FREE_STEM else r"(?<!\w)"
            if re.search(lb + re.escape(s), low):
                return True
        for w in _P47_WORDS.get(lang, ()):
            if re.search(r"(?<!\w)%s(?!\w)" % re.escape(w), low):
                return True
    w = NUMBER_WORDS.get(lang, {}).get(n)
    if w and re.search(r"(?<!\w)%s(?!\w)" % re.escape(w), low):
        return True
    return False


