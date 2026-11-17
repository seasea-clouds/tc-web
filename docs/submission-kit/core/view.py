# -*- coding: utf-8 -*-
"""core/view.py — 事实层（冻结）。

只回答「包和稿件里客观存在什么」，不做任何判断、不产出 finding、不写文件。
插件（plugins/<category>-<name>.py）读本层事实，自己判定红/绿。

设计约束：
  * 同一进程内一次检查只解析一次，结果缓存在视图上；插件之间共享。
  * 事实粒度必须够用：任何判据都不应自己 re 解析 mdx 或重新拆块，
    否则同一条规则在不同插件里会看到不同的块边界。
  * 本模块不得 import plugins/、不得 import core.checker、不得含 emit/add。
"""
# 治理声明：本文件属机制层，不承载策略数据；改动须走 README「治理」节的 L3 流程
#（先登记理由 → 行为级等价断言 → selftest --kit 全量），提交说明带 [arch]
#（commit-msg 钩子强制）。策略变更请改 plugins/ 判据或经 submit.py glossary 改库。
from __future__ import annotations

import json
import os
import re

from core.consts import ALLOWED_SUFFIX, IMAGE_EXTS, LOCALES
from core.frontmatter import line_ending_issues, parse_frontmatter
from core.textutil import blocks as _split_blocks
from core.textutil import text as _decode

MDX_PATH_RE = re.compile(r"^content/([a-z]{2}(?:-[A-Za-z]{2,4})?)/(.+)\.mdx$")
IMAGE_PATH_RE = re.compile(r"^images/([^/]+)/([^/]+\.webp)$")


class ArticleView(object):
    """单个条目（blog/<slug>/ 或 regulation/<slug>/）的事实视图。"""

    __slots__ = ("pkg", "kind_dir", "slug", "tails", "cache")

    def __init__(self, pkg, kind_dir, slug, tails):
        self.pkg = pkg
        self.kind_dir = kind_dir          # "blog" | "regulation"
        self.slug = slug
        self.tails = sorted(tails)         # 条目内相对路径（已去掉 kind/slug 前缀）
        self.cache = {}

    # ---------------- 基础事实 ----------------

    @property
    def kind(self):
        """目录层判定（与 submission.json 的 kind 是两件事，后者见 meta_kind）。"""
        return self.kind_dir

    @property
    def files(self):
        """{tail: bytes}"""
        c = self.cache.get("files")
        if c is None:
            c = {t: self.pkg.raw(t, self.kind_dir, self.slug) for t in self.tails}
            self.cache["files"] = c
        return c

    @property
    def sizes(self):
        return {t: len(b) for t, b in self.files.items()}

    @property
    def suffixes(self):
        return sorted({os.path.splitext(t)[1].lower() for t in self.tails})

    @property
    def bad_suffix(self):
        """后缀不在白名单的 tail 清单（S05 判据的输入）。"""
        c = self.cache.get("bad_suffix")
        if c is None:
            c = [t for t in self.tails
                 if os.path.splitext(t)[1].lower() not in ALLOWED_SUFFIX]
            self.cache["bad_suffix"] = c
        return c

    @property
    def image_exports(self):
        """本条目里出现非 webp 位图（jpg/png/gif/bmp/tiff）的 tail（I01 输入）。"""
        return [t for t in self.tails
                if os.path.splitext(t)[1].lower() in IMAGE_EXTS]

    # ---------------- 文件解码 ----------------

    @property
    def decode_errors(self):
        """[(tail, offset, byte)]：严格 UTF-8 解码失败的文本类文件。"""
        c = self.cache.get("decode_errors")
        if c is None:
            out = []
            for t, data in sorted(self.files.items()):
                if not t.lower().endswith((".mdx", ".md", ".json", ".txt",
                                           ".yaml", ".yml")):
                    continue
                if t.lower().endswith(".mdx"):
                    continue          # mdx 由 mdx_info 统一处理，避免重复解码
                try:
                    data.decode("utf-8")
                except UnicodeDecodeError as exc:
                    bad = data[exc.start:exc.start + 1]
                    out.append((t, exc.start, bad[0] if bad else 0))
            self.cache["decode_errors"] = out
        return self.cache["decode_errors"]

    @property
    def line_issues(self):
        """{tail: [问题]}：换行符/BOM 卫生事实（S07 输入）。"""
        c = self.cache.get("line_issues")
        if c is None:
            out = {}
            for t, data in sorted(self.files.items()):
                if not t.lower().endswith((".mdx", ".json")):
                    continue
                iss = line_ending_issues(data)
                if iss:
                    out[t] = iss
            self.cache["line_issues"] = out
        return self.cache["line_issues"]

    # ---------------- mdx 层 ----------------

    @property
    def mdx_info(self):
        """{lang: {...}}：每语 mdx 的路径事实与解码结果。

        键含 tail / lang / fname / size / decode_error / text。
        路径不合规（不在 content/<lang>/<slug>.mdx）的 mdx 不进入本字典，
        单独落在 mdx_bad_path。
        """
        c = self.cache.get("mdx_info")
        if c is None:
            info, bad = {}, []
            for t, data in sorted(self.files.items()):
                if not t.lower().endswith(".mdx"):
                    continue
                m = MDX_PATH_RE.match(t)
                if not m:
                    bad.append(t)
                    continue
                lang, fname = m.group(1), m.group(2)
                rec = {"tail": t, "lang": lang, "fname": fname,
                       "size": len(data), "decode_error": None, "text": None}
                try:
                    rec["text"] = _decode(data)
                except UnicodeDecodeError as exc:
                    b = data[exc.start:exc.start + 1]
                    rec["decode_error"] = (exc.start, b[0] if b else 0)
                info[lang] = rec
            self.cache["mdx_info"] = info
            self.cache["mdx_bad_path"] = bad
        return self.cache["mdx_info"]

    @property
    def mdx_bad_path(self):
        self.mdx_info
        return self.cache["mdx_bad_path"]

    @property
    def mdx(self):
        """{lang: str}：可解码的 mdx 正文原文。"""
        return {lg: r["text"] for lg, r in self.mdx_info.items()
                if r["text"] is not None}

    @property
    def unknown_locales(self):
        return sorted(lg for lg in self.mdx_info if lg not in LOCALES)

    @property
    def name_mismatch(self):
        return sorted(lg for lg, r in self.mdx_info.items()
                      if r["fname"] != self.slug)

    @property
    def oversized_mdx(self):
        from core.consts import MAX_MDX_BYTES
        return sorted(lg for lg, r in self.mdx_info.items()
                      if r["size"] > MAX_MDX_BYTES)

    # ---------------- frontmatter ----------------

    @property
    def parsed(self):
        """{lang: (fm dict, body str)}：frontmatter 解析成功且正文可解码的语向。"""
        c = self.cache.get("parsed")
        if c is None:
            out = {}
            for lg, rec in self.mdx_info.items():
                if rec["text"] is None or rec["fname"] != self.slug:
                    continue
                fm, body, err = parse_frontmatter(rec["text"])
                if not err:
                    out[lg] = (fm, body)
            self.cache["parsed"] = out
        return self.cache["parsed"]

    @property
    def fm_errors(self):
        """{lang: err}：frontmatter 解析失败原因。"""
        c = self.cache.get("fm_errors")
        if c is None:
            out = {}
            for lg, rec in self.mdx_info.items():
                if rec["text"] is None:
                    continue
                _fm, _body, err = parse_frontmatter(rec["text"])
                if err:
                    out[lg] = err
            self.cache["fm_errors"] = out
        return self.cache["fm_errors"]

    @property
    def langs(self):
        return sorted(self.parsed)

    def fm(self, lg):
        pair = self.parsed.get(lg)
        return pair[0] if pair else {}

    def body(self, lg):
        pair = self.parsed.get(lg)
        return pair[1] if pair else ""

    def blocks(self, lg):
        """按空行切块（与历史 P21-P27 块口径一致，缓存在视图上）。"""
        key = ("blocks", lg)
        c = self.cache.get(key)
        if c is None:
            c = _split_blocks(self.body(lg) or "")
            self.cache[key] = c
        return c

    @property
    def zh(self):
        return self.parsed.get("zh")

    # ---------------- 语向便捷事实 ----------------

    @property
    def en(self):
        """(fm, body)：英文语向；缺 en 时返回 ({}, "")，调用方自行判空。"""
        return self.parsed.get("en", ({}, ""))

    @property
    def en_title(self):
        return str(self.en[0].get("title") or "")

    @property
    def en_excerpt(self):
        return str(self.en[0].get("excerpt") or "")

    # ---------------- 跨语比对基准 ----------------

    @property
    def master_lang(self):
        """比对基准：--master 显式指定 > zh > en > 排序首个；单语返回 None。"""
        ctx = getattr(self.pkg, "ctx", None)
        explicit = getattr(ctx, "master_lang", None) if ctx else None
        if explicit:
            return explicit
        if "zh" in self.parsed:
            return "zh"
        if "en" in self.parsed:
            return "en"
        return sorted(self.parsed)[0] if self.parsed else None

    @property
    def master_body(self):
        ml = self.master_lang
        return self.body(ml) if ml else ""

    @property
    def parity_on(self):
        """跨语判据开关：≥2 语且未 --no-parity。"""
        ctx = getattr(self.pkg, "ctx", None)
        if getattr(ctx, "no_parity", False):
            return False
        return len(self.parsed) >= 2

    def outline(self, lg):
        """块大纲（缓存）：P21–P27 七条判据共用这一次计算。"""
        from core.textutil import block_outline
        return self.memo(("outline", lg),
                         lambda: block_outline(self.body(lg) or ""))

    def heads(self, lg):
        """该语向的二级标题列表（## 开头，去空白）。"""
        key = ("heads", lg)
        c = self.cache.get(key)
        if c is None:
            c = [h.strip() for h in re.findall(r"(?m)^## (.+)$",
                                               self.body(lg) or "")]
            c = [h for h in c if h]
            self.cache[key] = c
        return c

    @property
    def zh_blocks(self):
        return self.blocks("zh")

    # ---------------- submission.json ----------------

    @property
    def meta_state(self):
        """missing | bad_json | not_object | empty | ok"""
        self.meta
        return self.cache["meta_state"]

    @property
    def meta_error(self):
        self.meta
        return self.cache.get("meta_error")

    @property
    def meta(self):
        c = self.cache.get("meta")
        if c is None:
            raw = self.files.get("submission.json")
            if raw is None:
                self.cache["meta"] = {}
                self.cache["meta_state"] = "missing"
                self.cache["meta_error"] = None
                return self.cache["meta"]
            try:
                obj = json.loads(_decode(raw))
            except UnicodeDecodeError as exc:
                self.cache["meta"] = {}
                self.cache["meta_state"] = "bad_json"
                self.cache["meta_error"] = ("decode", exc.start)
                return self.cache["meta"]
            except Exception as exc:
                self.cache["meta"] = {}
                self.cache["meta_state"] = "bad_json"
                self.cache["meta_error"] = ("json", str(exc))
                return self.cache["meta"]
            if not isinstance(obj, dict):
                self.cache["meta"] = {}
                self.cache["meta_state"] = "not_object"
                self.cache["meta_error"] = type(obj).__name__
                return self.cache["meta"]
            self.cache["meta"] = obj
            self.cache["meta_state"] = "ok" if obj else "empty"
            self.cache["meta_error"] = None
        return self.cache["meta"]

    @property
    def meta_kind(self):
        """submission.json 里的 kind（已 strip+lower），缺省为空串。"""
        return str(self.meta.get("kind") or "").strip().lower()

    @property
    def is_reg(self):
        return self.meta_kind == "regulation"

    # ---------------- 图片 ----------------

    @property
    def webp_tails(self):
        """本条目内所有 .webp 的 tail（S04 图片路径形状判据的输入）。"""
        return [t for t in self.tails if t.lower().endswith(".webp")]

    @property
    def replacement_chars(self):
        """含 U+FFFD 替换字符的文本文件 tail（可解码的那部分）。"""
        c = self.cache.get("replacement_chars")
        if c is None:
            out = []
            for t, data in sorted(self.files.items()):
                if not t.lower().endswith((".mdx", ".md", ".json", ".txt",
                                           ".yaml", ".yml")):
                    continue
                try:
                    if "\ufffd" in _decode(data):
                        out.append(t)
                except UnicodeDecodeError:
                    continue
            self.cache["replacement_chars"] = out
        return self.cache["replacement_chars"]

    @property
    def images(self):
        """{文件名: bytes}：合规路径的图片（images/<slug>/<name>.webp）。"""
        c = self.cache.get("images")
        if c is None:
            out, bad = {}, []
            for t, data in sorted(self.files.items()):
                if not t.lower().endswith(".webp"):
                    continue
                m = IMAGE_PATH_RE.match(t)
                if not m:
                    bad.append(t)
                    continue
                out[m.group(2)] = data
                if m.group(1) != self.slug:
                    bad.append(t)
            self.cache["images"] = out
            self.cache["image_bad_path"] = bad
        return self.cache["images"]

    @property
    def image_bad_path(self):
        self.images
        return self.cache["image_bad_path"]

    # ---------------- 通用缓存槽 ----------------

    def memo(self, key, factory):
        """插件/事实派生共用缓存：同一 key 只算一次。"""
        k = ("memo", key)
        if k not in self.cache:
            self.cache[k] = factory()
        return self.cache[k]


class PackageView(object):
    """一次 check 调用的包视图：包级事实 + 条目列表。"""

    __slots__ = ("path", "ctx", "expected_kind", "_files", "_articles", "cache")

    def __init__(self, path, files, ctx=None, expected_kind=None):
        self.path = path
        self.ctx = ctx
        self.expected_kind = expected_kind
        self._files = files                # {完整 key: bytes}
        self._articles = None
        self.cache = {}

    # 包级
    @property
    def policy(self):
        return getattr(self.ctx, "policy", None)

    @property
    def keys(self):
        return sorted(self._files)

    @property
    def total_bytes(self):
        return sum(len(b) for b in self._files.values())

    def raw(self, tail, kind_dir, slug):
        return self._files.get("%s/%s/%s" % (kind_dir, slug, tail), b"")

    def memo(self, key, factory):
        k = ("memo", key)
        if k not in self.cache:
            self.cache[k] = factory()
        return self.cache[k]

    # 布局事实
    @property
    def layout(self):
        """(顶层目录 -> 文件数, 非 blog/regulation 的 key 清单, articles/ 遗留数, 隐藏/垃圾清单)"""
        c = self.cache.get("layout")
        if c is None:
            tops, stray, legacy, junk = {}, [], 0, []
            for n in self.keys:
                if n.startswith("__MACOSX/") or n.endswith("/.DS_Store") \
                        or n == ".DS_Store":
                    junk.append(n)
                    continue
                if any(p.startswith(".") for p in n.split("/")):
                    junk.append(n)
                    continue
                parts = n.split("/")
                if parts[0] == "articles":
                    legacy += 1
                    continue
                if parts[0] not in ("blog", "regulation"):
                    stray.append(n)
                    continue
                tops[parts[0]] = tops.get(parts[0], 0) + 1
            self.cache["layout"] = (tops, stray, legacy, junk)
        return self.cache["layout"]

    @property
    def articles(self):
        if self._articles is None:
            groups = {}
            for n in self.keys:
                parts = n.split("/")
                if parts[0] not in ("blog", "regulation") or len(parts) < 2:
                    continue
                groups.setdefault((parts[0], parts[1]), []).append(
                    "/".join(parts[2:]))
            self._articles = [ArticleView(self, k, s, tails)
                              for (k, s), tails in sorted(groups.items())]
        return self._articles

    def article(self, slug):
        for a in self.articles:
            if a.slug == slug:
                return a
        return None

    def close(self):
        self._files = {}
        self._articles = None
        self.cache.clear()
