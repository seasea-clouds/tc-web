# -*- coding: utf-8 -*-
"""F09：frontmatter 必须能被 YAML 解析

装了 PyYAML 用 safe_load 权威校验，否则退回内置子集校验；
键名后跟字面 /n 的 heredoc 损坏签名单独报。
"""
import re

from core import frontmatter as _fm
from core.frontmatter import extract_fm_raw, yaml_check

RULE = "F09"
RULES = [RULE]
PHASE = 20
CATEGORY = "frontmatter"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["mdx"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['frontmatter']}

RATIONALE = {
    RULE: "v1.18 实测：excerpt 裸值含 `': '`（枚举式 ` Vier lae: ...`），"
                    "gray-matter 把它解析成嵌套 map，整段摘要在页面上变成 `[object Object]`；"
                    "内置子集校验能定位到具体行。v1.90 另抓 `references:/n` 这类"
                    "字面 /n 签名——它是合法 YAML（值成了字符串），YAML 校验看不见，"
                    "必须按签名独立报。",
}


def run(view, emit):
    for art in view.articles:
        # 注意：不能用 art.langs —— 那是「解析成功」的语向集合，而 YAML 坏掉
        # 恰恰会让该语向解析失败，于是最该报的那一档被静默跳过（自检实测）。
        # 这里按 mdx 文件存在性遍历，解析失败也照报。
        for lg, rec in sorted(art.mdx_info.items()):
            src = rec.get("text") or ""
            if not src or rec.get("fname") != art.slug:
                continue
            yraw = extract_fm_raw(src)
            if yraw is None:
                continue
            tag = "%s/%s" % (lg, art.slug)
            sig = re.search(r"(?m)^[A-Za-z_]+:/n", yraw)
            if sig:
                emit(RULE, SEVERITY, tag,
                     "frontmatter 第 %d 行出现字面 \"/n\" 损坏签名（键名后直接"
                     "跟 /n，应为换行符）——批量修复脚本必须写成文件执行，"
                     "不要经 shell heredoc/内联传含 \\n 的字符串"
                     % (yraw[:sig.start()].count("\n") + 1))
            yerr = yaml_check(yraw)
            if yerr:
                emit(RULE, SEVERITY, tag,
                     "frontmatter 无法被 YAML 解析（%s）: %s"
                     % ("PyYAML" if _fm._pyyaml is not None else "内置校验", yerr))


def review(finding, view):
    return finding
