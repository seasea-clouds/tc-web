#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""投稿工具 —— 起手 / 编写检查 / 打包全流程唯一入口。

    submit.py start blog|regulation --slug=<slug> --root=<投稿目录> [--entry-name=<名>] [--langs=zh]
    submit.py check <path> [--json] [--jobs=N] [--no-parity]
    submit.py check <投稿目录根> --all [--yes] [--jobs=N]   # 全库扫描，须确认
    submit.py glossary list|get|add|update|delete|audit|export|import|diff|resolve
                     
    submit.py plugin   list|sync|verify|enable|disable|report
    submit.py rules [--verbose] [--json]
    submit.py preview <path> [--out=<file>]
    submit.py doctor [--root=<dir>] | hygiene | clean --apply
    submit.py pack --root=<投稿目录> [--only=blog|regulation] | version

写作／法规会话只允许通过本入口做内容检查与策略库增删改查。
单次调用开始时一次性载入不可变 PolicyView；插件按内容 hash 热加载；
术语或插件改动在下一次调用生效，同一次调用内 48 语判据一致。
所有路径相对当前工作目录解析，工具包可解包到任意位置运行。
"""
# 治理声明：本文件属机制层，不承载策略数据；改动须走 README「治理」节的 L3 流程
#（先登记理由 → 行为级等价断言 → selftest --kit 全量），提交说明带 [arch]
#（commit-msg 钩子强制）。策略变更请改 plugins/ 判据或经 submit.py glossary 改库。
import argparse
import datetime
import glob
import io
import json
import os
import re
import shutil
import sys
import time

KIT = os.path.dirname(os.path.abspath(__file__))


def _rel(p):
    """输出用相对路径（相对 cwd、正斜杠），让日志与 --json 可移植。"""
    try:
        r = os.path.relpath(p, os.getcwd())
    except ValueError:                      # Windows 跨盘符
        return os.path.abspath(p).replace(os.sep, "/")
    return r.replace(os.sep, "/")
if KIT not in sys.path:
    sys.path.insert(0, KIT)

from core import db, loader                             # noqa: E402
from core import rule_registry                           # noqa: E402
from core.model import Context, Finding                  # noqa: E402
from core.consts import CORE_RULES, LOCALES, RULE_META, SLUG_RE     # noqa: E402
from core import kit_hygiene                            # noqa: E402
from core.checker import (
    purge_entry_extras, resolve_check_root,
)                                                       # noqa: E402
from core import checker as _checker                     # noqa: E402
from core.checker import _run_batch                      # noqa: E402
from core import contract_health                        # noqa: E402
from core import arch_health                            # noqa: E402
from core import deps                                    # noqa: E402
from core import tmp_root as _tmp_root                   # noqa: E402
from plugins._style import check_style                   # noqa: E402

DB_PATH = os.path.join(KIT, "data", "glossary.db")
SUBCMDS = {"start", "check", "preview", "glossary", "plugin", "rules",
           "doctor", "hygiene", "clean", "pack", "version", "selftest",
           "integrity", "tools", "hooks"}


def _plugins(tolerant=False):
    """装载插件；返回 (插件列表, 跳过清单)。

    tolerant=True 供内容工作路径（check/pack）：某插件写到一半出现
    代码错误时跳过该插件、其余照常运行（2026-11-09 用户指令——多人
    并行语义，每轮用当前最新可用插件）；跳过清单必须输出到 stderr，
    让写坏插件的人下一轮就能看见。doctor/plugin/rules/version 等
    自检命令保持严格模式（默认），职责就是让坏插件现形。
    """
    return loader.discover(KIT, tolerant=tolerant)


def _report_skipped(skipped, runtime=None):
    """跳过插件清单 → stderr；不改变退出码，但必须可见。"""
    items = list(skipped or [])
    if runtime:
        items.extend(runtime)
    if not items:
        return
    import sys as _sys
    for s in items:
        _sys.stderr.write("[SKIP ] 插件 %s 已跳过（%s）——本轮结果不含其规则\n"
                          % (s["file"], s["error"]))
    _sys.stderr.write("[SKIP ] 共 %d 个插件未在场；下一轮调用会重新装载"
                      "最新可用版本\n" % len(items))


def _policy(args=None):
    p = getattr(args, "db", None) if args else None
    return db.current_policy(p or DB_PATH)


def _die(msg, code=2):
    print(msg, file=sys.stderr)
    return code


def _strip_entry_tmp(args):
    """从透传给工具的参数里剥掉入口级 --tmp（工具自己的 argparse 不认它）。

    返回 (透传参数, --tmp 值)。--tmp 在 main() 开头已按 argv 解析并校验过
    （含「不许落在工具包内」）；这里只负责不让它漏进工具参数，并交给
    _RunSink 做日志/JSON 归档——入口统一管理，与 check/pack 同口径。
    """
    out, tmp = [], None
    i = 0
    while i < len(args):
        a = args[i]
        if a == "--tmp" and i + 1 < len(args):
            tmp = args[i + 1]
            i += 2
            continue
        if a.startswith("--tmp="):
            tmp = a.split("=", 1)[1]
            i += 1
            continue
        out.append(a)
        i += 1
    return out, tmp


def _hygiene(plugins, policy, ctx, path, as_json):
    """工具包目录体检（H01/H02）：只写 stderr，不污染稿件 findings。

    M4：不再是「阶段插件」，改为 core.kit_hygiene 的直接调用——它的射程是
    工具包目录本身，没有 PackageView，留在插件层只会被 COVERAGE 约束架空。
    """
    out = [(rule, rel, detail)
           for rule, rel, detail in kit_hygiene.scan(KIT)[0]]
    if out and not as_json:
        for r, sl, d in out[:20]:
            print("  [WARN ] %-3s %-42s %s" % (r, sl, d), file=sys.stderr)
        if len(out) > 20:
            print("  ... 另有 %d 条，见 submit.py hygiene" % (len(out) - 20),
                  file=sys.stderr)
    return out


# ---------------------------------------------------------------- check

def _body_mode(path, args, ctx):
    """单篇草稿只跑 ST 写作纪律（与 v2.13 行为逐字一致）。"""
    import re
    try:
        with open(path, "rb") as fh:
            body_src = fh.read().decode("utf-8")
    except UnicodeDecodeError as exc:
        return None, "草稿含非法 UTF-8 字节（偏移 %d），拒绝以替换字符继续检查" % exc.start
    except OSError as exc:
        return None, "草稿不可读取: %s" % exc
    if args.until and args.until in body_src:
        body_src = body_src.split(args.until, 1)[0]
    # 2026-11-14：允许直接传完整 mdx（带 frontmatter）。此前不剥离，frontmatter
    # 收尾的 `---` 会被 B03 判成「正文分隔线」，于是 `check <任一正常稿件>.mdx
    # --body` 恒红 1 error——把最自然的用法判死。
    if body_src.startswith("---"):
        m = re.match(r"\A---\r?\n.*?\r?\n---[ \t]*\r?\n+", body_src, re.S)
        if m:
            body_src = body_src[m.end():]
    findings = []

    def add(rule, sev, sl, detail):
        findings.append(Finding(rule, sev, sl, detail))

    tag = os.path.basename(path)
    check_style(tag, body_src, add, ctx=ctx)
    lines = body_src.split("\n")
    for i, ln in enumerate(lines, 1):
        if re.match(r"^\s*---+\s*$", ln):
            add("B03", "error", "", "第 %d 行出现 --- 分隔线（正文禁止）" % i)
            break
    for i in range(len(lines) - 2):
        if re.match(r"^\s*[-*]\s", lines[i]) and lines[i + 1].strip() == "" \
                and i + 2 < len(lines) and re.match(r"^\s*[-*]\s", lines[i + 2]):
            add("B07", "error", "",
                "第 %d 行列表项之间有空行（会渲染成多个列表）" % (i + 1))
            break
    for i, ln in enumerate(lines, 1):
        if re.match(r"^\s{0,3}[-*]\s+\S", ln) \
                and len(re.findall(r"(?:^|\s)[-*]\s+\S", ln)) > 1:
            add("B08", "error", "", "第 %d 行有多个列表项写在同一行" % i)
            break
    img_refs = re.findall(r"!\[[^\]]*\]\(([^)\s]+\.webp)", body_src)
    dups = sorted({n for n in img_refs if img_refs.count(n) > 1})
    if dups:
        add("P01", "error", "", "同一图片被引用多次: %s" % dups)
    # M4：check_text_health 已随 core/rules 删除。P 族判据现在分散在
    # text-/numbers-/language- 六个插件里，草稿模式没有 PackageView，
    # 重建等于把判据复制回 CLI。草稿只做文风与结构速检，完整检查用
    # `submit.py check <条目>`。
    return findings, None


def cmd_check(args):
    try:
        plugins, skipped = _plugins(tolerant=True)
        _report_skipped(skipped)
        declared, missing = loader.coverage(plugins)
        if missing:
            raise db.PolicyError("规则注册表有未声明规则：%s" % sorted(missing))
        policy = _policy(args)
    except (loader.PluginError, db.PolicyError, OSError) as exc:
        if args.json:
            print(json.dumps({
                "package": os.path.basename((args.path or "").rstrip("/\\")),
                "result": "ERROR", "errors": 1, "warnings": 0,
                "configErrors": 1, "checkerVersion": "?",
                "findings": [{"rule": "C01", "severity": "error",
                              "article": "-",
                              "detail": "检查器初始化失败：%s" % exc}],
                "packed": None,
            }, ensure_ascii=False, indent=2))
            return 2
        return _die("C01 检查器初始化失败：%s" % exc)
    if args.master and args.master.lower() not in policy.locales:
        return _die("--master 必须是策略库注册的语言码之一（当前 %r）"
                    % args.master)
    if args.jobs < 1:
        return _die("--jobs 必须 ≥1")
    if args.jobs > 1 and not args.scan_all:
        # 2026-11-14：单包路径按语向顺序跑，没有进程池。此前 --jobs=4 被
        # 静默忽略，用户以为加速了实际上仍是串行；给一行明确提示。
        sys.stderr.write("[提示] --jobs 仅在 --all 全库扫描下生效；"
                         "单包检查本轮按串行处理（48 语合计约 13 秒/包）\n")

    ctx = Context(
        master_lang=args.master.lower() if args.master else None,
        no_parity=args.no_parity, glossary_disabled=args.body,
        kit_dir=KIT, db_path=args.db or DB_PATH, policy=policy,
        rules_filter=loader.enabled_rules(plugins))
    path = args.path
    if not path:
        return _die("check 需要 <path>（单篇条目路径；全库扫描另加 --all）")
    display_path = path      # JSON 的 package 名与标题始终用用户给的条目名

    # 防误触（2026-11-17）：check 默认只查 <path> 指定的单篇（中文+译文）。
    # 若 <path> 看着像投稿目录根（同时含 blogs/ 与 regulations/）却没带 --all，
    # 说明编写者多半忘了开关——明确提示，而不是把根目录当成一个包去跑、刷 F10。
    path_abs = os.path.abspath(path)
    looks_like_root = (os.path.isdir(os.path.join(path_abs, "blogs"))
                       and os.path.isdir(os.path.join(path_abs, "regulations")))
    if looks_like_root and not args.scan_all:
        return _die(
            "[提示] %s 是投稿目录根（含 blogs/ 与 regulations/），"
            "但 check 默认只检查指定的单篇。\n"
            "  · 全库扫描（很耗时，134 篇约 20 分钟）："
            "check %s --all --yes\n"
            "  · 只查某篇：check <该条目路径>，如 check %s/blogs/<条目名>/"
            % (_rel(path), _rel(path), _rel(path)))

    # 全库扫描要有显式确认：--yes 或交互终端输入 y。防止误触一次跑满 20 分钟。
    if args.scan_all and not os.path.isdir(path):
        return _die("--all 需要目录输入（博客/法规线根目录）: %s" % path)
    if args.scan_all and not args.yes:
        if sys.stdin.isatty():
            try:
                ans = input("[确认] 将全库扫描，耗时约 20 分钟。确认请输入 yes：")
            except EOFError:
                ans = ""
            if ans.strip().lower() not in ("yes", "y"):
                return _die("已取消全库扫描（未输入 yes）")
        else:
            return _die(
                "全库扫描需显式确认：请加 --yes（非交互环境），"
                "或在交互终端输入 yes。"
                "示例：check %s --all --yes" % _rel(path))

    # 条目白名单清场（2026-11-07 定稿）：条目根只留 work/ 与 preview_zh.html，
    # 其余发现即归档（移到 <temp>/待删除/entry-extras-*，2026-11-09 用户指令
    # 「删除即移动」；清单走 stderr，不污染 --json）。工具包自身路径
    # （template/ 等）不在清场范围；--keep-extras 可整体停用（审计用）。
    purged = {}
    if not getattr(args, "keep_extras", False):
        try:
            inside_kit = os.path.commonpath(
                [os.path.abspath(path), os.path.abspath(KIT)]) \
                == os.path.abspath(KIT)
        except ValueError:
            inside_kit = False
        if not inside_kit:
            purged = purge_entry_extras(path)
            n = sum(len(v) for v in purged.values())
            if n:
                import sys as _sys
                for er, names in sorted(purged.items()):
                    _sys.stderr.write("[清场] %s: %s\n"
                                      % (_rel(er), ", ".join(names)))
                _sys.stderr.write("[清场] 共移出 %d 项 -> <temp>/待删除/"
                                  "entry-extras-*（白名单：work/、"
                                  "preview_zh.html；temp=%s）\n"
                                  % (n, _tmp_root.resolve_tmp()))

    # --all：内核批量逐包跑 check，读数与单跑一致（确认已在上方完成）
    if args.scan_all:
        sys.stderr.write("[全库] 扫描 %s（已确认）\n" % _rel(path))
        try:
            rc = _run_batch(path, args, ctx)
        except (loader.PluginError, db.PolicyError) as exc:
            return _die("C01 %s" % exc)
        hint = _longpath_hint(path)
        if hint:
            sys.stderr.write("[路径] %s\n" % hint)
        return rc

    # v30：条目根 → work/（S01 判据不变，只在 CLI 层做显式归一化）。
    # --all 已在上面返回，投稿目录不会被误改写。
    resolved, note = resolve_check_root(path)
    if note:
        import sys as _sys
        _sys.stderr.write("[路径] %s → %s：%s\n"
                          % (_rel(path), _rel(resolved), note))
        path = resolved

    # --body / 单包
    diagnostics = []
    if args.body:
        findings, err = _body_mode(path, args, ctx)
        if err:
            return _die(err)
        json_key = "file"
        title = "写作纪律自检（ST 系列）  %s" % path
    else:
        try:
            # 单包与 --all 走同一条新管线（core.checker）：M3 起判据实现全在
            # plugins/，旧 engine.check + _review 只认得引擎内规则，新插件在这条
            # 路径上会被整体跳过（2026-11-11 实测：单包 check 静默少跑 160 个插件）。
            findings = _checker.check(path, ctx=ctx)
            _p2, rt_skipped = _checker.plugins_for(ctx)
            _report_skipped([], rt_skipped)
            skipped = list(skipped) + list(rt_skipped)
        except (loader.PluginError, db.PolicyError) as exc:
            return _die("C01 %s" % exc)
        json_key = "package"
        title = "投稿包自检  %s" % os.path.basename(display_path.rstrip("/"))
    _hygiene(plugins, policy, ctx, path, args.json)

    errors = [f for f in findings if f.severity == "error"]
    warnings = [f for f in findings if f.severity == "warning"]
    config_errors = [f for f in findings if f.rule.startswith("C0")]
    if args.json:
        out = {
            json_key: path if args.body else os.path.basename(
                display_path.rstrip("/\\")),
            "result": "ERROR" if config_errors else
                      ("PASS" if not errors else "FAIL"),
            "errors": len(errors), "warnings": len(warnings),
            "configErrors": len(config_errors),
            "checkerVersion": str(policy.policy_version),
            "skippedPlugins": skipped,
            "findings": [f.as_dict() for f in findings],
            # 2026-11-14：清场是可审计动作（条目根只许 work/ 与
            # preview_zh.html，其余移到 <tmp>/待删除/）。此前只写 stderr，
            # --json 消费方完全看不到「这次搬走了什么」。点开头的
            # （.git / .DS_Store 等）不参与清场。
            "purged": {_rel(k): v for k, v in (purged or {}).items()},
            "packed": None,
        }
        print(json.dumps(out, ensure_ascii=False, indent=2))
        return 2 if config_errors else (0 if not errors else 1)
    if not args.quiet:
        print("=" * 60)
        print(title)
        print("=" * 60)
        for f in findings:
            print("  [%s] %-3s %-26s %s" %
                  ("ERROR" if f.severity == "error" else "WARN ",
                   f.rule, f.slug, f.detail))
        print("-" * 60)
    if config_errors:
        print("结果：ERROR（%d 条配置故障；检查不完整，不得作为通过依据）"
              % len(config_errors))
        return 2
    if errors:
        print("结果：FAIL（%d error, %d warning）→ 请按 submit.py rules 说明修正后重新提交"
              % (len(errors), len(warnings)))
        return 1
    print("结果：PASS（0 error, %d warning）→ 本次已执行规则未发现 error；"
          "语义终审另需人工" % len(warnings))
    return 0


# ---------------------------------------------------------------- glossary

def cmd_glossary(args):
    action = args.action
    conn_kw = dict(db_path=args.db or DB_PATH)

    if action == "migrate":
        # 前向升级：必须在 _policy() 之前跑，否则旧库连读都过不去
        from core import schema as _schema
        conn = db.connect(conn_kw["db_path"])
        try:
            conn.execute("BEGIN IMMEDIATE")
            mig = _schema.migrate(conn)
            conn.commit()
        finally:
            conn.close()
        if args.json:
            print(json.dumps(mig, ensure_ascii=False, indent=2))
        else:
            print("schema 迁移：%s（schema %d，terms=%s）"
                  % (mig.get("state", "migrated"), _schema.SCHEMA_VERSION,
                     mig.get("terms", "-")))
        return 0

    policy = _policy(args)
    # argparse 用 cid/file 两个可选位置参数；只传一个路径时它落在 cid。
    # add/update/import/resolve 的四条路径统一从这里取，避免 args.file 为
    # None 时直接 open(None) 抛 TypeError（v3 首轮总验收实测）。
    doc_path = args.file or args.cid
    payload_file = getattr(args, "payload_file", None) or doc_path

    if action == "lexicon":
        # 受控词表：无 --id 列五类计数；有 --id 列行 / 加行 / 删行
        lid = getattr(args, "lex_id", None)
        if not lid:
            rows = policy.lexicons or {}
            counts = {i: len(rows.get(i) or []) for i in db.LEXICON_IDS}
            if args.json:
                print(json.dumps(counts, ensure_ascii=False, indent=2))
            else:
                for i in db.LEXICON_IDS:
                    print("  %-16s %4d" % (i, counts[i]))
            return 0
        if getattr(args, "payload_file", None):
            # 批量登记（2026-11-16 架构梳理）：consts 判据词表迁库的批量路径，
            # 也是 phrase-block 类多行词表的常规喂入口。JSON 行数组，每行
            # {"key":..., "value":..., "target":"", "meta":{}}；--key 给出时
            # 作为 key 前缀（`用途|语向` 的用途段，行内 key 只写语向段）。
            # 落库走 lexicon_replace_bulk（整批一个事务、一次 bump）；
            # only_keys 限定本批 key，绝不动同 id 下其他用途的行。
            data = json.load(io.open(args.payload_file, encoding="utf-8"))
            if not isinstance(data, list) or not data:
                return _die("--payload-file 需要非空 JSON 行数组")
            prefix = (args.key or "").strip()
            rows, keys = [], []
            for d in data:
                k = (d.get("key") or "").strip()
                if prefix:
                    k = "%s|%s" % (prefix, k) if k else prefix
                if not k:
                    return _die("批量行缺 key（行内 key 或 --key 前缀）")
                if k not in keys:
                    keys.append(k)
                rows.append((k, d["value"], d.get("target", ""),
                             d.get("meta") or {}))
            res = db.lexicon_replace_bulk(
                conn_kw["db_path"], lid, rows, only_keys=keys)
            if args.json:
                print(json.dumps(res, ensure_ascii=False, indent=2))
            else:
                print("批量登记 %s：%d 行 / %d key → policy v%s"
                      % (lid, res["rows"], len(keys), res["policy_version"]))
            return 0
        if args.value or args.remove:
            res = db.lexicon_write(
                conn_kw["db_path"], "delete" if args.remove else "add",
                lid, scope=args.scope, key=args.key, value=args.value,
                target=args.target)
            if args.json:
                print(json.dumps(res, ensure_ascii=False, indent=2))
            elif args.remove:
                print("已删除 %s/%s/%s：%d 行（policy v%s）"
                      % (lid, res["scope"], res["key"], res["removed"],
                         res["policy_version"]))
            else:
                print("已登记 %s/%s/%s=%r → policy v%s"
                      % (lid, res["scope"], res["key"], args.value,
                         res["policy_version"]))
            return 0
        rows = [r for r in (policy.lexicons or {}).get(lid) or []
                if not args.key or r["key"] == args.key]
        if args.json:
            print(json.dumps(rows, ensure_ascii=False, indent=2))
        else:
            print("%s：%d 行" % (lid, len(rows)))
            for r in rows[:40]:
                print("  %-8s %-18s %-24s %s"
                      % (r["scope"], r["key"], r["value"], r["target"]))
            if len(rows) > 40:
                print("  … 其余 %d 行用 --json 查看" % (len(rows) - 40))
        return 0

    if action == "term":
        # term-zh 的变体/禁用形：P74 的两个分支读的就是这两张清单。
        #
        # 已评估但**暂不收**的概念（别重复尝试，理由按实测）：账册（泛称过多，
        # 47 语凑不齐有据形）、核销（与账册同源，ru учёт 与「账务」同形）、检测
        # 报告（fr/ko 全库 0 命中）、跨境电商零售进口（长短语拼装即造词）、免税
        # （各语通用词与「放行」撞形，改由词族 + P75 覆盖）、收货人（篇数低于
        # 门槛，语料变多后补）、通关（ja/ko/th/vi 与「放行」同词）。
        # 2026-11-16 实测全库 0 条——机制在、数据从没落地，而登记门槛要求
        # 「错形在语料真实出现过、正形同语向 ≥3 次」，所以必须有写入口。
        concept = (args.term or "").strip()
        if not concept:
            return _die("term 需要 --term=<中文概念>（term-zh 的 key）")
        if not getattr(args, "lang", ""):
            return _die("term 需要 --lang=<语向>")
        changes = (args.add_variant, args.add_forbidden,
                   args.drop_variant, args.drop_forbidden)
        if not any(changes):
            return _die("term 需要至少一个 --add-variant / --add-forbidden / "
                        "--drop-variant / --drop-forbidden")
        try:
            res = db.term_meta_update(
                conn_kw["db_path"], concept, args.lang,
                add_variant=args.add_variant, add_forbidden=args.add_forbidden,
                drop_variant=args.drop_variant, drop_forbidden=args.drop_forbidden)
        except db.PolicyError as exc:
            return _die(str(exc))
        if args.json:
            print(json.dumps(res, ensure_ascii=False, indent=2))
        else:
            print("「%s」%s 首选形 %r ｜ 变体 %d 条 ｜ 禁用形 %d 条 ｜ policy v%s"
                  % (res["concept"], res["lang"], res["preferred"],
                     len(res["variants"]), len(res["forbidden"]),
                     res["policy_version"]))
            for f in res["forbidden"]:
                print("   禁用:", f)
            for f in res["variants"]:
                print("   变体:", f)
        return 0

    if action == "scan":
        # 加表前必查：某个词形已经在哪些契约、哪个语向、哪个极性登记过。
        # 与 list 的区别——list 按契约找词形，scan 按词形找契约（反查）。
        q = (args.term or "").strip()
        if not q:
            return _die("scan 需要 --term=<词形>：按词形反查已登记的契约/语向/极性")
        ql = q.casefold()
        sec_of = {c["id"]: (c["section"], c["revision"])
                  for c in policy.contracts}
        hits = []
        # v3：直接查 forms 表（lang 上有索引），不再逐条解析 payload。
        # forbid_re 在表里记作 assertion='forbid' + match_mode='regex'，输出时还原。
        for f in policy.forms:
            sec, rev = sec_of.get(f["term_id"], ("", 0))
            if args.section and sec != args.section:
                continue
            if args.lang and f["lang"] not in (args.lang, "*"):
                continue
            if ql not in str(f["value"]).casefold():
                continue
            polarity = f["assertion"]
            if polarity == "forbid" and f["match_mode"] == "regex":
                polarity = "forbid_re"
            hits.append({"id": f["term_id"], "section": sec,
                         "lang": f["lang"], "polarity": polarity,
                         "form": str(f["value"]), "revision": rev})
        if args.json:
            print(json.dumps({"term": q, "hits": hits,
                              "count": len(hits)},
                             ensure_ascii=False, indent=2))
        else:
            for h in hits:
                print("%-8s %-48s %-3s %-12s %s"
                      % (h["section"], h["id"], h["lang"], h["polarity"],
                         h["form"][:60]))
            print("词形 %r 命中 %d 条（require=必须出现 / forbid=禁用 / "
                  "forbid_re=禁用正则 / terms=banned 词形）" % (q, len(hits)))
        return 0

    if action == "list":
        rows = [c for c in policy.contracts
                if (not args.section or c["section"] == args.section)]
        out = []
        for c in rows:
            fs = [f for f in policy.forms if f["term_id"] == c["id"]]
            if args.lang and args.lang not in {f["lang"] for f in fs} \
                    and "*" not in {f["lang"] for f in fs}:
                continue
            out.append({"id": c["id"], "section": c["section"],
                        "zh": c["zh_anchor"], "scope": c["scope"],
                        "count": c["count"], "revision": c["revision"],
                        "forms": len(fs), "note": (c["note"] or "")[:80]})
        if args.json:
            print(json.dumps({"count": len(out), "contracts": out},
                             ensure_ascii=False, indent=2))
        else:
            for r in out:
                print("%-8s %-52s zh=%-20s rev=%d forms=%d"
                      % (r["section"], r["id"], (r["zh"] or "")[:18],
                         r["revision"], r["forms"]))
            print("共 %d 条" % len(out))
        return 0

    if action == "get":
        rows = [c for c in policy.contracts
                if c["id"] == args.cid or c["orig_id"] == args.cid]
        if not rows:
            return _die("未找到契约：%s" % args.cid, 3)
        if args.json:
            print(json.dumps([{"id": c["id"], "section": c["section"],
                               "revision": c["revision"],
                               "payload": c["payload"]}
                              for c in rows], ensure_ascii=False, indent=2))
        else:
            for c in rows:
                print(json.dumps(c["payload"],
                                 ensure_ascii=False, indent=2))
        return 0

    if action in ("add", "update"):
        try:
            if args.payload:
                payload = json.loads(args.payload)
            elif payload_file:
                with open(payload_file, encoding="utf-8") as fh:
                    payload = json.load(fh)
            else:
                return _die("需要 --payload=<json> / --payload-file=<文件> "
                            "或直接给 JSON 文件路径", 3)
            r = db.glossary_write(conn_kw["db_path"], action, args.section,
                                  payload=payload,
                                  base_revision=args.base_revision)
            print(json.dumps({"result": "ok", "change": r,
                              "policy_version": db.load_policy(
                                  conn_kw["db_path"]).policy_version},
                             ensure_ascii=False, indent=2))
            return 0
        except db.ConflictError as exc:
            return _die("并发冲突：%s" % exc, 3)
        except Exception as exc:
            return _die("写入失败：%s" % exc, 2)

    if action == "delete":
        try:
            r = db.glossary_write(conn_kw["db_path"], "delete", args.section,
                                  cid=args.cid,
                                  base_revision=args.base_revision)
            print(json.dumps({"result": "ok", "change": r},
                             ensure_ascii=False))
            return 0
        except db.ConflictError as exc:
            return _die("并发冲突：%s" % exc, 3)

    if action == "audit":
        # M6：原 plugins/p96_glossary_audit 随 M4 下线，改为直接调共享模块
        # （它是只读预检工具，不是判据，loader 也不装载下划线模块）。
        from plugins import _glossary_audit as p96
        argv = []
        for k, v in (("term", args.term), ("new", args.new),
                     ("face", args.face), ("roots", args.roots),
                     ("db", args.db)):
            if v:
                argv.append("--%s=%s" % (k, v))
        if args.json:
            argv.append("--json")
        # audit 的 roots 相对「项目根」解析；未显式给 --root 时用工作区根
        # （工具包目录的上一级），否则扁平布局 submission/ 永远扫不到。
        root = os.path.abspath(args.root) if args.root else os.path.dirname(KIT)
        return p96.main(argv, repo_root=root, pv=policy)

    if action == "export":
        cs = db.build_changeset(conn_kw["db_path"],
                                since_revision=args.since_revision,
                                against=args.against,
                                db_label="submit-v%d" % policy.policy_version)
        txt = json.dumps(cs, ensure_ascii=False, indent=2)
        if args.out:
            with open(args.out, "w", encoding="utf-8", newline="\n") as fh:
                fh.write(txt + "\n")
            print("written %s（%d ops，cs_id %s）"
                  % (args.out, len(cs["ops"]), cs["cs_id"][:16]))
        else:
            print(txt)
        return 0

    if action == "import":
        if not doc_path:
            return _die("import 需要 changeset JSON 文件路径", 3)
        try:
            with open(doc_path, encoding="utf-8") as fh:
                cs = json.load(fh)
        except (OSError, ValueError) as exc:
            return _die("changeset 文件无法读取：%s" % exc, 2)
        try:
            applied, skipped, conflicts = db.import_changeset(
                conn_kw["db_path"], cs, dry_run=args.dry_run,
                force=args.force)
        except db.PolicyError as exc:
            return _die("changeset 基线不兼容：%s" % exc, 3)
        if conflicts:
            print(json.dumps({"result": "CONFLICT", "conflicts": conflicts},
                             ensure_ascii=False, indent=2))
            return 3
        print(json.dumps({"result": "ok", "applied": applied,
                          "skipped": skipped, "dryRun": args.dry_run},
                         ensure_ascii=False))
        return 0

    if action == "diff":
        sys.stdout.write(db.diff_markdown(
            conn_kw["db_path"], against=args.against,
            since_revision=args.since_revision))
        return 0

    if action == "resolve":
        if not doc_path:
            return _die("resolve 需要 changeset JSON 文件路径", 3)
        try:
            with open(doc_path, encoding="utf-8") as fh:
                cs = json.load(fh)
        except (OSError, ValueError) as exc:
            return _die("changeset 文件无法读取：%s" % exc, 2)
        if args.theirs:
            cs = dict(cs)
            cs["ops"] = [dict(op, base_revision=None) for op in cs["ops"]]
            cs.pop("cs_id", None)
            cs["cs_id"] = db._cs_id({k: v for k, v in cs.items()
                                     if k != "cs_id"})
            out = args.out or doc_path + ".resolved.json"
            with open(out, "w", encoding="utf-8", newline="\n") as fh:
                json.dump(cs, fh, ensure_ascii=False, indent=2)
            cs["force_resolved"] = True
            applied, skipped, conflicts = db.import_changeset(
                conn_kw["db_path"], cs, dry_run=False, force=True)
            print(json.dumps({"result": "ok", "strategy": "theirs",
                              "changeset": out, "applied": applied},
                             ensure_ascii=False))
            return 0
        if args.ours:
            print(json.dumps({"result": "ok", "strategy": "ours",
                              "applied": 0,
                              "note": "已放弃来方全部 ops，主线保持不变"},
                             ensure_ascii=False))
            return 0
        return _die("resolve 需 --ours 或 --theirs", 3)
    return _die("未知 glossary 动作：%s" % action, 3)


# ---------------------------------------------------------------- plugin / rules

def cmd_plugin(args):
    plugins, _ = _plugins()
    if args.action == "list":
        rows = loader.report(plugins)
        print(json.dumps(rows, ensure_ascii=False, indent=2)
              if args.json else "\n".join(
                  "%-24s phase=%-3d v%-6s rules=%-3d enabled=%s sha=%s"
                  % (r["id"], r["phase"], r["version"], len(r["rules"]),
                     r["enabled"], r["source_sha"]) for r in rows))
        return 0
    if args.action == "report":
        print(json.dumps(loader.report(plugins, verbose=True),
                         ensure_ascii=False, indent=2))
        return 0
    if args.action == "verify":
        problems = db.doctor(args.db or DB_PATH, KIT, plugins=plugins)
        print(json.dumps({"ok": not problems, "problems": problems},
                         ensure_ascii=False, indent=2))
        return 0 if not problems else 2
    if args.action in ("enable", "disable"):
        if not args.pid:
            return _die("需要插件 id", 3)
        loader.set_enabled(KIT, args.pid, args.action == "enable")
        print(json.dumps({"result": "ok", "plugin": args.pid,
                          "enabled": args.action == "enable"},
                         ensure_ascii=False))
        return 0
    return _die("未知 plugin 动作：%s" % args.action, 3)


def _rule_summary(plugin, rule):
    """规则短摘要：RULE_META 未收录时回退插件模块 docstring 首行。

    M3 插件化后 RULE_META 只剩 22 条（core 级与少数早期规则），`rules`
    表对 156/175 条规则曾显示空摘要——而兜底
    `rule_catalog().get(r, "")` 取的是状态字典（count/registered/meta），
    永远拿不到说明，等于没有兜底。每个插件 docstring 首行本就是
    「规则号：一句话口径」，直接取用即可 175/175 有摘要，不再维护第二份清单。
    """
    doc = getattr(plugin.get("module"), "__doc__", "") or ""
    first = doc.strip().splitlines()[0].strip() if doc.strip() else ""
    if not first:
        return ""
    for sep in ("：", ":"):
        if first.startswith(rule + sep):
            return first[len(rule) + 1:].strip()
    return first


def _atomic_write(path, text):
    """同目录 tmp + replace：写一半的文件不会被下一个入口读到。"""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    with io.open(tmp, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(text)
    os.replace(tmp, path)


def _reload_registry_consts():
    """注册表落盘后刷新 `core.consts`，让 loader 立刻看到新的 KNOWN_RULES。

    不刷新的话，同一进程内 `loader.discover()` 会拿 import 时的旧集合，
    把刚导入的规则判成「未注册」——入口就在这一步自我否决。
    """
    import importlib
    import core.consts as _cc
    import core.consts.rules as _cr
    importlib.reload(_cr)
    importlib.reload(_cc)


def _policy_bump_and_sync():
    """规则变更后：policy_version +1。插件真源是 rules_registry.json。"""
    con = db.connect(DB_PATH)
    try:
        db._bump(con)
        con.commit()
    finally:
        con.close()
    plugins, _skipped = loader.discover(KIT)
    return len(plugins)


def _rules_list(args):
    plugins, _ = _plugins()
    data, err = rule_registry.try_load(KIT)
    meta = rule_registry.rules_of(data) if data else dict(RULE_META)
    rows = []
    for p in plugins:
        for r in p["rules"]:
            sev, desc = meta.get(r, ("error", ""))
            if not desc:
                desc = _rule_summary(p, r)
            rows.append({"rule": r, "plugin": p["id"], "phase": p["phase"],
                         "severity": sev, "enabled": p["enabled"],
                         "summary": desc,
                         "rationale": p["rationale"].get(r) if args.verbose
                         else None})
    # CORE_RULES（C01/H01/H02）由 core 发射、没有 plugins/ 文件，但仍要在
    # 规则表里出现——`rules` 是查规则的唯一入口。
    for r in sorted(CORE_RULES):
        sev, desc = meta.get(r, ("error", ""))
        rows.append({"rule": r, "plugin": "(core)", "phase": 0,
                     "severity": sev, "enabled": True,
                     "summary": desc or "core 级规则",
                     "rationale": ("core 级守卫：由 core/checker.py 的包级守卫与 "
                                   "core/kit_hygiene.py 发射，结构上不写成 "
                                   "plugins/ 下的一规则一文件"
                                   if args.verbose else None)})
    rows.sort(key=lambda x: x["rule"])
    if args.json:
        print(json.dumps({"count": len(rows), "rules": rows,
                          "registry_error": err or None},
                         ensure_ascii=False, indent=2))
    else:
        if err:
            print("[警告] %s（当前视图不完整）" % err)
        for r in rows:
            print("%-6s %-22s %-8s %s" % (r["rule"], r["plugin"],
                                           r["severity"], r["summary"][:70]))
            if args.verbose and r["rationale"]:
                print("       " + r["rationale"][:300].replace("\n", " "))
    return 0


def _rules_diff(args):
    """注册表 vs 磁盘：只报不改，用于「改完判据、还没走入口」的事后核对。"""
    data, err = rule_registry.try_load(KIT)
    if data is None:
        return _die("规则注册表不可用：%s（先跑 rules adopt --yes）" % err, 2)
    diff = rule_registry.audit(KIT, data)
    bad = {k: v for k, v in diff.items() if isinstance(v, list) and v}
    labels = (("unregistered", "未登记插件"),
              ("missing", "登记了但磁盘缺"),
              ("hash_mismatch", "插件指纹不一致"),
              ("selftest_unregistered", "自检臂未登记"),
              ("selftest_hash_mismatch", "自检臂指纹不一致"),
              ("orphan_rule", "无插件指向的规则"))
    if args.json:
        print(json.dumps({"ok": not bad, "diff": diff}, ensure_ascii=False,
                         indent=2))
    elif not bad:
        print("规则注册表与磁盘一致（%d 插件 / %d 规则）"
              % (len(data["plugins"]), len(data["rules"])))
    else:
        for key, label in labels:
            if diff.get(key):
                print("%-16s %s" % (label, ", ".join(diff[key][:10])))
        print("\n修复：合法变更走 `submit.py rules import|delete`；"
              "首次登记或灾后重建走 `rules adopt --yes`。")
    return 0 if not bad else 2


def _rules_adopt(args):
    """按磁盘现状重写注册表（**只允许注册表缺失/损坏时**：首次迁移 / 灾后重建）。

    注册表正常时禁止 adopt：它会把 `plugins/` 下任意手写插件直接登记为合法，
    绕过 `rules import` 的静态校验、自检臂实跑与 policy bump——白名单等于失效。
    合法新增一律走 `rules import`；判据改动走 `import --force` 或 `delete`。
    """
    cur, err = rule_registry.try_load(KIT)
    if cur is not None:
        diff = rule_registry.audit(KIT, cur)
        bad = diff.get("unregistered") or []
        if bad:
            return _die(
                "注册表存在，但有 %d 个插件未登记：%s\n"
                "  合法新增只能走 `rules import --plugin … --selftest … --yes`"
                "（入口做静态校验 + 自检臂实跑）；"
                "adopt 只用于注册表缺失/损坏后的重建。"
                % (len(bad), ", ".join(bad[:5])), 3)
        drift = ((diff.get("hash_mismatch") or [])
                 + (diff.get("missing") or [])
                 + (diff.get("selftest_hash_mismatch") or []))
        # 共享层（plugins/_*.py）是 SEALED 框架代码：维护者改后由重签把关，
        # 不因它阻止 adopt，但需要重建来同步 shared 指纹；判据插件的差异
        # 仍然拒绝（防「手写插件 → adopt 洗白」）。
        shared_drift = [x for x in drift
                        if os.path.basename(str(x)).startswith("_")]
        drift = [x for x in drift
                 if not os.path.basename(str(x)).startswith("_")]
        if drift:
            return _die(
                "注册表存在且有 %d 处指纹/缺失差异：%s\n"
                "  这是「判据已改但没走入口」的状态：合法变更走"
                " `rules import --force` 或 `rules delete`；"
                "adopt 只用于注册表缺失/损坏后的重建。"
                % (len(drift), ", ".join(sorted(drift)[:5])), 3)
        if not shared_drift:
            print("注册表与磁盘一致（%d 插件 / %d 规则），无需 adopt。"
                  % (len(cur.get("plugins") or {}), len(cur.get("rules") or {})))
            return 0
        print("共享层指纹待同步：%s（框架层，重签后生效）"
              % ", ".join(sorted(shared_drift)[:5]))
    if not getattr(args, "yes", False):
        print("将按磁盘现状重写 data/rules_registry.json："
              "把现有 plugins/ 与 selftest/ 全部登记（不改任何判据代码）。")
        return _die("需要 --yes 确认", 2)
    try:
        data = rule_registry.build_from_disk(KIT)
    except rule_registry.RegistryError as exc:
        return _die("无法按磁盘生成注册表：%s" % exc, 2)
    data["last_change"] = {
        "at": datetime.datetime.now().astimezone().isoformat(timespec="seconds"),
        "action": "adopt",
        "detail": "按磁盘现状登记 %d 个插件" % len(data["plugins"])}
    p = rule_registry.save(KIT, data)
    _reload_registry_consts()
    print(json.dumps({"result": "ok", "registry": _rel(p),
                      "plugins": len(data["plugins"]),
                      "rules": len(data["rules"])}, ensure_ascii=False))
    print("提示：注册表由入口受控维护——分发工具包前由维护者运行 "
          "`submit.py tools integrity_seal sign` 重签。")
    return 0


def _rules_import(args):
    """规则与自检臂成对导入：静态校验 → 落盘 → 装载 → 实跑臂 → bump → sync。"""
    import subprocess as _sp
    if not args.plugin or not args.selftest:
        return _die("rules import 需要 --plugin 与 --selftest（规则与自检臂"
                    "强制成对导入）", 2)
    for p in (args.plugin, args.selftest):
        if not os.path.isfile(p):
            return _die("草稿不存在：%s" % p, 2)
        try:
            _tmp_root.assert_outside_kit(p)
        except _tmp_root.TmpInsideKit:
            return _die("草稿 %s 在工具包内：规则草稿必须写在包外临时目录"
                        "（如 ../tmp/rule-draft/），再由入口导入"
                        % os.path.basename(p), 2)
    pname = os.path.basename(args.plugin)
    sname = os.path.basename(args.selftest)
    src_p = io.open(args.plugin, encoding="utf-8", newline="").read()
    src_s = io.open(args.selftest, encoding="utf-8", newline="").read()
    try:
        rec = rule_registry.parse_plugin(src_p, pname)
        rule_registry.validate_selftest(src_s, sname, pname)
    except rule_registry.RegistryError as exc:
        return _die("草稿不合规：%s" % exc, 2)

    data, err = rule_registry.try_load(KIT)
    if data is None:
        return _die("规则注册表不可用：%s（先跑 rules adopt --yes）" % err, 2)
    rule = rec["rule"]
    if rule in (data.get("core") or []):
        return _die("规则 %s 是 core 级内置规则，不允许插件声明" % rule, 3)
    owner = rule_registry.owner_of(data, rule)
    if owner and owner != pname and not args.force:
        return _die("规则 %s 已被插件 %s 占用；确需迁移加 --force"
                    % (rule, owner), 3)
    if pname in (data.get("plugins") or {}) and not args.force:
        return _die("插件 %s 已存在；确需替换加 --force" % pname, 3)
    if not getattr(args, "yes", False):
        print("将导入 %s → 规则 %s（%s）" % (pname, rule, rec["severity"]))
        print("  自检臂 %s" % sname)
        return _die("需要 --yes 确认（写盘后须由维护者重签）", 2)

    # 临时根必须在**写盘之前**解析：缺 --tmp 或落在包内时立刻失败。放到写盘
    # 之后曾造成「半导入」——插件与注册表已改、policy 未 bump、自检臂未实跑，
    # 且不回滚，下一次重试还被「插件已存在」的提示误导。dry-run（无 --yes）
    # 不写盘也不需要 --tmp，所以位置只能在 --yes 之后、落盘之前。
    try:
        tmp = _tmp_root.require_tmp(getattr(args, "tmp", None))
    except _tmp_root.TmpInsideKit as exc:
        return _die(str(exc), 2)
    except RuntimeError as exc:
        return _die("%s（rules import 需要 --tmp）" % exc, 2)

    dst_p = os.path.join(KIT, "plugins", pname)
    dst_s = os.path.join(KIT, "selftest", sname)
    old_p = (io.open(dst_p, encoding="utf-8", newline="").read()
             if os.path.exists(dst_p) else None)
    old_s = (io.open(dst_s, encoding="utf-8", newline="").read()
             if os.path.exists(dst_s) else None)
    old_reg = json.dumps(data, ensure_ascii=False, sort_keys=True)

    def _rollback(msg, code=2):
        try:
            if old_p is None:
                if os.path.exists(dst_p):
                    os.remove(dst_p)
            else:
                _atomic_write(dst_p, old_p)
            if old_s is None:
                if os.path.exists(dst_s):
                    os.remove(dst_s)
            else:
                _atomic_write(dst_s, old_s)
            rule_registry.save(KIT, json.loads(old_reg))
            _reload_registry_consts()
        except Exception as exc2:
            return _die("%s；且回滚失败：%s（请人工核对 plugins/ 与注册表）"
                        % (msg, exc2), 3)
        return _die("%s（已回滚）" % msg, code)

    try:
        _atomic_write(dst_p, src_p)
        _atomic_write(dst_s, src_s)
        new = json.loads(old_reg)
        if owner:
            for r in ((new["plugins"].get(owner) or {}).get("rules") or []):
                new["rules"].pop(r, None)
        new["rules"][rule] = {"severity": rec["severity"], "desc": rec["desc"]}
        new["plugins"][pname] = {
            "plugin": rec["plugin"], "rules": [rule],
            "sha256": rule_registry.sha256_bytes(src_p.encode("utf-8"))}
        new["selftest"][sname] = {
            "sha256": rule_registry.sha256_bytes(src_s.encode("utf-8"))}
        new["last_change"] = {
            "at": datetime.datetime.now().astimezone().isoformat(
                timespec="seconds"),
            "action": "import", "rule": rule, "plugin": pname}
        rule_registry.save(KIT, new)
        _reload_registry_consts()
    except Exception as exc:
        return _rollback("写入失败：%s" % exc)

    try:
        plugins, _skipped = loader.discover(KIT)
    except loader.PluginError as exc:
        return _rollback("导入后装载失败：%s" % exc)
    if not [p for p in plugins if p["id"] == rec["plugin"]]:
        return _rollback("导入后未发现插件 %s" % rec["plugin"])

    r = _sp.run([sys.executable, "-u", "-X", "utf8", dst_s, "--tmp", tmp],
                capture_output=True, text=True, encoding="utf-8",
                errors="replace")
    if r.returncode != 0:
        sys.stderr.write(r.stdout or "")
        sys.stderr.write(r.stderr or "")
        return _rollback("自检臂未通过（注入转红 / 还原转绿不成立）")

    n = _policy_bump_and_sync()
    print(json.dumps({"result": "ok", "rule": rule, "plugin": pname,
                      "selftest": sname, "plugins": n}, ensure_ascii=False))
    print("提示：注册表与插件已变更，须由维护者运行 "
          "`submit.py tools integrity_seal sign` 重签后，才对分发生效。")
    return 0


def _rules_delete(args):
    """按规则号删除：插件与自检臂归档到 tmp/待删除，注册表同步移除。"""
    rule = (getattr(args, "rule_id", None) or "").strip().upper()
    if not rule:
        return _die("rules delete 需要规则号，如：rules delete P75", 2)
    data, err = rule_registry.try_load(KIT)
    if data is None:
        return _die("规则注册表不可用：%s" % err, 2)
    if rule in (data.get("core") or []):
        return _die("规则 %s 是 core 级内置规则，不能经插件删除" % rule, 3)
    owner = rule_registry.owner_of(data, rule)
    if not owner:
        return _die("规则 %s 在注册表里没有插件归属" % rule, 3)
    # 先在确认之前解析临时根：缺 --tmp / 落包内是参数错误，应立刻暴露，
    # 不能让用户先看一遍「将删除…」再被告知参数不全。
    try:
        tmp = _tmp_root.require_tmp(getattr(args, "tmp", None))
    except _tmp_root.TmpInsideKit as exc:
        return _die(str(exc), 2)
    except RuntimeError as exc:
        return _die("%s（rules delete 需要 --tmp）" % exc, 2)
    if not getattr(args, "yes", False):
        print("将删除规则 %s（插件 plugins/%s 与同名自检臂）" % (rule, owner))
        return _die("需要 --yes 确认", 2)

    dst_p = os.path.join(KIT, "plugins", owner)
    dst_s = os.path.join(KIT, "selftest", owner)
    old_p = (io.open(dst_p, encoding="utf-8", newline="").read()
             if os.path.exists(dst_p) else None)
    old_s = (io.open(dst_s, encoding="utf-8", newline="").read()
             if os.path.exists(dst_s) else None)
    old_reg = json.dumps(data, ensure_ascii=False, sort_keys=True)
    moved = []

    def _restore_files():
        if old_p is not None and not os.path.exists(dst_p):
            _atomic_write(dst_p, old_p)
        if old_s is not None and not os.path.exists(dst_s):
            _atomic_write(dst_s, old_s)
        rule_registry.save(KIT, json.loads(old_reg))
        _reload_registry_consts()

    try:
        for path in (dst_p, dst_s):
            if os.path.exists(path):
                moved.append(_tmp_root.archive_delete(
                    path, label="rule-del-%s" % rule, tmp=tmp))
        new = json.loads(old_reg)
        new["rules"].pop(rule, None)
        new["plugins"].pop(owner, None)
        new["selftest"].pop(owner, None)
        new["last_change"] = {
            "at": datetime.datetime.now().astimezone().isoformat(
                timespec="seconds"),
            "action": "delete", "rule": rule, "plugin": owner}
        rule_registry.save(KIT, new)
        _reload_registry_consts()
        plugins, _skipped = loader.discover(KIT)
    except (loader.PluginError, OSError, ValueError) as exc:
        _restore_files()
        return _die("删除失败：%s（已回滚）" % exc, 2)

    n = _policy_bump_and_sync()
    print(json.dumps({"result": "ok", "rule": rule, "plugin": owner,
                      "archived": [x for x in moved if x],
                      "plugins": n}, ensure_ascii=False))
    print("提示：须由维护者 `submit.py tools integrity_seal sign` 重签。")
    return 0


def cmd_rules(args):
    action = (getattr(args, "action", None) or "list").strip().lower()
    handlers = {"list": _rules_list, "diff": _rules_diff,
                "adopt": _rules_adopt, "import": _rules_import,
                "delete": _rules_delete}
    fn = handlers.get(action)
    if not fn:
        return _die("未知 rules 动作：%s（list/diff/adopt/import/delete）"
                    % action, 3)
    return fn(args)


def _longpaths_enabled():
    """Windows 长路径开关；非 Windows 返回 None（Linux/macOS 无 260 限制）。"""
    if os.name != "nt":
        return None
    try:
        import winreg
        with winreg.OpenKey(
                winreg.HKEY_LOCAL_MACHINE,
                r"SYSTEM\CurrentControlSet\Control\FileSystem") as key:
            val, _typ = winreg.QueryValueEx(key, "LongPathsEnabled")
            return bool(val)
    except OSError:
        return False


def _enable_longpaths():
    """把 LongPathsEnabled 设为 1；返回 None 表示成功，否则返回原因。"""
    if os.name != "nt":
        return "仅 Windows 适用（Linux/macOS 没有 260 字符路径限制）"
    try:
        import winreg
        with winreg.OpenKey(
                winreg.HKEY_LOCAL_MACHINE,
                r"SYSTEM\CurrentControlSet\Control\FileSystem", 0,
                winreg.KEY_SET_VALUE) as key:
            winreg.SetValueEx(key, "LongPathsEnabled", 0, winreg.REG_DWORD, 1)
        return None
    except OSError as exc:
        return ("写入注册表失败（需要管理员权限）：%s；请以管理员身份运行 "
                "`python submit.py doctor --fix-longpaths`，或手动把 "
                "HKLM\\SYSTEM\\CurrentControlSet\\Control\\FileSystem\\"
                "LongPathsEnabled 设为 1 后重启终端" % exc)


def _longpath_hint(root):
    """路径超限且本机未启用长路径时返回一行提示；其余情况返回 None。"""
    pl = _path_length_audit(root)
    if not pl or not pl["over"]:
        return None
    enabled = _longpaths_enabled()
    if enabled is None or enabled:
        return None
    return ("路径长度：最长 %d 字符、≥250 字符的文件 %d 个，且本机未启用长路径；"
            "请以管理员运行 `python submit.py doctor --fix-longpaths`，"
            "或把稿件目录放浅" % (pl["max"], pl["over"]))


def _path_length_audit(root):
    """Windows MAX_PATH 体检：<root>/submission 下绝对路径长度。

    48 语 × 长 slug × 深层目录会让绝对路径超过经典 260 字符上限；本机
    启用 LongPathsEnabled 时无感，换到未启用的机器就整批读写失败。这里
    只统计、不阻断：doctor 打印最长路径与超限文件数，让换机前能看见。
    """
    base = os.path.join(root, "submission")
    if not os.path.isdir(base):
        return None
    worst, over = 0, 0
    for dp, _dn, fn in os.walk(base):
        for f in fn:
            n = len(os.path.abspath(os.path.join(dp, f)))
            worst = max(worst, n)
            if n >= 250:
                over += 1
    return {"max": worst, "over": over}


def _template_contract_check():
    """template 契约自足体检：站方契约的唯一来源必须自己就带全。

    站方形态契约（CTA、图片引用、references、法规两段式）只认 template/
    样例这一处来源；样例缺任何一项，新条目就没有可照抄的正形。逐项断言，
    缺项进 doctor problems（rc=2），防止「没人注意时悄悄腐化」。
    """
    problems = []
    for kind, marker in (("blog", "/zh/packages/"),
                         ("regulation", "<!-- original -->")):
        tdir = os.path.join(KIT, "template", kind)
        if not os.path.isdir(tdir):
            problems.append("template 契约自足：缺少 template/%s" % kind)
            continue
        samples = sorted(d for d in os.listdir(tdir)
                         if os.path.isdir(os.path.join(tdir, d)))
        if len(samples) != 1:
            problems.append("template 契约自足：%s 下应恰一个样例，实际 %d"
                            % (kind, len(samples)))
            continue
        zh_dir = os.path.join(tdir, samples[0], "content", "zh")
        mdx = glob.glob(os.path.join(zh_dir, "*.mdx"))
        if not mdx:
            problems.append("template 契约自足：%s 样例缺 zh 母版" % kind)
            continue
        s = io.open(mdx[0], encoding="utf-8", newline="").read()
        if marker not in s:
            problems.append("template 契约自足：%s zh 样例缺 %s"
                            % (kind, marker))
        if kind == "blog":
            if not re.search(r"(?m)^!\[.+\]\(/images/blog/", s):
                problems.append("template 契约自足：blog zh 样例缺图片引用行")
            ref_seg = re.search(r"(?ms)^references:.*?(?=^---)", s)
            n_refs = len(re.findall(r"(?m)^\s+-\s+title:", ref_seg.group(0))) \
                if ref_seg else 0
            if n_refs < 3:
                problems.append("template 契约自足：blog zh 样例 references "
                                "仅 %d 条（须 ≥3）" % n_refs)
            if not os.path.isfile(os.path.join(tdir, samples[0], "images",
                                               samples[0], "cover.webp")):
                problems.append("template 契约自足：blog 样例缺 cover.webp")
        else:
            body = s.split("<!-- original -->", 1)
            if len(body) < 2 or not body[0].strip() or not body[1].strip():
                problems.append("template 契约自足：regulation zh 样例两段式"
                                "有一段为空")
    return problems


def cmd_doctor(args):
    if getattr(args, "fix_longpaths", False):
        err = _enable_longpaths()
        if err:
            return _die("[longpaths] %s" % err)
        sys.stderr.write("LongPathsEnabled=1 已开启"
                         "（已运行的程序需重开终端/重启才生效）\n")
    plugins, skipped = _plugins(tolerant=True)
    policy = _policy(args)
    root = os.path.abspath(args.root) if args.root else KIT
    problems = db.doctor(args.db or DB_PATH, KIT, plugins=plugins)
    declared, missing = loader.coverage(plugins)
    if skipped:
        problems.append("插件装载被跳过 %d 个：%s"
                        % (len(skipped), ", ".join(
                            s["file"] for s in skipped[:5])))
    if missing:
        problems.append("规则注册表未声明：%s" % sorted(missing))
    # 规则注册表是插件白名单的依据：缺失/不可读/与磁盘不一致都必须在这里
    # 判红，否则「手工往 plugins/ 塞一条规则」就只剩封签这一道防线。
    from core.consts import REGISTRY_ERROR as _REG_ERR
    if _REG_ERR:
        problems.append("规则注册表：%s" % _REG_ERR)
    _reg, _reg_err = rule_registry.try_load(KIT)
    if _reg is not None:
        _diff = rule_registry.audit(KIT, _reg)
        for _key, _label in (("unregistered", "未登记插件"),
                             ("missing", "登记了但磁盘缺"),
                             ("hash_mismatch", "插件指纹不一致"),
                             ("selftest_unregistered", "自检臂未登记"),
                             ("selftest_hash_mismatch", "自检臂指纹不一致"),
                             ("orphan_rule", "无插件指向的规则")):
            if _diff.get(_key):
                problems.append("规则注册表%s：%s"
                                % (_label, ", ".join(_diff[_key][:8])))
    if set(LOCALES) != set(policy.locales):
        problems.append("内核 LOCALES 与策略库 locales 不一致")
    problems.extend(_template_contract_check())
    dep = deps.status()
    for it in dep["items"]:
        if not it["ok"]:
            problems.append("必装依赖缺失：%s（安装：%s）"
                            % (it["dist"], deps.install_cmd(it["dist"])))
    # 回流质量门禁：core.contract_health 的只读审计（M4 后无对应插件）。--root 显式给到
    # 含 submission/ 的项目根时，才启用依赖 zh 母版的孤儿锚 / 锚过宽检查。
    health = contract_health.audit(args.db or DB_PATH, repo_root=root)
    problems.extend("契约健康：%s" % e for e in health["errors"])
    pathlen = _path_length_audit(root)
    # 三表一致性（v3）：terms/anchors/forms 与 payload 派生值必须逐条相等，
    # 否则「查表」与「判据读 spec」会给出不同答案。
    schema = _schema_check(args.db or DB_PATH)
    problems.extend("schema v3：%s" % e for e in schema["errors"])
    # 架构守卫：core/rules 与 engine.py 不得回流 / tests 不得回流 /
    # 一规则一插件 + COVERAGE（core/arch_health.py）。
    arch = arch_health.audit(KIT)
    problems.extend("架构：%s" % e for e in arch["errors"])
    out = {"ok": not problems, "root": _rel(root),
           "policy_version": policy.policy_version,
           "schema_version": policy.schema_version,
           "plugins": len(plugins), "rules": len(declared),
           "skipped_plugins": len(skipped),
           "contracts": len(policy.contracts), "forms": len(policy.forms),
           "locales": len(policy.locales), "problems": problems,
           "deps": {i["dist"]: i["version"] for i in dep["items"]},
           "contract_health": {"errors": health["errors"],
                               "warnings": health["warnings"],
                               "stats": health["stats"]},
           "schema": schema,
           "path_length": pathlen,
           "arch_health": arch}
    if args.json:
        print(json.dumps(out, ensure_ascii=False, indent=2))
    elif problems:
        print("doctor: FAIL\n  " + "\n  ".join(problems))
    else:
        print("doctor: OK（v%d，%d 插件 / %d 规则 / %d 契约）"
              % (out["policy_version"], out["plugins"], out["rules"],
                 out["contracts"]))
        # 跨机器/多目录场景：明确本次体检的是哪个根，母版相关检查是否启用，
        # 避免「root 缺省=工具包自身」时把 skipped 当成已检查。
        print("根目录：%s（母版契约检查：%s）"
              % (_rel(root),
                 "启用" if health["stats"].get("orphan_check") == "enabled"
                 else "未启用——--root 指向含 submission/ 的项目根才检查"))
        if pathlen and pathlen["over"]:
            print("路径长度：最长 %d 字符，≥250 字符的文件 %d 个"
                  "（Windows 未启用长路径时读写会失败；"
                  "可启用 LongPathsEnabled 或把稿件目录放浅）"
                  % (pathlen["max"], pathlen["over"]))
        if health["warnings"]:
            print("契约健康 warning %d 条（不阻断）："
                  % len(health["warnings"]))
            for w in health["warnings"][:8]:
                print("  " + w)
    return 0 if not problems else 2


# ---------------------------------------------------------------- hygiene / clean / pack / version

def cmd_hygiene(args):
    kit_hygiene.hygiene_report(KIT, as_json=args.json)
    return 0


def cmd_clean(args):
    return kit_hygiene.clean(KIT, apply=args.apply,
                             confirm=args.confirm,
                             dry_run=(args.dry_run or not args.apply))


# v629：`restore` 命令已移除。理由：编写者模式下取回的文件不在清单，
# 下次入口自愈会再次归档；框架文件被改/删本就自动还原；维护者要找回
# 误归档文件，直接从 `<tmp>/待删除/` 拷回即可（归档目录保留原相对结构）。
# 封签框架文件损坏用 `submit.py integrity --restore`（从 sealed.zip 覆盖）。


def _fm_value(path, key):
    """读 mdx frontmatter 的单个标量（用于把 submission 对齐到实际值）。"""
    try:
        head = io.open(path, encoding="utf-8").read().split("---", 2)[1]
    except Exception:
        return ""
    m = re.search("(?m)^" + re.escape(key) + r":\s*(.*)$", head)
    if not m:
        return ""
    raw = m.group(1).strip()
    try:
        return str(json.loads(raw))
    except Exception:
        return raw.strip('"').strip("'")


def cmd_start(args):
    """起手：从 template/<kind>/ 的样例条目生成新骨架。

    生成 <root>/<blogs|regulations>/<条目名>/work/<kind>/<slug>/——条目直接落进
    投稿目录的对应线（2026-11-07 定稿：投稿目录是唯一传入的根，所有内容都在
    里面产生）。条目名默认＝slug；法规线的 REG<n>- 前缀用 --entry-name 给出。
    **中文是母版语言**：默认只保留 zh，其余
    语言目录裁掉；需要英文版时显式 --langs=zh,en，并用 --title-en / --excerpt-en
    给出英文题录（submission.json 的 title/excerpt 受 M09 约束，必须与 en
    frontmatter 一致）。slug 同时替换目录名、文件名、frontmatter 与
    submission.json，图片目录一并改名。语言只裁文件，submission.locales 仍
    声明 48 语——补齐译文后 check/pack 才能通过。生成时样例的配图与
    references 占位一并清空（避免样例内容静默混进投稿包），缺项由 check
    以 error 显性点名，待办清单见命令输出。
    """
    kind, slug = args.kind, args.slug
    if not SLUG_RE.match(slug) or len(slug) < 3:
        return _die("slug 必须是小写 kebab-case 且至少 3 字符（当前 %r）" % slug)

    # 语言口径：中文是母版，zh 恒定保留且默认只留 zh；en 是首个译语。
    keep = [x.strip() for x in (args.langs or "zh").split(",") if x.strip()]
    if "zh" not in keep:
        return _die("--langs 必须包含 zh：中文是母版语言，其余语种一律从 zh 出稿")
    if args.title_en and "en" not in keep:
        return _die("给了 --title-en 但 --langs 未保留 en")
    if args.excerpt_en and "en" not in keep:
        return _die("给了 --excerpt-en 但 --langs 未保留 en")
    for k in ("title", "excerpt"):
        if getattr(args, k) and "en" in keep and not getattr(args, k + "_en"):
            return _die("保留 en 时需一并给出 --%s-en：submission.json 的 %s "
                        "必须与 en frontmatter 一致（M09）" % (k, k))
    tpl = os.path.join(KIT, "template", kind)
    if not os.path.isdir(tpl):
        return _die("工具包缺少 template/%s（解包不完整）" % kind)
    samples = sorted(d for d in os.listdir(tpl)
                     if os.path.isdir(os.path.join(tpl, d)))
    if not samples:
        return _die("template/%s 下没有样例条目" % kind)
    old = samples[0]
    if not args.root:
        return _die("--root 必填：请显式传入投稿目录（其下自动建 blogs/ 或 "
                    "regulations/，如 --root=submission）")
    entry_name = (getattr(args, "entry_name", None) or slug).strip()
    if not re.match(r"^[A-Za-z0-9][A-Za-z0-9._-]*$", entry_name) \
            or entry_name.startswith("."):
        return _die("--entry-name 只允许字母/数字/点/下划线/连字符（当前 %r）"
                    % entry_name)
    base = os.path.abspath(args.root)
    line = "blogs" if kind == "blog" else "regulations"
    entry_root = os.path.join(base, line, entry_name)
    work = os.path.join(entry_root, "work", kind, slug)
    if os.path.exists(work) and not args.force:
        return _die("目标已存在：%s（覆盖请加 --force）" % _rel(work))
    if os.path.exists(work):
        _tmp_root.archive_delete(work, label="start-overwrite")
    os.makedirs(os.path.dirname(work), exist_ok=True)
    shutil.copytree(os.path.join(tpl, old), work)

    # 1) 目录/文件名换 slug
    for p in glob.glob(os.path.join(work, "content", "*", old + ".mdx")):
        os.replace(p, os.path.join(os.path.dirname(p), slug + ".mdx"))
    img_old = os.path.join(work, "images", old)
    if os.path.isdir(img_old):
        os.replace(img_old, os.path.join(work, "images", slug))

    # 2) 文本里换 slug（正文图片路径、frontmatter、submission.json）
    texts = glob.glob(os.path.join(work, "**", "*.mdx"), recursive=True)
    texts.append(os.path.join(work, "submission.json"))
    for p in texts:
        raw = io.open(p, encoding="utf-8", newline="").read()
        if old in raw:
            io.open(p, "w", encoding="utf-8", newline="\n").write(
                raw.replace(old, slug))

    # 3) 裁语言（只删 content 下的语言目录，不动 submission.locales）
    cdir = os.path.join(work, "content")
    dropped = []
    for lg in sorted(os.listdir(cdir)):
        if lg not in keep:
            _tmp_root.archive_delete(os.path.join(cdir, lg),
                                      label="start-prune-lang")
            dropped.append(lg)

    # 4) 元数据：submission.title/excerpt 跟随 en（M09 要求二者一致）；
    #    未保留 en 时 submission 暂用中文母版值，出译稿后换成英文。
    sp = os.path.join(work, "submission.json")
    meta = json.loads(io.open(sp, encoding="utf-8").read())
    meta["slug"] = slug
    # submission 跟随当前唯一可依据的源：保留 en 时跟 en，否则跟 zh 母版。
    src_lang = "en" if "en" in keep else "zh"
    src_path = os.path.join(cdir, src_lang, slug + ".mdx")
    picked = {"title": args.title_en if src_lang == "en" else args.title,
              "excerpt": args.excerpt_en if src_lang == "en" else args.excerpt}
    for k in ("title", "excerpt"):
        meta[k] = picked[k] or _fm_value(src_path, k) or meta.get(k, "")
    today = datetime.date.today().isoformat()
    if kind == "blog":
        meta["date"] = args.date or today
    else:
        meta["publishedAt"] = args.published_at or today
        meta["effectiveAt"] = args.effective_at or today
    io.open(sp, "w", encoding="utf-8", newline="\n").write(
        json.dumps(meta, ensure_ascii=False, indent=2) + "\n")

    fm = {"slug": slug}
    if kind == "blog":
        fm["date"] = meta["date"]
    else:
        fm["published_at"] = meta["publishedAt"]
        fm["effective_at"] = meta["effectiveAt"]
    master = {"title": args.title, "excerpt": args.excerpt}
    english = {"title": args.title_en, "excerpt": args.excerpt_en}
    for p in glob.glob(os.path.join(cdir, "*", "*.mdx")):
        lang = os.path.basename(os.path.dirname(p))
        s = io.open(p, encoding="utf-8", newline="").read()
        fields = dict(fm)
        if lang == "zh":
            fields.update({k: v for k, v in master.items() if v})
        elif lang == "en":
            fields.update({k: v for k, v in english.items() if v})
        # 其余语言保留样例文本：未译语向不得用英文/中文占位（L01/L02/L03）。
        for k, v in fields.items():
            s = re.sub(r"(?m)^%s:.*$" % re.escape(k),
                       "%s: %s" % (k, json.dumps(v, ensure_ascii=False)),
                       s, count=1)
        io.open(p, "w", encoding="utf-8", newline="\n").write(s)

    # 5) 清除模板内容残留：样例的配图与 references 是占位物，留在骨架里
    #    会随出稿静默混进投稿包（文件名过 I09、引用自配对，判据不报）。
    #    这里删掉模板图文件、正文图片引用行与 references 列表，让「缺什么」
    #    显性化成 error（I02 缺 cover、S0X 缺 references），由待办清单接管。
    if kind == "blog":
        img_dir = os.path.join(work, "images", slug)
        n_tpl_imgs = 0
        if os.path.isdir(img_dir):
            for fn in sorted(os.listdir(img_dir)):
                _tmp_root.archive_delete(os.path.join(img_dir, fn),
                                          label="start-tpl-img")
                n_tpl_imgs += 1
    for p in glob.glob(os.path.join(cdir, "*", "*.mdx")):
        s = io.open(p, encoding="utf-8", newline="").read()
        s2 = re.sub(r"(?m)^!\[.*$", "", s)                 # 模板图片引用行
        # 模板占位 references：只吞列表本体，止于下一顶格键 / frontmatter 闭合 / 串尾
        s2 = re.sub(r"(?ms)^references:.*?(?=^[A-Za-z_]+:|^---|\Z)",
                    "references: []\n", s2)
        s2 = re.sub(r"\n{3,}", "\n\n", s2).lstrip("\n")
        if s2 != s:
            io.open(p, "w", encoding="utf-8", newline="\n").write(s2)
    meta["images"] = []
    io.open(sp, "w", encoding="utf-8", newline="\n").write(
        json.dumps(meta, ensure_ascii=False, indent=2) + "\n")

    # 下一步提示按线分支：法规线**没有配图**（images 固定 []、正文禁图片），
    # 不能沿用博客线的 cover.webp/正文图提示——实测会误导刚起手的人。
    next_steps = ["先写 content/zh/%s.mdx（中文母版定稿）" % slug]
    if kind == "blog":
        next_steps.append(
            "补配图：cover.webp（1200×630，惯例用本篇第一张主图裁切）"
            "与正文图放进 images/%s/，正文逐一引用，references 补 3–4 条官方来源"
            % slug)
    else:
        next_steps.append(
            "法规线无配图：images 固定 []、正文禁 ![](...)；references 补 3–4 条官方来源")
    next_steps.extend([
        "python submit.py preview %s 生成审核页" % _rel(entry_root),
        "出译稿后逐语直接写 content/<lang>/（不要建 tmp/ 与 "
        "translations/ 中间层），再把 submission.json 的 "
        "title/excerpt 换成英文（M09 校验与 en frontmatter 一致）",
        "自检：python submit.py check %s --tmp %s"
        % (_rel(base), args.tmp),
        "打包：python submit.py pack --root=%s --tmp %s"
        % (_rel(base), args.tmp)])
    out = {"result": "ok", "kind": kind, "slug": slug, "path": _rel(work),
           "langs": keep, "dropped": len(dropped), "next": next_steps}
    if args.json:
        print(json.dumps(out, ensure_ascii=False, indent=2))
    else:
        print("已生成：%s" % _rel(work))
        print("  kind=%s  slug=%s  语言=%s（裁掉 %d 语）"
              % (kind, slug, ",".join(keep), len(dropped)))
        print("下一步：")
        for i, step in enumerate(out["next"], 1):
            print("  %d) %s" % (i, step))
    return 0


def cmd_preview(args):
    from core import preview
    try:
        out = preview.render(args.path, args.out)
    except (FileNotFoundError, ValueError) as exc:
        return _die(str(exc))
    if args.json:
        print(json.dumps({"result": "ok", "path": _rel(out)},
                         ensure_ascii=False))
    else:
        print("已生成：%s" % _rel(out))
    return 0


def cmd_selftest(args):
    """跑 selftest/ 下的插件自检臂（与 plugins/ 1:1）。

    纯回流演练（阶段 5 验收）就是靠它：只新增插件 + 术语，跑自检全绿即算
    「没动别的 kit 代码」。
    """
    import subprocess
    sdir = os.path.join(KIT, "selftest")
    if not os.path.isdir(sdir):
        return _die("selftest 目录不存在：%s" % sdir)
    only = [x.strip() for x in (getattr(args, "only", "") or "").split(",")
            if x.strip()]
    files = sorted(f for f in os.listdir(sdir)
                   if f.endswith(".py") and not f.startswith("_"))
    if only:
        # 支持前缀：--only language 跑 language-*.py；也接受完整文件名
        pref = tuple(x[:-3] if x.endswith(".py") else x for x in only)
        files = [f for f in files if f.startswith(pref)]
    kit_files = []
    if getattr(args, "kit", False):
        # 工具级臂（`_` 前缀）：没有对应插件，A6/A7 的 1:1 不覆盖它们，
        # 所以必须显式 --kit 才跑，且单独计数——不能混进「插件臂」的分子里。
        kit_files = sorted(f for f in os.listdir(sdir)
                           if f.startswith("_") and f.endswith(".py")
                           and f not in ("_harness.py",))
        if only:
            pref = tuple(x[:-3] if x.endswith(".py") else x for x in only)
            kit_files = [f for f in kit_files if f.startswith(pref)]
    if not files and not kit_files:
        return _die("没有匹配的自检文件（--only=%s）" % ",".join(only))
    tmp = getattr(args, "tmp", None)
    fails, rows = 0, []
    total = len(files) + len(kit_files)
    done = [0]
    t0 = time.time()

    def _one(f, is_kit):
        """跑一个臂；返回 (ok, 摘要行)。"""
        cmd = [sys.executable, "-u", "-X", "utf8", os.path.join(sdir, f)]
        if tmp:
            cmd += ["--tmp", tmp]
        r = subprocess.run(cmd, capture_output=True, text=True,
                           encoding="utf-8", errors="replace")
        ok = r.returncode == 0
        tail = [ln for ln in (r.stdout or "").strip().splitlines() if ln.strip()]
        if not tail:
            # 臂没输出时不能 `tail[-1]`：直接崩会吞掉整轮自检（v468 踩到）。
            # 摘要里带上 stderr 最后一行，方便一眼看出是守卫拦截还是异常。
            err = [ln for ln in (r.stderr or "").strip().splitlines() if ln.strip()]
            line = "(无输出%s)" % ("：" + err[-1][:90] if err else "")
        else:
            line = (tail[-1] if is_kit else
                    tail[-2] if len(tail) > 1 else tail[0])
        if not ok:
            sys.stderr.write(r.stdout or "")
            sys.stderr.write(r.stderr or "")
        return ok, line

    # 2026-11-14：改成逐臂流式输出。此前 176 臂全部攒在 rows 里最后一起
    # 打印，实测 18 分钟**零输出**——用户无法判断是在跑还是卡死，也无法
    # 中途 --only 收窄。现在每臂一行带 [n/total] 与累计耗时。
    def _emit(f, ok, line):
        done[0] += 1
        rows.append((f, ok, line))
        elapsed = time.time() - t0
        text = (line or "").strip()
        # 臂自己的输出常以 "OK  " / "FAIL" 开头，外层已有状态列，剥掉免重复
        for pref in ("OK   ", "OK  ", "FAIL ", "OK ", "FAIL"):
            if text.startswith(pref):
                text = text[len(pref):].lstrip()
                break
        print("  [%3d/%3d] %-4s %-40s %s  (%dm%02ds)"
              % (done[0], total, "OK" if ok else "FAIL", f,
                 text[:80], elapsed // 60, elapsed % 60))
        sys.stdout.flush()

    for f in files:
        ok, line = _one(f, False)
        _emit(f, ok, line)
    for f in kit_files:
        ok, line = _one(f, True)
        _emit(f, ok, line)
    fails = sum(1 for _f, ok, _ in rows if not ok)
    n_plugin = len(rows) - len(kit_files)
    elapsed = time.time() - t0
    print("自检：%d 个插件臂 + %d 个工具臂，FAIL %d（用时 %dm%02ds）"
          % (n_plugin, len(kit_files), fails, elapsed // 60, elapsed % 60))
    return 0 if fails == 0 else 1


def _schema_check(db_path):
    """库结构校验（只读）。库不可读时返回一条 error，不抛。"""
    import sqlite3 as _sqlite3
    from core import schema as _schema
    try:
        conn = _sqlite3.connect(db_path)
        conn.row_factory = _sqlite3.Row
        try:
            return _schema.verify(conn)
        finally:
            conn.close()
    except Exception as exc:                       # noqa: BLE001
        return {"errors": ["E5 无法校验库结构：%s" % exc],
                "warnings": [], "stats": {}}


def cmd_pack(args):
    if not args.root:
        return _die("--root 必填：请显式传入投稿目录（其下含 blogs/ 或 "
                    "regulations/，产物写入 <root>/dist/），如 --root=submission")
    root = os.path.abspath(args.root)
    # 投稿目录校验（防产物落到错误位置）：执行层 pack_all 也会再校验一次；
    # 入口先拦是为了给干净 rc=2 与可操作的修复指引，不走到 mkdtemp 才报错。
    from core import pack as _pack_guard
    ok, why = _pack_guard.validate_root(root)
    if not ok:
        return _die("[pack] %s" % why)
    out_dir = os.path.join(root, "dist")
    try:
        inside_kit = os.path.commonpath([out_dir, os.path.abspath(KIT)]) \
            == os.path.abspath(KIT)
    except ValueError:
        inside_kit = False
    if inside_kit:
        return _die("[pack] 输出目录在工具包内（%s），会把产物打进分发包；"
                    "请把 --root 指向投稿目录" % _rel(out_dir))
    # M6：原 plugins/p95_pack 随 M4 下线，改为直接调 core.pack（打包是文件系统
    # 作业，不是判据；它只把 core.checker 的结论当准入闸门）。
    from core import pack as _pack
    try:
        man = _pack.pack_all(
            root, KIT, only=args.only, slugs=args.slug, strict=args.strict,
            out=args.out, kit_only=args.kit_only,
            incremental=args.incremental, force=args.force,
            quiet=args.json)
    except RuntimeError as exc:
        return _die("[pack] %s" % exc)
    hint = _longpath_hint(root)
    if hint:
        sys.stderr.write("[路径] %s\n" % hint)
    if args.json:
        print(json.dumps(man, ensure_ascii=False, indent=2))
    return 0


def cmd_tools(args):
    """维护者工具索引：分组 / 用途 / 改动后要跑的验证强度。

    这些工具不在 check 流水线上；`need=entry` 才被本入口直接挂载，
    `guard` 被自检臂或其它工具 import，`manual` 是按需手工运行。
    """
    from tools import CATALOG, GROUPS, NEED_LABEL
    order = {g: i for i, (g, _t) in enumerate(GROUPS)}
    rows = sorted(CATALOG.items(),
                  key=lambda kv: (order.get(kv[1]["group"], 9), kv[0]))
    if args.json:
        print(json.dumps([dict(file=k, **v) for k, v in rows],
                         ensure_ascii=False, indent=2))
        return 0
    count = {k: sum(1 for _n, m in rows if m["need"] == k)
             for k in ("entry", "guard", "manual")}
    print("tools：%d 个维护者工具（入口 %d / 守卫 %d / 手工 %d）"
          % (len(rows), count["entry"], count["guard"], count["manual"]))
    title = dict(GROUPS)
    cur = None
    for name, meta in rows:
        if meta["group"] != cur:
            cur = meta["group"]
            print("\n[%s] %s" % (cur, title.get(cur, "")))
        print("  %-22s %-4s %s"
              % (name[:-3], NEED_LABEL[meta["need"]], meta["desc"]))
    print("\n运行：python submit.py tools <名字> [参数...]"
          "（tools/*.py 不允许直接运行）")
    print("写库工具必须经 submit.py glossary 透传；索引里标「入口」的才由本入口挂载。")
    return 0


def cmd_hooks(args):
    """git 钩子安装（commit-msg 强制 [arch]）：同样只走本入口。

    钩子本体 `tools/hooks/commit_msg_scope.py` 由 git 直接调用（那是 git 的
    约定，不是人跑的脚本）；安装器本身只经 `submit.py hooks install` 运行。
    """
    from importlib import import_module
    from tools import ENTRY_ENV
    mod = import_module("tools.hooks.install_hook")
    os.environ[ENTRY_ENV] = "submit.py"
    return int(mod.main() or 0)


def cmd_version(args):
    p = _policy(args)
    lexicons = sum(len(v) for v in (p.lexicons or {}).values())
    out = {"policy_version": p.policy_version,
           "schema_version": p.schema_version, "build_id": p.build_id,
           "applied_cs": p.applied_cs, "contracts": len(p.contracts),
           "lexicons": lexicons, "plugins": len(_plugins()[0])}
    print(json.dumps(out, ensure_ascii=False, indent=2) if args.json else
          "submit.py v%d (schema %d) · %d contracts · %d lexicon rows · "
          "%d plugins"
          % (out["policy_version"], out["schema_version"],
             out["contracts"], out["lexicons"], out["plugins"]))
    return 0


# ---------------------------------------------------------------- integrity

def cmd_integrity(args):
    """完整性自检：机制层是否被未经流程改动，一次跑清并给还原指引。

    五项检查（不依赖 git；git 存在时作为第四项辅助）：
      ⓿ 封签校验——Ed25519 分离签名：SEALED（core/、submit.py、tools/、
        selftest/、plugins/_*.py、data/rules_registry.json）与 TRACKED
        （判据插件）都必须与清单逐字节一致（严格口径）；库记逐表内容快照，
        表变而 policy_version 未变即判「绕过工具写库」。`--restore` 可从
        data/sealed.zip 就地还原。
      ① 机制层工作区差异（仅 .git 存在时）；
      ② 库逻辑 vs HEAD（仅 .git 存在时）；
      ③ 守卫臂——_db_write_surface / _word_data / _rule_data 三臂重跑；
      ④ doctor——库与插件一致性。
    """
    import subprocess as _sp
    problems = []

    # ⓿ 封签（无 git 也能跑：这是分发给外部写作者时的主防线）
    from core import integrity as _ig
    if getattr(args, "restore", False):
        n, errs = _ig.restore(KIT)
        print("⓿ 已从封签归档还原 %d 个机制层文件%s"
              % (n, ("；跳过 %d 项：%s" % (len(errs), errs[:2])) if errs else ""))
    _res = _ig.verify(KIT, DB_PATH)
    if _res.get("reason"):
        print("⓿ 封签校验：**%s**" % _res["reason"])
        if "签名不成立" not in _res["reason"]:
            problems.append("封签校验失败：%s\n"
                            "    还原：submit.py integrity --restore"
                            "（用包内 sealed.zip 覆盖机制层）" % _res["reason"])
        else:
            problems.append("封签校验失败：%s\n"
                            "    还原：从原始发布包重新解压 core/ 与 submit.py；"
                            "包内清单已不可信" % _res["reason"])
    else:
        sealed_bad = (len(_res["sealed_changed"]) + len(_res["sealed_missing"])
                      + len(_res["sealed_extra"]))
        tracked_bad = (len(_res["tracked_changed"]) + len(_res["tracked_missing"])
                       + len(_res["tracked_extra"]))
        print("⓿ 封签校验：%s（机制层差异 %d 个，判据插件差异 %d 个）"
              % ("OK" if _res["ok"] else "**FAIL**", sealed_bad, tracked_bad))
        for key, label in (("sealed_changed", "改动"),
                           ("sealed_missing", "缺失"),
                           ("sealed_extra", "多出")):
            if _res[key]:
                print("    机制层%s：%s" % (label, ", ".join(_res[key][:10])))
                problems.append("机制层%s：%s\n"
                                "    还原：submit.py integrity --restore"
                                % (label, ", ".join(_res[key][:10])))
        for key, label in (("tracked_changed", "改动"),
                           ("tracked_missing", "缺失"),
                           ("tracked_extra", "新增")):
            if _res[key]:
                print("    判据插件%s：%s" % (label, ", ".join(_res[key][:10])))
                problems.append(
                    "判据插件%s：%s\n"
                    "    合法变更走 submit.py rules import|delete（编写者可随时导入）；"
                    "稿件打包不受影响，\n"
                    "    分发工具包前由维护者 tools integrity_seal sign 重签"
                    % (label, ", ".join(_res[key][:10])))
        _db = _res.get("db") or {}
        if _db.get("status") == "silent_write":
            problems.append("库表内容变了但 policy_version 未变：%s\n"
                            "    疑似绕过 submit.py glossary 直接写库；"
                            "用 glossary diff/audit 追溯"
                            % ", ".join(_db.get("tables_changed", [])))
        elif _db.get("status") == "version_bumped":
            print("    库正常变更：policy %s → %s"
                  % tuple(_db.get("policy_version", [0, 0])))

    # ① 机制层未提交差异（git 辅助；无仓库时跳过）
    git_ok = os.path.isdir(os.path.join(os.path.dirname(KIT), ".git"))
    if not git_ok:
        print("① 机制层工作区差异：跳过（不是 git 仓库，以⓿封签为准）")
    out = _sp.run(["git", "status", "--porcelain", "--", "."],
                  capture_output=True, text=True, encoding="utf-8",
                  errors="replace", cwd=KIT) if git_ok else None
    protected = []
    for line in ((out.stdout if out else "") or "").splitlines():
        st, _, path = line.partition(" ")
        path = path.strip().replace("\\", "/")
        if path.startswith(("core/", "submit.py", "tools/hooks/")):
            protected.append("%s %s" % (st.strip() or "M", path))
    if protected:
        problems.append("机制层有未提交改动：\n    "
                        + "\n    ".join(protected))
    if git_ok:
        print("① 机制层工作区差异：%s"
              % ("无" if not protected else "%d 个文件" % len(protected)))

    # ② 库逻辑 vs HEAD（无 git 时以⓿的库快照代替）
    if not git_ok:
        print("② glossary.db vs HEAD：跳过（无 git，以⓿库快照为准）")
        rc = None
    else:
        # 工具的唯一入口是 submit.py：内部调用也要带入口标记，否则会被
        # `tools/db_diff.py` 的 require_entry 拒绝（v468 踩到，误报「库有差异」）。
        from tools import ENTRY_ENV as _ENTRY_ENV
        rc = _sp.run([sys.executable, "-u", "tools/db_diff.py"],
                     capture_output=True, text=True, encoding="utf-8",
                     errors="replace", cwd=KIT,
                     env=dict(os.environ, **{_ENTRY_ENV: "submit.py"}))
    last = ((rc.stdout if rc else "") or "").strip().splitlines()
    tail = last[-1] if last else ""
    if rc is None:
        pass
    elif rc.returncode == 0:
        print("② glossary.db vs HEAD：%s" % tail)
    else:
        problems.append("glossary.db 与 HEAD 逻辑不一致：%s\n"
                        "    还原：git checkout -- data/glossary.db"
                        "（确认并行会话没有在写之后）；或用"
                        " `glossary diff` 追溯变更来源。" % tail)
        print("② glossary.db vs HEAD：**DIFF**（见问题清单）")

    # ③ 守卫臂。子进程一律 cwd=KIT：integrity 允许从任意目录调用，而臂和
    # 工具的相对路径都相对工具包，不钉死 cwd 会在仓库根误报「三个臂全 FAIL」。
    # --tmp 先按调用者 cwd 解析成绝对路径再传，避免子进程在 KIT 下把相对
    # 路径解析成包内目录（那会被 --tmp 守卫直接拒绝）。
    arm_tmp = (os.path.abspath(args.tmp) if args.tmp
               else os.path.join(os.path.dirname(KIT), "tmp"))
    for arm, label in (("_db_write_surface", "写入口收窄"),
                       ("_word_data", "词形归属/库基线"),
                       ("_rule_data", "判据数据源")):
        r = _sp.run([sys.executable, "-u", "selftest/%s.py" % arm,
                     "--tmp", arm_tmp],
                    capture_output=True, text=True, encoding="utf-8",
                    errors="replace", cwd=KIT)
        okline = [ln for ln in (r.stdout or "").splitlines()
                  if "FAIL" in ln]
        bad = r.returncode != 0
        print("③ 守卫臂 %-14s %s" % (label, "FAIL" if bad else "OK"))
        if bad:
            problems.append("守卫臂 %s FAIL：\n    %s"
                            % (arm, "\n    ".join(
                                ln for ln in (r.stdout or "").splitlines()
                                if "FAIL" in ln and "FAIL 0" not in ln)))

    # ④ doctor
    r = _sp.run([sys.executable, "-u", "submit.py", "doctor"],
                capture_output=True, text=True, encoding="utf-8",
                errors="replace", cwd=KIT)
    doc_ok = "doctor: OK" in (r.stdout or "")
    print("④ doctor：%s"
          % ("OK" if doc_ok else (r.stdout or r.stderr or "").strip()[:120]))
    if not doc_ok:
        problems.append("doctor 异常：见上方输出。")

    print("")
    if problems:
        print("完整性：**异常 %d 项**" % len(problems))
        for p_ in problems:
            print("- " + p_)
        print("\n还原路径：代码 → git checkout -- <文件>（先确认不是并行"
              "会话的在办改动）；库 → git checkout -- data/glossary.db 或"
              " `glossary diff`/`glossary resolve` 追溯；任何还原前先跑"
              " `submit.py integrity` 留一份现场快照。")
        return 1
    print("完整性：CLEAN（机制层无未声明改动，库与 HEAD 逻辑一致，"
          "守卫臂全绿）")
    return 0



# ---------------------------------------------------------------- CLI

def build_parser():
    p = argparse.ArgumentParser(
        prog="submit.py",
        description="投稿工具唯一入口：起手 / 编写检查 / 策略治理 / 打包交付。",
        epilog="""命令分组
  流水线   start 起手 → check 逐篇检查 → pack 双包交付（preview 本地预览）
  治理     glossary 策略库唯一写入口 · plugin 插件启停/同步 · rules 规则表
           · doctor 库与插件一致性 · integrity 完整性自检（防篡改）
           · tools 维护者工具索引与运行入口（tools <名字> [参数]）
           · hooks git 钩子安装（commit-msg 强制 [arch]）
  运维     hygiene 目录白名单报告 · clean 兜底清理 · selftest 自检臂 · version
           （归档文件在 <tmp>/待删除/，需要时直接拷回）

判据变更只有一条合法路径：包外 tmp 写插件草稿 + 同名自检臂 → rules import
（plugins/ 逐文件绑定 sha256，手写文件会被入口归档）；术语/词形经 glossary 改库。
机制层（core/、submit.py）改动须走 README「治理」节的 L3 流程并在提交说明带
[arch]（commit-msg 钩子强制）。细节：根 README.md 与 submission-kit/README.md。""",
        formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", metavar="<子命令>")

    def common(sp):
        sp.add_argument("--json", action="store_true")
        sp.add_argument("--db", metavar="PATH", default=None)
        sp.add_argument("--tmp", metavar="DIR", default=None,
                        help="临时根目录（涉及删除/中间产物的操作必填，"
                             "如 start/check/pack/clean/rules import/rules delete；"
                             "未指定报错）："
                             "删除的文件移到其下 待删除/ 子树，中间过程"
                             "产物以它为根组织；相对路径相对当前工作"
                             "目录解析；**必须在工具包之外**（包内路径"
                             "直接 rc=2，如 --tmp ../tmp）")

    st = sub.add_parser("start", help="【流水线】从模板生成新条目骨架（起手）")
    st.add_argument("kind", choices=["blog", "regulation"])
    st.add_argument("--slug", required=True)
    st.add_argument("--entry-name", dest="entry_name",
                    help="条目目录名（默认＝slug）；法规线的 REG<n>- 前缀在这里给")
    st.add_argument("--root", required=True,
                    help="条目根目录（必填）：生成到 <root>/work/<kind>/<slug>")
    st.add_argument("--title", help="中文母版标题（写 content/zh）")
    st.add_argument("--excerpt", help="中文母版摘要（写 content/zh）")
    st.add_argument("--title-en", dest="title_en",
                    help="英文标题；保留 en 时必须与 --title 成对给出（M09）")
    st.add_argument("--excerpt-en", dest="excerpt_en",
                    help="英文摘要；保留 en 时必须与 --excerpt 成对给出（M09）")
    st.add_argument("--langs", default="zh",
                    help="保留的语言目录，逗号分隔（默认 zh；中文是母版语言）")
    st.add_argument("--date", help="blog 投稿日期，默认今天")
    st.add_argument("--published-at", dest="published_at")
    st.add_argument("--effective-at", dest="effective_at")
    common(st)
    st.add_argument("--force", action="store_true")

    c = sub.add_parser("check", help="【流水线】逐篇内容自检（默认只查指定条目 48 语）；"
                                     "全库须显式 --all 并确认")
    c.add_argument("path", nargs="?")
    common(c)
    c.add_argument("--quiet", action="store_true")
    c.add_argument("--all", dest="scan_all", action="store_true",
                   help="扫描投稿目录下全部条目（很耗时，134 篇约 20 分钟）；"
                        "需配合 --yes 或在交互终端确认。默认不加＝只查 <path> 指定的单篇")
    c.add_argument("--yes", action="store_true",
                   help="确认执行 --all 全库扫描（非交互脚本用；等价于交互确认）")
    c.add_argument("--body", action="store_true")
    c.add_argument("--no-parity", action="store_true")
    c.add_argument("--master", metavar="LANG")
    c.add_argument("--until", metavar="MARK")
    c.add_argument("--jobs", type=int, default=1)
    c.add_argument("--keep-extras", dest="keep_extras", action="store_true",
                   help="保留条目根级白名单（work/、preview_zh.html）外的文件"
                        "（审计用）；默认发现即删，删除清单走 stderr")

    g = sub.add_parser("glossary", help="【治理】glossary.db 唯一写入口：术语/词表/契约/词族/登记")
    g.add_argument("action", choices=["list", "get", "add", "update",
                                      "delete", "audit", "export", "import",
                                      "diff", "resolve", "scan",
                                      "migrate", "lexicon", "term",
                                      "family-import", "family-recheck",
                                      "family-trim", "pair-open"])
    g.add_argument("cid", nargs="?")
    g.add_argument("file", nargs="?")
    common(g)
    g.add_argument("--section", choices=list(db.SECTIONS), default="body")
    g.add_argument("--lang")
    g.add_argument("--payload")
    g.add_argument("--payload-file", dest="payload_file", metavar="JSON_FILE")
    g.add_argument("--base-revision", type=int, default=None)
    g.add_argument("--term", dest="term", default=None)
    g.add_argument("--new", dest="new", default=None)
    g.add_argument("--face", default="work")
    g.add_argument("--roots", default=None,
                   help="投稿目录（逗号分隔，相对项目根或缺省绝对路径）；"
                        "缺省按布局探测 submission/{blogs,regulations}")
    g.add_argument("--root", default=None,
                   help="项目根（audit 用）；缺省用工作区根")
    g.add_argument("--since", dest="since_revision", type=int, default=1)
    g.add_argument("--against", default=None)
    g.add_argument("--out")
    g.add_argument("--dry-run", action="store_true")
    g.add_argument("--force", action="store_true")
    g.add_argument("--ours", action="store_true")
    g.add_argument("--theirs", action="store_true")
    # 受控词表（lexicons 表）：list / add / remove，数据一律进库
    g.add_argument("--id", dest="lex_id", default=None,
                   help="词表 id：%s" % ", ".join(db.LEXICON_IDS))
    g.add_argument("--scope", default="global", choices=db.LEXICON_SCOPES)
    g.add_argument("--key", default="", help="global=语向；article=篇目 key")
    g.add_argument("--value", default="", help="词形 / 语向码 / ASCII 形")
    g.add_argument("--target", default="", help="正形（neighbor / latin-ascii）")
    g.add_argument("--remove", action="store_true", help="删除指定词表行")
    g.add_argument("--add-variant", action="append", default=[],
                   metavar="词形", help="term-zh：登记该语向的合法变体（可重复）")
    g.add_argument("--add-forbidden", action="append", default=[],
                   metavar="词形",
                   help="term-zh：登记该语向的已知错译（须有语料证据，可重复）")
    g.add_argument("--drop-variant", action="append", default=[], metavar="词形")
    g.add_argument("--drop-forbidden", action="append", default=[], metavar="词形")

    pl = sub.add_parser("plugin", help="【治理】插件启停、元数据同步（verify/sync）、加载体检（report）")
    pl.add_argument("action", choices=["list", "verify", "enable",
                                       "disable", "report"])
    pl.add_argument("pid", nargs="?")
    common(pl)

    r = sub.add_parser(
        "rules",
        help="【治理】规则一览与受控变更：list / diff / adopt / import / delete")
    common(r)
    r.add_argument("action", nargs="?", default="list",
                   choices=["list", "diff", "adopt", "import", "delete"])
    r.add_argument("rule_id", nargs="?",
                   help="delete：规则号，如 P75")
    r.add_argument("--plugin", metavar="PATH",
                   help="import：插件草稿路径（必须在工具包之外的临时目录）")
    r.add_argument("--selftest", metavar="PATH",
                   help="import：自检臂草稿路径（必须与插件同名、成对导入）")
    r.add_argument("--force", action="store_true",
                   help="import：允许覆盖同名插件或迁移规则归属")
    r.add_argument("--yes", action="store_true",
                   help="import / delete / adopt：确认写盘")
    r.add_argument("--verbose", action="store_true")

    d = sub.add_parser("doctor", help="【治理】库/插件/契约三方一致性体检（改动后的必跑项）")
    d.add_argument("--root", default=None,
                   help="项目根（旧名扫描 + 契约孤儿锚/锚过宽检查用）；"
                        "显式给到含 submission/ 的目录才启用母版相关检查，"
                        "缺省用工具包目录")
    d.add_argument("--fix-longpaths", action="store_true", dest="fix_longpaths",
                   help="Windows：把 LongPathsEnabled 设为 1（需管理员）；"
                        "Linux/macOS 无需此开关")
    common(d)
    h = sub.add_parser("hygiene", help="【运维】目录白名单报告（违规由每个入口自动归档）")
    common(h)
    cl = sub.add_parser("clean", help="【运维】清理名单外文件（--apply --confirm 才执行，先移待删除）")
    common(cl)
    cl.add_argument("--apply", action="store_true")
    cl.add_argument("--confirm", action="store_true")
    cl.add_argument("--dry-run", action="store_true")

    sf = sub.add_parser("selftest", help="【运维】自检臂：178 插件臂（1:1）+ 工具臂；--kit 连工具臂")
    sf.add_argument("--only", default="", help="只跑指定插件名，逗号分隔")
    sf.add_argument("--kit", action="store_true",
                    help="额外跑工具级自检臂（selftest/_*.py：契约健康等）")
    common(sf)

    pv = sub.add_parser("preview",
                        help="【流水线】从 zh 母版生成审核预览页 preview_zh.html")
    pv.add_argument("path", help="条目根目录（含 work/）、work 目录或其下任意层级")
    pv.add_argument("--out", default=None,
                    help="输出文件（默认条目根 preview_zh.html）")
    common(pv)

    pk = sub.add_parser("pack", help="【流水线】双包打包（投稿包 + 工具包）到 <投稿目录>/dist/")
    pk.add_argument("--root", required=True,
                    help="投稿目录（必填）：扫描 <root>/{blogs,regulations}，"
                         "产物写入 <root>/dist/")
    common(pk)
    pk.add_argument("--only", choices=["blog", "regulation"], default=None)
    pk.add_argument("--slug", action="append", default=None)
    pk.add_argument("--strict", action="store_true")
    pk.add_argument("--out", default=None, help="投稿包 zip 文件名（不是目录）")
    pk.add_argument("--kit-only", action="store_true", dest="kit_only")
    pk.add_argument("--incremental", action="store_true")
    pk.add_argument("--force", action="store_true")

    v = sub.add_parser("version", help="【治理】策略版本（policy/schema/契约/词表/插件计数）")
    tl = sub.add_parser(
        "tools", help="【治理】维护者工具索引与运行入口：tools [名字] [参数...]")
    tl.add_argument("--json", action="store_true", help="机器可读输出")
    hk = sub.add_parser(
        "hooks", help="【治理】git 钩子安装（commit-msg 强制 [arch]）")
    hk.add_argument("action", choices=["install"], help="install：安装 commit-msg 钩子")
    it = sub.add_parser(
        "integrity", help="【治理】完整性自检：机制层篡改发现 + 守卫臂 + 还原指引")
    it.add_argument("--tmp", metavar="DIR", default=None,
                    help="守卫臂的临时根目录；缺省为工具包同级的 tmp/ "
                         "（即 <工具包>/../tmp，按工具包位置推出，不看 cwd）")
    it.add_argument("--restore", action="store_true",
                    help="先用 data/sealed.zip 覆盖机制层，再跑五项检查")
    common(v)
    return p


class _Tee(object):
    """把写到终端的内容同时记进内存；只代理，不改变任何输出语义。"""

    def __init__(self, stream, buf):
        self._stream = stream
        self._buf = buf

    def write(self, s):
        self._buf.write(s)
        return self._stream.write(s)

    def writelines(self, lines):
        for s in lines:
            self.write(s)

    def flush(self):
        try:
            self._stream.flush()
        except Exception:
            pass

    def __getattr__(self, name):
        return getattr(self._stream, name)


class _RunSink(object):
    """一次命令的日志与 JSON 存档：给了 --tmp 就落到 <tmp>/{logs,json}/。

    只做归档，不改变 stdout/stderr 的可见行为：`--json` 的 stdout 仍是纯
    JSON（提示写 stderr），非 JSON 命令的报告另存 .out。落盘失败静默降级，
    绝不因归档问题让检查失败。
    """

    def __init__(self, tmp, cmd, want_json):
        self.tmp = _tmp_root.resolve_tmp(tmp)
        self.cmd = cmd or "cmd"
        self.want_json = bool(want_json)
        self.out = io.StringIO()
        self.err = io.StringIO()
        self._old = None

    def __enter__(self):
        if self.tmp:
            self._old = (sys.stdout, sys.stderr)
            sys.stdout = _Tee(sys.stdout, self.out)
            sys.stderr = _Tee(sys.stderr, self.err)
        return self

    def __exit__(self, *_exc):
        if self._old:
            sys.stdout, sys.stderr = self._old
        return False

    @staticmethod
    def _unique(path):
        if not os.path.exists(path):
            return path
        stem, ext = os.path.splitext(path)
        i = 2
        while os.path.exists("%s-%d%s" % (stem, i, ext)):
            i += 1
        return "%s-%d%s" % (stem, i, ext)

    def flush(self, rc=0):
        if not self.tmp:
            return
        try:
            stamp = time.strftime("%Y%m%d-%H%M%S")
            logdir = os.path.join(self.tmp, "logs")
            jsondir = os.path.join(self.tmp, "json")
            os.makedirs(logdir, exist_ok=True)
            os.makedirs(jsondir, exist_ok=True)
            out, err = self.out.getvalue(), self.err.getvalue()
            saved = []
            logp = self._unique(os.path.join(
                logdir, "%s-%s.log" % (self.cmd, stamp)))
            with open(logp, "w", encoding="utf-8", newline="\n") as fh:
                fh.write("# cmd=%s rc=%s at=%s\n"
                         % (self.cmd, rc, time.strftime("%Y-%m-%d %H:%M:%S")))
                fh.write(err)
            saved.append(("日志", logp))
            if self.want_json:
                try:
                    json.loads(out)
                except ValueError:
                    pass
                else:
                    jp = self._unique(os.path.join(
                        jsondir, "%s-%s.json" % (self.cmd, stamp)))
                    with open(jp, "w", encoding="utf-8", newline="\n") as fh:
                        fh.write(out)
                    saved.append(("JSON", jp))
            else:
                op = self._unique(os.path.join(
                    logdir, "%s-%s.out" % (self.cmd, stamp)))
                with open(op, "w", encoding="utf-8", newline="\n") as fh:
                    fh.write(out)
                saved.append(("输出", op))
            sys.stderr.write("[存档] %s\n" % " ｜ ".join(
                "%s %s" % (k, _rel(p)) for k, p in saved))
        except OSError:
            pass


def main(argv):
    # 入口自愈：编写者模式下立刻复原——封签文件被改/被删从 sealed.zip 还原，
    # 清单外新增归档到 <tmp>/待删除/；维护者（持私钥）跳过，改动留到他重签。
    # 封签清单验签失败则拒绝运行。放在最前：--help、透传工具、报错路径都先过
    # 这一关。
    try:
        from core import selfheal as _sh
        _rep = _sh.heal(KIT)
        if _rep.get("fatal"):
            return _die("[自愈] %s\n"
                        "  工具包封签清单不可信，请从原始分发包重新解压后使用。"
                        % _rep["fatal"])
        if _rep.get("restored") or _rep.get("archived"):
            sys.stderr.write(
                "[自愈] 还原 %d 个、归档 %d 个（编写者模式；只有维护者可改）\n"
                % (len(_rep["restored"]), len(_rep["archived"])))
    except Exception:
        pass
    args_in = argv[1:]
    # --tmp 边界（v469）：临时根不许落在工具包内——包内不得有临时目录（H01），
    # 而且 pack 会把包内内容打进分发包。这里放在**最早**：argparse 之前，
    # 透传工具（glossary family-* / tools <名字>）同样先过这一关，否则它们
    # 各自在深处抛 Traceback 而不是干净 rc=2。判定实现在 core.tmp_root。
    _raw_tmp = _tmp_root.argv_tmp(args_in)
    if _raw_tmp:
        try:
            _tmp_root.require_tmp(_raw_tmp)
        except _tmp_root.TmpInsideKit as exc:
            return _die(str(exc))
    # 允许省略 check 子命令（第一个参数是路径），但所有正式调用都写 check
    if args_in and not args_in[0].startswith("-") \
            and args_in[0] not in SUBCMDS:
        args_in = ["check"] + args_in
    # 词族运营工具收编（2026-11-16 架构梳理）：tools/family_* 与 pair_open
    # 的**写库**一律经本入口执行——glossary.db 的合法写入口只有投稿工具与
    # core/db.py 的写函数（铁律；selftest/_db_write_surface.py 钉死：除
    # core/db.py、core/schema.py 外任何文件出现裸 SQL 写即 FAIL）。在
    # argparse 之前短路转发，参数从 action 名之后原样透传给对应工具的
    # main(argv)——工具参数演进不需要改本文件；--dry-run 等安全开关仍由
    # 各工具自身提供。--help 细节请直接看 tools/<工具>.py --help。
    _passthrough = {"family-import": "family_import",
                    "family-recheck": "family_recheck",
                    "family-trim": "family_trim",
                    "pair-open": "pair_open"}
    if (len(args_in) >= 2 and args_in[0] == "glossary"
            and args_in[1] in _passthrough):
        from importlib import import_module
        mod = import_module("tools.%s" % _passthrough[args_in[1]])
        passthrough, tool_tmp = _strip_entry_tmp(args_in[2:])
        sink = _RunSink(tool_tmp, "glossary-" + args_in[1], False)
        rc = 2
        with sink:
            rc = mod.main(passthrough)
        sink.flush(rc)
        return 0 if rc is None else int(rc)
    # 工具唯一入口（v468）：`python submit.py tools <名字> [参数...]`。
    # tools/*.py 直接运行会被 `require_entry` 拒绝（退出码 2）；本入口负责
    # 设环境标记、把剩余参数重排进 sys.argv（各工具 main() 用 argparse 默认
    # 读 sys.argv），返回码原样传出。无名字时仍是索引列表。
    if (len(args_in) >= 2 and args_in[0] == "tools"
            and not args_in[1].startswith("-")):
        from importlib import import_module
        from tools import CATALOG, ENTRY_ENV
        name = args_in[1]
        if name.endswith(".py"):
            name = name[:-3]
        if (name + ".py") not in CATALOG:
            sys.stderr.write("未知工具：%s（python submit.py tools 查看索引）\n"
                             % name)
            return 2
        os.environ[ENTRY_ENV] = "submit.py"
        mod = import_module("tools.%s" % name)
        passthrough, tool_tmp = _strip_entry_tmp(args_in[2:])
        sink = _RunSink(tool_tmp, "tools-" + name, False)
        old_argv = sys.argv
        sys.argv = [name + ".py"] + passthrough
        rc = 2
        try:
            with sink:
                rc = mod.main()
        finally:
            sys.argv = old_argv
            sink.flush(rc)
        return 0 if rc is None else int(rc)
    parser = build_parser()
    try:
        args = parser.parse_args(args_in)
    except SystemExit as exc:
        # --help 是 SystemExit(0)，参数错误是 SystemExit(2)。早期一律返回 2，
        # 导致 `submit.py <cmd> --help` 明明打印了帮助却以失败码退出（v468 修）。
        return int(exc.code or 0)
    if not args.cmd:
        parser.print_help(sys.stderr)
        return 2
    # --tmp 无环境变量、无默认值：未指定时删除行为为直接删除；
    # 库层经 argv 扫描取得同一显式值（删除点均在主进程，无需广播）。
    handlers = {"start": cmd_start, "check": cmd_check,
                "glossary": cmd_glossary,
                "plugin": cmd_plugin, "rules": cmd_rules,
                "doctor": cmd_doctor, "hygiene": cmd_hygiene,
                "preview": cmd_preview,
                "clean": cmd_clean, "pack": cmd_pack,
                "selftest": cmd_selftest,
                "version": cmd_version, "integrity": cmd_integrity,
                "tools": cmd_tools, "hooks": cmd_hooks,
        }
    # 传了 --tmp 就把本次的日志与 JSON 各存一份到 <tmp>/{logs,json}/；
    # stdout/stderr 的可见行为不变（--json 仍是纯 JSON + stderr 诊断）。
    try:
        sink = _RunSink(getattr(args, "tmp", None), args.cmd,
                        getattr(args, "json", False))
    except _tmp_root.TmpInsideKit as exc:      # 双保险：上面已拦过一次
        return _die(str(exc))
    rc = 2
    try:
        with sink:
            # 必装依赖门禁：PyYAML 缺失时整条命令退出 rc=2 并给安装命令。
            # 只豁免 version（纯读常量），其余命令一律不放行降级路径。
            if args.cmd != "version":
                deps.require("submit.py %s" % args.cmd)
            try:
                rc = handlers[args.cmd](args)
                return rc
            except (loader.PluginError, db.PolicyError, RuntimeError,
                    OSError) as exc:
                rc = _die("C01 %s" % exc)
                return rc
            except db.ConflictError as exc:
                rc = _die("并发冲突：%s" % exc, 3)
                return rc
    finally:
        sink.flush(rc)


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        # v2.14：stderr 同口径。Windows 下 stderr 走管道默认 GBK，父进程按
        # utf-8 解码会把「[清场]」等诊断损坏成替换字（v4 电池 P10 实测假红）；
        # 诊断流与 stdout 同编码，跨平台管道读取才稳定。
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass
    sys.exit(main(sys.argv))
