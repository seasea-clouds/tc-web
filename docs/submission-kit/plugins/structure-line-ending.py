# -*- coding: utf-8 -*-
"""S07：行尾与 BOM 卫生 —— 一律 LF、无 BOM。

这条不是洁癖：CRLF 会让「按空行切块」失效，P21–P27 的块大纲比对、
S08 块级术语契约会全线假红（2026-11 多次踩到，误判成内容错）。

两个红面：mdx 与 submission.json 的提示文案不同 —— mdx 要顺带点明
「会让块级判据全线误报」的后果，json 只报卫生问题本身。
"""

RULE = "S07"
RULES = [RULE]
PHASE = 10
CATEGORY = "structure"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["line_issues"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['frontmatter', 'body']}

RATIONALE = {
    RULE: "2026-11-07 实测（C1 起手阶段）：Write 工具与部分编辑器在 Windows 上落 CRLF，"
          "mdx 整篇被切成 1 块，P21/P22/P23/P27 全红且报的是「块数 1 vs 48」——"
          "看起来像内容缺失，实际是行尾。三保险已落地：.gitattributes、build 归一化、"
          "本条判据。submission.json 的 CRLF 会让 M09/M12 的字符串比对带上 \\r，同样致命。",
}


def run(view, emit):
    for art in view.articles:
        for tail, issues in sorted(art.line_issues.items()):
            for iss in issues:
                if tail == "submission.json":
                    emit(RULE, SEVERITY, art.slug,
                         "submission.json %s（必须为 LF、无 BOM）" % iss)
                else:
                    emit(RULE, SEVERITY, art.slug,
                         "%s %s（必须为 LF、无 BOM；CRLF 会使正文分块检查 "
                         "P21-P24/P27 全线误报）" % (tail, iss))


def review(finding, view):
    return finding
