# -*- coding: utf-8 -*-
"""P80：块内序号标记前必须有分隔（归并丢层的高发形状）

把多块合并成一段时，若原块以 `1. ` 这类行首序号开头，拼接后序号会直接贴在
上一条末尾：ja 实测 `Achatina fulica2.`、`Race 46.`——读者看到的是 46 号，
不是「Race 4」+「6.」。markdown 也不会渲染成列表，机检此前全绿。
判据用母版同块的序号集合做锚：译文同块里，凡末位构成母版序号的点号，其前一位
必须是空白/标点/行首；紧贴字母或数字即红。四位数年份（1900–2100）不参与判定。
"""
import re
import unicodedata

RULE = "P80"
RULES = [RULE]
PHASE = 60
CATEGORY = "parity"
APPLIES_TO = ["regulation"]
NEEDS = ["parsed", "master"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ["body"]}

RATIONALE = {
    RULE: "v2.24 立规（REG109 ja 实证）：22 块归并后七项有害生物挤成一段，"
                    "`fulica2.` / `lilacinus7.` / `Race 46.` 三形同现。R22 只管行首"
                    "列表，P23 只管块大纲，块内序号粘连无人管。判据按母版序号做锚、"
                    "按 Unicode 类别判前一位，不绑语向、不绑篇目。",
}

_MARK_RE = re.compile(r"(?<!\d)(\d{1,2})[.)．]")
_DOT_RE = re.compile(r"[.)．]")


def _markers(block):
    return {int(m) for m in _MARK_RE.findall(block) if 1 <= int(m) <= 99}


def _sep(ch):
    if not ch:
        return True
    if ch.isspace():
        return True
    cat = unicodedata.category(ch)
    return cat.startswith("P") or cat.startswith("Z")


def run(view, emit):
    for art in view.articles:
        ml = art.master_lang
        if "<!-- original -->" not in art.master_body:
            continue
        by_block = [_markers(b) for b in art.blocks(ml)]
        if not any(by_block):
            continue
        for lg in sorted(art.parsed):
            if lg == ml:
                continue
            cur = art.blocks(lg)
            for bi, marks in enumerate(by_block):
                if not marks or bi >= len(cur):
                    continue
                text = cur[bi]
                hits = []
                for d in _DOT_RE.finditer(text):
                    if d.end() < len(text) and text[d.end()].isdigit():
                        continue                      # 小数/编号延续，不是序号
                    run_m = re.search(r"(\d+)$", text[:d.start()])
                    if not run_m:
                        continue                      # 无数字前缀，不是序号
                    digits = run_m.group(1)
                    val = int(digits)
                    if len(digits) > 1:
                        continue                      # 多位数不参与：46/15 一类歧义太大
                    if text[d.start()] == ")":
                        # 「)」只在「(N)」或「N) 项」形态里算序号；TR4) 这类缩写不算
                        left = text[run_m.start() - 1] if run_m.start() else ""
                        if left != "(" and not _sep(left):
                            continue
                    if val not in marks:
                        continue
                    before = text[run_m.start() - 1] if run_m.start() else ""
                    if not _sep(before):
                        hits.append("%s%s" % (digits, text[d.start()]))
                if hits:
                    emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                         "第%d块序号标记紧贴前文：%s（合并块丢分隔，须补「；」或空格）"
                         % (bi + 1, "、".join(hits[:3])))


def review(finding, view):
    return finding
