# -*- coding: utf-8 -*-
"""P27：行内链接目标必须与母版一致

链接目标去掉语言前缀后比对（CTA 在每个语向都写 /<lang>/packages/，前缀本身
不参与比较）。指向错误的站内路径会让读者点进另一个栏目。
"""
from core.textutil import _blocks_by_kind, _link_dim

RULE = "P27"
RULES = [RULE]
PHASE = 60
CATEGORY = "parity"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed", "master", "outline"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['body']}

RATIONALE = {
    RULE: "自 v1.20 起实测：某语 CTA 从 /packages/ 被改成 /pricing/，链接文案"
                    "与目标页不匹配，读者点进去看到的是价格页而不是联系页；"
                    "另有语向把相对路径写成绝对域名，跨站跳转丢参数。P23 的逐块大纲"
                    "里 PARA 第 4 维就是链接目标，但报的是「块规模不符」，"
                    "定位不到是链接变了还是段落变了，因此本条单独出、直接打印两个"
                    "链接串。语言前缀由 _link_shape 归一化，语言写错归 P29 管。",
}


def run(view, emit):
    for art in view.articles:
        if not art.parity_on:
            continue
        ml = art.master_lang
        base = _blocks_by_kind(art.outline(ml))
        for lg in sorted(art.parsed):
            if lg == ml:
                continue
            cur = _blocks_by_kind(art.outline(lg))
            for k, base_blocks in base.items():
                cur_blocks = cur.get(k, [])
                for n, (_bi, d) in enumerate(base_blocks):
                    if n >= len(cur_blocks):
                        continue
                    _ci, cd = cur_blocks[n]
                    base_links = _link_dim(d, k)
                    cur_links = _link_dim(cd, k)
                    if base_links != cur_links:
                        emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                             "第%d个%s块 链接目标与 %s 不一致：基准 %s，本语言 %s"
                             % (n + 1, k, ml,
                                "/".join(base_links) or "-",
                                "/".join(cur_links) or "-"))


def review(finding, view):
    return finding
