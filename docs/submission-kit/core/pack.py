# -*- coding: utf-8 -*-
"""core/pack.py — 打包与分发（内容包 + 工具包）。

打包是文件系统作业：不建 PackageView、不跑内容机检，只做打包器自身的
结构/安全门禁（kind/slug 唯一性、48 语文件完整、私钥硬闸、路径安全、体积上限）。
48 语完整性按**实际文件**核对（`content/<lang>/<slug>.mdx` 存在且非空），
不采信 `submission.json.locales` 的声明；内容机检仍由编写人在打包前用
`check <单篇路径>` 自行完成，不在 pack 环节重复执行。

半成品跳过、kind/slug 唯一性、48 语完整、双包落 <投稿目录>/dist/、固定 ZipInfo 可重现、
拒绝静默覆盖。dist/ 产物区口径：工具包与全文档包各保留最近 KEEP_ZIPS(=5) 份，
**其余任何 zip（单篇单包、历史命名）每轮打包清除**，按磁盘 mtime 判新旧；
manifest.json 与非 zip 文件不动。工具包里的 DB 是 VACUUM INTO 出来的净化
单文件快照（无 -wal/-shm），manifest.json 记录双包 sha256 与策略版本。

零批量删除原则：逐条 copytree 到 staging 时**不把整库拼成一个"包"读**（否则
整库超过单包 60 MB 上限就永远打不出包），也不反复清空 staging——单轮删除量
会越过平台批量删除阈值，导致半包。
"""
# 治理声明：本文件属机制层，不承载策略数据；改动须走 README「治理」节的 L3 流程
#（先登记理由 → 行为级等价断言 → selftest --kit 全量），提交说明带 [arch]
#（commit-msg 钩子强制）。策略变更请改 plugins/ 判据或经 submit.py glossary 改库。
import datetime
import hashlib
import json
import os
import re
import shutil
import zipfile

from core import tmp_root as _tmp_root
from core.consts import LOCALES
from core.model import Context
from core.pkgio import pack_package

SOURCES = [("blogs", "work", "blog"),
           ("regulations", "work", "regulation")]
ZIP_TS = (2020, 1, 1, 0, 0, 0)
KIT_EXCLUDE_DIRS = {"__pycache__", ".staging", "tmp"}
KIT_EXCLUDE_EXT = {".pyc", ".pyo", ".zip"}
KEEP_ZIPS = 5          # dist/：工具包与全文档包各留 5 份，其余 zip 每轮清除

# 分发包必须自带封签四件 + 配置白名单：接收方没有 .keys 也要能验真伪。
# （旧口径 data/ 只收 glossary.db，导致分发包「无封签可验」——2026-11-16 修）
KIT_DATA_KEEP = {
    "data/glossary.db",
    "data/integrity.json",
    "data/integrity.sig",
    "data/sealed.zip",
    "data/trust_anchor.txt",
    # 规则注册表：接收方要靠它校验插件指纹，缺了等于「白名单无从比对」
    "data/rules_registry.json",
}
# 私钥类材料硬闸：命中即拒绝打包（不静默跳过，避免「以为没打进去」）
KIT_SECRET_DIRS = {".keys"}
KIT_SECRET_SUFFIX = (".key", ".pem", ".p12", ".pfx")
KIT_ZIP_PREFIX = "submission-kit-"
PACK_ZIP_RE = r"^submission-\d{8}-r\d+\.zip$"


def _zip_write(zf, fp, arc):
    """固定时间/属性 → 相同输入必得相同字节。"""
    zi = zipfile.ZipInfo(arc, date_time=ZIP_TS)
    zi.compress_type = zipfile.ZIP_DEFLATED
    zi.create_system = 0
    zi.external_attr = 0o644 << 16
    with open(fp, "rb") as fh:
        zf.writestr(zi, fh.read())


def _sha(fp):
    h = hashlib.sha256()
    with open(fp, "rb") as fh:
        for b in iter(lambda: fh.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def kit_version(kit_dir):
    """版本号唯一来源：DB meta.policy_version（取消 VERSION 文件）。"""
    from core import db
    return str(db.current_policy(kit_dir=kit_dir).policy_version)


def _disp_rel(p):
    """展示用相对路径；Windows 跨盘符时退回绝对路径。"""
    try:
        return os.path.relpath(p).replace(os.sep, "/")
    except ValueError:
        return os.path.abspath(p).replace(os.sep, "/")


def _reject_secret(arc):
    """私钥/证书材料硬闸：命中直接拒绝打包，绝不静默跳过。"""
    parts = arc.replace("\\", "/").split("/")
    if any(p in KIT_SECRET_DIRS for p in parts):
        raise RuntimeError(
            "拒绝打包：%s 属密钥材料（私钥只留维护者本机；"
            "接收方用包内公钥验签即可，不需要私钥）" % arc)
    if arc.lower().endswith(KIT_SECRET_SUFFIX):
        raise RuntimeError(
            "拒绝打包：%s 属密钥/证书材料（见 README「私钥与分发」）" % arc)


def kit_skip(fn, arc):
    """→ 跳过原因（None = 入包）。纯函数：自检臂据此钉死打包口径。

    规则：`data/` 只放行 KIT_DATA_KEEP（运行库 + 封签 + 配置）；其余目录
    只按扩展名与 SQLite 伴生后缀过滤。`data/sealed.zip` 是唯一允许的 .zip。
    """
    _reject_secret(arc)
    ext = os.path.splitext(fn)[1].lower()
    if arc.startswith("data/"):
        if arc not in KIT_DATA_KEEP:
            return "data 目录只收白名单产物"
        if ext in KIT_EXCLUDE_EXT and arc != "data/sealed.zip":
            return "扩展名排除"
        return None
    if ext in KIT_EXCLUDE_EXT:
        return "扩展名排除"
    if fn.endswith(("-wal", "-shm", "-journal")):
        return "SQLite 伴生文件"
    return None


class SealStale(RuntimeError):
    """封签与当前判据不一致（编写者已 rules import、维护者尚未重签）。

    工具包分发包不能带着过期封签出去；但**稿件包**不含判据代码，不应因此
    被阻塞——编写者随时导入判据后仍要能打包交稿，见 pack_all 的分级处理。
    """


def _seal_gate(kit_dir):
    """出包前校验封签：带着过期封签分发，等于把「验不过」发给所有人。"""
    from core import integrity
    if not os.path.exists(os.path.join(kit_dir, integrity.MANIFEST)):
        print("[警告] 未封签：本包不具备防篡改能力"
              "（发布前请跑 python submit.py tools integrity_seal sign）")
        return
    res = integrity.verify(kit_dir)
    if not res.get("ok"):
        raise SealStale(
            "%s；先跑 python submit.py tools integrity_seal sign 再重出工具包"
            % (res.get("reason") or "封签校验失败"))


def pack_kit(kit_dir, out_dir, force=False):
    """工具包 zip：净化后的单文件 DB 快照 + 封签四件 + 可重现 ZipInfo。

    分发包口径（2026-11-16）：**带公钥与封签，绝不带私钥**——接收方解压即可
    `submit.py integrity` 验真伪；私钥留在维护者 `.keys/`，不入包、不入库。
    """
    _seal_gate(kit_dir)
    from core import db
    ver = kit_version(kit_dir)
    today = datetime.date.today().strftime("%Y%m%d")
    name = "submission-kit-v%s-%s.zip" % (ver, today)
    dest = os.path.join(out_dir, name)
    if os.path.exists(dest) and not force:
        raise RuntimeError("工具包 zip 已存在，拒绝静默覆盖：%s（如需重出请加 --force）"
                           % dest)
    # mkdtemp：建在 <tmp> 下；未指定 --tmp 抛 RuntimeError（必要参数）
    tmp = _tmp_root.mkdtemp(prefix="chk-kitdb-")
    snap = os.path.join(tmp, "glossary.db")
    try:
        build_id = db.vacuum_into(
            os.path.join(kit_dir, "data", "glossary.db"), snap)
        n = 0
        with zipfile.ZipFile(dest, "w", zipfile.ZIP_DEFLATED) as zf:
            for base, dirs, files in os.walk(kit_dir):
                dirs[:] = sorted(d for d in dirs
                                 if d not in KIT_EXCLUDE_DIRS
                                 and d not in KIT_SECRET_DIRS
                                 and not d.startswith("."))
                for fn in sorted(files):
                    fp = os.path.join(base, fn)
                    arc = os.path.relpath(fp, kit_dir).replace(os.sep, "/")
                    if kit_skip(fn, arc):
                        continue
                    if arc == "data/glossary.db":
                        fp = snap                 # 用净化快照替换运行库
                    _zip_write(zf, fp, arc)
                    n += 1
            # 包内自检：密钥材料混入即作废（私钥永不随包分发）
            bad = [x for x in zf.namelist()
                   if ".keys/" in x or x.lower().endswith(KIT_SECRET_SUFFIX)]
        if bad:
            os.remove(dest)
            raise RuntimeError("打包自检失败：包含密钥材料 %s" % (bad[:3],))
        return {"name": name, "path": dest, "files": n,
                "bytes": os.path.getsize(dest), "version": ver,
                "build_id": build_id, "sha256": _sha(dest)}
    finally:
        _tmp_root.archive_delete(tmp, label="kit-db-snap")


def _lang_files_problem(art, slug):
    """48 语文件完整性：缺任一语向的 `<slug>.mdx` 或文件为空 → 半成品。

    只认磁盘上的实际文件，`submission.json.locales` 只是声明，不能作为放行
    依据（补语漏落盘、空文件、删语后未改元数据都会让声明与实际脱节）。
    """
    content = os.path.join(art, "content")
    missing = []
    for lg in LOCALES:
        fp = os.path.join(content, lg, slug + ".mdx")
        if not os.path.isfile(fp) or os.path.getsize(fp) == 0:
            missing.append(lg)
    if missing:
        return "48 语文件不完整（缺 %d 语：%s）" % (
            len(missing), ", ".join(missing[:8]))
    return None


def collect(repo_root, only=None, slugs=None):
    """[(kind, slug, 源路径, 问题)]：条目级问题只记录不杀全包。"""
    found, seen, problems = [], {}, {}
    for line_dir, work, kind in SOURCES:
        if only and kind != only:
            continue
        base = os.path.join(repo_root, line_dir)
        if not os.path.isdir(base):
            continue
        for entry in sorted(os.listdir(base)):
            work_kind = os.path.join(base, entry, work, kind)
            if not os.path.isdir(work_kind):
                continue
            for slug in sorted(os.listdir(work_kind)):
                art = os.path.join(work_kind, slug)
                if not os.path.isdir(art) or (slugs and slug not in slugs):
                    continue
                problem = None
                meta_fp = os.path.join(art, "submission.json")
                if not os.path.isfile(meta_fp):
                    problem = "缺 submission.json"
                else:
                    try:
                        with open(meta_fp, encoding="utf-8") as fh:
                            meta = json.load(fh)
                        if meta.get("kind") != kind:
                            problem = "kind=%r 与目录 %s/ 不一致" % (
                                meta.get("kind"), kind)
                        elif not meta.get("slug"):
                            problem = "submission.json 缺 slug 字段"
                    except (ValueError, OSError) as exc:
                        problem = "submission.json 无法解析（%s）" % exc
                if not problem:
                    problem = _lang_files_problem(art, slug)
                if problem:
                    problems[slug] = problem
                elif slug in seen:
                    problem = "slug 重复（%s 与 %s）" % (seen[slug], art)
                    problems[slug] = problem
                else:
                    seen[slug] = art
                found.append((kind, slug, art, problem))
    return found, problems


def validate_root(root):
    """校验 pack 的 --root 是不是投稿目录（防产物落到错误位置）。

    投稿目录 = 其下直接有 `blogs/` 和/或 `regulations/`。产物写 `<root>/dist/`，
    所以传错目录会在那个错误目录里凭空生成一个 dist/（2026-11-18 曾在仓库根
    留下 v461–v509 的残留，只靠 .gitignore 兜底，入口没有任何提示）。

    返回 `(ok, message)`：ok 为 True 时 message 为空；否则 message 是可直接
    展示给调用者的修复指引。三种反例各有针对性提示：
      * 传了项目根（其下 `submission/` 才是投稿目录）→ 指出应传 --root=<root>/submission；
      * 空目录 / 别的目录（无 blogs 也无 regulations）→ 指出投稿目录的判据；
      * 路径不存在 / 不是目录 → 原样说明。

    只做路径判定，不写盘、不依赖 core 之外任何模块，便于自检臂直接单测。
    """
    if not root or not os.path.isdir(root):
        return False, "--root 不存在或不是目录：%s" % _disp_rel(root or "<空>")
    has_blogs = os.path.isdir(os.path.join(root, "blogs"))
    has_regs = os.path.isdir(os.path.join(root, "regulations"))
    if has_blogs or has_regs:
        return True, ""
    # 传了项目根：submission/ 下才是两线目录，精确指出应传的路径
    inner = os.path.join(root, "submission")
    if (os.path.isdir(os.path.join(inner, "blogs"))
            or os.path.isdir(os.path.join(inner, "regulations"))):
        return False, (
            "--root 指向的是项目根（产物会写到 %s）。本工具的 --root 是投稿目录，"
            "其下直接含 blogs/ 与 regulations/。请改传：--root=%s"
            % (_disp_rel(os.path.join(root, "dist")), _disp_rel(inner)))
    return False, (
        "--root 不是投稿目录：%s 下既没有 blogs/ 也没有 regulations/。\n"
        "  产物会写到 <root>/dist/，传错会在错误位置凭空生成 dist/。"
        "请指向含 blogs/ 或 regulations/ 的投稿目录（通常是 <项目根>/submission）。"
        % _disp_rel(root))


def next_zip_name(out_dir):
    today = datetime.date.today().strftime("%Y%m%d")
    n = 1
    while os.path.exists(os.path.join(out_dir, "submission-%s-r%d.zip"
                                      % (today, n))):
        n += 1
    return "submission-%s-r%d.zip" % (today, n)


def rotate_zips(out_dir, keep_kit=KEEP_ZIPS, keep_pack=KEEP_ZIPS, say=None):
    """dist/ 产物区清场：目录里**只允许**两类 zip 各 keep 份 + manifest.json。

    2026-11-12 用户两次收紧后的最终口径：
      * 工具包 `submission-kit-*.zip` —— 留 mtime 最新 keep_kit 份；
      * 全文档包 `submission-YYYYMMDD-rN.zip` —— 留最新 keep_pack 份；
      * **其余一切条目一律清除**：单篇单包、旧命名 `submission-<SLUG>-48langs.zip`、
        `--out` 自定义名（哪怕是刚写出的）、非 zip 文件、以及 `.staging` 等目录。
        `--out` 自定义名不在白名单：要留就自己另存到 dist/ 之外。
      * 唯一豁免：`manifest.json`（当前交付记录）。

    排序按磁盘 mtime（zip 内部时间戳是固定值，不能当新旧依据）。删除走
    `archive_delete` 归档到 `<tmp>/待删除/`，可回溯。返回被移除的条目名列表。
    """
    kits, packs, stale = [], [], []
    for fn in sorted(os.listdir(out_dir)):
        if fn == "manifest.json":
            continue
        fp = os.path.join(out_dir, fn)
        item = (os.path.getmtime(fp) if os.path.isfile(fp) else 0.0, fn, fp)
        if os.path.isfile(fp) and fn.startswith(KIT_ZIP_PREFIX) and fn.endswith(".zip"):
            kits.append(item)
        elif os.path.isfile(fp) and re.match(PACK_ZIP_RE, fn):
            packs.append(item)
        else:
            stale.append(item)
    removed = []
    for group, keep in ((packs, keep_pack), (kits, keep_kit)):
        group.sort(reverse=True)          # mtime 新者在前
        for _, fn, fp in group[keep:]:
            _tmp_root.archive_delete(fp, label="dist-rotation")
            removed.append(fn)
    for _, fn, fp in sorted(stale, reverse=True):
        _tmp_root.archive_delete(fp, label="dist-stale")
        removed.append(fn)
    if removed and say:
        for fn in removed:
            say("[pack] dist/ 清场：%s" % fn)
        say("[pack] dist/ 口径：工具包 %d 份 + 全文档包 %d 份 + manifest.json，"
            "其余条目不留" % (keep_kit, keep_pack))
    return removed


def pack_all(repo_root, kit_dir, only=None, slugs=None, strict=False,
             out=None, kit_only=False, incremental=False, force=False,
             quiet=False):
    """返回 manifest dict；失败抛 RuntimeError。"""
    from core import db
    # 2026-11-07 投稿目录定稿：repo_root 即投稿目录（其下 blogs/、regulations/
    # 是内容，dist/ 是本命令的产物区），不再写 <root>/submission/。
    # 执行层再校验一次：即使有人绕过 cmd_pack 直接调用，也不会在错误位置建 dist/。
    ok, why = validate_root(repo_root)
    if not ok:
        raise RuntimeError("[pack] %s" % why)
    out_dir = os.path.join(repo_root, "dist")
    # staging：中间过程产物，一律 <tmp>/pack-staging（2026-11-09 用户
    # 指令：未指定 --tmp 报错，与其他必要参数一致）。
    staging = _tmp_root.tmp_path("pack-staging")
    os.makedirs(out_dir, exist_ok=True)
    pol = db.current_policy(kit_dir=kit_dir)
    ctx = Context(kit_dir=kit_dir, policy=pol, rules_filter=None)
    say = (lambda *a: None) if quiet else (lambda *a: print(*a, flush=True))

    # 封签分级（2026-11-19 用户指令：编写者发现问题随时导入，不等维护者统一）：
    #   · --kit-only = 出工具包分发包 → 封签必须一致，否则接收方验不过，直接拒绝；
    #   · 出稿件包 → 判据代码不随稿件包分发，封签过期不该阻塞交稿。跳过工具包
    #     重出（dist/ 里已有版本原样保留），只出全文档包；manifest 的 kit 字段
    #     续用上一轮记录，并在 stderr 说清「维护者重签后再 --kit-only 重出」。
    kit = None
    try:
        kit = pack_kit(kit_dir, out_dir, force=force)
        say("[pack] 工具包 %s（%d 文件，%.2f MB，策略版本 v%s）"
            % (_disp_rel(kit["path"]), kit["files"],
               kit["bytes"] / 1048576.0, kit["version"]))
    except SealStale as exc:
        if kit_only:
            raise
        say("[pack] 封签与当前判据不一致：%s" % exc)
        say("[pack] 稿件包不含判据代码，本次照常出稿；工具包保持 dist/ 现有版本，"
            "维护者重签后再 `pack --kit-only` 重出。")
    prev_man = _read_manifest(out_dir)
    if kit is not None:
        kit_rec = {k: kit[k] for k in ("name", "sha256", "files",
                                       "bytes", "build_id", "version")}
    else:
        kit_rec = (prev_man or {}).get("kit")
        if kit_rec:
            say("[pack] manifest 续用上一轮工具包记录：%s"
                % kit_rec.get("name"))
    man = {"generated": datetime.date.today().isoformat(),
           "policy_version": pol.policy_version,
           "schema_version": pol.schema_version,
           "applied_cs": pol.applied_cs,
           "kit": kit_rec,
           "checker_sha256": _sha(os.path.join(kit_dir, "submit.py")),
           "submission": None, "skipped": [], "entries": []}
    if kit_only:
        say("[pack] --kit-only：跳过投稿打包")
        rotate_zips(out_dir, say=say)
        # 2026-11-14：保留上一轮的全文档包记录。此前 --kit-only 一律把
        # submission 置 None、entries 清空，dist/manifest.json 从「双包记录」
        # 退化成「只有工具包」，逼得打包后手工 `git show` 上一版再把两个
        # 字段贴回来（长期做法，容易漏）。这里只更新工具包字段，全文档包
        # 记录原样续用；但那几个 zip 必须仍在 dist/ 里，否则如实置空。
        prev = _read_manifest(out_dir)
        if prev:
            old = prev.get("submission")
            if old and old.get("name"):
                if os.path.isfile(os.path.join(out_dir, old["name"])):
                    man["submission"] = old
                    man["entries"] = prev.get("entries") or []
                    man["skipped"] = prev.get("skipped") or []
                    say("[pack] manifest 续用上一轮全文档包记录：%s（%d 条目）"
                        % (old["name"], len(man["entries"])))
                else:
                    say("[pack] 上一轮全文档包 %s 已不在 dist/，manifest 置空"
                        % old["name"])
        _write_manifest(out_dir, man)
        return man

    plan, problems = collect(repo_root, only, set(slugs) if slugs else None)
    if not plan:
        raise RuntimeError("没有可打包的成品（当前过滤：%s）"
                           % (slugs or only or "无"))
    packed = []
    for kind, slug, art, problem in plan:
        rel = os.path.relpath(art, repo_root)
        if problem:
            if strict:
                raise RuntimeError("%s：%s（--strict 遇错即停）" % (slug, problem))
            say("[pack] 跳过 %-10s %-52s <- %s（%s）"
                % (kind, slug, rel, problem))
            man["skipped"].append({"slug": slug, "reason": problem})
            continue
        # 内容机检不在打包环节执行：由编写人在打包前用 check <单篇路径> 自行完成。
        # pack 只做打包器自身的结构/安全门禁（problem 分支：kind/slug 唯一性、
        # 私钥硬闸、路径安全），不再因内容 error 跳过条目。
        packed.append((kind, slug, art))
        man["entries"].append({"kind": kind, "slug": slug, "source": rel})
        say("[pack] 收入 %-10s %-52s <- %s" % (kind, slug, rel))
    if not packed:
        raise RuntimeError("所有候选条目均未通过预检，没有可打包的成品")

    _tmp_root.archive_delete(staging, label="pack-staging")
    for kind, slug, art in packed:
        dest = os.path.join(staging, kind, slug)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        shutil.copytree(art, dest)

    # 进包门禁：逐条目复核，**不把整库拼成一个"包"读**。
    # 60MB / 5000 文件是 S06 给「单篇投稿包 vs 站点上传接口」定的上限，
    # 套在整库合集上会让条目一多就永远打不出包——实测 3811 文件 / 82.6MB
    # 被 load_package 判「解压后总大小 60.0 MB 超过 60 MB」，pack 直接中止。
    # 内容机检（checker.check）已移出打包环节，由编写人打包前自行完成；
    # pack 只负责文件系统作业与结构门禁。

    zip_name = out or next_zip_name(out_dir)
    if not zip_name.endswith(".zip"):
        zip_name += ".zip"
    # dist/ 只允许两类命名：自定义 --out 会让成品在下一行轮换里被清掉，
    # 与其留一个 manifest 指向不存在的文件，不如在写盘前直接拒绝。
    if not re.match(PACK_ZIP_RE, os.path.basename(zip_name)):
        raise RuntimeError(
            "dist/ 只接受全文档包命名 submission-YYYYMMDD-rN.zip；"
            "--out=%s 不符合口径。请省略 --out 用自动命名，或自行把成品另存到 dist/ 之外"
            % zip_name)
    zip_path = os.path.join(out_dir, zip_name)
    pack_package(staging, zip_path)
    _tmp_root.archive_delete(staging, label="pack-staging")
    man["submission"] = {"name": zip_name, "sha256": _sha(zip_path),
                         "bytes": os.path.getsize(zip_path),
                         "blog": sum(1 for k, _, _ in packed if k == "blog"),
                         "regulation": sum(1 for k, _, _ in packed
                                           if k == "regulation")}
    say("[pack] 投稿包 %s（%.1f MB，blog %d / regulation %d）"
        % (_disp_rel(zip_path), man["submission"]["bytes"] / 1048576.0,
           man["submission"]["blog"], man["submission"]["regulation"]))
    _write_manifest(out_dir, man)
    rotate_zips(out_dir, say=say)
    say("[pack] 双包齐备 + manifest.json（dist/ 工具包与全文档包各留最新 %d 份）"
        % KEEP_ZIPS)
    return man


def _write_manifest(out_dir, man):
    with open(os.path.join(out_dir, "manifest.json"), "w",
              encoding="utf-8", newline="\n") as fh:
        json.dump(man, fh, ensure_ascii=False, indent=2)


def _read_manifest(out_dir):
    """读上一轮 manifest；缺失/损坏一律返回 None（当作首轮，不阻断打包）。"""
    try:
        with open(os.path.join(out_dir, "manifest.json"),
                  encoding="utf-8") as fh:
            man = json.load(fh)
        return man if isinstance(man, dict) else None
    except (OSError, ValueError):
        return None


