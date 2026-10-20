#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
submitter_check.py — 博客投稿包自检工具 (v1.0)

用法:
    python3 submitter_check.py <package.zip | 目录>
    python3 submitter_check.py <package.zip> --json
    python3 submitter_check.py <package.zip> --quiet

退出码: 0 = 通过(无 error)；1 = 存在 error（需返工）

只依赖 Python 3.8+ 标准库，不需要安装任何包。
规则编号与 SPEC.md 对应。
"""

import io
import json
import os
import re
import sys
import unicodedata
import zipfile
from datetime import datetime, timedelta, timezone

# ---------------------------------------------------------------- 常量

LOCALES = ["en", "zh", "es", "fr", "de", "ja", "pt", "ru", "ar", "ko",
           "it", "nl", "tr", "vi", "id", "th", "hi", "pl", "sv", "el",
           "cs", "ro", "hu", "fi", "da", "no", "uk", "bg", "hr", "sr",
           "sk", "sl", "ms", "ka", "he", "sw", "bn", "ca", "fa", "ur",
           "ta", "af", "sq", "az", "hy", "be", "ne", "si"]

CATEGORIES = ["Brand Protection", "Compliance Guide", "Cosmetics", "E-commerce",
              "Food & Beverage", "Label Compliance", "Product Certification"]

FRONTMATTER_KEYS = ["title", "slug", "date", "category", "excerpt", "references"]

AUTHOR = "David Zhang"

MAX_TITLE = 85
MAX_EXCERPT = 185
MAX_MDX_BYTES = 100 * 1024
MAX_IMAGE_BYTES = 400 * 1024
MAX_PACKAGE_BYTES = 60 * 1024 * 1024
COVER_SIZE = (1200, 630)
MIN_IMAGE_WIDTH = 1200
MIN_EN_WORDS = 400
MAX_PARAGRAPH_CHARS = 400
MAX_IMAGES_WARN = 6
SIMILARITY_LIMIT = 0.95

SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
IMAGE_EXTS = {".webp", ".jpg", ".jpeg", ".png", ".gif", ".avif", ".svg"}
ALLOWED_SUFFIX = {".mdx", ".webp", ".json"}

SCRIPT_TESTS = {
    "ar": r"[\u0600-\u06FF]", "fa": r"[\u0600-\u06FF]", "ur": r"[\u0600-\u06FF]",
    "he": r"[\u0590-\u05FF]",
    "hi": r"[\u0900-\u097F]", "ne": r"[\u0900-\u097F]",
    "bn": r"[\u0980-\u09FF]",
    "ta": r"[\u0B80-\u0BFF]",
    "th": r"[\u0E00-\u0E7F]",
    "ka": r"[\u10A0-\u10FF]",
    "hy": r"[\u0530-\u058F]",
    "el": r"[\u0370-\u03FF]",
    "ru": r"[\u0400-\u04FF]", "uk": r"[\u0400-\u04FF]", "be": r"[\u0400-\u04FF]",
    "bg": r"[\u0400-\u04FF]", "sr": r"[\u0400-\u04FF]",
    "ja": r"[\u3040-\u30FF]",
    "ko": r"[\uAC00-\uD7AF]",
    "si": r"[\u0D80-\u0DFF]",
    "zh": r"[\u4E00-\u9FFF]",
}
CJK_LANGS = {"zh", "ja", "ko"}

# 红线（SPEC 第 5 节）
PRICE_RES = [
    r"[$€£¥]\s?\d",
    r"\b\d[\d.,]*\s?(?:USD|EUR|GBP|CNY|RMB|dollars?|euros?)\b",
    r"\b(?:USD|EUR|GBP|CNY|RMB)\s?\d",
]
DELIVERY_RES = [
    r"(?is)\b(?:delivery|lead\s*time|turnaround|shipping\s*time)\b[^.]{0,60}?\b\d+\s*[-–to]*\s*\d*\s*(?:days?|weeks?)\b",
]
NEGATIVE_RES = [
    r"(?is)\b(?:cannot|can\s*not|can't|not\s+possible|impossible)\s+(?:to\s+)?(?:be\s+)?(?:export|exported|import|imported|sell|sold|enter)\b",
    r"无法出口", r"不能出口", r"无法进口", r"无法进入中国",
    r"لا\s*يمكن\s*تصدير", r"нельзя\s+экспортир", r"não\s+pode\s+ser\s+exportad",
    r"kann\s+nicht\s+exportiert", r"ne\s+peut\s+pas\s+être\s+export", r"non\s+può\s+essere\s+esportat",
    r"nie\s+można\s+eksportowa", r"nem\s+lehet\s+exportálni", r"nie\s+je\s+možné\s+exportova",
    r"non\s+se\s+puede\s+exportar", r"non\s+si\s+può\s+esportare",
]
PROMISE_RES = [
    r"(?is)\bwe\s+(?:arrange|organi[sz]e|handle)\s+(?:the\s+)?(?:shipping|shipment|sample\s+shipping|delivery|logistics)",
    r"(?is)\bguarantee(?:d|s)?\b",
    r"(?is)\b100\s*%\s*(?:success|approval|pass)\b",
    r"(?is)\bnear[- ]100\s*%",
    r"(?is)\bwithin\s*24\s*hours\b",
]
LEGACY_DECREE_RE = None  # 用数字归一化后匹配

CTA_TEXT = {"en": "Contact us", "zh": "联系我们"}
NO_LATIN_FALLBACK = {"ja", "ko"}  # R11 中文字符检查的例外


# ---------------------------------------------------------------- 数据载入

class Finding:
    __slots__ = ("rule", "severity", "slug", "detail")

    def __init__(self, rule, severity, slug, detail):
        self.rule = rule
        self.severity = severity
        self.slug = slug
        self.detail = detail

    def as_dict(self):
        return {"rule": self.rule, "severity": self.severity,
                "article": self.slug, "detail": self.detail}


def load_package(path):
    """返回 {相对路径: bytes}。支持 zip 或目录。"""
    files = {}
    if os.path.isdir(path):
        for root, _dirs, names in os.walk(path):
            for n in names:
                full = os.path.join(root, n)
                rel = os.path.relpath(full, path).replace(os.sep, "/")
                with open(full, "rb") as fh:
                    files[rel] = fh.read()
        return files, None

    if not os.path.isfile(path):
        raise SystemExit("找不到文件或目录: %s" % path)
    total = 0
    with zipfile.ZipFile(path) as zf:
        for info in zf.infolist():
            if info.is_dir():
                continue
            name = info.filename.replace("\\", "/")
            if name.startswith("/") or ".." in name.split("/"):
                raise SystemExit("压缩包内含非法路径: %s" % name)
            data = zf.read(info)
            total += len(data)
            files[name] = data
    return files, total


# ---------------------------------------------------------------- 工具函数

def text(data):
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError:
        return data.decode("utf-8", "replace")


def normalize_digits(s):
    out = []
    for ch in s:
        if ch.isdigit():
            try:
                d = unicodedata.digit(ch)
            except (TypeError, ValueError):
                out.append(ch)
                continue
            out.append(str(d))
        else:
            out.append(ch)
    return "".join(out)


def parse_frontmatter(src):
    """返回 (meta: dict, body: str, error: str|None)"""
    if not src.startswith("---"):
        return {}, src, "文件不以 frontmatter 开头"
    m = re.match(r"^---[ \t]*\r?\n(.*?)\r?\n---[ \t]*\r?\n?", src, re.S)
    if not m:
        return {}, src, "frontmatter 未正确闭合"
    raw, body = m.group(1), src[m.end():]
    meta = {}
    refs = []
    cur_ref = None
    in_refs = False
    for line in raw.splitlines():
        if not line.strip():
            continue
        if re.match(r"^references\s*:\s*$", line):
            in_refs = True
            meta["references"] = refs
            continue
        if in_refs:
            mm = re.match(r"^\s*-\s*(.*)$", line)
            if mm:
                cur_ref = {}
                refs.append(cur_ref)
                rest = mm.group(1).strip()
                km = re.match(r"^([A-Za-z_]+)\s*:\s*(.*)$", rest)
                if km:
                    cur_ref[km.group(1)] = unquote(km.group(2))
                continue
            km = re.match(r"^\s+([A-Za-z_]+)\s*:\s*(.*)$", line)
            if km and cur_ref is not None:
                cur_ref[km.group(1)] = unquote(km.group(2))
            continue
        km = re.match(r"^([A-Za-z_]+)\s*:\s*(.*)$", line)
        if km:
            meta[km.group(1)] = unquote(km.group(2))
    return meta, body, None


def unquote(v):
    v = v.strip()
    if len(v) >= 2 and v[0] == v[-1] and v[0] in "\"'":
        return v[1:-1]
    return v


def webp_size(data):
    """解析 webp 宽高；失败返回 None。"""
    if len(data) < 30 or data[:4] != b"RIFF" or data[8:12] != b"WEBP":
        return None
    fourcc = data[12:16]
    try:
        if fourcc == b"VP8 ":
            w = int.from_bytes(data[26:28], "little") & 0x3FFF
            h = int.from_bytes(data[28:30], "little") & 0x3FFF
            return w, h
        if fourcc == b"VP8L":
            bits = int.from_bytes(data[21:25], "little")
            w = (bits & 0x3FFF) + 1
            h = ((bits >> 14) & 0x3FFF) + 1
            return w, h
        if fourcc == b"VP8X":
            w = int.from_bytes(data[24:27], "little") + 1
            h = int.from_bytes(data[27:30], "little") + 1
            return w, h
    except Exception:
        return None
    return None


def image_size(name, data):
    low = name.lower()
    if low.endswith(".webp"):
        return webp_size(data)
    if low.endswith(".png") and data[:8] == b"\x89PNG\r\n\x1a\n":
        return (int.from_bytes(data[16:20], "big"), int.from_bytes(data[20:24], "big"))
    if low.endswith((".jpg", ".jpeg")) and data[:2] == b"\xff\xd8":
        i = 2
        while i < len(data) - 9:
            if data[i] != 0xFF:
                i += 1
                continue
            marker = data[i + 1]
            if marker in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
                h = int.from_bytes(data[i + 5:i + 7], "big")
                w = int.from_bytes(data[i + 7:i + 9], "big")
                return w, h
            seg = int.from_bytes(data[i + 2:i + 4], "big")
            i += 2 + seg
        return None
    return None


def ngrams(s, n=4):
    s = re.sub(r"\s+", " ", s.lower())
    s = re.sub(r"[^\w\u0400-\u04FF\u0600-\u06FF\u0900-\u0DFF\u3040-\u30FF\u4E00-\u9FFF ]", "", s)
    return {s[i:i + n] for i in range(max(0, len(s) - n + 1))}


def jaccard(a, b):
    if not a or not b:
        return 0.0
    return len(a & b) / float(len(a | b))


# ---------------------------------------------------------------- 主检查

def check(path):
    findings = []

    def add(rule, severity, slug, detail):
        findings.append(Finding(rule, severity, slug, detail))

    files, total_bytes = load_package(path)

    if total_bytes is not None and total_bytes > MAX_PACKAGE_BYTES:
        add("S06", "error", "-", "压缩包总大小 %.1f MB > 60 MB" % (total_bytes / 1048576.0))

    # --- 顶层结构：articles/<slug>/...
    names = list(files.keys())
    articles = {}
    for n in names:
        if n.startswith("__MACOSX/") or n.endswith("/.DS_Store") or n == ".DS_Store":
            add("S05", "error", "-", "压缩包内含系统垃圾文件: %s" % n)
            continue
        if any(part.startswith(".") for part in n.split("/")):
            add("S05", "error", "-", "压缩包内含隐藏文件: %s" % n)
            continue
        parts = n.split("/")
        if parts[0] != "articles":
            add("S01", "error", "-", "顶层必须是 articles/ 目录，发现: %s" % n)
            continue
        if len(parts) < 2:
            continue
        articles.setdefault(parts[1], []).append("/".join(parts[2:]))

    if not articles:
        add("S01", "error", "-", "压缩包内没有 articles/<slug>/ 结构")
        return findings

    slugs = set()
    for slug in sorted(articles):
        prefix = "articles/%s/" % slug
        art = {k: v for k, v in files.items() if k.startswith(prefix)}
        check_article(slug, art, add)
        if slug in slugs:
            add("M03", "error", slug, "slug 重复")
        slugs.add(slug)

    return findings


def check_article(slug, art, add):
    rel = lambda k: k.split("/", 2)[2] if k.count("/") >= 2 else k

    # --- 文件白名单 & 命名
    mdx_files = {}
    image_files = {}
    for full, data in art.items():
        tail = rel(full)
        suffix = os.path.splitext(tail)[1].lower()
        if suffix not in ALLOWED_SUFFIX:
            add("S05", "error", slug, "不允许的文件类型: %s" % tail)
            continue
        if suffix == ".mdx":
            m = re.match(r"^content/([a-z]{2}(?:-[A-Za-z]{2,4})?)/(.+)\.mdx$", tail)
            if not m:
                add("S04", "error", slug, "mdx 路径应为 content/<lang>/<slug>.mdx，发现: %s" % tail)
                continue
            lang, fname = m.group(1), m.group(2)
            if fname != slug:
                add("S04", "error", slug, "文件名必须等于 slug（%s），发现 %s.mdx" % (slug, fname))
            if lang not in LOCALES:
                add("S03", "error", slug, "未知语言目录: %s" % lang)
            if len(data) > MAX_MDX_BYTES:
                add("S06", "error", slug, "%s/%s.mdx 超过 100KB" % (lang, slug))
            mdx_files[lang] = text(data)
        elif suffix == ".webp":
            m = re.match(r"^images/([^/]+)/([^/]+\.webp)$", tail)
            if not m:
                add("S04", "error", slug, "图片路径应为 images/<slug>/<name>.webp，发现: %s" % tail)
                continue
            if m.group(1) != slug:
                add("S04", "error", slug, "图片目录必须等于 slug，发现: %s" % tail)
            image_files[m.group(2)] = data
        elif suffix in IMAGE_EXTS:
            add("I01", "error", slug, "图片必须为 webp，发现: %s" % tail)

    # --- submission.json
    sub_key = "articles/%s/submission.json" % slug
    meta = {}
    if sub_key not in art:
        add("M01", "error", slug, "缺少 submission.json")
    else:
        try:
            meta = json.loads(text(art[sub_key]))
        except Exception as exc:
            add("M01", "error", slug, "submission.json 不是合法 JSON: %s" % exc)
            meta = {}
    if meta:
        for req in ["slug", "title", "date", "category", "author", "excerpt", "locales", "images", "imageRights"]:
            if req not in meta:
                add("M02", "error", slug, "submission.json 缺少字段 %s" % req)
        if meta.get("slug") not in (None, slug):
            add("M03", "error", slug, "submission.json 的 slug 与目录名不一致")
        date = str(meta.get("date", ""))
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", date):
            add("M04", "error", slug, "date 应为 YYYY-MM-DD")
        else:
            try:
                d = datetime.strptime(date, "%Y-%m-%d").date()
                tz8 = timezone(timedelta(hours=8))
                if d > datetime.now(tz8).date():
                    add("M04", "error", slug, "date 不得晚于今天（UTC+8）")
            except ValueError:
                add("M04", "error", slug, "date 不是合法日期")
        if meta.get("category") not in CATEGORIES:
            add("M05", "error", slug, "category 必须是: %s" % " / ".join(CATEGORIES))
        if meta.get("author") != AUTHOR:
            add("M06", "error", slug, "author 必须固定为 %s（当前: %r）" % (AUTHOR, meta.get("author")))
        locs = meta.get("locales")
        if isinstance(locs, list) and sorted(locs) != sorted(LOCALES):
            missing = sorted(set(LOCALES) - set(locs))
            extra = sorted(set(locs) - set(LOCALES))
            add("M07", "error", slug, "locales 必须正好 48 个；缺: %s；多: %s" %
                (missing or "无", extra or "无"))
        imgs = meta.get("images")
        if isinstance(imgs, list) and sorted(imgs) != sorted(image_files.keys()):
            add("M08", "error", slug, "images 清单与实际文件不一致（清单: %s / 实际: %s）" %
                (sorted(imgs), sorted(image_files.keys())))
        if not str(meta.get("imageRights", "")).strip():
            add("M02", "error", slug, "imageRights 不能为空（需确认可商用）")

    # --- 语言齐备
    for lang in LOCALES:
        if lang not in mdx_files:
            add("S02", "error", slug, "缺少语言: %s" % lang)

    # --- 每篇 frontmatter / 正文
    parsed = {}
    for lang, src in sorted(mdx_files.items()):
        fm, body, err = parse_frontmatter(src)
        parsed[lang] = (fm, body)
        tag = "%s/%s" % (lang, slug)
        if err:
            add("F01", "error", tag, err)
            continue
        missing = [k for k in FRONTMATTER_KEYS if k not in fm]
        if missing:
            add("F02", "error", tag, "frontmatter 缺字段: %s" % ", ".join(missing))
        extra = [k for k in fm if k not in FRONTMATTER_KEYS]
        if extra:
            add("F02", "error", tag, "frontmatter 多出字段: %s（只允许 %s）" %
                (", ".join(extra), ", ".join(FRONTMATTER_KEYS)))

        title = fm.get("title", "")
        if len(title) > MAX_TITLE:
            add("F03", "error", tag, "title 超长（%d > %d）" % (len(title), MAX_TITLE))
        if re.search(r"[:：\-—–]", title):
            add("F03", "error", tag, "title 不得含冒号或连字符/破折号")
        if not title.strip():
            add("F03", "error", tag, "title 不能为空")
        if fm.get("slug") != slug:
            add("F04", "error", tag, "frontmatter slug 必须等于 %s" % slug)
        if meta.get("date") and fm.get("date") != meta.get("date"):
            add("F05", "error", tag, "frontmatter date 与 submission.json 不一致")
        if meta.get("category") and fm.get("category") != meta.get("category"):
            add("F06", "error", tag, "frontmatter category 与 submission.json 不一致")
        if fm.get("category") and fm.get("category") not in CATEGORIES:
            add("F06", "error", tag, "category 不在白名单")
        excerpt = fm.get("excerpt", "")
        if len(excerpt) > MAX_EXCERPT:
            add("F07", "error", tag, "excerpt 超长（%d > %d）" % (len(excerpt), MAX_EXCERPT))
        if excerpt and excerpt.strip() == title.strip():
            add("F07", "error", tag, "excerpt 不能与 title 相同")
        refs = fm.get("references")
        if refs is None:
            refs = []
        if len(refs) > 6:
            add("F08", "error", tag, "references 最多 6 条")
        for r in refs:
            if not r.get("title"):
                add("F08", "error", tag, "references 条目缺 title: %r" % r)
            if not re.match(r"^https://", str(r.get("url", ""))):
                add("F08", "error", tag, "references url 必须 https:// 开头: %r" % r.get("url"))

        check_body(tag, lang, body, image_files, slug, add)

    # --- 本地化真实性
    en_fm, en_body = parsed.get("en", ({}, ""))
    en_title = en_fm.get("title", "")
    en_excerpt = en_fm.get("excerpt", "")
    en_ng = ngrams(en_body)
    for lang, (fm, body) in parsed.items():
        if lang == "en":
            continue
        tag = "%s/%s" % (lang, slug)
        if en_title and fm.get("title", "").strip() == en_title.strip():
            add("L01", "error", tag, "title 与英文完全相同（疑似未翻译）")
        if en_excerpt and fm.get("excerpt", "").strip() == en_excerpt.strip():
            add("L02", "error", tag, "excerpt 与英文完全相同（疑似未翻译）")
        pat = SCRIPT_TESTS.get(lang)
        blob = fm.get("title", "") + " " + fm.get("excerpt", "") + " " + body
        if pat and not re.search(pat, blob):
            add("L03", "error", tag, "正文未使用该语言的文字系统（疑似英文回退）")
        if lang not in CJK_LANGS and re.search(r"[\u4E00-\u9FFF]", blob):
            add("L04", "error", tag, "非中日韩语种出现中文字符（疑似中文回退）")
        score = jaccard(ngrams(body), en_ng)
        if score > SIMILARITY_LIMIT:
            add("L05", "error", tag, "正文与英文相似度过高（%.2f），疑似未翻译" % score)
        for para in [p for p in body.split("\n\n") if p.strip()]:
            if len(para) > MAX_PARAGRAPH_CHARS and not para.strip().startswith("-"):
                add("W02", "warning", tag, "存在超长段落（%d 字符）" % len(para))
                break

    en_words = len(re.findall(r"\w+", en_body, re.UNICODE))
    if parsed.get("en") and en_words < MIN_EN_WORDS:
        add("W01", "warning", "%s/%s" % ("en", slug),
            "英文正文偏短（%d 词，建议 ≥%d）" % (en_words, MIN_EN_WORDS))

    # --- 图片
    if "cover.webp" not in image_files:
        add("I02", "error", slug, "缺少 cover.webp")
    for name, data in sorted(image_files.items()):
        if len(data) > MAX_IMAGE_BYTES:
            add("I04", "error", slug, "%s 超过 400KB（%.0fKB）" % (name, len(data) / 1024.0))
        size = image_size(name, data)
        if not size:
            add("I01", "error", slug, "%s 无法解析尺寸（文件可能损坏）" % name)
            continue
        w, h = size
        if name == "cover.webp" and (w, h) != COVER_SIZE:
            add("I02", "error", slug, "cover.webp 必须精确 1200×630，实际 %d×%d" % (w, h))
        if name != "cover.webp" and w < MIN_IMAGE_WIDTH:
            add("I03", "error", slug, "%s 宽度 %d < 1200" % (name, w))
    if len(image_files) > MAX_IMAGES_WARN:
        add("W03", "warning", slug, "图片数量 %d，建议 ≤%d" % (len(image_files), MAX_IMAGES_WARN))


def check_body(tag, lang, body, image_files, slug, add):
    lines = body.split("\n")

    # B01 一级标题
    for i, ln in enumerate(lines, 1):
        if re.match(r"^#\s", ln):
            add("B01", "error", tag, "第 %d 行使用了一级标题 #，请用 ##" % i)
    # B02 标题空格 / 层级
    for i, ln in enumerate(lines, 1):
        if re.match(r"^#{2,6}[^#\s]", ln):
            add("B02", "error", tag, "第 %d 行标题缺少空格: %s" % (i, ln[:40]))
        if re.match(r"^####+\s", ln):
            add("B02", "error", tag, "第 %d 行标题层级超过 ###" % i)
    # B03 分隔线
    for i, ln in enumerate(lines, 1):
        if re.match(r"^\s*---+\s*$", ln):
            add("B03", "error", tag, "第 %d 行出现 --- 分隔线（正文禁止）" % i)
    # B04 正文 References
    if re.search(r"(?im)^#{2,3}\s*references\b", body):
        add("B04", "error", tag, "正文出现 References 章节（请移到 frontmatter）")
    # B05 JSX / HTML
    if re.search(r"</?[A-Za-z][A-Za-z0-9]*(\s[^>]*)?>", body):
        add("B05", "error", tag, "正文含 HTML/JSX 标签")
    if re.search(r"\{[^}\n]{0,60}\}", body):
        add("B05", "error", tag, "正文含 JSX 表达式 {...}")
    # B06 框线字符
    if re.search(r"[\u2500-\u257F]", body):
        add("B06", "error", tag, "正文含框线字符流程图")
    # B07 列表项间空行
    for i in range(len(lines) - 2):
        if re.match(r"^\s*[-*]\s", lines[i]) and lines[i + 1].strip() == "" \
                and i + 2 < len(lines) and re.match(r"^\s*[-*]\s", lines[i + 2]):
            add("B07", "error", tag, "第 %d 行列表项之间有空行（会渲染成多个列表）" % (i + 1))
            break
    # B08 多项内联
    for i, ln in enumerate(lines, 1):
        if len(re.findall(r"(?:^|\s)[-*]\s+\S", ln)) > 1:
            add("B08", "error", tag, "第 %d 行有多个列表项写在同一行" % i)
            break
    # B10 破折号混用
    if "—" in body and "–" in body:
        add("B10", "error", tag, "同一文件混用 — 与 –（请统一）")
    # B11 emoji 列表混排
    for i, ln in enumerate(lines, 1):
        if len(re.findall(r"[\U0001F300-\U0001FAFF\u2600-\u27BF]", ln)) >= 2:
            add("B11", "error", tag, "第 %d 行 emoji 列表混排" % i)
            break

    # B09 CTA
    tail = [ln for ln in lines[-10:] if ln.strip()]
    link = None
    for ln in tail:
        m = re.search(r"(?<!!)\[([^\]]+)\]\(([^)\s]+)\)", ln)
        if m:
            link = (m.group(1), m.group(2))
            break
    if not link:
        add("B09", "error", tag, "结尾缺少 CTA 链接 [Contact us](/<lang>/packages/)")
    else:
        txt, url = link
        expected_path = "/%s/packages/" % lang
        if url.rstrip("/") != expected_path.rstrip("/"):
            add("B09", "error", tag, "CTA 链接必须是 %s，当前 %s" % (expected_path, url))
        if lang in CTA_TEXT:
            if txt.strip() != CTA_TEXT[lang]:
                add("B09", "error", tag, "CTA 文字应为 %r，当前 %r" % (CTA_TEXT[lang], txt))
        else:
            if re.match(r"(?i)^contact\s*us", txt.strip()):
                add("B09", "error", tag, "CTA 文字未翻译（仍为英文 Contact us）")

    # 图片引用
    referenced = set()
    for i, ln in enumerate(lines, 1):
        for m in re.finditer(r"!\[([^\]]*)\]\(([^)\s]+)", ln):
            alt, url = m.group(1), m.group(2)
            if re.match(r"^https?://", url):
                add("I07", "error", tag, "第 %d 行图片使用了外链: %s" % (i, url))
                continue
            mm = re.match(r"^/images/blog/%s/([^/]+\.webp)$" % re.escape(slug), url)
            if not mm:
                add("I05", "error", tag, "第 %d 行图片路径应为 /images/blog/%s/<name>.webp" % (i, slug))
                continue
            referenced.add(mm.group(1))
            if not alt.strip():
                add("I08", "error", tag, "第 %d 行图片缺少 alt 文字" % i)
            elif alt.strip().lower() in {"image", "img", "图", "图片", "photo", "picture"}:
                add("I08", "error", tag, "第 %d 行 alt 过于笼统: %r" % (i, alt))
    for name in image_files:
        if name == "cover.webp":
            continue  # 封面用于列表卡片与社交分享，不要求正文出现
        if name not in referenced:
            add("I06", "error", tag, "图片 %s 未被正文引用" % name)

    # 红线
    norm = normalize_digits(body)
    if re.search(r"(?<!\d)(248|249)(?!\d)", norm):
        add("R01", "error", tag, "正文出现 248/249（现行法条一律写 280 号令）")
    if re.search(r"\b(MOA|CFDA)\b", body):
        add("R02", "error", tag, "正文出现旧机构名 MOA/CFDA（应为 MARA/SAMR）")
    for pat in PRICE_RES:
        if re.search(pat, body, re.I):
            add("R03", "error", tag, "正文出现价格/金额（不写报价）")
            break
    for pat in DELIVERY_RES:
        if re.search(pat, body):
            add("R04", "error", tag, "正文出现交付周期承诺")
            break
    for pat in NEGATIVE_RES:
        if re.search(pat, body, re.I):
            add("R05", "error", tag, "正文出现绝对否定表述（改写为建设性说法）")
            break
    for pat in PROMISE_RES:
        if re.search(pat, body):
            add("R06", "error", tag, "正文出现过度承诺（寄样安排/保证/时限）")
            break


# ---------------------------------------------------------------- CLI

def main(argv):
    args = [a for a in argv[1:] if not a.startswith("--")]
    flags = {a for a in argv[1:] if a.startswith("--")}
    if not args:
        print(__doc__.strip())
        return 2
    path = args[0]

    findings = check(path)
    errors = [f for f in findings if f.severity == "error"]
    warnings = [f for f in findings if f.severity == "warning"]

    if "--json" in flags:
        print(json.dumps({
            "package": os.path.basename(path.rstrip("/")),
            "result": "PASS" if not errors else "FAIL",
            "errors": len(errors),
            "warnings": len(warnings),
            "findings": [f.as_dict() for f in findings],
        }, ensure_ascii=False, indent=2))
        return 0 if not errors else 1

    quiet = "--quiet" in flags
    if not quiet:
        articles = sorted({f.slug.split("/")[-1] for f in findings if f.slug not in ("-", "")})
        langs = sum(1 for _ in {})  # placeholder for readability
        print("=" * 60)
        print("博客投稿包自检  %s" % os.path.basename(path.rstrip("/")))
        print("=" * 60)
        if articles:
            print("文章: %s" % ", ".join(articles))
        for f in findings:
            sev = "ERROR" if f.severity == "error" else "WARN "
            print("  [%s] %-3s %-26s %s" % (sev, f.rule, f.slug, f.detail))
        print("-" * 60)

    if errors:
        print("结果：FAIL（%d error, %d warning）→ 请按 SPEC.md 修正后重新提交"
              % (len(errors), len(warnings)))
        return 1
    print("结果：PASS（0 error, %d warning）→ 可提交" % len(warnings))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
