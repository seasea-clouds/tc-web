# -*- coding: utf-8 -*-
"""core/model.py — 数据模型。

Context / Finding 与配置异常。放在最底层：Finding 依赖 KNOWN_RULES，
故本模块只依赖 core.consts，供插件层与调度层共用同一份定义。
"""
# 治理声明：本文件属机制层，不承载策略数据；改动须走 README「治理」节的 L3 流程
#（先登记理由 → 行为级等价断言 → selftest --kit 全量），提交说明带 [arch]
#（commit-msg 钩子强制）。策略变更请改 plugins/ 判据或经 submit.py glossary 改库。

import os

from core.consts import KNOWN_RULES

# ---------------------------------------------------------------- v2.13 基础设施
# I07：把「工具/配置坏了」与「稿子写错了」分开。C0* = 配置层（退出码 2），
# F10 = 输入文件不可安全解码/读取（退出码 1），其余维持既有稿件规则。
class PackageInputError(Exception):
    """投稿包目录/zip 不可安全读取：路径、成员数、体积、符号链接、重名。"""


class Context:
    """I10：单次检查的配置容器，每个包一份；check() 不再写模块级可变状态。

    v2.12 的 _NO_PARITY / _MASTER_LANG / _GLOSSARY / _ARTICLE_GLOSSARY_SEEN
    四个全局开关与 7 处 global 语句让 check() 不可重入、不能并发。这里改为
    显式传参：批量模式每包 clone() 一份，同进程连续检查不会串味。
    """
    __slots__ = ("master_lang", "no_parity", "glossary", "glossary_disabled",
                 "config_errors", "kit_dir",
                 "db_path", "policy", "rules_filter", "lexicons",
                 "lexicon_cache")

    def __init__(self, master_lang=None, no_parity=False, glossary=None,
                 glossary_disabled=False,
                 config_errors=None, kit_dir=None, db_path=None, policy=None,
                 rules_filter=None, lexicons=None):
        self.master_lang = master_lang
        self.no_parity = bool(no_parity)
        self.glossary = glossary
        self.glossary_disabled = bool(glossary_disabled)
        self.config_errors = list(config_errors or [])
        # 本模块位于 core/，工具包根是上一级
        self.kit_dir = kit_dir or os.path.dirname(
            os.path.dirname(os.path.abspath(__file__)))
        self.db_path = db_path
        self.policy = policy
        self.rules_filter = rules_filter
        # 受控词表：{id: [row, ...]}，由 glossary_loader 从 lexicons 表装载；
        # lexicon_cache 供 plugins/_lexicon.py 整形缓存（同一包内多语向复用）。
        self.lexicons = lexicons
        self.lexicon_cache = {}

    def to_kwargs(self):
        """可回传给 __init__ 的字段快照（派生缓存不入参）。

        2026-11-14：`--all --jobs>1` 曾在 checker._run_batch 里自建
        `{k: getattr(self, k) for k in __slots__}`，把后加的 `lexicon_cache`
        一起传进 `Context(**cfg)`，直接 TypeError 崩掉整轮并行检查。
        单一真值放在这里：新增派生字段只改本方法，clone 与进程池共用。
        """
        return {k: getattr(self, k) for k in self.__slots__
                if k != "lexicon_cache"}

    def clone(self, **kw):
        # lexicon_cache 是纯派生缓存，随新 Context 重建（不入参、不共享）
        vals = self.to_kwargs()
        vals.update(kw)
        return Context(**vals)


class Finding:
    __slots__ = ("rule", "severity", "slug", "detail")

    def __init__(self, rule, severity, slug, detail):
        # I07/I09：规则 ID 必须登记，severity 必须是枚举值；拼写错误不再静默忽略
        if rule not in KNOWN_RULES:
            raise ValueError("未注册规则 ID: %r（请登记到 KNOWN_RULES/RULE_META）" % rule)
        if severity not in ("error", "warning"):
            raise ValueError("非法 severity: %r" % severity)
        self.rule = rule
        self.severity = severity
        self.slug = slug
        self.detail = detail

    def as_dict(self):
        # lang：逐语 finding 的 slug 字段是 "lang/slug" 形态，机器消费时
        # 直接给独立字段；条目级 finding（结构/元数据类）lang 为 None。
        lang = self.slug.split("/", 1)[0] if "/" in self.slug else None
        return {"rule": self.rule, "severity": self.severity,
                "article": self.slug, "lang": lang, "detail": self.detail}
