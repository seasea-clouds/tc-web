# -*- coding: utf-8 -*-
"""P51：同篇百分号体例必须一致（前缀型 / 后缀型内部不得混写）

sv/cs/el/ro 把列表项写成「21.4%」而正文写「20 %」——同一种语言里两套排版，
读者会以为它们来自两个来源。逐个 % 只归一类（后缀优先），避免同一个 % 被
同时算进前缀与后缀。
"""
import re

from core.consts import P51_NUM, P51_SP

RULE = "P51"
RULES = [RULE]
PHASE = 40
CATEGORY = "text"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["body"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['body']}

RATIONALE = {
    RULE: "v1.55→v1.56 实测（M1 47 语）：sv/cs/el/ro 把列表项写成「21.4%」、正文写"
                    "「20 %」，同篇两套排版；ka 反向（正文一律「20 %」，列表混进"
                    "「17.6%」）。v1.56 把两侧边界对齐：一个 % 归后缀还是前缀只看它左面"
                    "贴不贴数字——旧写法只给后缀加右界、前缀没左界，az「70% 9,1%-ə」的"
                    "% 两头不算、反被读成「% 9,1」前缀，零前缀形的语向就这样被判了"
                    "「前后缀并存」。",
}


def run(view, emit):
    for art in view.articles:
        for lg in sorted(art.parsed):
            body = art.body(lg) or ""
            post, pre = [], []
            for pm in re.finditer(r"%", body):
                left, right = body[:pm.start()], body[pm.start() + 1:]
                lm = re.search(r"(?<![\d.,])" + P51_NUM + "(" + P51_SP + r"*)$",
                               left)
                rm = re.match(r"(" + P51_SP + "*)" + P51_NUM, right)
                if lm:
                    post.append("sp" if lm.group(1) else "ns")
                elif rm:
                    pre.append("sp" if rm.group(1) else "ns")
            post_ns, post_sp = post.count("ns"), post.count("sp")
            pre_ns, pre_sp = pre.count("ns"), pre.count("sp")
            mix = []
            if post_ns and post_sp:
                mix.append("后缀「N%%」%d 处 × 「N %%」%d 处" % (post_ns, post_sp))
            if pre_ns and pre_sp:
                mix.append("前缀「%%N」%d 处 × 「%% N」%d 处" % (pre_ns, pre_sp))
            if (post_ns or post_sp) and (pre_ns or pre_sp):
                mix.append("前缀型与后缀型并存")
            if mix:
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "同篇百分号体例混用：" + "；".join(mix))


def review(finding, view):
    return finding
