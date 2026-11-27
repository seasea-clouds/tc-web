# -*- coding: utf-8 -*-
"""core/glossary_loader.py — 术语策略的装配与配置校验。

三件事，全部与「判据」无关（判据在 plugins/glossary-*）：
  * `_glossary_config_errors`  配置体检：坏表/坏正则/非法语言码 → C01；
  * `_normalize_glossary`      显式传参与自动加载共用同一归一化路径；
  * `_auto_glossaries`         把 SQLite 策略库转成 spec（按 mtime 缓存）。

本模块不含任何稿件判据，只负责「把数据装成插件能吃的形状」。放在 core/
是因为它必须在插件装载之前跑（库读不出来时也要能报 C01）。
"""
# 治理声明：本文件属机制层，不承载策略数据；改动须走 README「治理」节的 L3 流程
#（先登记理由 → 行为级等价断言 → selftest --kit 全量），提交说明带 [arch]
#（commit-msg 钩子强制）。策略变更请改 plugins/ 判据或经 submit.py glossary 改库。

import re

from core.consts import KNOWN_RULES, LOCALES
from core.model import Context


def _glossary_config_errors(spec):
    """配置错误与稿件缺陷分离：坏表/坏正则/非法语言码/展开 0 项 → C01。"""
    errs = []
    if spec is None:
        return errs
    if not isinstance(spec, dict):
        return ["术语表顶层必须是 object（当前 %s）" % type(spec).__name__]
    for key in ("terms", "banned", "writing", "excerpt", "title", "refs"):
        v = spec.get(key)
        if v is not None and not isinstance(v, list):
            errs.append("术语表 %s 段必须是数组（当前 %s）"
                        % (key, type(v).__name__))
    # writing 段（README 全量回流）：契约必须声明已注册 rule、至少一个
    # 合法语向的 patterns，且正则可编译。坏契约会让整类防线静默失效，
    # 归 C01 配置层而不是稿件 finding。
    for w in (spec.get("writing") or []):
        if not isinstance(w, dict):
            errs.append("writing 段出现非对象条目")
            continue
        wid = str(w.get("id") or "<无 id>")
        if str(w.get("rule") or "") not in KNOWN_RULES:
            errs.append("writing 契约 %s 的 rule=%r 未注册" % (wid, w.get("rule")))
        wscope = str(w.get("scope") or "body")
        if wscope not in ("heading", "body", "meta", "link", "refs"):
            errs.append("writing 契约 %s 的 scope=%r 非法" % (wid, wscope))
        # link/refs 是结构型判据（链接形态、条数），没有词形表，不要求 patterns
        if wscope in ("link", "refs"):
            continue
        pats = w.get("patterns")
        if not isinstance(pats, dict) or not pats:
            errs.append("writing 契约 %s 缺 patterns（展开 0 项）" % wid)
            continue
        for lg, ps in pats.items():
            if lg != "*" and lg not in LOCALES:
                errs.append("writing 契约 %s 含非法语言码 %r" % (wid, lg))
            for p in ([ps] if isinstance(ps, str) else (ps or [])):
                p = str(p)
                if len(p) > 400:
                    errs.append("writing 契约 %s 的 patterns[%s] 过长" % (wid, lg))
                    continue
                try:
                    re.compile(p)
                except re.error as e:
                    errs.append("writing 契约 %s 的 patterns[%s] 正则无效: %s"
                                % (wid, lg, e))
    for t in (spec.get("terms") or []):
        if not isinstance(t, dict):
            errs.append("terms 段出现非对象条目")
            continue
        tid = str(t.get("id") or "<无 id>")
        if not str(t.get("zh") or "").strip():
            errs.append("术语 %s 缺 zh 锚点" % tid)
        all_targets = set()
        for fld in ("require", "require_all", "forbid", "forbid_re",
                    "forbid_licensed_by"):
            d = t.get(fld) or {}
            if not isinstance(d, dict):
                errs.append("术语 %s 的 %s 必须是 object" % (tid, fld))
                continue
            for lg in d:
                if lg != "*" and lg not in LOCALES:
                    errs.append("术语 %s 的 %s 含非法语言码 %r" % (tid, fld, lg))
                all_targets.add(lg)
        for lg, pats in (t.get("forbid_re") or {}).items():
            vals = [pats] if isinstance(pats, str) else (pats or [])
            for p in vals:
                p = str(p)
                if len(p) > 400:
                    errs.append("术语 %s 的 forbid_re[%s] 过长（%d 字符，拒绝潜在 ReDoS）"
                                % (tid, lg, len(p)))
                    continue
                try:
                    re.compile(p)
                except re.error as e:
                    errs.append("术语 %s 的 forbid_re[%s] 正则无效: %s" % (tid, lg, e))
        # M4：forbid_licensed_by 的 `re:` 来源词原先在判据内部即时编译
        # （异常即发 C01）。判据搬进 plugins/ 后，那条路径只在有对应稿件时
        # 才跑得到——配置错却没人命中，坏正则会一直不报。装配期统一校验，
        # 与 forbid_re 同档。
        for lg, val in (t.get("forbid_licensed_by") or {}).items():
            vals = [val] if isinstance(val, str) else (val or [])
            for p in vals:
                p = str(p)
                if not p.startswith("re:"):
                    continue
                pat = p[3:]
                if len(pat) > 400:
                    errs.append("术语 %s 的 forbid_licensed_by[%s] 正则过长"
                                "（%d 字符，拒绝潜在 ReDoS）" % (tid, lg, len(pat)))
                    continue
                try:
                    re.compile(pat)
                except re.error as e:
                    errs.append("术语 %s 的 forbid_licensed_by[%s] 正则无效: %s"
                                % (tid, lg, e))
        # I18/A14：没有任何语言目标的条款会静默失效
        if t.get("_checkable") is False:
            continue
        if not all_targets:
            errs.append("术语 %s 未指定任何语言目标（展开 0 项，会静默失效）" % tid)
    # S12 参考文献标题契约的 forbid_re：与块级同口径，同一道装配期校验。
    for r in (spec.get("refs") or []):
        if not isinstance(r, dict):
            errs.append("refs 段出现非对象条目")
            continue
        rid = str(r.get("id") or "<无 id>")
        for lg, pats in (r.get("forbid_re") or {}).items():
            vals = [pats] if isinstance(pats, str) else (pats or [])
            for p in vals:
                p = str(p)
                if len(p) > 400:
                    errs.append("refs 契约 %s 的 forbid_re[%s] 过长（%d 字符，"
                                "拒绝潜在 ReDoS）" % (rid, lg, len(p)))
                    continue
                try:
                    re.compile(p)
                except re.error as e:
                    errs.append("refs 契约 %s 的 forbid_re[%s] 正则无效: %s"
                                % (rid, lg, e))
    return errs


def _normalize_glossary(spec):
    """I11/A14/I18：显式传参与自动加载共用同一归一化路径。

    ① 注入 _shared（库 API 与 CLI 语义一致，消除直传原始表的 292 条配置噪声）；
    ② banned 按 (语种, casefold 词形) 全局去重，一次命中只报一条 P43；
    ③ 保留 verbatim / case_sensitive / require_match / zh 等新字段。
    """
    if spec is None or not isinstance(spec, dict):
        return spec
    out = {"version": spec.get("version")}
    for key in ("terms", "writing", "excerpt", "title", "refs"):
        arr = []
        for t in (spec.get(key) or []):
            if not isinstance(t, dict):
                continue
            t = dict(t)
            if key == "terms" and t.get("shared") is not False:
                t["_shared"] = True
            arr.append(t)
        out[key] = arr
    seen_ban, bans = set(), []
    for b in (spec.get("banned") or []):
        if not isinstance(b, dict):
            continue
        b = dict(b)
        lg = str(b.get("lang") or "")
        terms = b.get("terms")
        if isinstance(terms, str):
            terms = [terms]
        kept = []
        for w in (terms or []):
            k = (lg, str(w).casefold().strip())
            if not k[1] or k in seen_ban:
                continue
            seen_ban.add(k)
            kept.append(w)
        if kept:
            b["terms"] = kept
            bans.append(b)
    out["banned"] = bans
    return out


def _auto_lexicons(ctx):
    """把受控词表装进 Context（与契约同一份 PolicyView，不二次读盘）。

    显式注入 glossary 自检夹具时 `_auto_glossaries` 不会跑，词表仍需可用；
    读不到就记 config_errors（C01 报红），不静默当空表放行。
    """
    if ctx.lexicons is not None:
        return
    try:
        from core import db as _db
        pv = ctx.policy or _db.current_policy(ctx.db_path, ctx.kit_dir)
        ctx.lexicons = pv.lexicons
    except Exception as exc:
        ctx.lexicons = {}
        ctx.config_errors.append("受控词表读取失败: %s" % exc)


def _auto_glossaries(ctx=None):
    """从策略库装配术语 spec（唯一来源 data/glossary.db）。

    经 current_policy() 按 (mtime_ns, size) 缓存：同一次进程内多包只读一次，
    库文件一改下一次调用即失效重载。
    """
    if ctx is None:
        ctx = Context()
    try:
        from core import db as _db
        pv = ctx.policy or _db.current_policy(ctx.db_path, ctx.kit_dir)
        ctx.lexicons = pv.lexicons
        spec = _db.policy_spec(pv)
    except Exception as exc:
        ctx.config_errors.append("策略库读取失败: %s" % exc)
        return None
    for key in ("terms", "banned"):
        for item in spec.get(key) or []:
            if isinstance(item, dict):
                item["_shared"] = True
    return _normalize_glossary(spec)
