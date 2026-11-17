# -*- coding: utf-8 -*-
"""架构守卫：把「判据该写在哪」从口头纪律变成可机检的读数。

终态：
  判据实现**只在 `plugins/`**（一规则一文件）；术语契约与受控词表**只在
  `data/glossary.db`**（terms/anchors/forms + lexicons 两族表）；`plugins/_lexicon.py`
  只是访问层（取行 → 整形 → 缓存），不含词形数据。
  `core/` 只剩事实与调度：解析、装载、视图、策略库、插件发现、预览。

本模块只做五类断言，全部只读、零副作用：
  A1 core 内不得出现判据实现——`core/rules/`、`core/engine.py` 必须不存在，
     `core/**` 的 `add(` 发射点只允许出现在 `core/checker.py` 的包级守卫段，
     且规则 ID 必须在 CORE_GUARD_RULES 白名单内。
  A2 `tests/` 不得回流——回归只有 `selftest/` 一条路。
  A5 判据实现只在 `plugins/`：`core/` 与 `submit.py` 不得出现 `RULE = "..."`。
  A6/A7 一规则一插件：插件与自检 1:1，必填常量齐全，COVERAGE 字面量合法。
  A9 词表归数据层：`core/` 不得 import `plugins/`（防反向依赖）；
     `plugins/` 只允许一个词表访问层 `_lexicon.py`（数据一律进库，不许再长出
     `_lexicon_<x>.py` 数据模块），且该文件不得夹带判据、必须被至少一处 import。

分级：errors 锁红（doctor FAIL / check 的 C01），warnings 只登记。
"""
# 治理声明：本文件属机制层，不承载策略数据；改动须走 README「治理」节的 L3 流程
#（先登记理由 → 行为级等价断言 → selftest --kit 全量），提交说明带 [arch]
#（commit-msg 钩子强制）。策略变更请改 plugins/ 判据或经 submit.py glossary 改库。

from __future__ import annotations

import ast
import os
import re

# core 允许发射的规则：都是「包读不出/结构不成立」的包级守卫，必须在插件层
# 之前给出——包坏了连 PackageView 都构造不出来，插件根本没机会跑。
#   S01  没有 blog/<slug>/ 或 regulation/<slug>/ 结构
#   S05  文件后缀不在白名单
#   S06  包总大小超限
#   F10  包不可安全读取/非法 UTF-8
#   M03  条目 slug 重复
#   C01  策略库未加载或契约配置错误（工具配置，不是稿件缺陷）
CORE_GUARD_RULES = frozenset({"S01", "S05", "S06", "F10", "M03", "C01"})

# A1 的白名单文件名：只有它能发射包级守卫规则
_CHECKER_FILE = "checker.py"

# 词表访问层：全工具包唯一一个（数据在 data/glossary.db）
_LEXICON_FILE = "_lexicon" + ".py"


ZONE_VOCAB = {"frontmatter", "body", "metadata", "images", "package", "any"}
LANGS_VOCAB = {"all", "any", "scripted"}


def _coverage_of(path):
    """读插件的 COVERAGE 声明；返回 (found, value)。不执行插件。"""
    import ast
    try:
        tree = ast.parse(_read(path))
    except SyntaxError:
        return True, None
    for n in tree.body:
        if isinstance(n, ast.Assign) and getattr(n.targets[0], "id", "") == "COVERAGE":
            try:
                return True, ast.literal_eval(n.value)
            except Exception:
                return True, None
    return False, None


# 新形态插件命名：<category>-<name>.py（分类-名称，全小写 kebab）
NEW_PLUGIN_RE = re.compile(r"^[a-z][a-z0-9]*-[a-z0-9]+(?:-[a-z0-9]+)*\.py$")


def _read(path):
    with open(path, encoding="utf-8") as fh:
        return fh.read()


def audit(kit_dir):
    """返回 {"errors": [...], "warnings": [...], "stats": {...}}。"""
    errors, warnings = [], []
    kit_dir = os.path.abspath(kit_dir)
    core = os.path.join(kit_dir, "core")
    tests = os.path.join(kit_dir, "tests")
    rules_dir = os.path.join(core, "rules")
    stats = {}

    # A1 core 内不得出现判据实现
    rules_dir = os.path.join(core, "rules")
    if os.path.isdir(rules_dir):
        errors.append(
            "ARCH core/rules/ 仍然存在：判据实现只允许写在 plugins/，"
            "core/ 不得出现规则实现目录。")
    eng = os.path.join(core, "engine.py")
    if os.path.isfile(eng):
        errors.append(
            "ARCH core/engine.py 仍然存在：core 只提供事实与调度，"
            "不存在统一门面；调用方直接 import 真实模块。")

    add_re = re.compile(r'add\(\s*"([A-Z][A-Z0-9]+)"')
    checked = 0
    # core/ 现在含子包（consts/ 分包）：守卫必须递归扫，不能只看顶层 .py，
    # 否则往 consts/<分片>.py 里塞发射点会绕过 A1。
    for base, dirs, files in os.walk(core):
        dirs[:] = sorted(d for d in dirs if d != "__pycache__")
        for name in sorted(files):
            if not name.endswith(".py"):
                continue
            path = os.path.join(base, name)
            rel = os.path.relpath(path, kit_dir).replace(os.sep, "/")
            body = _read(path)
            hits = add_re.findall(body)
            if not hits:
                continue
            checked += 1
            if rel != "core/" + _CHECKER_FILE:
                errors.append(
                    "ARCH %s 出现 add( 发射点（%s）：core 只提供事实与调度，"
                    "判据必须写成 plugins/<分类>-<名称>.py。"
                    % (rel, ",".join(sorted(set(hits))[:4])))
                continue
        bad = sorted(set(hits) - CORE_GUARD_RULES)
        if bad:
            errors.append(
                "ARCH core/checker.py 发射了非包级守卫规则 %s：只有 %s 允许留在"
                " core（包读不出/结构不成立时插件无法运行）；其余规则请写插件。"
                % (bad, sorted(CORE_GUARD_RULES)))
    stats["core_files_with_add"] = checked

    # A2 tests/ 不得回流
    tests = os.path.join(kit_dir, "tests")
    if os.path.isdir(tests):
        extra = sorted(n for n in os.listdir(tests) if n.endswith(".py"))
        stats["tests_files"] = len(extra)
        errors.append(
            "ARCH tests/ 目录重新出现（%d 个 .py）：回归统一写 "
            "selftest/<插件同名>.py（一规则一臂），不允许另起测试目录。"
            % len(extra))

    # A5 判据实现只在 plugins/：入口与 core 都不得定义 RULE 常量。
    # 2026-11-12 M6 修正：原实现只扫 submit.py，与 docstring 宣称的
    # 「core/ 与 submit.py」不符——core 里塞一条 RULE 常量不会被抓到。
    a5_targets = ["submit.py"]
    core_dir = os.path.join(kit_dir, "core")
    if os.path.isdir(core_dir):
        # 同样递归：consts/ 分包后的分片也必须受 A5 约束。
        for base, dirs, files in os.walk(core_dir):
            dirs[:] = sorted(d for d in dirs if d != "__pycache__")
            a5_targets += [os.path.relpath(os.path.join(base, n), kit_dir)
                           .replace(os.sep, "/")
                           for n in sorted(files) if n.endswith(".py")]
    for rel in a5_targets:
        path = os.path.join(kit_dir, rel)
        if not os.path.isfile(path):
            continue
        body = _read(path)
        if re.search(r'(?m)^RULE\s*=\s*["\']', body):
            errors.append(
                "ARCH %s 内出现 RULE 常量：判据实现只能放 plugins/，"
                "CLI 只调用插件。" % rel)

    # A6/A7 一规则一插件（新形态）：插件与自检 1:1，且只许 emit
    plugins_dir = os.path.join(kit_dir, "plugins")
    selftest_dir = os.path.join(kit_dir, "selftest")
    if os.path.isdir(plugins_dir):
        newp = sorted(n for n in os.listdir(plugins_dir)
                      if NEW_PLUGIN_RE.match(n))
        stats["new_plugins"] = len(newp)
        st_set = set()
        if os.path.isdir(selftest_dir):
            st_set = {n for n in os.listdir(selftest_dir)
                      if n.endswith(".py") and not n.startswith("_")}
        stats["selftests"] = len(st_set)
        for n in newp:
            if n not in st_set:
                errors.append(
                    "ARCH 插件 %s 缺同名自检 selftest/%s：一规则一插件必须配一条"
                    "自检臂（注入缺陷→报红→还原→转绿）。" % (n, n))
        for n in sorted(st_set - set(newp)):
            errors.append(
                "ARCH selftest/%s 没有同名插件：自检必须与插件 1:1，否则"
                "孤儿自检会长期假绿。" % n)
        for n in newp:
            body = _read(os.path.join(plugins_dir, n))
            if 'add("' in body:
                errors.append(
                    "ARCH 插件 %s 内出现 add(\"：新形态插件只许 "
                    "emit(rule, severity, slug, detail)。" % n)
            for need in ("RULE =", "RULES =", "PHASE =", "CATEGORY =",
                         "APPLIES_TO =", "NEEDS =", "SEVERITY =",
                         "ENABLED =", "RATIONALE =", "def run(", "def review("):
                if need not in body:
                    errors.append("ARCH 插件 %s 缺 `%s`：一规则一插件的必填"
                                  "信息不全。" % (n, need))
            # A8：COVERAGE 是自检「注入点是否在射程内」的唯一依据。
            found, cov = _coverage_of(os.path.join(plugins_dir, n))
            if not found:
                errors.append(
                    "ARCH 插件 %s 缺 COVERAGE：必须声明判据真实射程 "
                    "COVERAGE = {\"langs\": ..., \"zones\": [...]}，"
                    "自检台架据此拦截「注入落在射程外」的空臂。" % n)
            elif not isinstance(cov, dict):
                errors.append("ARCH 插件 %s 的 COVERAGE 不是字面量字典"
                              "（只能是字符串/列表常量，不许写表达式）。" % n)
            else:
                zones = cov.get("zones")
                langs = cov.get("langs")
                if not isinstance(zones, list) or not zones:
                    errors.append("ARCH 插件 %s 的 COVERAGE.zones 必须是非空列表"
                                  "（frontmatter/body/metadata/images/package）。" % n)
                else:
                    bad = [z for z in zones if z not in ZONE_VOCAB]
                    if bad:
                        errors.append("ARCH 插件 %s 的 COVERAGE.zones 含未知层级 %s"
                                      "（合法值 %s）。"
                                      % (n, bad, sorted(ZONE_VOCAB - {"any"})))
                if isinstance(langs, str):
                    if langs not in LANGS_VOCAB:
                        errors.append("ARCH 插件 %s 的 COVERAGE.langs=%r 不合法"
                                      "（all / any / scripted 或语向列表）。"
                                      % (n, langs))
                elif not isinstance(langs, list):
                    errors.append("ARCH 插件 %s 缺 COVERAGE.langs（all / any / "
                                  "scripted / 语向列表）。" % n)

    # A9 受控词表与依赖方向：core/ 不得 import plugins/；词表必须是纯数据，
    # 且被至少一处 import（防「加了表没人用」的死表）。2026-11-13 收口：
    # 4 个受控词表从 core/ 迁到 plugins/_lexicon_*.py。
    plug_imports = set()
    for base, dirs, files in os.walk(core):
        dirs[:] = sorted(d for d in dirs if d != "__pycache__")
        for name in sorted(files):
            if not name.endswith(".py"):
                continue
            path = os.path.join(base, name)
            try:
                tree = ast.parse(_read(path))
            except SyntaxError:
                continue
            mods = []
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    mods.extend(a.name for a in node.names)
                elif isinstance(node, ast.ImportFrom):
                    mods.append(node.module or "")
            if any(m == "plugins" or m.startswith("plugins.") for m in mods):
                plug_imports.add(
                    os.path.relpath(path, kit_dir).replace(os.sep, "/"))
    stats["core_plugins_imports"] = len(plug_imports)
    if plug_imports:
        errors.append(
            "ARCH core/ 出现对 plugins/ 的依赖（%s）：core 只提供事实与调度，"
            "受控词表与判据都归实现层。反向依赖会让 core 无法脱离 plugins "
            "独立运行，也让插件启停能改掉 core 的行为（A9）。"
            % ", ".join(sorted(plug_imports)))

    plugins_dir = os.path.join(kit_dir, "plugins")
    lexicons = []
    if os.path.isdir(plugins_dir):
        lexicons = sorted(n for n in os.listdir(plugins_dir)
                          if n.startswith("_lexicon") and n.endswith(".py"))
    stats["lexicons"] = len(lexicons)
    if lexicons and lexicons != [_LEXICON_FILE]:
        errors.append(
            "ARCH plugins/ 只允许一个词表访问层 %s，实际有 %s：词形数据一律进"
            " data/glossary.db 的 lexicons 表，不许再长出数据模块（A9）。"
            % (_LEXICON_FILE, ", ".join(lexicons)))
    # add( 只认带规则号的发射形态 add("，避免把 set().add(x) 误判成判据
    pure_bad = ("RULE =", "RULE=", "PHASE", "def run(", "def review(",
                "emit(", 'add("')
    if _LEXICON_FILE in lexicons:
        body = _read(os.path.join(plugins_dir, _LEXICON_FILE))
        bad = [t for t in pure_bad if t in body]
        if bad:
            errors.append(
                "ARCH plugins/%s 是词表访问层却含 %s：只许取行/整形/缓存，"
                "判据必须另写 plugins/<分类>-<名称>.py（A9）。"
                % (_LEXICON_FILE, " / ".join(bad)))
        # 反向检查：访问层被谁 import（死代码检测）
        pat = re.compile(r"(?:from|import)\s+[\w.]*%s\b" % re.escape("_lexicon"))
        used = 0
        for d in (core, plugins_dir, os.path.join(kit_dir, "selftest"),
                  os.path.join(kit_dir, "tools")):
            if not os.path.isdir(d):
                continue
            for base, dirs, files in os.walk(d):
                dirs[:] = sorted(x for x in dirs if x != "__pycache__")
                for name in sorted(files):
                    if not name.endswith(".py") or name == _LEXICON_FILE:
                        continue
                    if pat.search(_read(os.path.join(base, name))):
                        used += 1
        stats["lexicon_consumers"] = used
        if not used:
            errors.append(
                "ARCH plugins/%s 没有任何消费方：词表访问层必须被至少一个判据"
                "插件 import，否则是死代码（A9）。" % _LEXICON_FILE)

    return {"errors": errors, "warnings": warnings, "stats": stats}
