# -*- coding: utf-8 -*-
"""core/checker.py — 检查调度（冻结）。

职责只有三件：装载插件 → 建视图 → 收 finding。**不含任何判据**。
判据在 plugins/<category>-<name>.py，一规则一文件。
"""
# 治理声明：本文件属机制层，不承载策略数据；改动须走 README「治理」节的 L3 流程
#（先登记理由 → 行为级等价断言 → selftest --kit 全量），提交说明带 [arch]
#（commit-msg 钩子强制）。策略变更请改 plugins/ 判据或经 submit.py glossary 改库。

import os
import sys
import json
import zipfile

from core.consts import (
    CORE_RULES, ENTRY_WHITELIST,
)
from core.model import PackageInputError, Context, Finding
from core import tmp_root as _tmp_root
from core.pkgio import (
    load_package,
)
from core.glossary_loader import (
    _auto_glossaries, _auto_lexicons, _glossary_config_errors,
    _normalize_glossary,
)
from core import loader
from core import view as _view

_PLUGIN_CACHE = {}


def _kit_sig(kit_dir):
    """插件目录签名：文件名 + 大小 + mtime；任一变化即重扫（热插拔）。"""
    sig = []
    try:
        with os.scandir(os.path.join(kit_dir, "plugins")) as it:
            for e in it:
                if not e.name.endswith(".py") or e.name.startswith("_"):
                    continue
                st = e.stat()
                sig.append((e.name, st.st_size, st.st_mtime_ns))
    except OSError:
        return ()
    return tuple(sorted(sig))


def plugins_for(ctx):
    """按 kit_dir 缓存插件发现结果；文件一变即失效。"""
    kit = getattr(ctx, "kit_dir", None)
    if not kit:
        return [], []
    key = (os.path.abspath(kit), _kit_sig(kit))
    hit = _PLUGIN_CACHE.get(key)
    if hit is None:
        hit = loader.discover(kit, tolerant=True)
        _PLUGIN_CACHE.clear()
        _PLUGIN_CACHE[key] = hit
    return hit


def resolve_check_root(path):
    """把「条目根」解析为可直接交给 check() 的内容根，返回 (path, note)。

    `preview` 传条目根，而 `check` 传同一路径会因 work/ 不是 blog/ 或
    regulation/ 顶层而刷出整屏 S01。这里在 CLI 层做一次**显式**归一化：
    仅当 <path>/work 下确实存在 blog/ 或 regulation/ 时才改写；
    S01 判据本身不放宽，--all 投稿目录、template/ 官方尺与任意非法
    目录一律原样放行，继续由内核判据出声。

    note 非空表示发生了改写，交给 CLI 走 stderr 提示（不污染 --json）。
    """
    if not path or not os.path.isdir(path):
        return path, ""
    if os.path.isdir(os.path.join(path, "blog")) or \
            os.path.isdir(os.path.join(path, "regulation")):
        return path, ""        # 已是内容根形状，不误改写
    work = os.path.join(path, "work")
    if not os.path.isdir(work):
        return path, ""
    if not any(os.path.isdir(os.path.join(work, k))
               for k in ("blog", "regulation")):
        return path, ""
    return work, "条目根已归一化到 work/（check 顶层需为 blog/ 或 regulation/）"


def purge_entry_extras(root, whitelist=ENTRY_WHITELIST):
    """条目白名单清场（2026-11-07 定稿）：删掉条目根级除白名单外的一切。

    条目根＝含 work/ 目录的那一层（或 path 本身是 work 目录时的父目录）。
    只动条目根这一层：work/ 内部由判据管，不参与清场；找不到 work 层
    （如工具包 template/、sample/）时天然无操作。返回 {条目根: [删除名]}。
    """
    root = os.path.abspath(root)
    purged = {}
    if os.path.basename(root) == "work":
        cand_roots = [os.path.dirname(root)]
    elif os.path.isdir(os.path.join(root, "work")):
        cand_roots = [root]
    else:
        cand_roots = []
        for base, dirs, _files in os.walk(root):
            dirs[:] = [d for d in dirs if not d.startswith(".")]
            if "work" in dirs:
                cand_roots.append(base)
                dirs[:] = []          # 已确认条目不再深入
    for er in cand_roots:
        removed = []
        for name in sorted(os.listdir(er)):
            if name in whitelist:
                continue
            # 2026-11-14：点开头的一律不碰（.git / .DS_Store / .gitignore /
            # 编辑器状态目录）。清场的目的是让条目根只留 work/ 与
            # preview_zh.html，而「目录绝对干净」不能靠搬走版本控制元数据来
            # 达成——那会直接毁掉工作副本。S05 另判压缩包里的隐藏文件。
            if name.startswith("."):
                continue
            p = os.path.join(er, name)
            # 删除即归档（2026-11-09 用户指令）：移到 <temp>/待删除/，
            # 移动失败才回退真删。
            _tmp_root.archive_delete(p, label="entry-extras")
            removed.append(name)
        if removed:
            purged[er] = removed
    return purged


def check(path, glossary=None, ctx=None):
    """检查一个投稿包（zip 或目录），返回 Finding 列表。

    v2.13：不再写模块级 _GLOSSARY；glossary 与全部开关收进 Context。
    显式传 glossary 时与 CLI 自动加载走同一归一化路径（I11）。
    """
    if ctx is None:
        ctx = Context(glossary=glossary)
    elif glossary is not None:
        ctx = ctx.clone(glossary=glossary)
    if ctx.glossary is not None and isinstance(ctx.glossary, dict):
        ctx.glossary = _normalize_glossary(ctx.glossary)
    if ctx.glossary is None and not ctx.glossary_disabled:
        ctx.glossary = _auto_glossaries(ctx)
    _auto_lexicons(ctx)
    findings = []
    enabled = ctx.rules_filter

    def add(rule, severity, slug, detail):
        # 插件装载器把「启用插件声明的规则并集」放进 Context；
        # 未声明的规则不产出，实现插件级启停。None = 库直调（自检臂）。
        # CORE_RULES（C01/H01/H02）不在插件并集里，必须显式放行：
        # 否则「策略库未加载 / 契约配置错误 / Context 配置错误」这三类
        # 配置故障会被自己的过滤器吞掉，check 仍判 PASS（2026-11-14 实测：
        # 注入 config_errors 后 0 条 C01、退出码 0）。
        if (enabled is not None and rule not in enabled
                and rule not in CORE_RULES):
            return
        findings.append(Finding(rule, severity, slug, detail))

    # A03/I07：术语表未加载或契约不可用，不能伪装成「检查通过」
    if ctx.glossary is None and not ctx.glossary_disabled:
        add("C01", "error", "-",
            "策略库未加载（缺失、不可读或策略表损坏）：术语检查未执行，"
            "本次结论不可作为可提交依据；请运行 submit.py doctor")
    else:
        for msg in _glossary_config_errors(ctx.glossary):
            add("C01", "error", "-", "术语契约配置错误：" + msg)
    for msg in ctx.config_errors:
        add("C01", "error", "-", "配置错误：" + msg)

    try:
        files, _total_bytes = load_package(path)
    except PackageInputError as exc:
        add("F10", "error", "-", "投稿包不可安全读取：%s" % exc)
        return findings
    except (OSError, zipfile.BadZipFile, ValueError) as exc:
        add("F10", "error", "-", "投稿包读取失败：%s" % exc)
        return findings

    # 编码与体积的**判据**在 plugins/input-encoding.py（F10）与
    # plugins/structure-package-size.py（S06）。这里只读取字节、不判红：
    # 2026-11-15 实测（探针包：一个坏字节 mdx + 两个垃圾文件 + 一个顶层裸文件）
    # 这两条规则各被报了**两遍**，原因是 core 与插件各有一份同名判定。
    # 同一问题报两遍不只是噪音，它会让 `--json` 消费方按条数统计缺陷时虚高。

    # --- 顶层结构（v1.63 硬切换：只认 blog/ 与 regulation/）
    #   I14：一次遍历完成分组，不再对每篇文章全量滤一遍 files（O(A×F) → O(F)）
    articles = {}
    for n in files:
        # 隐藏/垃圾文件由 plugins/structure-file-type.py（S05）报；这里只做分组
        # 排除，不再重复发 finding。
        if n.startswith("__MACOSX/") or n.endswith("/.DS_Store") or n == ".DS_Store":
            continue
        if any(part.startswith(".") for part in n.split("/")):
            continue
        parts = n.split("/")
        if parts[0] not in ("blog", "regulation"):
            # 旧 articles/ 布局与顶层裸文件都由 plugins/structure-top-layout.py
            # （S01）报，含「旧布局按整包汇总一次」的特殊口径；这里只排除分组。
            continue
        if len(parts) < 2:
            continue
        articles.setdefault((parts[0], parts[1]), []).append("/".join(parts[2:]))

    # 「整包没有条目结构」也不在这里报：S01 插件对零条目有专门口径
    # （view.articles 为空时输出「压缩包内没有…结构」），core 继续往下走让
    # 插件层开口，否则这类包会得到「core 报了、其余 178 个插件一条没跑」的半份结论。

    # M4（2026-11-12）：旧判据引擎 check_article 已删除，稿件判据唯一来源是
    # plugins/。这里只剩包级守卫：包读不出来、没有条目结构、条目 slug 重复——
    # 这三类必须在插件层之前给出，否则包坏了连 view 都构造不出来。
    slugs = set()
    for (kind_dir, slug) in sorted(articles, key=lambda x: (x[0] or "", x[1])):
        if slug in slugs:
            add("M03", "error", slug, "slug 重复")
        slugs.add(slug)

    plugins, _skipped = plugins_for(ctx)
    active = [p for p in plugins
              if p["style"] == "new" and p["enabled"]
              and (not p["applies_to"] or True)]
    if active:
        pkg = _view.PackageView(path, files, ctx=ctx)
        for p in active:
            buf = []
            try:
                p["module"].run(pkg, lambda r, s, sl, d, _b=buf: _b.append(
                    Finding(r, s, sl, d)))
                reviewed = []
                for f in buf:
                    rv = p["module"].review(f, pkg)
                    if rv is None:
                        continue
                    if isinstance(rv, (list, tuple)):
                        reviewed.extend(x for x in rv if x is not None)
                    else:
                        reviewed.append(rv)
                for f in reviewed:
                    if isinstance(f, Finding):
                        findings.append(f)
                    else:
                        findings.append(Finding(*f))
            except Exception as exc:      # 插件半成品不炸整轮（tolerant）
                # 插件崩了 = 该规则本轮**没执行**，不能只往 stderr 写一行就
                # 当没事：--json 消费方看不到 stderr，PASS 会变成假绿。
                # 产 C01（配置故障）→ result=ERROR、退出码 2，与
                # 「检查不完整不得作为通过依据」的既有语义一致。
                detail = ("插件 %s 运行失败（%s: %s）：该规则本轮未执行，"
                          "结论不得作为通过依据；修复后重跑"
                          % (p["id"], type(exc).__name__, exc))
                sys.stderr.write("[插件跳过] %s\n" % detail)
                findings.append(Finding("C01", "error", "-", detail))

    return findings


def _works_one_level(root):
    works = []
    for name in sorted(os.listdir(root)):
        if name.startswith("."):
            continue
        cand = os.path.join(root, name, "work")
        if os.path.isdir(cand):
            works.append(cand)
    return works


def _discover_works(root):
    """--all（v1.68）：<root>/<条目>/work 全部投稿目录，博客/法规同一口径。

    支持两种传入形态（2026-11-07 投稿目录定稿）：
    - 线目录：blogs/ 或 regulations/（其下 <条目>/work）；
    - 投稿目录：其下同时有 blogs/ 与 regulations/ 两条线，一次全收。
    root 本身是 work 目录时只跑它（允许 --all 收窄到单篇）。
    不递归更深：`work/` 里是 blog|regulation/<slug>，不会再有 work。
    """
    root = os.path.abspath(root)
    if os.path.basename(root) == "work":
        return [root]
    works = _works_one_level(root)
    if not works:
        for line in ("blogs", "regulations"):
            d = os.path.join(root, line)
            if os.path.isdir(d):
                works.extend(_works_one_level(d))
    return works


def _batch_worker(task):
    """进程池 worker：独立 Context，返回纯 dict，避免跨进程 pickle Finding。"""
    w, cfg = task
    return w, [f.as_dict() for f in check(w, ctx=Context(**cfg))]


def _disp_rel(p):
    """展示用相对路径；Windows 跨盘符时退回绝对路径，绝不让日志报错。"""
    try:
        r = os.path.relpath(p)
    except ValueError:
        return os.path.abspath(p).replace(os.sep, "/")
    return r.replace(os.sep, "/")


def _run_batch(root, args, base_ctx):
    """批量逐个跑 check()；每包一份独立 Context（I10），读数与单跑一致。"""
    works = _discover_works(root)
    if not works:
        print("--all 未找到 <条目>/work 投稿目录：%s" % root, file=sys.stderr)
        return 1
    if args.jobs > 1 and len(works) > 1:
        # I10 完成后才有资格并行：每包一份 Context，子进程不共享任何模块级开关。
        # cfg 必须走 Context.to_kwargs()（派生缓存 lexicon_cache 不入参），
        # 自行遍历 __slots__ 会在新增派生字段时崩掉整轮（2026-11-14 实测）。
        from concurrent.futures import ProcessPoolExecutor
        cfg = base_ctx.to_kwargs()
        cfg["glossary"] = None
        cfg["config_errors"] = []
        with ProcessPoolExecutor(max_workers=min(args.jobs, len(works))) as pool:
            results = dict(pool.map(_batch_worker, [(w, cfg) for w in works]))
    else:
        results = {}
        for w in works:
            c = base_ctx.clone(glossary=None, config_errors=[])
            results[w] = [f.as_dict() for f in check(w, ctx=c)]

    rows = []
    total_err = total_warn = total_cfg = 0
    for w in works:
        fs = results[w]
        errs = [f for f in fs if f["severity"] == "error"]
        warns = [f for f in fs if f["severity"] == "warning"]
        cfgs = [f for f in fs if f["rule"].startswith("C0")]
        total_err += len(errs)
        total_warn += len(warns)
        total_cfg += len(cfgs)
        rel = os.path.relpath(w, os.path.abspath(root)).replace(os.sep, "/")
        rows.append({"work": rel, "result": "PASS" if not errs else "FAIL",
                     "errors": len(errs), "warnings": len(warns),
                     "findings": fs})
        if args.json:
            continue
        print("== %s  %s（%d error, %d warning）"
              % (rel, rows[-1]["result"], len(errs), len(warns)))
        if not args.quiet:
            for f in fs:
                sev = "ERROR" if f["severity"] == "error" else "WARN "
                print("  [%s] %-3s %-26s %s"
                      % (sev, f["rule"], f["article"], f["detail"]))
    if args.json:
        print(json.dumps({"batch": _disp_rel(root),
                          "works": len(works),
                          "result": "PASS" if not total_err else "FAIL",
                          "errors": total_err, "warnings": total_warn,
                          "configErrors": total_cfg,
                          "packages": rows}, ensure_ascii=False, indent=2))
    else:
        print("-" * 60)
        print("批量结果：%s（%d 个投稿包，%d error, %d warning）"
              % ("PASS" if not total_err else "FAIL",
                 len(works), total_err, total_warn))
    if total_cfg:
        return 2
    return 0 if not total_err else 1
