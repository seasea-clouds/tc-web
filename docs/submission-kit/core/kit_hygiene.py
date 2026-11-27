# -*- coding: utf-8 -*-
"""core/kit_hygiene.py — 工具包目录白名单（H01/H02）。

工具包内每个文件都必须命中逐文件清单（`integrity.allowed_files`）：运行时
文件 + 封签 SEALED + `template/**` 资产 + 规则注册表登记的插件。未登记或
内容不符一律 H01，由入口归档到 `<tmp>/待删除/`；合法变更只有两条路：
`submit.py rules import|delete`（判据）与维护者重签（框架层）。

本文件不含策略数据，也没有人工放行清单：数据源只有封签清单与注册表。

`IMMUNE` 是双保险：即使清单读坏，这些具体文件也永不被移动——工具包不能
因为一次误判把自己拆掉（策略库、封签信任根、插件注册表都在里面）。

临时目录不许进工具包：临时根永远是仓库根的 `tmp/`（`--tmp` 显式传入）；
工具包内出现 `tmp/` 属结构违规，入口整目录归档。
"""
# 治理声明：本文件属机制层，不承载策略数据；改动须走 README「治理」节的 L3 流程
#（先登记理由 → 行为级等价断言 → selftest --kit 全量），提交说明带 [arch]
#（commit-msg 钩子强制）。策略变更请改 plugins/ 判据或经 submit.py glossary 改库。
import datetime
import fnmatch
import hashlib
import json
import os
import shutil
import sys

# 精确放行的单个文件（相对路径） -----------------------------------------

# 目录级规则：目录 → 允许的扩展名（None 表示整树允许）
# plugins/ 的 `.py` 仍按扩展名进白名单判定，但**还要**命中规则注册表的
# sha256（见 scan）：未登记或内容被改都算 H01。`plugins/x.md`、`.json`
# 连扩展名这一关都过不了，直接归档。

# 额外的模式放行（一般留空；逐文件清单见 integrity.allowed_files）

# 运行时/临时目录：整目录不扫（内容不参与目录合规）
SKIP_DIRS = {"tmp", "__pycache__", ".state", ".clean", ".cache", ".keys"}
# 但**根层**这些目录一律不许存在：临时根是 <repo>/tmp（--tmp 显式传入），
# 与工具包位置无关；工具包自带的 tmp 会被整目录归档（v466）。
FORBIDDEN_DIRS = {"tmp"}
# 产物噪声：静默（不当违规、不报）
IGNORE_GLOBS = ("*.pyc", "*.pyo", "*.db-wal", "*.db-shm", "*.db-journal",
                "__pycache__/*", "*/__pycache__/*")

REGISTRY_FILE = "data/rules_registry.json"

# 双保险：白名单常量被写坏时也不许移动这些**具体文件**（工具包自毁防护）。
# 注意这里只能列文件，不能列目录：早期版本写了 `core`、`tools` 等目录前缀，
# 结果 `core/notes.md` 被判成「免疫路径」而永不移动——免疫射程必须小于
# 违规判定，否则白名单形同虚设（v464 实测踩到）。
IMMUNE = ("submit.py", "README.md",
          "data/glossary.db", "data/glossary.db-wal",
          "data/glossary.db-shm", "data/glossary.db-journal",
          "data/integrity.json", "data/integrity.sig",
          "data/sealed.zip", "data/trust_anchor.txt",
          REGISTRY_FILE)
# 熔断：一次要移动这么多文件，多半是白名单配置错了，宁可拒绝也不拆包
PURGE_LIMIT = 50


def _rel_norm(rel):
    """归一相对路径：只剥前缀 `./`，**不能**用 `lstrip("./")`——那会把点文件
    的前导点当分隔符剥掉，`.gitignore` 变成 `gitignore`（v463 修）。"""
    rel = rel.replace("\\", "/")
    while rel.startswith("./"):
        rel = rel[2:]
    return rel


def _sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()


def plugin_fingerprints(kit_dir):
    """读规则注册表 → {"plugins/<文件名>": sha256}；缺失/损坏返回 None。

    返回 None 表示「无从校验」：`scan` 会报一条**不自动归档**的 H01，
    由 doctor 与 integrity 判红。绝不能在缺注册表时把 190 多个插件当违规
    整批归档——那是拆包，不是清理。
    """
    p = os.path.join(kit_dir, REGISTRY_FILE.replace("/", os.sep))
    if not os.path.exists(p):
        return None
    try:
        with open(p, encoding="utf-8") as fh:
            data = json.load(fh)
    except (ValueError, OSError):
        return None
    out = {}
    for key in ("plugins", "shared"):
        for name, rec in (data.get(key) or {}).items():
            if isinstance(rec, dict) and name.endswith(".py"):
                out["plugins/" + name] = str(rec.get("sha256") or "")
    return out


def is_immune(rel):
    return any(rel == i or rel.startswith(i + "/") for i in IMMUNE)




def scan(kit_dir):
    """返回 (findings, extras)。

    findings = [(rule, rel, detail)]；extras = 非白名单相对路径（供 purge/clean）。
    射程：工具包全树，跳过 SKIP_DIRS 与点目录；产物噪声静默。
    """
    findings, extras = [], []
    kit_dir = os.path.abspath(kit_dir)
    real_root = os.path.realpath(kit_dir)
    # 逐文件清单（v628）：允许存在的文件 = 运行时 + SEALED + template 资产 +
    # 注册表登记的插件。不再按「目录 + 扩展名」放行——core/tools/selftest
    # 里凭空多出的 .py 同样算违规。
    from core import integrity as _ig
    allowed = _ig.allowed_files(kit_dir)
    fp_reg = plugin_fingerprints(kit_dir)
    if fp_reg is None:
        # 只报不动：缺注册表时插件指纹无从校验，但整批归档会拆掉工具包。
        # 判红由 doctor（REGISTRY_ERROR）与 integrity（封签）负责。
        findings.append((
            "H01", REGISTRY_FILE,
            "缺规则注册表：插件指纹无法校验（先跑 submit.py rules adopt）；"
            "本项不自动归档，由 doctor / integrity 判红"))
    # 根层临时目录：整目录算一条违规（不逐文件报，否则 4 万条噪声）
    for d in sorted(FORBIDDEN_DIRS):
        if os.path.isdir(os.path.join(kit_dir, d)):
            findings.append((
                "H01", d,
                "工具包内不得有临时目录：临时根必须是仓库根 tmp/，由 --tmp 显式"
                "传入（与工具包路径无关）；入口会整目录归档到 tmp/待删除/"))
            extras.append(d)
    for base, dirs, files in os.walk(kit_dir):
        dirs[:] = sorted(d for d in dirs
                         if d not in SKIP_DIRS and not d.startswith("."))
        for name in sorted(files):
            fp = os.path.join(base, name)
            rel = _rel_norm(os.path.relpath(fp, kit_dir))
            if os.path.islink(fp):
                target = os.path.realpath(fp)
                if not target.startswith(real_root + os.sep) and target != real_root:
                    findings.append(("H02", rel,
                                     "符号链接越出工具包目录（指向 %s），拒绝跟随"
                                     % target))
                else:
                    findings.append(("H02", rel, "工具包目录内出现符号链接，请改为实体文件"))
                extras.append(rel)
                continue
            if any(fnmatch.fnmatch(rel, g) for g in IGNORE_GLOBS):
                continue
            if rel in allowed:
                if (fp_reg is not None and rel.startswith("plugins/")
                        and rel.endswith(".py")):
                    want = fp_reg.get(rel)
                    if want is None:
                        findings.append((
                            "H01", rel,
                            "插件未在规则注册表登记：新增规则只能经 "
                            "submit.py rules import 导入"))
                        extras.append(rel)
                        continue
                    if _sha256_file(fp) != want:
                        findings.append((
                            "H01", rel,
                            "插件内容与注册表 sha256 不一致：判据变更只能经 "
                            "submit.py rules import（手工改会被归档）"))
                        extras.append(rel)
                        continue
                continue
            findings.append((
                "H01", rel,
                "清单外文件：工具包只允许封签清单 + 注册表登记的文件；"
                "编写者模式入口会自动归档到 tmp/待删除/。"
                "编写者只能经 rules import 导入判据，框架文件只有维护者可改"))
            extras.append(rel)
    return findings, extras


def hygiene_report(kit_dir, as_json=False):
    findings, extras = scan(kit_dir)
    payload = {"result": "CLEAN" if not findings else "NOTICE",
               "warnings": len(findings), "files": extras,
               "findings": [{"rule": r, "path": p, "detail": d}
                            for r, p, d in findings]}
    if as_json:
        sys.stdout.write(json.dumps(payload, ensure_ascii=False, indent=2))
    else:
        for r, p, d in findings:
            print("  [WARN ] %-3s %-46s %s" % (r, p, d))
        print("目录合规：%s（%d warning，非白名单 %d 项）"
              % (payload["result"], len(findings), len(extras)))
    return payload


def _archive_root(kit_dir, dest_root):
    if dest_root:
        return dest_root
    return os.path.join(os.path.dirname(os.path.abspath(kit_dir)),
                        "tmp", "待删除")


def _prune_empty_dirs(path, kit_dir):
    """收掉因移动而变空的父目录（只向上到 kit 根，不碰白名单顶层）。"""
    parent = os.path.dirname(path)
    stop = os.path.abspath(kit_dir)
    while os.path.abspath(parent) != stop:
        try:
            if os.listdir(parent):
                break
            os.rmdir(parent)
        except OSError:
            break
        parent = os.path.dirname(parent)


def purge_foreign(kit_dir, dest_root=None, apply=True):
    """把非白名单文件归档到 `<repo>/tmp/待删除/foreign-<ts>/` 并给出警告。

    这是**每个入口自动执行**的动作（`submit.py main()` 最前）。按仓库纪律
    走归档而不是 unlink，需要时可直接从归档目录拷回。
    → 已移动（或待移动）的相对路径列表。
    """
    _findings, extras = scan(kit_dir)
    movable = [r for r in extras if not is_immune(r)]
    blocked = [r for r in extras if is_immune(r)]
    if not movable and not blocked:
        return []
    if blocked:
        print("[警告] %d 个非白名单文件属免疫路径，未移动（白名单可能被改坏）：%s"
              % (len(blocked), ", ".join(blocked[:5])))
    if not movable:
        return []
    if len(movable) > PURGE_LIMIT:
        print("[错误] 待移动 %d 个文件，超过熔断阈值 %d：疑似白名单配置错误，"
              "已拒绝自动归档。请检查封签清单与规则注册表，或人工执行 "
              "clean --apply --confirm。" % (len(movable), PURGE_LIMIT),
              file=sys.stderr)
        return []
    if not apply:
        return movable
    dest = os.path.join(_archive_root(kit_dir, dest_root),
                        "foreign-%s" % datetime.datetime.now().strftime(
                            "%Y%m%d-%H%M%S"))
    moved = []
    # 目录级违规（tmp/）：整棵移走，不逐文件搬（4 万文件的目录要几十分钟）
    for rel in [r for r in movable if r in FORBIDDEN_DIRS]:
        src = os.path.join(kit_dir, rel)
        if not os.path.isdir(src):
            continue
        dst = os.path.join(dest, rel)
        os.makedirs(dest, exist_ok=True)
        if os.path.exists(dst):
            dst = "%s-%d" % (dst, datetime.datetime.now().microsecond)
        shutil.move(src, dst)
        moved.append(rel)
        print("[警告] 临时目录已归档：%s/ → %s（临时根请用仓库 tmp/ + --tmp）"
              % (rel, os.path.relpath(dst, os.path.dirname(
                  os.path.abspath(kit_dir)))))
    for rel in movable:
        if rel in FORBIDDEN_DIRS:
            continue                      # 上面已整目录处理
        src = os.path.join(kit_dir, rel.replace("/", os.sep))
        if not os.path.lexists(src):
            continue
        dst = os.path.join(dest, rel.replace("/", os.sep))
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.move(src, dst)
        moved.append(rel)
        _prune_empty_dirs(src, kit_dir)
    if moved:
        print("[警告] 检出 %d 个非白名单文件，已归档到 %s"
              % (len(moved), os.path.relpath(
                  dest, os.path.dirname(os.path.abspath(kit_dir)))))
        for rel in moved[:10]:
            print("   - " + rel)
        if len(moved) > 10:
            print("   …（其余 %d 个见归档目录）" % (len(moved) - 10))
        print("   编写者只能经 rules import 导入判据；框架文件只有维护者可改。"
              "归档保留原相对结构，需要时直接从待删除目录拷回")
    return moved


def clean(kit_dir, apply=False, confirm=False, dry_run=True):
    """显式清理入口（兜底）：非白名单文件同样走归档，不 unlink。

    正常情况下入口的 `purge_foreign` 已经把违规文件清走，本命令用于
    「刚放过一批文件但还没调用任何 submit 命令」的场景。
    """
    findings, extras = scan(kit_dir)
    if not extras:
        print("[clean] 工具包目录干净，无需清理")
        return 0
    print("[clean] 非白名单 %d 项：" % len(extras))
    for rel in extras:
        print("   " + rel)
    if dry_run or not apply:
        print("[clean] 预览模式（--dry-run）：未改动任何文件")
        return 0
    if not confirm:
        print("[clean] 需显式 --confirm 二次确认后才会移动；本次未改动",
              file=sys.stderr)
        return 2
    purge_foreign(kit_dir, apply=True)
    return 0
