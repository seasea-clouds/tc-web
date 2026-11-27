# -*- coding: utf-8 -*-
"""P86：块首重复编号前缀（II. II. / (iii) (иии)）

REG93 实测：ja/ar/sr/bn/ne/he 的标题块在机器翻译后出现「II. II.」「III. Ⅲ．」
「(iii) (иии)」这类同值双前缀。人读时像是格式噪声，但 P21/P23 只核对条目
数与块数，不会发现前缀自身重复，必须单列。

只比较块首前两个 token 的编号值与括号形态；同值同形才报。第二个 token
必须自带 `.`/`)` 编号标点：it「(i) i materiali」的「i」是复数冠词，si
「(2) 2 වන ස්ථරය」的第二个 2 是序数词，都不判。
"""
import re
import unicodedata

RULE = "P86"
RULES = [RULE]
PHASE = 40
CATEGORY = "structure"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed"]
SEVERITY = "error"
ENABLED = True

COVERAGE = {"langs": "all", "zones": ["body"]}

RATIONALE = {
    RULE: "REG93 实测：ja 第 7 块「II. II.」、第 16 块「III. Ⅲ．」，"
                    "sr 第 5/7/14/16/19 块「I. И.」「(iii) (иии)」，"
                    "bn/ne 的「II. ২.」「III. III。」，he 的「I. א.」。这些前缀"
                    "在 26 块结构里不会触发 P21/P23（块数、条目数都对），机检"
                    "PASS 后仍需人工逐语才发现。判据取块首前两个 token，按"
                    "Unicode 罗马数字、西里尔/孟加拉等数字归一后比较数值，且"
                    "要求括号形制相同；同值同形即报。第二个 token 没有编号标点"
                    "（it 的「(i) i materiali」、si 的「(2) 2 ...」）不判。"
                    "档位 error：重复编号会直接"
                    "印在成品标题上。",
}

_TOKEN_RE = re.compile(r"[^\s]+")
_ROMAN_RE = re.compile(r"(?i)^[ivxlcdm]+$")
_ROMAN = {"i": 1, "v": 5, "x": 10, "l": 50, "c": 100, "d": 500, "m": 1000}


def _marker(tok):
    """返回 (数值, 形制)；形制为 paren / dot / bare，非编号返回 (None, "")。"""
    raw = tok.strip().strip("*").strip().replace("\u200b", "")
    style = "paren" if "(" in raw else ("dot" if ("." in raw or "．" in raw or ")" in raw) else "bare")
    t = raw.replace("(", "").replace(")", "").replace(".", "").replace("．", "")
    t = unicodedata.normalize("NFKC", t)
    if not t or len(t) > 8:
        return None, ""
    t = t.replace("И", "I").replace("и", "i").replace("І", "I").replace("і", "i")
    if _ROMAN_RE.match(t):
        total, prev = 0, 0
        for ch in reversed(t.lower()):
            v = _ROMAN.get(ch)
            if v is None:
                return None, ""
            total = total - v if v < prev else total + v
            prev = max(prev, v)
        return total, style
    digits = []
    for ch in t:
        if ch.isdigit():
            digits.append(str(unicodedata.digit(ch)))
        else:
            return None, ""
    return (int("".join(digits)), style) if digits else (None, "")


def run(view, emit):
    for art in view.articles:
        for lg in sorted(art.parsed):
            for bi, block in enumerate(art.blocks(lg), 1):
                toks = _TOKEN_RE.findall(block.strip())
                if len(toks) < 2:
                    continue
                (a, sa), (b, sb) = _marker(toks[0]), _marker(toks[1])
                if a is None or b is None or a != b:
                    continue
                # 第二个 token 必须自带编号标点：it「(i) i materiali」里的
                # 「i」是意大利语复数冠词，不是重复罗马数字。
                if sa == sb and sa in ("paren", "dot"):
                    emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                         "第 %d 块块首重复编号前缀：%s %s"
                         % (bi, toks[0][:12], toks[1][:12]))


def review(finding, view):
    return finding
