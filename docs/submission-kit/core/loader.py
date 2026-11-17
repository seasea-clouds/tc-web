# -*- coding: utf-8 -*-
"""core/loader.py — 插件装载器（磁盘权威、热插拔、字节码缓存）。

两种插件形态：

**新形态（唯一允许新增的形态）**：`plugins/<category>-<name>.py`，模块级常量
RULE / RULES / PHASE / CATEGORY / APPLIES_TO / NEEDS / SEVERITY / ENABLED /
RATIONALE，以及 run(view, emit) 与 review(finding, view)。

插件必须声明 RULE 常量；缺常量按装配错误报出（不产出规则）。

热插拔：每次调用重扫目录；模块名带内容 sha，改文件下一次调用即生效。
字节码缓存：sha 未变时直接 marshal 载入 code object，不再解析源码
（180 个插件时这是唯一能让每次调用不付 1.9s 的办法）。
"""
# 治理声明：本文件属机制层，不承载策略数据；改动须走 README「治理」节的 L3 流程
#（先登记理由 → 行为级等价断言 → selftest --kit 全量），提交说明带 [arch]
#（commit-msg 钩子强制）。策略变更请改 plugins/ 判据或经 submit.py glossary 改库。
from __future__ import annotations

import glob
import hashlib
import importlib.util
import json
import marshal
import os
import re
import sys

from core.consts import PLUGIN_CATEGORIES

NEW_NAME_RE = re.compile(r"^([a-z][a-z0-9]*)-([a-z0-9]+(?:-[a-z0-9]+)*)\.py$")
REQUIRED_ATTRS = ("RULE", "RULES", "PHASE", "CATEGORY", "APPLIES_TO", "NEEDS",
                  "SEVERITY", "ENABLED", "RATIONALE")
RATIONALE_MIN = 80


class PluginError(Exception):
    pass


def state_path(kit_dir):
    """插件启停是工具内部状态：落在工具包 .state/（不入分发包）。"""
    return os.path.join(kit_dir, ".state", "plugins.json")


def cache_dir(kit_dir):
    return os.path.join(kit_dir, ".cache", "plugins")


def disabled_plugins(kit_dir):
    p = state_path(kit_dir)
    if not os.path.isfile(p):
        return set()
    try:
        d = json.load(open(p, encoding="utf-8"))
        return set(d.get("disabled") or [])
    except Exception:
        return set()


def set_enabled(kit_dir, plugin_id, enabled):
    p = state_path(kit_dir)
    cur = disabled_plugins(kit_dir)
    if enabled:
        cur.discard(plugin_id)
    else:
        cur.add(plugin_id)
    try:
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, "w", encoding="utf-8", newline="\n") as fh:
            json.dump({"disabled": sorted(cur)}, fh, ensure_ascii=False, indent=2)
    except OSError as exc:
        # 工具包可能被解包到只读位置（共享盘/系统目录）：启停需要写 .state/，
        # 这里给明确原因，避免只看到裸的 WinError（只读检查不受影响）。
        raise RuntimeError(
            "工具包目录不可写，无法保存插件启停状态：%s（%s）；"
            "只读部署下 check / preview / glossary 查询仍可正常用，"
            "需要启停插件时把工具包放到可写目录再执行"
            % (p, exc))


# ------------------------------------------------------------------ 字节码缓存

def _code_of(fp, raw, sha, kit_dir):
    """返回 (code object, 是否命中缓存)。缓存损坏/版本不符时静默回退编译。"""
    cdir = cache_dir(kit_dir)
    cpath = os.path.join(cdir, "%s.pyc" % sha)
    try:
        with open(cpath, "rb") as fh:
            if fh.read(4) == importlib.util.MAGIC_NUMBER:
                return marshal.load(fh), True
    except (OSError, ValueError, EOFError):
        pass
    code = compile(raw.decode("utf-8"), fp, "exec")
    try:
        os.makedirs(cdir, exist_ok=True)
        tmp = cpath + ".tmp"
        with open(tmp, "wb") as fh:
            fh.write(importlib.util.MAGIC_NUMBER)
            marshal.dump(code, fh)
        os.replace(tmp, cpath)
    except OSError:
        pass
    return code, False


def _exec_module(fp, raw, sha, kit_dir, mod_name):
    mod = sys.modules.get(mod_name)
    if mod is not None:
        return mod, True
    code, _hit = _code_of(fp, raw, sha, kit_dir)
    spec = importlib.util.spec_from_loader(mod_name, loader=None, origin=fp)
    mod = importlib.util.module_from_spec(spec)
    mod.__file__ = fp
    sys.modules[mod_name] = mod
    try:
        exec(code, mod.__dict__)
    except Exception as exc:
        del sys.modules[mod_name]
        raise PluginError("插件 %s 加载失败：%s: %s"
                          % (os.path.basename(fp), type(exc).__name__, exc))
    return mod, False


# ------------------------------------------------------------------ 发现

def _load_new(fp, raw, sha, kit_dir, stem, category, name):
    mod_name = "chk_plugin_%s_%s" % (stem.replace("-", "_"), sha[:10])
    mod, _cached = _exec_module(fp, raw, sha, kit_dir, mod_name)
    for attr in REQUIRED_ATTRS:
        if not hasattr(mod, attr):
            raise PluginError("插件 %s 缺常量 %s（一规则一插件必填）"
                              % (os.path.basename(fp), attr))
    rule = str(mod.RULE)
    rules = list(mod.RULES or [])
    if rules != [rule]:
        raise PluginError("插件 %s 的 RULES 必须恰为 [RULE]（当前 %r）"
                          % (os.path.basename(fp), rules))
    if str(mod.CATEGORY) != category:
        raise PluginError("插件 %s 的 CATEGORY=%r 与文件名前缀 %r 不一致"
                          % (os.path.basename(fp), mod.CATEGORY, category))
    if category not in PLUGIN_CATEGORIES:
        raise PluginError(
            "插件 %s 的分类前缀 %r 不在 PLUGIN_CATEGORIES 内（允许：%s）；"
            "新增分类属架构变更，须先改 core/consts/ 并更新方案"
            % (os.path.basename(fp), category, ", ".join(PLUGIN_CATEGORIES)))
    rationale = getattr(mod, "RATIONALE", {}) or {}
    if not isinstance(rationale, dict) or rule not in rationale:
        raise PluginError("插件 %s 的 RATIONALE 缺 %s 条目" % (fp, rule))
    if len(str(rationale[rule]).strip()) < RATIONALE_MIN:
        raise PluginError("插件 %s 的 RATIONALE[%s] 过短（< %d 字）：必须写实测出处"
                          % (os.path.basename(fp), rule, RATIONALE_MIN))
    if not hasattr(mod, "run") or not callable(mod.run):
        raise PluginError("插件 %s 缺 run(view, emit)" % fp)
    if not hasattr(mod, "review") or not callable(mod.review):
        raise PluginError("插件 %s 缺 review(finding, view)" % fp)
    rjson = json.dumps({rule: str(rationale[rule])}, ensure_ascii=False,
                       sort_keys=True, separators=(",", ":"))
    return {
        "id": stem, "name": name, "category": category, "style": "new",
        "version": "1", "phase": int(mod.PHASE), "rule": rule, "rules": [rule],
        "applies_to": list(mod.APPLIES_TO), "needs": list(mod.NEEDS or []),
        "severity": str(mod.SEVERITY),
        "rationale": {rule: str(rationale[rule])},
        "rationale_sha": hashlib.sha256(rjson.encode("utf-8")).hexdigest(),
        "source_sha": sha, "path": fp, "module": mod,
        "enabled": True, "default_enabled": bool(mod.ENABLED),
    }


def discover(kit_dir, tolerant=False):
    """返回 (插件信息列表, 跳过清单)，按 phase 排序。

    tolerant=True：单个插件写到一半（语法错误/常量缺失）跳过并记原因，
    其余照常运行；「全部插件都不可用」仍抛 PluginError。
    """
    from core import consts as _consts
    pdir = os.path.join(kit_dir, "plugins")
    if not os.path.isdir(pdir):
        raise PluginError("插件目录不存在：%s" % pdir)
    disabled = disabled_plugins(kit_dir)
    plugins, skipped = [], []
    seen_ids, seen_rules = set(), {}

    def _skip(fp, pid, reason):
        skipped.append({"file": os.path.basename(fp), "id": pid or "?",
                        "error": reason})

    for fp in sorted(glob.glob(os.path.join(pdir, "*.py"))):
        base = os.path.basename(fp)
        if base.startswith("_"):
            continue
        try:
            raw = open(fp, "rb").read()
            sha = hashlib.sha256(raw).hexdigest()
            m = NEW_NAME_RE.match(base)
            if not m:
                raise PluginError(
                    "插件文件名 %s 非法：必须是 <分类>-<名称>.py（分类取 "
                    "consts.PLUGIN_CATEGORIES，名称小写 kebab-case）" % base)
            info = _load_new(fp, raw, sha, kit_dir, base[:-3],
                             m.group(1), m.group(2))
            for r in info["rules"]:
                if r not in _consts.KNOWN_RULES:
                    raise PluginError("插件 %s 声明了未注册规则 %s"
                                      % (base, r))
                if r in seen_rules:
                    raise PluginError("规则 %s 被 %s 与 %s 重复声明"
                                      % (r, seen_rules[r], info["id"]))
            if info["id"] in seen_ids:
                raise PluginError("插件 id 重复：%s" % info["id"])
        except PluginError as exc:
            if not tolerant:
                raise
            _skip(fp, base[:-3], str(exc))
            continue
        seen_ids.add(info["id"])
        for r in info["rules"]:
            seen_rules[r] = info["id"]
        # 启停：ENABLED 常量给默认值，.state 显式覆盖优先
        if info["id"] in disabled:
            info["enabled"] = False
        elif info["style"] == "new" and not info["default_enabled"]:
            info["enabled"] = False
        plugins.append(info)

    if tolerant and skipped and not plugins:
        raise PluginError("全部 %d 个插件均不可用（检查环境整体故障）：%s"
                          % (len(skipped),
                             "; ".join(s["file"] for s in skipped[:5])))
    plugins.sort(key=lambda x: (x["phase"], x["id"]))
    return plugins, skipped


def enabled_rules(plugins):
    return frozenset(r for p in plugins if p["enabled"] for r in p["rules"])


def coverage(plugins):
    """返回 (已声明集合, 未声明集合)；doctor 要求未声明为空。

    M4：`consts.CORE_RULES`（C01/H01/H02）算已声明——它们由 core/checker.py 的
    包级守卫与 core/kit_hygiene.py 发射，必须在插件层之前/之外就能报，
    结构上不可能写成 plugins/ 下的一规则一文件。
    """
    from core import consts as _consts
    declared = frozenset(r for p in plugins for r in p["rules"])
    declared |= frozenset(getattr(_consts, "CORE_RULES", ()))
    return declared, frozenset(_consts.KNOWN_RULES) - declared


def report(plugins, verbose=False):
    rows = []
    for p in plugins:
        rows.append({
            "id": p["id"], "version": p["version"], "phase": p["phase"],
            "applies_to": p["applies_to"], "rules": p["rules"],
            "enabled": p["enabled"], "source_sha": p["source_sha"][:16],
            "rationale_sha": p["rationale_sha"][:16],
            "rationale_rules": sorted(p["rationale"]) if verbose else None,
        })
    return rows
