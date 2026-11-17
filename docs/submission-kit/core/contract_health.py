# -*- coding: utf-8 -*-
"""回流质量门禁：检查已入库的术语契约是否「真的能生效、且不会误伤别篇」。

工具包通用资产，跨篇、跨执行人生效。存在的理由（README「发现的问题必须
回流」与历次审计教训）：

* 改了 zh 母版之后，绑定该篇独有整句的契约会**静默失效**——契约还在库里、
  `doctor` 仍判 PASS，但它再也不会激活，等于回流白做（工作记忆 2026-11-08
  「改母版后必须重建 work 的 zh content」）。
* `forbid_re` 正则写错、或 JSON 里写成字面 ``\\uXXXX``，整条契约作废且无
  任何报错（工作记忆「写 \\uXXXX 会废掉整条契约」）。
* 同一契约同语向的 `require` 与 `forbid` 收了同一个词形，禁令被自己的
  require 抵消，P43/S08 判据静默失效（v1.92 hy «ՉՈՒՆ» 自碰教训）。
* 锚点用泛化概念词会同时激活多篇母版并逼出假红（README 第 380 行硬规则）。

分级：errors = 「回流没生效」类，必须锁红；warnings = 数据冗余类，只登记
不阻断。宽锚**不进 warnings**：本库有设计上就跨篇复用的通用契约（如
``body:declaration-not-announcement`` 命中 23 篇母版），一律报 warning 会
把正确设计当成缺陷。宽锚只按「契约 id 带篇号前缀却命中 ≥3 篇」收进 stats
盘点，供人工复核，遵循「已过审存量不追溯」。

本模块只读、无副作用；`repo_root` 显式传入才做依赖母版的检查（孤儿锚与
锚过宽），未传时跳过并在 stats 里标注，符合工具包「不推断项目根」的纪律。
"""
# 治理声明：本文件属机制层，不承载策略数据；改动须走 README「治理」节的 L3 流程
#（先登记理由 → 行为级等价断言 → selftest --kit 全量），提交说明带 [arch]
#（commit-msg 钩子强制）。策略变更请改 plugins/ 判据或经 submit.py glossary 改库。
from __future__ import annotations

import glob
import io
import json
import os
import re
import sqlite3

from core import db as _db

VALID_SECTIONS = {"body", "banned", "writing", "excerpt", "title", "refs"}
ZH_GLOB = os.path.join("*", "*", "work", "*", "*", "content", "zh", "*.mdx")
# 篇号前缀：A1/D3/O1/C4/REG22 一类单篇契约；无前缀者是跨篇通用契约，
# 锚宽属设计意图，不纳入 W1 盘点（宽锚只进 stats 盘点，不判缺陷）。
ARTICLE_PREFIX = re.compile(r"^(?:reg\d{1,2}|[a-z]\d{1,2})-", re.I)
WIDE_MIN_HITS = 3


def _as_list(v):
    if v is None:
        return []
    if isinstance(v, (list, tuple)):
        return [str(x) for x in v]
    return [str(v)]


# 工具包内部目录：即使落进 `*/*/work/...` 的形态也不是投稿树
# （selftest 夹具在 <kit>/tmp/selftest-*/work/... 下，正是这个形态）
KIT_LOCAL_DIRS = {"tmp", ".cache", ".state", ".clean", "template",
                  "tools", "selftest", "core", "plugins", "data"}


def _zh_corpus(repo_root):
    """返回 {slug: 全文}；repo_root 可直接是 submission/ 或其上级。

    2026-11-14 修正：本函数曾无条件追加 `root/*/*/work/*/*/content/zh`，
    在 root 缺省为工具包目录时命中了 `tmp/selftest-<pid>-n/work/...` 的
    自检夹具，于是拿 1 份样例母版去校验全库 1001 条契约，`doctor` 报
    489 条假「孤儿锚」并判 FAIL——且随 selftest 是否在跑而时有时无。
    现在只有 root 确实是投稿目录（自身/下含 blogs|regulations，或是
    submission 本身）才启用第二形态，并排除工具包内部目录。
    """
    if not repo_root:
        return {}
    root = os.path.abspath(repo_root)
    pats = [os.path.join(root, "submission", ZH_GLOB)]
    is_submission_root = (
        os.path.basename(root).lower() == "submission"
        or any(os.path.isdir(os.path.join(root, d)) for d in ("blogs", "regulations"))
    )
    if is_submission_root:
        pats.append(os.path.join(root, ZH_GLOB))
    # 只有当 root 本身是工具包（含 submit.py）时才套用内部目录排除，
    # 避免误伤投稿目录里恰好叫 data/ 或 tools/ 的条目。
    is_kit = os.path.isfile(os.path.join(root, "submit.py"))
    out = {}
    for pat in pats:
        for p in glob.glob(pat):
            rel = os.path.relpath(os.path.abspath(p), root).replace(os.sep, "/")
            if is_kit:
                head = rel.split("/", 1)[0]
                if head in KIT_LOCAL_DIRS:
                    continue
                if "/tmp/" in "/" + rel + "/" or "/selftest-" in "/" + rel:
                    continue
            try:
                out[os.path.basename(p)[:-4]] = io.open(
                    p, encoding="utf-8", errors="replace").read()
            except OSError:
                continue
    return out


def _regexes(payload):
    """产出 (字段, 语种, 正则源) 三元组，供编译校验。"""
    for lang, pats in (payload.get("forbid_re") or {}).items():
        for pat in _as_list(pats):
            yield "forbid_re", lang, pat
    for lang, pats in (payload.get("forbid_licensed_by") or {}).items():
        for pat in _as_list(pats):
            if isinstance(pat, str) and pat.startswith("re:"):
                yield "forbid_licensed_by", lang, pat[3:]


def audit(db_path, repo_root=None):
    """只读体检；返回 {errors, warnings, stats}。"""
    errors, warnings = [], []
    stats = {"contracts": 0, "zh_masters": 0, "anchored": 0,
             "orphan_check": "skipped", "wide_anchor_check": "skipped",
             "wide_anchor_total": 0, "wide_anchor_hits": []}

    corpus = _zh_corpus(repo_root)
    stats["zh_masters"] = len(corpus)
    do_corpus = bool(corpus)
    if do_corpus:
        stats["orphan_check"] = "enabled"
        stats["wide_anchor_check"] = "enabled"

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute(
            "SELECT id, section, options_json, note FROM terms "
            "ORDER BY section, ord").fetchall()
        anchors = {}
        for a in conn.execute(
                "SELECT term_id, zh_anchor FROM anchors ORDER BY term_id, ord"):
            anchors.setdefault(a["term_id"], []).append(a["zh_anchor"])
        forms = {}
        for f in conn.execute(
                "SELECT term_id, assertion, lang, value, match_mode, scalar "
                "FROM forms ORDER BY term_id, ord"):
            forms.setdefault(f["term_id"], []).append(
                (f["assertion"], f["lang"], f["value"], f["match_mode"],
                 f["scalar"]))
    finally:
        conn.close()
    stats["contracts"] = len(rows)

    # 跨契约重复词形统计（同语向 + casefold）
    seen_terms = {}
    anchored = []

    for r in rows:
        cid, sec = r["id"], (r["section"] or "")
        got_a = anchors.get(cid, [])
        anchor = got_a[0] if got_a else ""
        if sec not in VALID_SECTIONS:
            errors.append("E4 非法 section：%s -> %r" % (cid, sec))
        try:
            p = _db.payload_of(cid, sec, r["options_json"], r["note"],
                               got_a, forms.get(cid, []))
        except Exception as exc:
            errors.append("E4 契约重建失败：%s -> %s" % (cid, exc))
            continue
        if not isinstance(p, dict):
            errors.append("E4 payload 非 object：%s" % cid)
            continue

        # E1 / W1：只针对带 zh 锚的块级/题录契约
        if anchor:
            anchored.append((cid, anchor))
            if do_corpus:
                hits = [slug for slug, text in corpus.items() if anchor in text]
                if not hits:
                    errors.append(
                        "E1 孤儿锚（全库 %d 份 zh 母版均无此锚，契约永不激活）："
                        "%s -> %r" % (len(corpus), cid, anchor[:60]))
                elif (len(hits) >= WIDE_MIN_HITS and
                      ARTICLE_PREFIX.match(cid.split(":", 1)[-1])):
                    stats["wide_anchor_total"] += 1
                    if len(stats["wide_anchor_hits"]) < 10:
                        stats["wide_anchor_hits"].append(
                            {"id": cid, "hits": len(hits),
                             "slugs": sorted(hits)[:4]})

        # E2：正则编译失败 = 契约静默作废
        for field, lang, pat in _regexes(p):
            try:
                re.compile(pat)
            except Exception as exc:
                errors.append("E2 失效正则：%s [%s/%s] %r -> %s"
                              % (cid, field, lang, pat, exc))

        # E3：require 与 forbid 同形，禁令被自身抵消
        req, forb = p.get("require") or {}, p.get("forbid") or {}
        for lang in set(list(req) + list(forb)):
            a = {x.casefold().rstrip("*") for x in
                 _as_list(req.get(lang)) + _as_list(req.get("*"))}
            b = {x.casefold().rstrip("*") for x in
                 _as_list(forb.get(lang)) + _as_list(forb.get("*"))}
            common = a & b
            if common:
                errors.append("E3 词形自碰（require/forbid 同形，禁令失效）："
                              "%s [%s] %s" % (cid, lang, sorted(common)[:3]))

        # E4 / W2：banned 段结构
        if sec == "banned":
            lang = str(p.get("lang") or "")
            if not lang or (lang != "*" and not re.fullmatch(r"[a-z]{2}", lang)):
                errors.append("E4 banned 缺合法 lang：%s -> %r" % (cid, lang))
            terms = _as_list(p.get("terms"))
            if not terms:
                errors.append("E4 banned 空词形：%s" % cid)
            for t in terms:
                key = (lang, t.casefold())
                seen_terms.setdefault(key, []).append(cid)

    stats["anchored"] = len(anchored)
    for (lang, term), cids in sorted(seen_terms.items()):
        uniq = sorted(set(cids))
        if len(cids) > len(uniq):
            warnings.append("W2 重复词形（同契约内大小写冗余）：%s [%s] %r"
                            % (uniq[0], lang, term[:40]))
        elif len(uniq) > 1:
            warnings.append("W2 重复词形（跨契约登记）：%s [%s] %r"
                            % (", ".join(uniq[:3]), lang, term[:40]))

    return {"errors": errors, "warnings": warnings, "stats": stats}
