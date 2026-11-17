# -*- coding: utf-8 -*-
"""core/kit_hygiene.py — 工具包目录白名单（H01/H02）。

用户口径（v464）：**所有文件都必须命中白名单，不限制文件类型**；唯一例外是
`plugins/` 下的 `.py`——那是策略面，随时会改，不设白名单。所有非白名单文件
由入口自动归档到 `<repo>/tmp/待删除/foreign-<时间戳>/` 并给出警告，需要时用
`submit.py restore <路径>` 显式恢复（`--allow` 同时登记到 `data/whitelist.json`）。

为什么改成文件级（v464）：旧版白名单是**目录级**的（`top in ALLOW_TOP` 就整
目录放行），于是 `core/`、`tools/`、`plugins/` 里放任何文件都不报；再叠加
「只 warning + 手动 clean」，等于没有白名单。实测把 `core/probe_doc.md`、
`tools/sub/x.rst` 放进去，旧逻辑一条不报。

白名单分两层：
  · **代码常量**（本文件）：结构性文件——入口、说明、各代码层的扩展名、
    数据层的逐文件清单、template 整树；
  · **数据层放行**（`data/whitelist.json`）：`restore --allow` 写入的人工
    放行清单，属 L1 数据变更，改它不需要动代码、不需要重签。

`IMMUNE` 是双保险：即使白名单常量被写错，这些路径也永不被移动——工具包
不能因为一次误判把自己拆掉（策略库、封签信任根、插件目录都在里面）。

**v466：临时目录不许进工具包**。临时根永远是仓库根的 `tmp/`（`--tmp` 显式
传入，与工具包放在哪无关）；工具包内出现 `tmp/` 属结构违规，入口会**整目录**
归档到 `<repo>/tmp/待删除/foreign-<时间戳>/`。此前 `tmp` 被当作「运行时目录」
静默跳过，结果 `submission-kit/tmp` 长到 46911 个文件 / 348 MB，还被 `pack`
打进分发包（旧 zip 47434 文件里 46911 个是垃圾）。
"""
# 治理声明：本文件属机制层，不承载策略数据；改动须走 README「治理」节的 L3 流程
#（先登记理由 → 行为级等价断言 → selftest --kit 全量），提交说明带 [arch]
#（commit-msg 钩子强制）。策略变更请改 plugins/ 判据或经 submit.py glossary 改库。
import datetime
import fnmatch
import json
import os
import shutil
import sys

try:
    from core import tmp_root as _tmp_root
except ImportError:                            # 插件直载场景：core 目录入 path
    _CORE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if _CORE_DIR not in sys.path:
        sys.path.insert(0, _CORE_DIR)
    import tmp_root as _tmp_root

# 精确放行的单个文件（相对路径） -----------------------------------------
ALLOW_FILES = frozenset({
    "submit.py",
    "README.md",
    ".gitignore",
    # 策略库及其 WAL 伴生（活跃文件，误判会损坏库或丢事务）
    "data/glossary.db", "data/glossary.db-wal",
    "data/glossary.db-shm", "data/glossary.db-journal",
    # 封签产物：完整性校验的信任根与还原归档，误判会让工具包自毁
    "data/integrity.json", "data/integrity.sig",
    "data/sealed.zip", "data/trust_anchor.txt",
    # 数据层人工放行清单（restore --allow 写入）
    "data/whitelist.json",
    # 版本化人工否决表（词族运营数据，非代码）
    "tools/family_deny.json",
})

# 目录级规则：目录 → 允许的扩展名（None 表示整树允许）
# plugins/ 不设白名单的含义：目录内 `.py` 一律允许（策略随时改），
# 但 `plugins/x.md`、`plugins/x.json` 仍需命中白名单——仍会被归档。
ALLOW_DIRS = {
    "core": (".py",),
    "plugins": (".py",),
    "selftest": (".py",),
    "tools": (".py",),
    "template": None,          # 内容资产整树：mdx / webp / submission.json / 同类素材
}

# 额外的模式放行（数据层 whitelist.json 之外，一般留空）
ALLOW_GLOBS = ()

# 运行时/临时目录：整目录不扫（内容不参与目录合规）
SKIP_DIRS = {"tmp", "__pycache__", ".state", ".clean", ".cache", ".keys"}
# 但**根层**这些目录一律不许存在：临时根是 <repo>/tmp（--tmp 显式传入），
# 与工具包位置无关；工具包自带的 tmp 会被整目录归档（v466）。
FORBIDDEN_DIRS = {"tmp"}
# 产物噪声：静默（不当违规、不报）
IGNORE_GLOBS = ("*.pyc", "*.pyo", "*.db-wal", "*.db-shm", "*.db-journal",
                "__pycache__/*", "*/__pycache__/*")

WHITELIST_FILE = "data/whitelist.json"

# 双保险：白名单常量被写坏时也不许移动这些**具体文件**（工具包自毁防护）。
# 注意这里只能列文件，不能列目录：早期版本写了 `core`、`tools` 等目录前缀，
# 结果 `core/notes.md` 被判成「免疫路径」而永不移动——免疫射程必须小于
# 违规判定，否则白名单形同虚设（v464 实测踩到）。
IMMUNE = ("submit.py", "README.md",
          "data/glossary.db", "data/glossary.db-wal",
          "data/glossary.db-shm", "data/glossary.db-journal",
          "data/integrity.json", "data/integrity.sig",
          "data/sealed.zip", "data/trust_anchor.txt")
# 熔断：一次要移动这么多文件，多半是白名单配置错了，宁可拒绝也不拆包
PURGE_LIMIT = 50


def _rel_norm(rel):
    """归一相对路径：只剥前缀 `./`，**不能**用 `lstrip("./")`——那会把点文件
    的前导点当分隔符剥掉，`.gitignore` 变成 `gitignore`（v463 修）。"""
    rel = rel.replace("\\", "/")
    while rel.startswith("./"):
        rel = rel[2:]
    return rel


def load_extra_allow(kit_dir):
    """读数据层人工放行清单 → tuple[str]（支持 glob）；损坏时返回空。"""
    p = os.path.join(kit_dir, WHITELIST_FILE.replace("/", os.sep))
    if not os.path.exists(p):
        return ()
    try:
        with open(p, encoding="utf-8") as fh:
            data = json.load(fh)
        allow = data.get("allow") or ()
        return tuple(str(x) for x in allow if str(x).strip())
    except (ValueError, OSError):
        return ()


def is_immune(rel):
    return any(rel == i or rel.startswith(i + "/") for i in IMMUNE)


def is_allowed(rel, extra=()):
    """文件级判定：精确文件 → 模式 → 数据层放行 → 目录扩展名规则。"""
    rel = _rel_norm(rel)
    if rel in ALLOW_FILES:
        return True
    if any(fnmatch.fnmatch(rel, g) for g in ALLOW_GLOBS):
        return True
    if any(fnmatch.fnmatch(rel, g) for g in extra):
        return True
    top, _, rest = rel.partition("/")
    if not rest:
        return False                       # 根层未列名的文件一律不放行
    if top not in ALLOW_DIRS:
        return False
    rule = ALLOW_DIRS[top]
    return True if rule is None else os.path.splitext(rest)[1] in rule


def scan(kit_dir):
    """返回 (findings, extras)。

    findings = [(rule, rel, detail)]；extras = 非白名单相对路径（供 purge/clean）。
    射程：工具包全树，跳过 SKIP_DIRS 与点目录；产物噪声静默。
    """
    findings, extras = [], []
    kit_dir = os.path.abspath(kit_dir)
    real_root = os.path.realpath(kit_dir)
    extra = load_extra_allow(kit_dir)
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
            if is_allowed(rel, extra):
                continue
            findings.append((
                "H01", rel,
                "非白名单文件：工具包只允许白名单内的文件（仅 plugins/*.py 免登记），"
                "入口会自动归档到 tmp/待删除/；确属合法新增请 restore --allow"))
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
    走归档而不是 unlink，随时可 restore。
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
              "已拒绝自动归档。请检查 ALLOW_FILES / ALLOW_DIRS，或人工执行 "
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
        print("   确属合法新增：submit.py restore <路径> --allow（登记到 %s）"
              % WHITELIST_FILE)
    return moved


def restore(kit_dir, rel, allow=False, dest_root=None):
    """从 `tmp/待删除/foreign-*/` 恢复一个文件 → (ok, message)。

    `allow=True` 同时写入 `data/whitelist.json`，否则恢复后下次入口会再次
    归档（用户口径：恢复必须是显式动作，且默认不留后门）。
    """
    rel = _rel_norm(rel).strip("/")
    if not rel or ".." in rel.split("/"):
        return False, "路径必须是工具包内的相对路径，且不得含 .."
    target = os.path.join(kit_dir, rel.replace("/", os.sep))
    if os.path.exists(target):
        return False, "目标已存在：%s（如需覆盖请先人工处理）" % rel
    arch_root = _archive_root(kit_dir, dest_root)
    if not os.path.isdir(arch_root):
        return False, "归档目录不存在：%s" % arch_root
    candidates = sorted(
        (os.path.join(arch_root, d) for d in os.listdir(arch_root)
         if d.startswith("foreign-")), reverse=True)
    for base in candidates:
        src = os.path.join(base, rel.replace("/", os.sep))
        if os.path.exists(src):
            os.makedirs(os.path.dirname(target), exist_ok=True)
            shutil.move(src, target)
            msg = "已恢复 %s（来源 %s）" % (rel, os.path.basename(base))
            if allow:
                _register_allow(kit_dir, rel)
                msg += "；已登记白名单 %s" % WHITELIST_FILE
            else:
                msg += "；**未登记白名单**，下次入口会再次归档"
            return True, msg
    return False, "归档里找不到 %s（查 %s）" % (rel, arch_root)


def _register_allow(kit_dir, rel):
    p = os.path.join(kit_dir, WHITELIST_FILE.replace("/", os.sep))
    data = {"allow": [], "note": ""}
    if os.path.exists(p):
        try:
            with open(p, encoding="utf-8") as fh:
                data = json.load(fh)
        except ValueError:
            pass
    allow = [str(x) for x in (data.get("allow") or [])]
    if rel not in allow:
        allow.append(rel)
    data["allow"] = sorted(allow)
    if not str(data.get("note") or "").strip():
        data["note"] = ("人工放行清单：restore --allow 写入；每项一个相对路径"
                        "或 glob，新增须有理由（写在这里或提交说明）")
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(json.dumps(data, ensure_ascii=False, indent=1) + "\n")


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
