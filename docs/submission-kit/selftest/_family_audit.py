# -*- coding: utf-8 -*-
"""自检：词族召回体检（工具级臂，`selftest --kit` 才跑）。

为什么必须有这条臂：`tools/family_audit.py` 的召回值是**给语向定 mode 的唯一
依据**——它把「族够不够用」变成可测量的数。它算错（分子分母取反、证据集取错、
嵌套词形不去重）时不会有任何报错，只会让 `check` 格子的范围悄悄偏大或偏小，
而这种偏差要到很久以后才以误报的形式暴露。

三个断言（在假语料树上跑，不读 submission/）：
  ① 覆盖满 → 召回 1.0；
  ② 族缺写法（译文只有别的词）→ 召回 0；
  ③ 上位/下位嵌套（`报关单` = `customs declaration`，`申报` = `declaration`）
     → 母版只提「申报」而译文只写 `customs declaration` 时，`申报` 的召回
     必须按**互斥计数**算（不得因嵌套而虚高）。
"""
import io
import json
import os
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.dirname(HERE)

# 工具的唯一入口是 submit.py；本臂用子进程验工具行为，显式标记为“入口调用”
os.environ.setdefault("SUBMIT_KIT_ENTRY", "submit.py")
TOOL = os.path.join(KIT, "tools", "family_audit.py")

ZH_FULL = "# 测试\n\n增值税税率 13%。\n\n增值税发票要留档。\n\n增值税申报在次月完成。\n"
ZH_NEST = "# 测试\n\n申报义务在企业端。\n\n申报时限按月。\n\n申报材料留存。\n"


def _tmp_root():
    argv = sys.argv[1:]
    for i, a in enumerate(argv):
        if a == "--tmp" and i + 1 < len(argv):
            return argv[i + 1]
        if a.startswith("--tmp="):
            return a.split("=", 1)[1]
    # 缺省指仓库根 tmp/（不是 CWD/tmp）：避免在工具包内生成临时目录（v466）
    return os.path.join(os.path.dirname(KIT), "tmp")


def _pkg(root, name, zh, de=None, en=None):
    base = os.path.join(root, "submission", "blogs", name, "work", "blog",
                        name, "content")
    for lg, text in (("zh", zh), ("de", de), ("en", en)):
        if text is None:
            continue
        d = os.path.join(base, lg)
        os.makedirs(d, exist_ok=True)
        io.open(os.path.join(d, name + ".mdx"), "w",
                encoding="utf-8", newline="\n").write(text)


def _run(family, root, out):
    fam_p = os.path.join(root, "family.json")
    io.open(fam_p, "w", encoding="utf-8", newline="\n").write(
        json.dumps(family, ensure_ascii=False))
    rc = subprocess.run([sys.executable, "-u", TOOL, "--family", fam_p,
                         "--root", root, "--tsv", out],
                        capture_output=True, text=True, encoding="utf-8",
                        errors="replace")
    if rc.returncode != 0:
        raise RuntimeError("audit 失败：%s" % (rc.stdout or "")[-400:])
    rows = {}
    for i, line in enumerate(io.open(out, encoding="utf-8")):
        if not i:
            continue
        p = line.rstrip("\n").split("\t")
        rows[(p[0], p[1])] = float(p[7])
    return rows


def main():
    root = os.path.join(_tmp_root(), "family-audit-%d" % os.getpid())
    if os.path.isdir(root):
        shutil.rmtree(root)
    try:
        # ① 满覆盖 vs 缺写法：同一概念、同一母版，de 有两种表现
        _pkg(root, "T1", ZH_FULL, de="Die MwSt beträgt 13 %. MwSt-Rechnung. MwSt-Erklärung.")
        _pkg(root, "T2", ZH_FULL, de="Die Steuer beträgt 13 %. Beleg. Erklärung.")
        fam = {"增值税": {"de": {"forms": ["MwSt"], "mode": "check", "pair": ""}}}
        rows = _run(fam, root, os.path.join(root, "a.tsv"))
        full = rows.get(("增值税", "de"))
        # T1 覆盖满、T2 零命中 → 3 篇里 1 篇达标
        ok1 = full == 0.5        # T1 达标 / T2 缺写法 → 3 篇里 1 篇

        # ② 只留 T2（族缺写法）→ 召回 0
        fam2 = {"增值税": {"de": {"forms": ["Umsatzsteuer"], "mode": "check", "pair": ""}}}
        rows2 = _run(fam2, root, os.path.join(root, "b.tsv"))
        ok2 = rows2.get(("增值税", "de")) == 0.0

        # ③ 嵌套：母版只说「申报」，译文只说 customs declaration
        _pkg(root, "T3", ZH_NEST, en="The customs declaration is filed by the entity.")
        fam3 = {"申报": {"en": {"forms": ["declaration"], "mode": "check",
                                "pair": "报关单"}},
                "报关单": {"en": {"forms": ["customs declaration"], "mode": "check",
                                  "pair": "申报"}}}
        rows3 = _run(fam3, root, os.path.join(root, "c.tsv"))
        ok3 = rows3.get(("申报", "en")) == 0.0

        # ④ 跨概念同形：同一词形属于两个不同概念对 → 必须报（同对共享不算）
        fam4 = {"发票": {"de": {"forms": ["Rechnung"], "mode": "check", "pair": "合同"}},
                "合同": {"de": {"forms": ["Vertrag"], "mode": "check", "pair": "发票"}},
                "备案": {"de": {"forms": ["Rechnung"], "mode": "check",
                                "pair": "注册登记"}},
                "注册登记": {"de": {"forms": ["Registrierung"], "mode": "check",
                                    "pair": "备案"}}}
        p4 = os.path.join(root, "coll.json")
        io.open(p4, "w", encoding="utf-8", newline="\n").write(
            json.dumps(fam4, ensure_ascii=False))
        rc4 = subprocess.run([sys.executable, "-u", TOOL, "--collisions",
                              "--family", p4], capture_output=True, text=True,
                             encoding="utf-8", errors="replace")
        ok4 = rc4.returncode == 1 and "发票" in rc4.stdout and "备案" in rc4.stdout

        # ⑤ 证据篇目数必须在汇总里可见（v430）。v429 的 14 格小样本误判就是
        #   因为这个数只躺在 TSV 第 4 列，控制台看不出来。
        p5 = os.path.join(root, "fam5.json")
        io.open(p5, "w", encoding="utf-8", newline="\n").write(
            json.dumps({"增值税": {"de": {"forms": ["MwSt"], "mode": "check",
                                        "pair": ""}}}, ensure_ascii=False))
        rc5 = subprocess.run([sys.executable, "-u", TOOL, "--family", p5,
                              "--root", root], capture_output=True, text=True,
                             encoding="utf-8", errors="replace")
        ok5 = ("样本不足" in rc5.stdout and "证据篇目= 2" in rc5.stdout)

        # ⑥ 射程为 0 必须在汇总里告警（v437）。`免税/放行` 的 82 个 check 格
        #   母版从不在一篇里同时谈两概念，判据永远没机会跑；召回再高也是空转。
        p6 = os.path.join(root, "fam6.json")
        io.open(p6, "w", encoding="utf-8", newline="\n").write(
            json.dumps({"增值税": {"de": {"forms": ["MwSt"], "mode": "check",
                                        "pair": "合同"}},
                        "合同": {"de": {"forms": ["Vertrag"], "mode": "check",
                                      "pair": "增值税"}}}, ensure_ascii=False))
        rc6 = subprocess.run([sys.executable, "-u", TOOL, "--family", p6,
                              "--root", root], capture_output=True, text=True,
                             encoding="utf-8", errors="replace")
        ok6 = "射程 0（族再全也不会开火）" in rc6.stdout

        fails = 0
        for label, ok in (("① 一篇达标一篇缺写法 → 召回 0.5", ok1),
                          ("② 族缺写法 → 召回 0", ok2),
                          ("③ 嵌套词形互斥计数 → 申报 召回 0", ok3),
                          ("④ 跨概念同形必须报红", ok4),
                          ("⑤ 小样本在汇总里显式告警", ok5),
                          ("⑥ 射程 0 在汇总里显式告警", ok6)):
            print("  %-4s %-34s %s" % ("OK" if ok else "FAIL", label,
                                       "" if ok else "实测不符"))
            fails += 0 if ok else 1
        print("词族召回体检：6 个断言，FAIL %d" % fails)
        return 0 if not fails else 1
    finally:
        if os.path.isdir(root):
            shutil.rmtree(root, ignore_errors=True)


if __name__ == "__main__":
    sys.exit(main())
