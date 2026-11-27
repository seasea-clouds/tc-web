# -*- coding: utf-8 -*-
"""P76：标准代号后的数字必须是西文阿拉伯数字

ISPM 15 / ISPM 12 / HS / ISO 等国际标准代号是固定写法，代号后的序号用本语
数字（bn 的 ১৫、ne 的 १५、ar 的 ١٥）会让证书与标准文本对不上号——同一份稿件
里 ISPM 与本语数字并排，读者无法判断指的是不是同一条标准。
"""
RULE = "P76"
RULES = [RULE]
PHASE = 60
CATEGORY = "numbers"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ["body"]}

RATIONALE = {
    RULE: "REG89 实测（GACC 公告 101，bn）：正文两处把 ISPM 15 / ISPM 12 写成"
                    "「ISPM ১৫」「ISPM ১২」，48 语机检全绿——P19/P36 只判「关键编号"
                    "在不在」，不判代号后的数字用了哪套字形。植检证书与 ISPM 标准"
                    "逐字比对时，孟加拉数字与本语读者熟悉的代号写法不同形，等于把"
                    "标准编号改成了另一个记号。本条按「代号 + 空格 + 数字串」取词，"
                    "数字串里出现非 ASCII 数字即报，限标准代号白名单避免误扫正文数字。",
}

_CODES = ("ISPM", "HS", "ISO", "GB", "WCO", "CITES", "IPPC")
_TOKEN_RE = r"(?<![A-Za-z])(%s)[ \u00a0]*([^\s,;:、。．（）()\[\]]+)" % "|".join(_CODES)


def _has_foreign_digit(s):
    for ch in s:
        if ch.isdigit() and not ("0" <= ch <= "9"):
            return True
    return False


def run(view, emit):
    import re
    for art in view.articles:
        for lg in sorted(art.parsed):
            body = art.body(lg) or ""
            hits = []
            for m in re.finditer(_TOKEN_RE, body):
                token = m.group(2)
                if _has_foreign_digit(token):
                    hits.append(m.group(1) + " " + token)
            if hits:
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "标准代号后的序号用了本语数字：%s"
                     "（ISPM/HS/ISO 等代号一律写西文阿拉伯数字，证书比对才同号）"
                     % "、".join(sorted(set(hits))[:4])
                     + ("；等共 %d 处" % len(set(hits)) if len(set(hits)) > 4 else ""))


def review(finding, view):
    return finding
