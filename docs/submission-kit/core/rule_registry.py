# -*- coding: utf-8 -*-
"""core/rule_registry.py — 规则注册表的唯一读写层。

`data/rules_registry.json` 是「有哪些规则、哪条规则由哪个插件发射、插件与
自检臂的字节指纹」的唯一真源。它本身在封签 SEALED 清单里：手工改动会让
`integrity` 失败。合法变更只有入口这一条路：

    python submit.py rules import --plugin <草稿.py> --selftest <草稿.py>
    python submit.py rules delete <RULE_ID>

判据插件逐文件登记 sha256：往 `plugins/` 丢文件或原地改判据，入口按注册表
指纹归档；合法变更只有 `rules import|delete` 一条路。注册表本身由入口受控
维护，分发前由维护者重签。

现在口径：
  · 插件目录逐文件比对 sha256，未登记或内容不符 → H01 → 入口归档；
  · 注册表在 SEALED 清单内，改动必须由维护者重签；
  · 新增/删除/修改规则只能走入口，入口负责静态校验、成对导入自检臂、
    policy bump、plugin sync，并提示重签。

本模块只做「数据 + 校验」，文件写入由 submit.py 统筹（这样回滚点只有一个）。
"""
# 治理声明：本文件属机制层，不承载策略数据；改动须走 README「治理」节的 L3 流程
#（先登记理由 → 行为级等价断言 → selftest --kit 全量），提交说明带 [arch]
#（commit-msg 钩子强制）。策略变更请改 plugins/ 判据或经 submit.py glossary 改库。

from __future__ import annotations

import ast
import hashlib
import io
import json
import os
import re

from core.consts import PLUGIN_CATEGORIES

REGISTRY_REL = "data/rules_registry.json"
FORMAT = 1

PLUGIN_NAME_RE = re.compile(r"^([a-z][a-z0-9]*)-([a-z0-9]+(?:-[a-z0-9]+)*)\.py$")
RULE_ID_RE = re.compile(r"^[A-Z][A-Z0-9]{1,3}$")

RATIONALE_MIN = 80
ZONE_VOCAB = frozenset({"frontmatter", "body", "metadata", "images",
                        "package", "any"})
LANGS_VOCAB = frozenset({"all", "any", "scripted"})

# 机制层内置规则：由 core/checker.py 与 core/kit_hygiene.py 发射，没有插件文件
CORE_RULE_IDS = ("C01", "H01", "H02")

REQUIRED_CONSTS = ("RULE", "RULES", "PHASE", "CATEGORY", "APPLIES_TO", "NEEDS",
                   "SEVERITY", "ENABLED", "RATIONALE", "COVERAGE")


class RegistryError(RuntimeError):
    pass


# ---------------------------------------------------------------- 基础工具

def path_of(kit_dir):
    return os.path.join(os.path.abspath(kit_dir),
                        REGISTRY_REL.replace("/", os.sep))


def sha256_bytes(data):
    return hashlib.sha256(data).hexdigest()


def sha256_file(path):
    with open(path, "rb") as fh:
        return sha256_bytes(fh.read())


def empty():
    return {"format": FORMAT,
            "note": "规则注册表：规则 ID、严重级、口径说明与插件指纹的唯一真源。"
                    "由 submit.py rules import/delete 维护；属封签 SEALED，"
                    "手工改动会让 integrity 失败。",
            "core": list(CORE_RULE_IDS),
            "rules": {}, "plugins": {}, "shared": {}, "selftest": {},
            "last_change": {}}


def load(kit_dir):
    """读注册表 → dict；缺失或损坏抛 RegistryError（调用方决定降级口径）。"""
    p = path_of(kit_dir)
    if not os.path.exists(p):
        raise RegistryError("缺规则注册表 %s（首次部署先跑 "
                            "`submit.py rules adopt`）" % REGISTRY_REL)
    try:
        with io.open(p, encoding="utf-8") as fh:
            data = json.load(fh)
    except (ValueError, OSError) as exc:
        raise RegistryError("规则注册表不可读：%s" % exc)
    if not isinstance(data, dict) or not isinstance(data.get("rules"), dict):
        raise RegistryError("规则注册表格式不合法（缺 rules 字典）")
    data.setdefault("core", list(CORE_RULE_IDS))
    for k in ("plugins", "shared", "selftest"):
        data.setdefault(k, {})
    return data


def try_load(kit_dir):
    """读注册表 → (dict|None, 错误字符串)。只读场景用它，不抛异常。"""
    try:
        return load(kit_dir), ""
    except RegistryError as exc:
        return None, str(exc)


def save(kit_dir, data, newline="\n"):
    """原子写：先写同目录 tmp 再 replace，避免半截文件被别的入口读到。"""
    p = path_of(kit_dir)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    payload = json.dumps(data, ensure_ascii=False, indent=1, sort_keys=True)
    tmp = p + ".tmp"
    with io.open(tmp, "w", encoding="utf-8", newline=newline) as fh:
        fh.write(payload + "\n")
    os.replace(tmp, p)
    return p


# ---------------------------------------------------------------- 插件静态校验

def _eval_node(node, env):
    """模块级常量的受限求值：只认字面量与对**已解析常量**的引用。

    为什么不直接 ast.literal_eval：现网插件普遍写 `RULES = [RULE]`、
    `RATIONALE = {"P75": _TEXT}`。这些引用在「不执行代码」的前提下仍可解，
    而表达式/函数调用一律拒绝——草稿来自包外临时目录，导入前的校验不能
    以「先跑一遍」为代价。
    """
    if isinstance(node, ast.Constant):
        return node.value
    if isinstance(node, ast.Name):
        if node.id in env:
            return env[node.id]
        raise KeyError(node.id)
    if isinstance(node, ast.List):
        return [_eval_node(e, env) for e in node.elts]
    if isinstance(node, ast.Tuple):
        return tuple(_eval_node(e, env) for e in node.elts)
    if isinstance(node, ast.Set):
        return {_eval_node(e, env) for e in node.elts}
    if isinstance(node, ast.Dict):
        out = {}
        for k, v in zip(node.keys, node.values):
            if k is None:
                raise KeyError("**")
            out[_eval_node(k, env)] = _eval_node(v, env)
        return out
    if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.USub):
        return -_eval_node(node.operand, env)
    if isinstance(node, ast.BinOp) and isinstance(node.op, ast.Add):
        return _eval_node(node.left, env) + _eval_node(node.right, env)
    raise KeyError(type(node).__name__)


def parse_plugin(src, filename):
    """静态解析插件源码 → 记录字典；不合规抛 RegistryError（带人话原因）。

    只解析、不执行：草稿来自包外临时目录，绝不 import 它——导入前的校验
    必须在「代码还没跑」的前提下完成。
    """
    m = PLUGIN_NAME_RE.match(filename)
    if not m:
        raise RegistryError("插件文件名 %r 非法：必须是 <分类>-<名称>.py"
                            "（全小写 kebab-case）" % filename)
    category = m.group(1)
    if category not in PLUGIN_CATEGORIES:
        raise RegistryError("分类前缀 %r 不在 PLUGIN_CATEGORIES 内（允许：%s）"
                            % (category, ", ".join(PLUGIN_CATEGORIES)))
    try:
        tree = ast.parse(src, filename=filename)
    except SyntaxError as exc:
        raise RegistryError("插件语法错误：第 %s 行 %s" % (exc.lineno, exc.msg))

    env = {}
    for node in tree.body:
        if isinstance(node, ast.Assign) and len(node.targets) == 1:
            name = getattr(node.targets[0], "id", "")
            if not name:
                continue
            try:
                env[name] = _eval_node(node.value, env)
            except Exception:
                pass          # 非字面量赋值（函数/调用）不进 env，后续引用即报缺
    missing = [n for n in REQUIRED_CONSTS if n not in env]
    if missing:
        raise RegistryError("插件缺常量或常量不是字面量：%s（一规则一插件必填，"
                            "只允许字面量与模块内常量引用）"
                            % ", ".join(missing))
    found = {n: env[n] for n in REQUIRED_CONSTS}

    rule = found["RULE"]
    if not isinstance(rule, str) or not RULE_ID_RE.match(rule):
        raise RegistryError("RULE=%r 不是合法规则号（形如 P75 / WR01）" % (rule,))
    if list(found["RULES"] or []) != [rule]:
        raise RegistryError("RULES 必须恰为 [RULE]（当前 %r）"
                            % (found["RULES"],))
    if str(found["CATEGORY"]) != category:
        raise RegistryError("CATEGORY=%r 与文件名前缀 %r 不一致"
                            % (found["CATEGORY"], category))

    rationale = found["RATIONALE"]
    if not isinstance(rationale, dict) or rule not in rationale:
        raise RegistryError("RATIONALE 缺 %s 条目" % rule)
    if len(str(rationale[rule]).strip()) < RATIONALE_MIN:
        raise RegistryError("RATIONALE[%s] 过短（< %d 字）：必须写实测出处"
                            % (rule, RATIONALE_MIN))

    cov = found["COVERAGE"]
    if not isinstance(cov, dict):
        raise RegistryError("COVERAGE 必须是字面量字典")
    zones = cov.get("zones")
    if not isinstance(zones, list) or not zones:
        raise RegistryError("COVERAGE.zones 必须是非空列表")
    bad_z = [z for z in zones if z not in ZONE_VOCAB]
    if bad_z:
        raise RegistryError("COVERAGE.zones 含未知层级 %s（合法：%s）"
                            % (bad_z, sorted(ZONE_VOCAB - {"any"})))
    langs = cov.get("langs")
    if isinstance(langs, str):
        if langs not in LANGS_VOCAB:
            raise RegistryError("COVERAGE.langs=%r 不合法（all/any/scripted "
                                "或语向列表）" % langs)
    elif not isinstance(langs, list):
        raise RegistryError("COVERAGE.langs 缺失或不合法")
    else:
        bad_l = [x for x in langs if not isinstance(x, str)]
        if bad_l:
            raise RegistryError("COVERAGE.langs 列表含非字符串项：%r" % bad_l)

    funcs = {n.name for n in tree.body
             if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))}
    for fn in ("run", "review"):
        if fn not in funcs:
            raise RegistryError("插件缺 def %s(…)" % fn)

    doc = ast.get_docstring(tree) or ""
    first = doc.strip().splitlines()[0].strip() if doc.strip() else ""
    desc = ""
    for sep in ("：", ":"):
        if first.startswith(rule + sep):
            desc = first[len(rule) + 1:].strip()
            break
    if not desc:
        desc = str(rationale[rule]).strip().splitlines()[0][:120]

    return {"filename": filename, "plugin": filename[:-3],
            "category": category, "rule": rule,
            "severity": str(found["SEVERITY"]), "desc": desc,
            "phase": int(found["PHASE"])}


def validate_selftest(src, filename, plugin_filename):
    """自检臂最小校验：同名、非空、有可运行的断言结构。

    兼容两种形态（现网两种都在用，不能只认一种）：
      A. `import _harness as H` + `H.main([...])` —— 主流形态，注入/还原由台架
         统一执行；
      B. 自带 `def main()` 且输出 PASS/FAIL —— 少数独立臂。
    """
    if filename != plugin_filename:
        raise RegistryError("自检臂必须与插件同名：%s != %s"
                            % (filename, plugin_filename))
    if not src.strip():
        raise RegistryError("自检臂 %s 是空文件" % filename)
    try:
        ast.parse(src, filename=filename)
    except SyntaxError as exc:
        raise RegistryError("自检臂语法错误：第 %s 行 %s"
                            % (exc.lineno, exc.msg))
    if "_harness" not in src and "def main(" not in src:
        raise RegistryError(
            "自检臂 %s 缺可执行入口：既没有走 _harness 台架，也没有 "
            "main()" % filename)


# ---------------------------------------------------------------- 注册表构建 / 审计

def build_from_disk(kit_dir):
    """按磁盘现状生成注册表（`rules adopt` 用；首次迁移与灾后重建）。"""
    kit_dir = os.path.abspath(kit_dir)
    pdir = os.path.join(kit_dir, "plugins")
    sdir = os.path.join(kit_dir, "selftest")
    if not os.path.isdir(pdir):
        raise RegistryError("插件目录不存在：%s" % pdir)
    data = empty()
    for name in sorted(os.listdir(pdir)):
        if not name.endswith(".py"):
            continue
        fp = os.path.join(pdir, name)
        if not os.path.isfile(fp):
            continue
        sha = sha256_file(fp)
        if name.startswith("_") or name == "__init__.py":
            data["shared"][name] = {"sha256": sha}
            continue
        with io.open(fp, encoding="utf-8") as fh:
            src = fh.read()
        rec = parse_plugin(src, name)
        data["plugins"][name] = {"plugin": rec["plugin"],
                                 "rules": [rec["rule"]], "sha256": sha}
        data["rules"][rec["rule"]] = {"severity": rec["severity"],
                                      "desc": rec["desc"]}
        arm = os.path.join(sdir, name)
        if os.path.isfile(arm):
            data["selftest"][name] = {"sha256": sha256_file(arm)}
    if not data["plugins"]:
        raise RegistryError("plugins/ 下没有可登记的判据插件：拒绝生成空注册表")
    data["last_change"] = {"at": "", "action": "adopt",
                           "detail": "按磁盘现状一次性登记 %d 个插件"
                                     % len(data["plugins"])}
    return data


def audit(kit_dir, data=None):
    """注册表 vs 磁盘差异 → 分类字典（只读）。

    keys: unregistered / hash_mismatch / missing / selftest_unregistered /
          selftest_hash_mismatch / orphan_rule
    """
    kit_dir = os.path.abspath(kit_dir)
    if data is None:
        data, err = try_load(kit_dir)
        if data is None:
            return {"error": err}
    pdir = os.path.join(kit_dir, "plugins")
    sdir = os.path.join(kit_dir, "selftest")
    on_disk = {}
    if os.path.isdir(pdir):
        for name in sorted(os.listdir(pdir)):
            if name.endswith(".py") and os.path.isfile(os.path.join(pdir, name)):
                on_disk[name] = sha256_file(os.path.join(pdir, name))
    reg = {}
    for name, rec in (data.get("plugins") or {}).items():
        reg[name] = str(rec.get("sha256") or "")
    for name, rec in (data.get("shared") or {}).items():
        reg[name] = str(rec.get("sha256") or "")

    out = {"unregistered": sorted(set(on_disk) - set(reg)),
           "missing": sorted(set(reg) - set(on_disk)),
           "hash_mismatch": sorted(n for n in set(on_disk) & set(reg)
                                   if on_disk[n] != reg[n]),
           "selftest_unregistered": [], "selftest_hash_mismatch": [],
           "orphan_rule": []}
    arms = {}
    if os.path.isdir(sdir):
        for name in sorted(os.listdir(sdir)):
            if name.endswith(".py") and not name.startswith("_"):
                arms[name] = sha256_file(os.path.join(sdir, name))
    reg_arms = {n: str(r.get("sha256") or "")
                for n, r in (data.get("selftest") or {}).items()}
    out["selftest_unregistered"] = sorted(set(arms) - set(reg_arms))
    out["selftest_hash_mismatch"] = sorted(
        n for n in set(arms) & set(reg_arms) if arms[n] != reg_arms[n])
    # 注册表里声明了规则、但没有插件指向它
    owned = {r for rec in (data.get("plugins") or {}).values()
             for r in (rec.get("rules") or [])}
    out["orphan_rule"] = sorted(set(data.get("rules") or {}) - owned
                                - set(data.get("core") or []))
    return out


def rules_of(data):
    """→ {规则号: (严重级, 说明)}（含 core 级）。"""
    return {r: (str(v.get("severity") or "error"),
                str(v.get("desc") or ""))
            for r, v in (data.get("rules") or {}).items()}


def owner_of(data, rule):
    for name, rec in (data.get("plugins") or {}).items():
        if rule in (rec.get("rules") or []):
            return name
    return None
