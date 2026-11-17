# -*- coding: utf-8 -*-
"""F01：frontmatter 必须存在且闭合

缺开头的 ---、缺收尾的 ---、字段行结构坏掉都归本条。
解析失败的语向不再进入后续判据（否则每条规则都会跟着报）。
"""
import re

RULE = "F01"
RULES = [RULE]
PHASE = 20
CATEGORY = "frontmatter"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["fm_errors"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['frontmatter', 'body']}

RATIONALE = {
    RULE: "v1.15 实测：某语 mdx 的收尾 `---` 被删（手工删注释时连带删掉），"
                    "整块 frontmatter 变成正文，站方解析不出 title 直接不发布；"
                    "机检当时只报「title 为空」，方向完全错。解析失败必须独立成条。"
                    "v1.90 起附带 heredoc 损坏签名探测——真实事故里 references:/n 把"
                    "字段折成一行，报错给出直接指向比逐个字段排查省一轮。",
}


def run(view, emit):
    for art in view.articles:
        for lg, err in sorted(art.fm_errors.items()):
            src = (art.mdx_info.get(lg) or {}).get("text") or ""
            if re.search(r"(?m)^[A-Za-z_]+:/n", src):
                err = err + ("；检测到字面 \"/n\" 损坏签名（键名后直接跟 /n，应为"
                             "换行符）——批量修复脚本必须写成文件执行，不要经 "
                             "shell heredoc/内联传含 \\n 的字符串")
            emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug), err)


def review(finding, view):
    return finding
