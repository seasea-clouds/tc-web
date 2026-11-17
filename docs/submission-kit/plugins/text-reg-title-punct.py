# -*- coding: utf-8 -*-
"""R20：法规译文标题的标点/空格式必须与中文母版一致

以 zh 母版标题的标点类别计数为基准逐类比对；首尾空格、连续空格、末尾标点
单独判。多一个冒号、多一对括号都算不合格。
"""
import re

from core.consts import _REG_PUNCT_GROUPS

RULE = "R20"
RULES = [RULE]
PHASE = 40
CATEGORY = "text"
APPLIES_TO = ["regulation"]
NEEDS = ["parsed", "master"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['frontmatter']}

RATIONALE = {
    RULE: "v1.65 用户要求「标题格式一样」：母版「关于进口食品境外生产企业注册的"
                    "公告」翻成 ca 时写成「Anunci sobre el registre d'importadors: "
                    "aliments」，多一个冒号，列表页标题截断处正好在冒号上。v1.68 修两处"
                    "口径——① 基准标题必须在解析循环之前单独取 zh（循环内读 parsed['zh'] "
                    "恒空，标点对照从未生效）；② 词内撇号与词内连字符属正字法（ca/fr 的 "
                    "d'importadors、hu 的 élelmiszer-előállítók），按标点计数会把正确译文"
                    "判红，两侧都是字母数字的 ' ’ - 跳过。",
}

_ORTHO = "'\u2019-"


def _punct_profile(text):
    """把标题里的标点按类别计数；词内撇号/连字符属正字法，不计入。"""
    prof = {}
    for name, chars in _REG_PUNCT_GROUPS:
        n = 0
        for i, ch in enumerate(text):
            if ch not in chars:
                continue
            if ch in _ORTHO and 0 < i < len(text) - 1 \
                    and text[i - 1].isalnum() and text[i + 1].isalnum():
                continue
            n += 1
        if n:
            prof[name] = n
    return prof


def _title_errors(title, base_title):
    errs = []
    if title != title.strip():
        errs.append("标题首尾不得有空格")
    if re.search(r"\s{2,}", title):
        errs.append("标题不得出现连续空格")
    if "\n" in title or "\t" in title:
        errs.append("标题不得含换行/制表符")
    if title.strip() and title.strip()[-1] in ".。;；,，:：、":
        errs.append("标题末尾不得有标点（当前以 %r 结尾）" % title.strip()[-1])
    if base_title:
        base = _punct_profile(base_title)
        cur = _punct_profile(title.strip())
        for name in sorted(set(base) | set(cur)):
            b, c = base.get(name, 0), cur.get(name, 0)
            if b != c:
                errs.append(
                    "标题标点与中文母版不一致：%s 类 母版 %d 个 / 译文 %d 个"
                    "（母版 %r）" % (name, b, c, base_title[:40]))
    return errs


def run(view, emit):
    for art in view.articles:
        if not art.is_reg:
            continue
        # 基准恒取 zh 母版；缺 zh 时只判形态（与历史口径一致：单语法规无标点对照面）
        base_title = str((art.fm("zh") or {}).get("title") or "")
        for lg in sorted(art.parsed):
            title = str((art.fm(lg) or {}).get("title") or "")
            for msg in _title_errors(title, base_title if lg != "zh" else ""):
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug), msg)


def review(finding, view):
    return finding
