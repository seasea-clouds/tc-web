# -*- coding: utf-8 -*-
"""I09：配图文件名必须可检索（kebab-case 描述）

小写 kebab-case、至少两段、至少 8 字符；cover.webp 豁免。
一律 error。
"""
from core.pkgio import image_name_ok

RULE = "I09"
RULES = [RULE]
PHASE = 80
CATEGORY = "assets"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["images"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['images']}

RATIONALE = {
    RULE: "v1.44 实测：45 张配图全叫 fig-01.webp / img2.webp，"
                    "站点图片搜索结果里全是无意义名，且 CDN 按文件名做去重缓存时"
                    "跨篇撞名。规则只判文件名形状，不判语义是否准确（那要人读图）。"
                    "已交付 35 个 fig-0N 按不追溯原则登记为 warning 欠账。",
}


def run(view, emit):
    for art in view.articles:
        for name in sorted(art.images):
            if name == "cover.webp" or image_name_ok(name):
                continue
            emit(RULE, "error", art.slug,
                 "配图名 %s 不含可检索内容（SEO）：请改成描述画面的 kebab-case "
                 "名称（如 china-food-label-checklist.webp）；cover.webp 是站方"
                 "封面契约、不受此限" % name)


def review(finding, view):
    return finding
