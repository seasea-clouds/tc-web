# -*- coding: utf-8 -*-
"""P61：希腊语「;」是问号，分号应为 άνω τελεία「·」(U+0387)

判据：块内「;」后跟（可跨空白）希腊小写字母 ⇒ 分号位误用问号。句末真问号
后面不接小写字母，天然豁免。

v2.26 补一类：行尾「;」作列表/枚举分隔（后接下一项「- …」或「(2) …」）。
旧判据只看「; 后跟小写字母」，行尾分隔整片漏判（G5 审计 13 处、C6 5 处、
REG9 4 处）。新判据要求该行自身也是列表项、下一条非空行也是列表项——
句末真问号即使引出列表（C1 el 第 18 行问句后接正文段落）也不点火。
"""
import re

RULE = "P61"
RULES = [RULE]
PHASE = 60
CATEGORY = "language"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed", "master"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": ["el"], "zones": ['body']}

RATIONALE = {
    RULE: "v2.02 实测（REG10 审计）：el 12 处把分号写成「;」，希腊读者读成问号，"
                    "整句变成疑问句、语义反了。希腊语分号是 άνω τελεία「·」(U+0387)，"
                    "「;」在希腊键盘上就是问号键。判据只在「; 后跟希腊小写字母」时点火："
                    "句末问号后不接小写，负控（句末「;」与拉丁串）实测不判。"
                    "v2.26（G5 审计）补行尾列表分隔：13 处「;」后接下一项「- …」或"
                    "「(2) …」，旧射线看不到；新射线要求本行与下一非空行都是列表项，"
                    "C1 el 第 18 行「真问号 + 正文段落」是负控、不点火。",
}

_EL_SEMI_RE = re.compile(r";(?=\s*[\u03ac-\u03af\u03cc-\u03ce\u03b1-\u03c9])")

# 列表/枚举项：`- `、`* `、`• `、`(2) `、`2. `。行尾「;」在两项之间是分隔位，
# 不可能是问号；但只有「本行也是列表项」才能把真问句引出的列表排除在外。
_LIST_ITEM_RE = re.compile(r"^[ \t]*(?:[-*\u2022]|\(\d+\)|\d+[.)])[ \t]")


def _list_separator_hits(body):
    """返回 [(行号, 行尾片段)]：行尾「;」后接下一列表项。"""
    lines = body.split("\n")
    hits = []
    for i, raw in enumerate(lines):
        ln = raw.rstrip("\r")
        if not ln.rstrip().endswith(";") or not _LIST_ITEM_RE.match(ln):
            continue
        for j in range(i + 1, len(lines)):
            if not lines[j].strip():
                continue
            if _LIST_ITEM_RE.match(lines[j]):
                hits.append((i + 1, ln.strip()[-60:]))
            break
    return hits


def run(view, emit):
    for art in view.articles:
        if "el" not in art.parsed:
            continue
        body = art.body("el") or ""
        hits = []
        for pi, blk in enumerate([p for p in body.split(chr(10) + chr(10))
                                  if p.strip()]):
            for m in _EL_SEMI_RE.finditer(blk):
                hits.append(u"块%d …%r…"
                            % (pi + 1,
                               blk[max(0, m.start() - 12):m.end() + 12]))
        for ln, ex in _list_separator_hits(body):
            hits.append(u"行%d 列表分隔 …%s…" % (ln, ex))
        if hits:
            emit(RULE, SEVERITY, "el/%s" % art.slug,
                 u"希腊语分号误用：「;」在希腊语中是问号，分号应为「·」(U+0387) "
                 + u"；".join(hits[:3])
                 + (u"；等共 %d 处" % len(hits) if len(hits) > 3 else u""))


def review(finding, view):
    return finding
