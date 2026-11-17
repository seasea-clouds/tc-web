# -*- coding: utf-8 -*-
"""自检：同一条判据不得由 core 与插件各报一遍（工具级臂）。

背景（2026-11-15 实测）：`core/checker.py` 里留着 S01/S05/S06/F10 的判定，
插件层又各有实现。一个带「坏字节 mdx + 两个垃圾文件 + 一个顶层裸文件」的
探针包，四条规则各被报了**两遍**——S05 4 条、S01 2 条、F10 2 条。
重复上报不只是噪音：`--json` 消费方按条数统计缺陷时会虚高，而人读报告会
以为有两个不同的问题。

三层断言：
  ① 探针包 A（有坏字节 + 垃圾文件 + 顶层裸文件）：S05=2、F10=1、S01=1；
  ② 探针包 B（零条目，只有一个顶层裸文件）：S01=2（裸文件 + 无结构，两个面）；
  ③ 两个包里都不得出现完全相同的 `(rule, loc, detail)`。

为什么用子进程跑真 CLI 而不是直接调 checker：这条臂要钉的是「CLI → checker →
插件层」整条链上只有一份判据，直接调内部函数会绕开 CLI 的路径归一化
（`resolve_check_root` 会把条目根折到 work/），探针就测不到真实入口。
"""
import json
import os
import subprocess
import sys
import tempfile

_HERE = os.path.dirname(os.path.abspath(__file__))
_KIT = os.path.dirname(_HERE)
SUBMIT = os.path.join(_KIT, "submit.py")

MDX = """---
title: "Demo"
slug: "%s"
excerpt: "Demo excerpt."
---

Body paragraph.
"""

META = {
    "kind": "blog",
    "slug": "demo",
    "title": "Demo",
    "excerpt": "Demo excerpt.",
    "locales": ["en"],
}


def _argv_tmp():
    for i, a in enumerate(sys.argv):
        if a == "--tmp" and i + 1 < len(sys.argv):
            return sys.argv[i + 1]
        if a.startswith("--tmp="):
            return a.split("=", 1)[1]
    return None


def _write(root, rel, data):
    p = os.path.join(root, rel.replace("/", os.sep))
    os.makedirs(os.path.dirname(p), exist_ok=True)
    mode = "wb" if isinstance(data, bytes) else "w"
    kw = {} if isinstance(data, bytes) else {"encoding": "utf-8", "newline": "\n"}
    with open(p, mode, **kw) as fh:
        fh.write(data)


def build_a(root):
    """坏字节 mdx + 两个垃圾文件 + 一个顶层裸文件。"""
    slug = "demo"
    meta = dict(META)
    meta["slug"] = slug
    _write(root, "work/blog/%s/submission.json" % slug,
           json.dumps(meta, ensure_ascii=False))
    body = (MDX % slug).encode("utf-8")
    _write(root, "work/blog/%s/content/en/%s.mdx" % (slug, slug),
           body[:20] + b"\xff\xfe" + body[20:])
    _write(root, "work/.DS_Store", b"x")
    _write(root, "work/__MACOSX/._a.mdx", b"x")
    _write(root, "work/stray.txt", b"x")


def build_b(root):
    """零条目：只有顶层裸文件。"""
    _write(root, "work/stray.txt", b"x")


def run_check(pkg, tmp):
    out = subprocess.run(
        [sys.executable, "-u", SUBMIT, "check", pkg, "--json", "--tmp", tmp],
        capture_output=True, text=True, encoding="utf-8")
    txt = out.stdout
    i = txt.find("{")
    if i < 0:
        raise RuntimeError("check 无 JSON 输出：%s" % (out.stderr or txt)[-300:])
    return json.loads(txt[i:]).get("findings") or []


def count(findings, rule):
    return sum(1 for f in findings if f.get("rule") == rule)


def dups(findings):
    seen = {}
    for f in findings:
        k = (f.get("rule"), f.get("lang") or "", f.get("detail"))
        seen[k] = seen.get(k, 0) + 1
    return {k: n for k, n in seen.items() if n > 1}


def main():
    tmp = _argv_tmp()
    if not tmp:
        print("需要 --tmp <目录>：本臂要造探针包，不允许落到工具包内")
        return 2
    base = os.path.join(os.path.abspath(tmp), "no-dup")
    fails = 0

    pa = os.path.join(base, "a")
    build_a(pa)
    fa = run_check(pa, os.path.join(base, "a-tmp"))
    checks = [
        ("①A S05 每文件一条（2）", count(fa, "S05") == 2, count(fa, "S05")),
        ("①A F10 只报一次（1）", count(fa, "F10") == 1, count(fa, "F10")),
        ("①A S01 只报一次（1）", count(fa, "S01") == 1, count(fa, "S01")),
        ("③A 无完全重复 finding", not dups(fa), dups(fa)),
    ]

    pb = os.path.join(base, "b")
    build_b(pb)
    fb = run_check(pb, os.path.join(base, "b-tmp"))
    checks.append(("②B S01 两个面各一条（2）", count(fb, "S01") == 2,
                   count(fb, "S01")))
    checks.append(("③B 无完全重复 finding", not dups(fb), dups(fb)))

    for label, good, got in checks:
        print("  %-4s %-26s %s" % ("OK" if good else "FAIL", label, got))
        fails += 0 if good else 1
    print("core/插件双报：6 断言，FAIL %d" % fails)
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
