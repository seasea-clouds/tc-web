# -*- coding: utf-8 -*-
"""P97：frontmatter 闭合/字段键位置守卫（压缩改写事故）

REG232 批量压缩脚本用 `head.split("---", 2)[0] + "---\\n\\n" + 正文` 重写文件，
把整段 frontmatter 留成了正文：文件只剩开头一条 `---`、没有收尾分隔线，32 语
frontmatter 整段消失。F01 能报「未闭合」，但报的是字段解析错，作者容易去逐字段
排查；本条直接把「开分隔线数量不足 / 正文以字段键开头」两种事故形状摆出来。
"""
import re

RULE = "P97"
RULES = [RULE]
PHASE = 20
CATEGORY = "frontmatter"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["fm_errors"]
SEVERITY = "error"
ENABLED = True

COVERAGE = {"langs": "all", "zones": ["frontmatter", "body"]}

RATIONALE = {
    RULE: "REG232（2026-11-20 压缩改写事故）：批量脚本把 frontmatter 整段拼进"
          "正文，32 语只剩开头 `---`、没有收尾 `---`，解析器把 title/slug 等字段"
          "当正文。F01 已报「未闭合」，但提示是字段层错误，作者第一反应是逐字段"
          "查，而不是怀疑改写脚本；本条独立判「`^---$` 少于 2 行」与「正文前 10 行"
          "出现 ≥2 个 frontmatter 键」两种事故形状，提示直接指向批量改写/压缩脚本。"
          "健康文件两条都不命中；官方尺 template 基线为零。",
}

_FM_KEYS = re.compile(
    r"(?m)^(title|slug|category|excerpt|doc_number|issuer|published_at|"
    r"effective_at|status|source_url|related_service|references|date|"
    r"author|tags|cover|images|kind):\s*\S")
_CLOSE = re.compile(r"(?m)^---\s*$")


def run(view, emit):
    for art in view.articles:
        for lg, info in sorted(art.mdx_info.items()):
            text = info.get("text") or ""
            if not text:
                continue
            closes = len(_CLOSE.findall(text))
            head = "\n".join(text.splitlines()[:12])
            keys = len(_FM_KEYS.findall(head))
            if text.startswith("---") and closes < 2:
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "frontmatter 只有开分隔线、没有收尾 `---`（`^---$` 实测 %d 行）；"
                     "检查批量改写/压缩脚本是否把 frontmatter 拼进了正文" % closes)
            elif not text.startswith("---") and keys >= 2:
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "文件不以 `---` 开头，正文前 12 行出现 %d 个 frontmatter 字段键；"
                     "frontmatter 疑似整段丢失（压缩/批量改写脚本须保留 12 字段头）"
                     % keys)


def review(finding, view):
    return finding
