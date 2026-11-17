# -*- coding: utf-8 -*-
"""中文母版审核预览页生成（博客 / 法规通用）。

把条目的 zh 母版渲染成独立 HTML（preview_zh.html），供「先审后译」流程的
人工审核：过审前不进入翻译与打包。两种线共用同一套版式：

- blog：封面图 + category/date 元信息 + 正文 + 参考出处；
- regulation：doc_number/issuer/status 元信息 + 解读正文，遇到
  ``<!-- original -->`` 标记插入「官方原文（译本）」分隔条后继续渲染。

只解析站方用到的 markdown 子集：## / ### 小节、- 列表、管道表格、
![alt](src)、[文字](链接)、**加粗**、段落。frontmatter 解析复用
core.frontmatter.parse_frontmatter（与判据同一份解析器，预览看到的字段
就是检查看到的字段）。

【表格渲染 v2.15 / 2026-11-10 O7 实测回流】此前 _blocks_html 只认标题/列表/
图片，其余一律按段落 join 成 `<p>`，导致源页逐块全覆盖写进母版的 markdown
表格在审核页被压成一行 `| 页面 | 字段 | ... |` 长串（O7 p071 七行七列字段
核对表，452 字符），审核者无法逐行核对字段、校验规则与责任人——而「先审后译」
闸门的唯一凭据就是这张审核页。O6 已交付母版里的 SKU 准入分级表同样被压平，
属跨篇通用缺陷，故改内核渲染器而非单篇绕过：
  * 识别条件：块内每行以 `|` 开头、至少 2 行、第 2 行为 `---` 分隔行；
  * 表头进 `<thead><th>`，分隔行不产出，数据行进 `<tbody><td>`；
  * 单元格仍走 _inline（HTML 转义 + 加粗 + 链接），不做额外解析；
  * 列数不齐不丢字：少列补空 td，多列余下内容并入末格；
  * 非表格块（含单个含 `|` 的散文段落）渲染路径完全不变，零回归。
表格形状的回归靠 preview 实跑对读。

站点绝对路径的配图（/images/<kind>/<slug>/x.webp）唯一映射到
条目的 images/<slug>/（与 content/ 同级；真实条目即
work/<kind>/<slug>/images/<slug>/）；存在时以 data URI 内嵌（v2.14：
Windows 查看器按 260 MAX_PATH 解析相对路径，C2 实测正文图绝对路径
275/276 字符致「文件不存在」、封面 223 字符正常——内嵌后审核页自包含，
不依赖查看器的磁盘路径解析）；不存在时保留原路径（预览中显示
alt 占位）。
"""
# 治理声明：本文件属机制层，不承载策略数据；改动须走 README「治理」节的 L3 流程
#（先登记理由 → 行为级等价断言 → selftest --kit 全量），提交说明带 [arch]
#（commit-msg 钩子强制）。策略变更请改 plugins/ 判据或经 submit.py glossary 改库。
import base64
import html
import os
import re

from .frontmatter import parse_frontmatter

_KIND_LABEL = {"blog": "博客", "regulation": "法规"}


def _inline(text):
    """转义 HTML 后还原 **加粗** 与 [文字](链接)。"""
    text = html.escape(text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(
        r"\[([^\]]+)\]\(([^)]+)\)",
        lambda m: '<a href="%s">%s</a>' % (m.group(2), m.group(1)),
        text)
    return text


def _data_uri(p):
    """配图内嵌为 data URI（审核页自包含，绕开查看器 MAX_PATH 限制）。"""
    mime = {".webp": "image/webp", ".png": "image/png",
            ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
            ".gif": "image/gif"}.get(os.path.splitext(p)[1].lower(),
                                     "image/webp")
    with open(p, "rb") as fh:
        return "data:%s;base64,%s" % (mime, base64.b64encode(
            fh.read()).decode("ascii"))


def _img_map(slug_dir, entry_root, slug, src):
    """把站点绝对图片路径映射到配图唯一位置：<条目>/<slug>/images/<slug>/。

    配图一律与 content/ 同级（真实条目即 work/<kind>/<slug>/images/<slug>/
    ——唯一确定，无第二候选）；本地存在时内嵌 data URI（v2.14 MAX_PATH），
    缺失时保留原路径（预览显示 alt 占位）。
    """
    if not src.startswith("/images/"):
        return src
    p = os.path.join(slug_dir, "images", slug, os.path.basename(src))
    if os.path.isfile(p):
        return _data_uri(p)
    return src


_TABLE_SEP_RE = re.compile(r"^\s*:?-{3,}:?\s*$")


def _table_cells(line):
    """拆一行管道表格；去掉首尾管道，单元格 strip（不做转义管道解析）。"""
    s = line.strip()
    if s.startswith("|"):
        s = s[1:]
    if s.endswith("|"):
        s = s[:-1]
    return [c.strip() for c in s.split("|")]


def _is_table_block(lines):
    """表格块：每行以 | 开头、≥2 行、第 2 行是 --- 分隔行。

    射程刻意收窄：单个含 `|` 的散文段落、竖线列举、代码块都不进表格路径，
    保证存量 53 包预览渲染零回归。
    """
    if len(lines) < 2 or not all(l.strip().startswith("|") for l in lines):
        return False
    sep = _table_cells(lines[1])
    return bool(sep) and all(_TABLE_SEP_RE.match(c) for c in sep)


def _table_html(lines):
    """按 v2.15 口径渲染 markdown 管道表格；分隔行丢弃，列数不齐不丢字。"""
    rows = [_table_cells(l) for l in lines]
    head, sep, data = rows[0], rows[1], rows[2:]
    ncol = len(head)
    out = ['<table class="md-table">', "  <thead>", "    <tr>"]
    for c in head:
        out.append("      <th>%s</th>" % _inline(c))
    out += ["    </tr>", "  </thead>", "  <tbody>"]
    for row in data:
        cells = list(row[:ncol]) + [""] * max(0, ncol - len(row))
        if len(row) > ncol:
            cells[-1] = " ".join([cells[-1]] + row[ncol:]).strip()
        out.append("    <tr>")
        for c in cells:
            out.append("      <td>%s</td>" % _inline(c))
        out.append("    </tr>")
    out += ["  </tbody>", "</table>"]
    return "\n".join(out)


def _body_html(body, slug_dir, entry_root, slug):
    # 官方原文分隔（法规）：<!-- original --> 之前是解读，之后是全文译本
    parts = re.split(r"<!--\s*original\s*-->", body)
    chunks = []
    for i, part in enumerate(parts):
        if i:
            chunks.append('<div class="original-divider">官方原文（译本）</div>')
        chunks.append(_blocks_html(part, slug_dir, entry_root, slug))
    return "\n\n".join(chunks)


def _blocks_html(body, slug_dir, entry_root, slug):
    blocks = [b.strip("\n") for b in re.split(r"\n\s*\n", body.strip()) if b.strip()]
    out = []
    for block in blocks:
        lines = block.split("\n")
        if block.startswith("### "):
            out.append("<h3>%s</h3>" % _inline(block[4:].strip()))
            continue
        if block.startswith("## "):
            out.append("<h2>%s</h2>" % _inline(block[3:].strip()))
            continue
        if _is_table_block(lines):
            out.append(_table_html(lines))
            continue
        if all(line.startswith("- ") for line in lines):
            out.append("<ul>")
            for line in lines:
                out.append("  <li>%s</li>" % _inline(line[2:].strip()))
            out.append("</ul>")
            continue
        m = re.match(r"!\[([^\]]*)\]\(([^)]+)\)", block.strip())
        if m:
            alt, src = m.group(1), _img_map(slug_dir, entry_root, slug,
                                            m.group(2))
            out.append(
                '<figure>\n  <img src="%s" alt="%s">'
                '\n  <figcaption>%s</figcaption>\n</figure>'
                % (html.escape(src), html.escape(alt), html.escape(alt)))
            continue
        cls = "cta-box" if "](/zh/packages/)" in block else None
        p = "<p>%s</p>" % _inline(" ".join(x.strip() for x in lines))
        out.append('<div class="cta-box">%s</div>' % p if cls else p)
    return "\n\n".join(out)


def _meta_row(meta, kind):
    bits = ['<span class="cat">%s</span>'
            % html.escape(str(meta.get("category") or ""))]
    if kind == "blog":
        bits.append("<span>%s</span>" % html.escape(str(meta.get("date") or "")))
    else:
        bits.append("<span>%s</span>"
                    % html.escape(str(meta.get("doc_number") or "")))
        bits.append("<span>%s</span>" % html.escape(str(meta.get("issuer") or "")))
        bits.append("<span>发布 %s · 施行 %s</span>"
                    % (html.escape(str(meta.get("published_at") or "")),
                       html.escape(str(meta.get("effective_at") or ""))))
    return "\n    ".join(bits)


def _refs_html(meta):
    refs = meta.get("references") or []
    if not refs:
        return ""
    items = "\n".join(
        '      <li>%s%s</li>'
        % (html.escape(str(r.get("title") or "")),
           ('<br><span class="url">%s</span>'
            % html.escape(re.sub(r"^https?://", "", str(r.get("url") or ""))))
           if r.get("url") else "")
        for r in refs)
    return ('  <div class="refs">\n    <h3>参 考 出 处</h3>\n    <ol>\n%s\n'
            "    </ol>\n  </div>" % items)


def _cover_html(slug_dir, entry_root, slug, kind):
    if kind != "blog":
        return ""
    p = os.path.join(slug_dir, "images", slug, "cover.webp")
    if os.path.isfile(p):
        return '\n  <img class="cover" src="%s" alt="封面">\n' % _data_uri(p)
    return ""


_PAGE = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>%(title)s · 中文版预览（审核用）</title>
<style>
  :root {
    --ink: #2b2b2b; --muted: #6b6b6b; --accent: #1A4778;
    --accent-soft: #eaf1f8; --line: #dde5ee; --bg: #f7f9fc;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: "Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif;
    color: var(--ink); background: var(--bg);
    line-height: 1.9; font-size: 16.5px;
  }
  .review-banner {
    background: #2f4f4f; color: #fff; text-align: center;
    padding: 10px 16px; font-size: 14px; letter-spacing: 1px;
  }
  .page { max-width: 780px; margin: 0 auto; padding: 40px 24px 80px; }
  .cover {
    width: 100%%; border-radius: 6px; display: block;
    box-shadow: 0 4px 18px rgba(0,0,0,.12);
  }
  .meta-row {
    display: flex; gap: 14px; align-items: center;
    margin: 26px 0 10px; font-size: 13.5px; color: var(--muted); flex-wrap: wrap;
  }
  .meta-row .cat {
    background: var(--accent-soft); color: var(--accent);
    padding: 3px 12px; border-radius: 999px; font-weight: 600;
  }
  h1 { font-size: 30px; line-height: 1.45; margin: 8px 0 14px; letter-spacing: .5px; }
  .excerpt {
    color: var(--muted); font-size: 16px;
    border-left: 3px solid var(--accent); padding-left: 14px; margin-bottom: 8px;
  }
  .body { margin-top: 34px; }
  .body p { margin: 18px 0; text-align: justify; }
  .body h2 {
    font-size: 21.5px; margin: 44px 0 6px;
    padding-bottom: 8px; border-bottom: 1px solid var(--line);
  }
  .body h2::before {
    content: ""; display: inline-block; width: 8px; height: 8px;
    background: var(--accent); border-radius: 50%%;
    margin-right: 10px; vertical-align: 3px;
  }
  .body h3 { font-size: 18px; margin: 30px 0 4px; }
  .body ul { margin: 14px 0 14px 4px; list-style: none; }
  .body ul li { position: relative; padding-left: 20px; margin: 12px 0; }
  .body ul li::before {
    content: ""; position: absolute; left: 2px; top: 13px;
    width: 6px; height: 6px; background: var(--accent); border-radius: 50%%;
  }
  .body strong { color: var(--accent); }
  .body table.md-table {
    width: 100%%; border-collapse: collapse; margin: 22px 0;
    font-size: 14.5px; line-height: 1.65;
  }
  .body table.md-table th, .body table.md-table td {
    border: 1px solid var(--line); padding: 9px 11px; text-align: left;
    vertical-align: top; word-break: break-word;
  }
  .body table.md-table thead th {
    background: var(--accent-soft); color: var(--accent); font-weight: 700;
  }
  .body table.md-table tbody tr:nth-child(even) { background: #fbfcfe; }
  figure { margin: 28px 0; }
  figure img {
    width: 100%%; border-radius: 6px; display: block; margin: 0 auto;
    border: 1px solid var(--line); box-shadow: 0 3px 14px rgba(0,0,0,.08);
  }
  figcaption { text-align: center; color: var(--muted); font-size: 13.5px; margin-top: 10px; }
  .cta-box {
    margin: 44px 0 10px; background: var(--accent-soft);
    border: 1px solid #cfdeee; border-radius: 8px; padding: 22px 26px;
  }
  .cta-box p { margin: 0; }
  .cta-box a {
    color: var(--accent); font-weight: 700; text-decoration: none;
    border-bottom: 2px solid var(--accent);
  }
  .original-divider {
    margin: 40px 0; text-align: center; color: var(--accent);
    font-size: 14px; letter-spacing: 3px; font-weight: 700;
  }
  .original-divider::before, .original-divider::after {
    content: "———"; color: var(--line); margin: 0 14px; letter-spacing: 0;
  }
  .refs { margin-top: 50px; border-top: 1px solid var(--line); padding-top: 18px; }
  .refs h3 { font-size: 15px; color: var(--muted); margin-bottom: 10px; letter-spacing: 2px; }
  .refs ol { margin-left: 20px; }
  .refs li { font-size: 13.5px; color: var(--muted); margin: 6px 0; line-height: 1.7; }
  .refs li span.url { font-size: 12px; opacity: .75; word-break: break-all; }
  .foot-note {
    margin-top: 40px; text-align: center; color: #b9b2ac;
    font-size: 12.5px; letter-spacing: 2px;
  }
</style>
</head>
<body>
<div class="review-banner">%(banner)s</div>
<div class="page">
%(cover)s
  <div class="meta-row">
    %(meta)s
  </div>

  <h1>%(title)s</h1>

  <p class="excerpt">%(excerpt)s</p>

  <div class="body">

%(body)s

  </div>

%(refs)s
  <div class="foot-note">%(slug)s</div>

</div>
</body>
</html>
"""


def _find_master(path):
    """从 path（条目根 / work / 更深层级）向上找 zh 母版。

    支持三种条目形态：
    - 真实条目：<entry>/work/<kind>/<slug>/content/zh/<slug>.mdx
      （entry_root = work 的父目录）
    - 裸条目/模板：<root>/<kind>/<slug>/content/zh/<slug>.mdx
      （entry_root = <slug> 目录本身）
    - 路径本身就是条目目录：<dir>/content/zh/<slug>.mdx
    找不到返回 None。起路径里最近的 blog/regulation 段作为语种提示，
    向上回溯时优先匹配同线分支（避免 template 层误命中另一线的样例）。
    """
    import glob
    import json
    start = os.path.abspath(path)
    hint = None
    for seg in reversed(start.lower().split(os.sep)):
        if seg in ("blog", "regulation"):
            hint = seg
            break
    order = ([hint] + [k for k in ("blog", "regulation") if k != hint]
             if hint else ["blog", "regulation"])

    def _kind_of(subm):
        try:
            return json.load(open(subm, encoding="utf-8")).get("kind")
        except Exception:
            return None

    cur = start
    for _ in range(8):
        # 形态 0：cur 本身就是条目目录（含 content/zh）
        hits = glob.glob(os.path.join(cur, "content", "zh", "*.mdx"))
        if hits:
            kind = os.path.basename(os.path.dirname(cur))
            if kind not in ("blog", "regulation"):
                kind = _kind_of(os.path.join(cur, "submission.json")) or hint or "blog"
            return os.path.abspath(hits[0]), cur, kind
        # 形态 1：真实条目（work 层）
        work = cur if os.path.basename(cur) == "work" else os.path.join(cur, "work")
        if not os.path.isdir(work):
            # 投稿目录形态：<root>/{blogs,regulations}/<条目>/work
            for line in ("blogs", "regulations"):
                d = os.path.join(cur, line)
                if os.path.isdir(d):
                    import glob as _g
                    hits = _g.glob(os.path.join(d, "*", "work", "*", "*",
                                                "content", "zh", "*.mdx"))
                    if hits:
                        mdx = os.path.abspath(hits[0])
                        parts = mdx.split(os.sep)
                        wi = len(parts) - 1 - parts[::-1].index("work")
                        return mdx, os.sep.join(parts[:wi]), parts[wi + 1]
        if os.path.isdir(work):
            hits = glob.glob(os.path.join(work, "*", "*", "content", "zh", "*.mdx"))
            if hits:
                mdx = sorted(hits, key=lambda h: 0 if
                             (os.sep + (hint or "") + os.sep) in h else 1)[0]
                mdx = os.path.abspath(mdx)
                parts = mdx.split(os.sep)
                wi = len(parts) - 1 - parts[::-1].index("work")
                return mdx, os.sep.join(parts[:wi]), parts[wi + 1]
        # 形态 2：裸条目（无 work 层）
        for kind in order:
            hits = glob.glob(os.path.join(cur, kind, "*", "content", "zh", "*.mdx"))
            if hits:
                mdx = os.path.abspath(hits[0])
                # .../<kind>/<slug>/content/zh/<slug>.mdx → 条目根 = <slug> 目录
                return mdx, os.path.dirname(os.path.dirname(
                    os.path.dirname(mdx))), kind
        parent = os.path.dirname(cur)
        if parent == cur:
            return None
        cur = parent
    return None


def render(path, out=None):
    """从条目的 zh 母版生成预览页。

    path 接受条目根目录（含 work/）、work 目录或其下任意层级；
    out 缺省写到条目根 preview_zh.html。返回输出文件绝对路径。
    """
    found = _find_master(path)
    if not found:
        raise FileNotFoundError(
            "未找到 zh 母版（%s 上下没有 work/<kind>/<slug>/content/zh/*.mdx）" % path)
    mdx, entry_root, kind = found
    slug = os.path.basename(mdx)[:-4]
    slug_dir = os.path.dirname(os.path.dirname(os.path.dirname(mdx)))  # content/ 的父目录（条目目录）

    src = open(mdx, encoding="utf-8").read()
    meta, body, err = parse_frontmatter(src)
    if err:
        raise ValueError("zh 母版 frontmatter 解析失败（%s）: %s" % (mdx, err))

    banner = "中文母版审核页（%s · 过审前不进入翻译与打包）" % _KIND_LABEL.get(kind, kind)
    page = _PAGE % {
        "title": html.escape(str(meta.get("title") or "")),
        "banner": banner,
        "cover": _cover_html(slug_dir, entry_root, slug, kind),
        "meta": _meta_row(meta, kind),
        "excerpt": html.escape(str(meta.get("excerpt") or "")),
        "body": _body_html(body, slug_dir, entry_root, slug),
        "refs": _refs_html(meta),
        "slug": html.escape(slug.upper()),
    }
    if out is None:
        out = os.path.join(entry_root, "preview_zh.html")
    out = os.path.abspath(out)
    with open(out, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(page)
    return out
