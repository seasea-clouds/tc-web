# -*- coding: utf-8 -*-
"""P95：正文不得用 ASCII 直双引号当作引号

REG232 全语审计实测：多语正文残留 ASCII `"` 成对引号，P81 只判词内紧贴字母的
形状，P60 只判 `„` 开头的闭引号错族，整段 `"text"` 无人拦。站点排版要求各语
使用本语引号形制（“…” / „…“ / «…» / 「…」），ASCII 直引号是英文排版残留。
本条剥代码围栏、行内代码、Markdown 链接目标后，正文任何 ASCII `"` 即报。
"""
import re

RULE = "P95"
RULES = [RULE]
PHASE = 60
CATEGORY = "text"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed"]
SEVERITY = "error"
ENABLED = True

COVERAGE = {"langs": "all", "zones": ["body"]}

RATIONALE = {
    RULE: "REG232（市场监管总局 2025 年第 57 号公告，2026-11-20 逐语审计）："
          "47 语正文统一清洗 ASCII 直引号后仍有语向残留；P81 的拉丁语向臂只认"
          "「引号左右都是字母」的词内形状，P60 只认 `„` 开头的闭引号错族，"
          "`He said \"yes\"` 这类成对直引号两条都不报。本条按「正文任何 ASCII "
          "直双引号即错」立规，剥代码/链接后判，跨语向通用；单引号不判，"
          "拉丁语向撇号（d'ús / l'emploi）与白俄·乌克兰原生撇号整族放行。"
          "官方尺 template/{blog,regulation} 正文零 ASCII 直引号，基线干净。",
}

_FENCE_RE = re.compile(r"```.*?```", re.S)
_INLINE_RE = re.compile(r"`[^`\n]+`")
_LINK_RE = re.compile(r"!?\[[^\]]*\]\([^)]*\)")


def _clean(body):
    text = _FENCE_RE.sub(" ", body or "")
    text = _INLINE_RE.sub(" ", text)
    text = _LINK_RE.sub(" ", text)
    return text


def run(view, emit):
    for art in view.articles:
        for lg in sorted(art.parsed):
            body = art.body(lg) or ""
            clean = _clean(body)
            if '"' not in clean:
                continue
            hits = clean.count('"')
            first = clean.find('"')
            line = clean.count("\n", 0, first) + 1
            emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                 "正文第 %d 行出现 ASCII 直双引号（共 %d 处）；应改用本语引号"
                 "（“…” / „…“ / «…» / 「…」），代码与链接已剥离" % (line, hits))


def review(finding, view):
    return finding
