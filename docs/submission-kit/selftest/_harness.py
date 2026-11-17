# -*- coding: utf-8 -*-
"""自检台（selftest 专用，不是插件）。

一个插件文件对应一个同名自检文件；自检只做一件事：
在官方尺副本上注入该规则的典型缺陷 → 断言报红 → 还原 → 断言转绿。
这样「插件写错了」和「内容写错了」永远不会混为一谈。

约定：
  * 不在 core/ 下，不参与 check，不被 loader 装载（文件名以 _ 开头）。
  * 只读官方尺 template/{blog,regulation}，绝不读 submission/ 成品。
  * 副本落在 <tmp>/selftest-<pid>-<n>/，跑完归档（删除即移动）。
"""
from __future__ import annotations

import os
import shutil
import sys
import time
from pathlib import Path

KIT = Path(__file__).resolve().parents[1]
if str(KIT) not in sys.path:
    sys.path.insert(0, str(KIT))

from core import checker                                    # noqa: E402
from core import deps as _deps                              # noqa: E402
from core.model import Context                              # noqa: E402

FIXTURES = {"blog": KIT / "template" / "blog",
            "regulation": KIT / "template" / "regulation"}
_SEQ = [0]


def tmp_root():
    argv = sys.argv[1:]
    for i, a in enumerate(argv):
        if a == "--tmp" and i + 1 < len(argv):
            return Path(argv[i + 1])
        if a.startswith("--tmp="):
            return Path(a.split("=", 1)[1])
    # 缺省指仓库根 tmp/（不是 CWD/tmp）：避免在工具包内生成临时目录（v466）
    return KIT.parent / "tmp"


def article_root(work, kind="blog"):
    """返回 <work>/<kind>/<slug> 路径；官方尺每类恰一条。"""
    base = Path(work) / kind
    subs = [p for p in sorted(base.iterdir()) if p.is_dir()]
    if not subs:
        raise RuntimeError("官方尺缺 %s/<slug>/：%s" % (kind, base))
    return subs[0]


def lang_file(work, lang, kind="blog"):
    """返回 <work>/<kind>/<slug>/content/<lang>/<slug>.mdx。"""
    art = article_root(work, kind)
    return next((art / "content" / lang).glob("*.mdx"))


def patch_fm(path, key, value):
    """把 frontmatter 里某一行改成 `key: "<value>"`（自检注入专用）。"""
    import re as _re
    s = Path(path).read_text(encoding="utf-8")
    new, n = _re.subn(r"(?m)^%s:.*$" % _re.escape(key),
                      '%s: "%s"' % (key, value.replace('"', '\\"')), s, count=1)
    if not n:
        raise RuntimeError("frontmatter 里找不到 %s：%s" % (key, path))
    Path(path).write_text(new, encoding="utf-8", newline="\n")


def patch_fm_raw(path, key, raw):
    """把 frontmatter 某行改成 `key: <raw>`（不加引号，用于注入 YAML 语法缺陷）。"""
    import re as _re
    s = Path(path).read_text(encoding="utf-8")
    new, n = _re.subn(r"(?m)^%s:.*$" % _re.escape(key),
                      "%s: %s" % (key, raw), s, count=1)
    if not n:
        raise RuntimeError("frontmatter 里找不到 %s：%s" % (key, path))
    Path(path).write_text(new, encoding="utf-8", newline="\n")


def fm_value(path, key):
    import re as _re
    s = Path(path).read_text(encoding="utf-8")
    m = _re.search(r"(?m)^%s:\s*(.*)$" % _re.escape(key), s)
    return m.group(1).strip().strip('"') if m else None


def add_fm_line(path, line):
    """在 frontmatter 收尾 `---` 之前插一行。"""
    s = Path(path).read_text(encoding="utf-8")
    i = s.find("\n---", 3)
    if i < 0:
        raise RuntimeError("frontmatter 未闭合：%s" % path)
    Path(path).write_text(s[:i + 1] + line + "\n" + s[i + 1:],
                          encoding="utf-8", newline="\n")


def drop_fm_close(path):
    """删掉 frontmatter 收尾 `---`，制造解析失败（F01）。"""
    s = Path(path).read_text(encoding="utf-8")
    i = s.find("\n---", 3)
    if i < 0:
        raise RuntimeError("frontmatter 未闭合：%s" % path)
    j = s.find("\n", i + 1)
    Path(path).write_text(s[:i] + (s[j:] if j > 0 else ""),
                          encoding="utf-8", newline="\n")


def body_of(path):
    import re as _re
    s = Path(path).read_text(encoding="utf-8")
    m = _re.match(r"\A---\n.*?\n---\n+", s, _re.S)
    return s[m.end():] if m else s


def write_body(path, body):
    import re as _re
    s = Path(path).read_text(encoding="utf-8")
    m = _re.match(r"\A---\n.*?\n---\n+", s, _re.S)
    Path(path).write_text(s[:m.end()] + body, encoding="utf-8", newline="\n")


def copy_fm_block(dst_path, key, src_path):
    """把 src 的 frontmatter 块 `key:` 整段复制到 dst（含列表型 references）。"""
    import re as _re
    pat = r"(?ms)^%s:.*?(?=^[A-Za-z_]+:|\Z)" % _re.escape(key)
    src = Path(src_path).read_text(encoding="utf-8")
    m = _re.search(pat, src)
    if not m:
        raise RuntimeError("源文件没有 %s 块：%s" % (key, src_path))
    block = m.group(0).rstrip() + "\n"
    dst = Path(dst_path).read_text(encoding="utf-8")
    if not _re.search(pat, dst):
        raise RuntimeError("目标文件没有 %s 块：%s" % (key, dst_path))
    Path(dst_path).write_text(_re.sub(pat, block, dst, count=1),
                              encoding="utf-8", newline="\n")


DELETE = object()


def sub_json(work, kind="blog"):
    """返回条目根的 submission.json 路径。"""
    return article_root(work, kind) / "submission.json"


def patch_json(work, key, value, kind="blog"):
    """改/删 submission.json 的一个键；value 传 DELETE 表示删除该键。"""
    import json
    p = sub_json(work, kind)
    d = json.loads(p.read_text(encoding="utf-8"))
    if value is DELETE:
        d.pop(key, None)
    else:
        d[key] = value
    p.write_text(json.dumps(d, ensure_ascii=False, indent=2) + "\n",
                 encoding="utf-8", newline="\n")


# ---------------- 注入射程校验（COVERAGE）----------------
#
# 背景（实测三次踩坑）：自检写好了、注入也写了，但注入点落在判据根本
# 不看的地方（L03 注入 fr 而 SCRIPT_TESTS 只收非拉丁语向；M07 删 ti 而
# 48 语清单里没有 ti；F09 注入坏 YAML 却先被 F01 拦下），臂静默失效。
# 光靠「记得先确认射程」不成立，所以在代码里固定成四条：
#   ① 注入必须真的改动字节（注入点不存在 = 无效臂）；
#   ② 改动必须落在插件 COVERAGE 声明的 zones / langs 之内；
#   ③ 注入后必须报红，未报红时打印「实际报了哪些规则」帮助定位；
#   ④ 还原后必须归零（等价于基线本身干净）。
# 任一条不满足即 FAIL，不允许沉默通过。

_COV = {}


def plugin_meta():
    """静态扫描 plugins/，返回 {rule: (stem, COVERAGE)}；不执行插件。"""
    if _COV:
        return _COV
    import ast as _ast
    for f in sorted((KIT / "plugins").glob("*.py")):
        if f.name.startswith("_"):
            continue
        try:
            tree = _ast.parse(f.read_text(encoding="utf-8"))
        except SyntaxError:
            continue
        rule, cov = None, None
        for n in tree.body:
            if not isinstance(n, _ast.Assign):
                continue
            tgt = getattr(n.targets[0], "id", "")
            if tgt == "RULE" and isinstance(n.value, _ast.Constant):
                rule = n.value.value
            elif tgt == "COVERAGE":
                try:
                    cov = _ast.literal_eval(n.value)
                except Exception:
                    cov = None
        if rule:
            _COV[rule] = (f.stem, cov)
    return _COV


def _fm_body(text):
    import re as _re
    m = _re.match(r"\A---\r?\n.*?\r?\n---\r?\n", text, _re.S)
    if not m:
        return text, ""
    return text[:m.end()], text[m.end():]


def classify(snap, work):
    """对比快照，返回 (changed, zones, langs)。

    * 新增/删除文件 → package（结构级改动；图片目录记 images）；
    * 原地修改 mdx → 按 frontmatter / body 分别归位；
    * 原地修改 submission.json → metadata；图片字节 → images。
    """
    zones, langs, changed = set(), set(), set()
    now = {q: q.read_bytes() for q in work.rglob("*") if q.is_file()}
    for q in set(now) - set(snap):
        changed.add(q)
        zones.add("images" if "images" in q.parts else "package")
    for q in set(snap) - set(now):
        changed.add(q)
        zones.add("images" if "images" in q.parts else "package")
        parts = q.parts
        if "content" in parts:
            i = parts.index("content")
            if i + 1 < len(parts):
                langs.add(parts[i + 1])
    for q in set(now) & set(snap):
        if now[q] == snap[q]:
            continue
        changed.add(q)
        parts = q.parts
        if "images" in parts:
            zones.add("images")
            continue
        if q.name == "submission.json":
            zones.add("metadata")
            continue
        if "content" in parts:
            i = parts.index("content")
            if i + 1 < len(parts):
                langs.add(parts[i + 1])
            bf, bb = _fm_body(snap[q].decode("utf-8", "replace"))
            af, ab = _fm_body(now[q].decode("utf-8", "replace"))
            if bf != af:
                zones.add("frontmatter")
            if bb != ab:
                zones.add("body")
            continue
        zones.add("package")
    if not zones and changed:
        zones.add("package")
    return changed, zones, langs


def scope_error(rule, zones, langs):
    """注入点是否落在插件声明的射程内；返回错误串或 None。"""
    meta = plugin_meta().get(rule)
    if not meta:
        return None                     # 旧形态规则（p00–p97），无 COVERAGE
    stem, cov = meta
    if not isinstance(cov, dict):
        return ("插件 %s 未声明 COVERAGE（射程）：每个插件必须写 "
                "COVERAGE = {\"langs\": ..., \"zones\": [...]}，"
                "自检才能校验注入点是否在射程内" % stem)
    zones_ok = cov.get("zones") or []
    if "any" not in zones_ok:
        bad = sorted(zones - set(zones_ok))
        if bad:
            return ("注入落在射程外：改动层级 %s，插件声明 zones=%s"
                    % (bad, zones_ok))
    allowed = cov.get("langs", "all")
    pool = None
    if isinstance(allowed, str):
        if allowed == "scripted":
            from core.consts import SCRIPT_TESTS
            pool = set(SCRIPT_TESTS)
        elif allowed in ("all", "any"):
            pool = None
        else:
            pool = {allowed}
    else:
        pool = set(allowed)
    if pool is not None:
        bad = sorted(langs - pool)
        if bad:
            return ("注入落在射程外：改动语向 %s，插件声明 langs=%s"
                    % (bad, allowed if isinstance(allowed, str) else sorted(pool)))
    return None


def _findings(work, glossary=None):
    ctx = Context(kit_dir=str(KIT), db_path=str(KIT / "data" / "glossary.db"),
                  glossary=glossary)
    return checker.check(str(work), ctx=ctx)


def _rules_hit(work, rule, glossary=None):
    return [f for f in _findings(work, glossary) if f.rule == rule]


def _copy_fixture(kind, attempts=3):
    """复制样板包；同名残留与瞬时占用不再抛死（批量 218 臂里一次抖动会连累整轮）。

    目录名带 pid+序号；上一轮异常退出可能留下同名目录，`dirs_exist_ok=True`
    覆盖重建而不是 FileExistsError。Windows 下杀毒/索引服务偶发锁文件，
    重试三次（每次间隔 0.2s）仍失败才抛。
    """
    _SEQ[0] += 1
    dest = tmp_root() / ("selftest-%d-%d" % (os.getpid(), _SEQ[0]))
    src = FIXTURES[kind]
    work = dest / "work"
    last = None
    for i in range(attempts):
        try:
            shutil.copytree(src, work / kind, dirs_exist_ok=True)
            # 官方尺自带模板占位元数据（Sample Decree / example/...），这是给
            # 作者的显眼提示，不能改。但自检夹具是副本，必须把它清成中性值：
            # F11 的基线才干净，注入臂也才能靠改回占位形状来报红。
            for p in (work / kind).rglob("*.mdx"):
                raw = p.read_bytes()
                try:
                    s = raw.decode("utf-8")
                except UnicodeDecodeError:
                    continue
                s2 = (s.replace("Sample Decree No. 1", "Test Decree No. 1")
                        .replace("example/content_0000001.html",
                                 "notice/content_0000001.html"))
                if s2 != s:
                    p.write_bytes(s2.encode("utf-8"))
            # 题录也要同步改：R23 要求 submission.json 与逐语 frontmatter 的
            # docNumber/sourceUrl 逐字一致，只改 mdx 会把基线打成 96 条 R23。
            for p in (work / kind).rglob("submission.json"):
                raw = p.read_bytes()
                try:
                    s = raw.decode("utf-8")
                except UnicodeDecodeError:
                    continue
                s2 = (s.replace("Sample Decree No. 1", "Test Decree No. 1")
                        .replace("example/content_0000001.html",
                                 "notice/content_0000001.html"))
                if s2 != s:
                    p.write_bytes(s2.encode("utf-8"))
            return dest, work
        except OSError as exc:          # 占用 / 半途被改 / 权限抖动
            last = exc
            time.sleep(0.2 * (i + 1))
    raise last


def _snapshot(work):
    snap = {}
    for p in work.rglob("*"):
        if p.is_file():
            snap[p] = p.read_bytes()
    return snap


def _restore(work, snap):
    for p in list(work.rglob("*")):
        if p.is_file() and p not in snap:
            p.unlink()
    for p, data in snap.items():
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(data)


def _archive(dest):
    try:
        from core import tmp_root as _tr
        _tr.archive_delete(str(dest), label="selftest")
    except Exception:
        shutil.rmtree(dest, ignore_errors=True)


def main(cases, quiet=False):
    """cases: [(rule, mutate_fn, 说明)]；返回进程退出码。

    每条臂的判定条件（全部满足才算 OK）：
      ① 注入真的改动了字节；② 改动落在 COVERAGE 射程内；
      ③ 注入后该规则报红（>=1）；④ 还原后该规则归零（基线本身干净）。

    例外（第 5 项 mode="green"）：判据在官方尺上**本来就红**（如 W01 英文
    正文偏短，官方尺 en 只有 80 词）。此时按「正向控制」判：基线必须已红、
    注入后必须转绿、还原后回到基线条数——臂既不会空转，也不会因「基线不干净」
    把正确的判据判成失败。
    """
    _deps.require("%s（自检）" % Path(sys.argv[0]).name)
    fails = 0
    total = 0
    for case in cases:
        rule, mutate, desc = case[0], case[1], case[2]
        total += 1
        # 第 4 项可显式指定官方尺类别（R 族默认 regulation，其余 blog）；
        # P62/P65 这类「编号属 P 族、语义属法规线」的判据必须显式传。
        kind = (case[3] if len(case) > 3
                else ("regulation" if rule.startswith("R") else "blog"))
        mode = case[4] if len(case) > 4 else "red"
        # 第 6 项可传隔离术语夹具（dict）：契约类判据的自检必须自带 spec——
        # 共享库 937 条契约按篇/语向绑定，官方尺上没有对应锚点，臂在共享库上
        # 既构造不出来、也不该为了自检去改线上契约。传 dict 即走
        # checker 的显式 spec 路径（_normalize_glossary 同一条归一化），
        # 不读 data/glossary.db，跑完无残留。
        gl = case[5] if len(case) > 5 else None
        why = []
        red, green, zones, langs = [], [], set(), set()
        changed, others = False, []
        dest = None
        try:
            dest, work = _copy_fixture(kind)
            snap = _snapshot(work)
            before = len(_rules_hit(work, rule, gl)) if mode == "green" else 0
            mutate(work)
            changed, zones, langs = classify(snap, work)
            red_all = _findings(work, gl)
            red = [f for f in red_all if f.rule == rule]
            others = sorted({f.rule for f in red_all} - {rule})
            _restore(work, snap)
            green = _rules_hit(work, rule, gl)
        except Exception as exc:                           # noqa: BLE001
            # 批量自检里一次读盘/复制异常不能只留一个「无原因的 FAIL」：
            # 把类型与消息带进诊断，下一轮才分得清是环境抖动还是判据问题。
            why.append("运行异常 %s: %s" % (type(exc).__name__, exc))
        finally:
            if dest is not None:
                _archive(dest)
        if not changed:
            why.append("注入未改动任何字节（注入点不存在）")
        sc = scope_error(rule, zones, langs) if not why else ""
        if sc:
            why.append(sc)
        if mode == "green":
            if not before:
                why.append("正向控制不成立：官方尺上该判据本来不红，"
                           "无法验证「注入后转绿」")
            if red:
                why.append("注入后仍未转绿（仍红 %d 条）" % len(red))
            if len(green) != before:
                why.append("还原后未回到基线条数（基线 %d / 还原 %d）"
                           % (before, len(green)))
        else:
            if not red:
                why.append("未报红" + ("；实际报的规则=%s" % ",".join(others[:6])
                                       if others else "；也没有别的规则报红"))
            if green:
                why.append("还原后未归零（基线本身已红 %d 条）" % len(green))
        ok = not why
        if not ok:
            fails += 1
        if not quiet:
            print("  %-4s %-3s %-30s 注入=%d 还原=%d  改=%s/%s  %s"
                  % ("OK" if ok else "FAIL", rule, desc[:30], len(red),
                     len(green), "+".join(sorted(zones)) or "-",
                     ",".join(sorted(langs)) or "-",
                     "" if ok else why[0]))
    print("%s：%d 臂，FAIL %d" % (Path(sys.argv[0]).name, total, fails))
    return 0 if fails == 0 else 1
