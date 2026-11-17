# -*- coding: utf-8 -*-
"""P66：中文「我国」= 中国（发布方），不得译成目标语读者本国视角

公告发布方是中国，译文不能写「我が国／우리나라／ons land／vårt land／nước ta」
一类读者本国视角，一律用该语的「中国」词形。条件完全由 zh 母版内容驱动。
"""
from plugins._language import check_self_country

RULE = "P66"
RULES = [RULE]
PHASE = 70
CATEGORY = "language"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed", "master"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['body']}

RATIONALE = {
    RULE: "v2.19 实测（REG18 三轮审计）：27 语 57 处把「我国」译成目标语读者本国"
                    "视角（我が国／우리나라／ons land／vårt land／nước ta）——公告发布方"
                    "是中国，读者读完会以为法规由本国发布，责任主体整个错位；前两轮分组"
                    "子代理判全 CLEAN，第三轮主线程逐篇直读才抓出。法规新篇 error、已交付"
                    "成品按不追溯铁律聚合 warning，博客 warning 交人工判定。",
}


def run(view, emit):
    def _add(rule, sev, loc, detail):
        emit(rule, sev, loc, detail)

    for art in view.articles:
        ctx = getattr(art.pkg, "ctx", None)
        ml = (getattr(ctx, "master_lang", None)
              or ("zh" if "zh" in art.parsed
                  else "en" if "en" in art.parsed
                  else (sorted(art.parsed)[0] if art.parsed else "zh")))
        check_self_country(view, art.body(ml) or "", art.parsed, art.slug, ml, _add)


def review(finding, view):
    return finding
