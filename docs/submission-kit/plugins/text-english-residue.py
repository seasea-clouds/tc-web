# -*- coding: utf-8 -*-
"""P52：拉丁语向残留英文词（语法词形必须翻，行业借词交人工）

两种档位：硬档（p52-residue-hard）里是语法功能词（the/and/of/with），残留即 error；
软档（p52-residue-soft）是行业借词（compliance/clearance），warning 交人工裁定。
词形与射程语向都在 `lexicons` 的 phrase-block（用途 p52-residue-hard /
p52-residue-soft / p52-latin-langs），增补改库即可，不动代码。
"""
import re

from plugins._lexicon import phrase_block

RULE = "P52"
RULES = [RULE]
PHASE = 40
CATEGORY = "text"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed", "master"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['body', 'frontmatter']}

RATIONALE = {
    RULE: "v1.56 实测：某语（拉丁语向）正文里留着英文 the / and / of，句子里本语词"
                    "与英文功能词混排，读者一眼看出是机器拼接。两档分开的理由：功能词"
                    "残留是明确的未译（error），行业借词（compliance officer）在部分语向"
                    "确属惯例（warning）。射程只含 P52_LATIN_LANGS——非拉丁语向的英文"
                    "残留归 P30，两条口径不同（那边判「不该出现拉丁词」，这边判「该译"
                    "没译」）。母版语向自身不判。",
}


def run(view, emit):
    # 三个用途各自显式传字面量：rule_data_audit 靠扫描 phrase_block 调用点的
    # 字符串字面量核对「插件声明的数据源在库里是否有效行」，变量传参会把
    # 数据源藏进变量名里，被判空转（W3）。
    langs = {v for v, _m in
             phrase_block(view, "p52-latin-langs").get("*", ())}
    hard = [v for v, _m in
            phrase_block(view, "p52-residue-hard").get("*", ())]
    soft = [v for v, _m in
            phrase_block(view, "p52-residue-soft").get("*", ())]
    tiers = (("error", hard), ("warning", soft))
    for art in view.articles:
        ml = art.master_lang
        for lg in sorted(art.parsed):
            if lg not in langs or lg == ml:
                continue
            fm = art.fm(lg) or {}
            whole = "\n".join([art.body(lg) or "",
                               str(fm.get("excerpt", "")),
                               str(fm.get("title", ""))])
            scan = re.sub(r"!?\[[^\]]*\]\([^)]*\)", " ", whole).lower()
            for tier, words in tiers:
                for w in words:
                    n = len(re.findall(r"(?<![a-z])" + w + r"(?![a-z])", scan))
                    if n:
                        emit(RULE, tier, "%s/%s" % (lg, art.slug),
                             "拉丁语向残留英文词 %r ×%d（本语应有词形；"
                             "行业借词请人工裁定，语法词形必须翻）" % (w, n))


def review(finding, view):
    return finding
