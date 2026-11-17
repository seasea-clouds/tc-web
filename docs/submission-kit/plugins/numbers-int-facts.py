# -*- coding: utf-8 -*-
"""P19：关键编号（≥10 的非年份整数）跨语言齐全

母版里的文号、限额、天数等整数编号，各语可用本族数字或数词书写，但不得缺项。
"""
import re

from core.consts import (
    DOC_NUMBER_MIN, DOC_NUMBER_YEAR_MAX, DOC_NUMBER_YEAR_MIN,
    NUMBER_WORDS, NUMBER_WORD_ALTS,
    _CN_UNIT_MULT, _CN_UNIT_RE, _UNIT_WORD_MULT, _UNIT_WORD_RE,
)
from core.textutil import (
    _fold_thousands, _number_word_in, _strip_group_seps,
    normalize_cn_numbers, normalize_digits, normalize_unit_numbers,
)

RULE = "P19"
RULES = [RULE]
PHASE = 60
CATEGORY = "numbers"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["body"]
SEVERITY = "warning"   # P19 历史档位是 warning（P04/P55 才是 error）
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ["body"]}

RATIONALE = {
    RULE: "P04 只收 ≥1000 与小数，10–999 的编号（天数、项数、税率百分比）它看不见；这条补上，并接受本族数字、千分位、汉字数字与数词（fourteen / catorze /أربع عشرة）多种书写形态，只判「事实在不在」。",
}

def extract_int_facts(text):
    """P19 基准侧取数：普通独立整数 + 计数单位换算后的整数。

    与 extract_fact_numbers 分开：P04 收 ≥1000 与小数，P19 只看 ≥10 的
    整数编号；单位换算后的 100,000 必须作为一个事实，而不是 10。
    """
    text = normalize_digits(text)
    facts = set()
    for m in _CN_UNIT_RE.finditer(text):
        v = int(m.group(1)) * _CN_UNIT_MULT[m.group(2)]
        if v >= DOC_NUMBER_MIN:
            facts.add(str(v))
    for m in _UNIT_WORD_RE.finditer(text):
        v = int(m.group(1)) * _UNIT_WORD_MULT[m.group(2).lower()]
        if v >= DOC_NUMBER_MIN:
            facts.add(str(v))
    masked = _CN_UNIT_RE.sub(lambda m: " " * len(m.group(0)), text)
    masked = _UNIT_WORD_RE.sub(lambda m: " " * len(m.group(0)), masked)
    # v2.24：省略年份的中文日期同样不是关键编号。母版「10 月 13 日发布、
    # 11 月 15 日起实施」（REG24 解读段）无「年」前缀，v1.88 的 `(?<=年)`
    # 掩不到月份，10/11 被当 ≥10 编号抽出；各语按本语月份名书写 ⇒ 44 语
    # 各一条 `['10','11']` 假红。只在「X 月 Y 日」完整相邻形里整体掩掉
    # （等长空白保位置）；孤立「12 个月」「5 月」不动，避免误掩真实数量事实。
    # 必须排在 v1.88 两条之前：否则「月 X 日」那条先把日数字换成空白，
    # 本规则就匹配不到完整日期形了（REG24 首版修正顺序颠倒，实测无效）。
    masked = re.sub(r"(?<!\d)\d{1,2}\s*月\s*\d{1,2}\s*日",
                    lambda m: " " * len(m.group(0)), masked)
    # v1.88：完整日期的月/日成分不是关键编号。母版「2017 年 12 月 26 日公布」
    # 会把 12（和 26）当 ≥10 编号抽出，而各语把月份写成本语月份名（December）
    # 或本语数字写法 ⇒ 每语一条假红（A6 43 条 `['12']` + REG3 44 条
    # `['11','12']`，两线每轮必报）。只在「年 X 月」「月 X 日」相邻上下文里
    # 掩掉（等长空白，保位置）；孤立的「12 月」「26 日」不是完整日期，不掩。
    masked = re.sub(r"(?<=年)\s*\d{1,2}(?=\s*月)",
                    lambda m: " " * len(m.group(0)), masked)
    masked = re.sub(r"(?<=月)\s*\d{1,2}(?=\s*日)",
                    lambda m: " " * len(m.group(0)), masked)
    for m in re.finditer(r"(?<![\w.])(\d+)(?![\w.])", _fold_thousands(masked)):
        tok = m.group(1)
        # v1.74：零填充整数是编号（HS 品目 0401/0404），不是计数事实。
        # int() 会抹掉前导零得到 401/404，而目标侧原文仍写 0401/0404，
        # `(?<!\d)401` 永远匹配不到 → 47 语全篇假红。HS 编码由 P20 管。
        if len(tok) > 1 and tok.startswith("0"):
            continue
        v = int(tok)
        if v >= DOC_NUMBER_MIN and not (
                DOC_NUMBER_YEAR_MIN <= v <= DOC_NUMBER_YEAR_MAX):
            facts.add(str(v))
    return sorted(facts, key=int)

def run(view, emit):
    for art in view.articles:
        if not art.parity_on:
            continue
        ml = art.master_lang
        fact_ints = extract_int_facts(art.body(ml))
        for lg in art.langs:
            if lg == ml:
                continue
            nb = normalize_unit_numbers(normalize_digits(art.body(lg)))
            nb_cn = normalize_cn_numbers(nb)
            nb_group = _strip_group_seps(nb)
            nb_cn_group = _strip_group_seps(nb_cn)
            variants = {nb, nb_cn, nb_group, nb_cn_group,
                        nb.replace(",", ""),
                        nb.replace(" ", "").replace("\u00a0", ""),
                        nb_cn.replace(",", ""),
                        nb_cn.replace(" ", "").replace("\u00a0", ""),
                        nb.replace(",", "").replace(" ", "").replace("\u00a0", ""),
                        nb_cn.replace(",", "").replace(" ", "").replace("\u00a0", "")}
            words = NUMBER_WORDS.get(lg, {})
            alt_words = NUMBER_WORD_ALTS.get(lg, {})

            def _word_ok(v):
                forms = []
                if words.get(int(v)):
                    forms.append(words[int(v)])
                forms.extend(alt_words.get(int(v), ()))
                return any(form and any(_number_word_in(form, t, lg)
                                        for t in variants)
                           for form in forms)

            missing = [v for v in fact_ints
                       if not any(re.search(r"(?<!\d)%s(?!\d)" % re.escape(v), t)
                                  for t in variants)
                       and not _word_ok(v)]
            if missing:
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "关键编号缺失（对照 %s）: %s" % (ml, missing))

def review(finding, view):
    return finding
