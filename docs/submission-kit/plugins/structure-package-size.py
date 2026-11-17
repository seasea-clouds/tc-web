# -*- coding: utf-8 -*-
"""S06：体积上限 —— 单包 ≤ 60 MB，单语 mdx ≤ 100 KB。

两个红面共用一条规则：站点侧对大包直接拒收，对单文件过大在渲染层截断，
两者都表现为「投稿失败但不给原因」。分档给出具体体积，修复方向不同。
"""
from core.consts import MAX_PACKAGE_BYTES

RULE = "S06"
RULES = [RULE]
PHASE = 10
CATEGORY = "structure"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["sizes"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['package', 'body']}

RATIONALE = {
    RULE: "包级 60 MB 上限来自站点上传接口的实际限制；单语 mdx 100 KB 上限来自"
          "REG16（138 号）48 语包的实测——官方全文型法规单语约 40 KB，超过 100 KB "
          "的样本全部是误把整页 HTML 粘进正文。两个红面合并成一条规则，是因为"
          "修复动作同源（删冗余、拆页），分成两条会让同一篇报两遍。",
}


def run(view, emit):
    if view.total_bytes > MAX_PACKAGE_BYTES:
        emit(RULE, SEVERITY, "-", "包总大小 %.1f MB > 60 MB"
             % (view.total_bytes / 1048576.0))
    for art in view.articles:
        for lg in art.oversized_mdx:
            emit(RULE, SEVERITY, art.slug, "%s/%s.mdx 超过 100KB" % (lg, art.slug))


def review(finding, view):
    return finding
