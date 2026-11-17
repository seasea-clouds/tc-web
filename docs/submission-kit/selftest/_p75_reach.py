# -*- coding: utf-8 -*-
"""自检：P75 射程体检（工具级臂，`selftest --kit` 才跑）。

为什么必须有这条臂：射程是「0 命中」的**分母**。全库 P75 = 0 可以被读成
「译文都对」，也可以被读成「根本没机会判」——本轮实测 `免税/放行` 82 个
check 格射程 **0 篇**，就是这个差别。射程算错（闸门用了别的常量、把「共存
篇目」当成「射程篇目」、语向不取两侧交集）会让覆盖数字虚高，而没有任何报错。

四个断言（假语料树，不读 submission/）：
  ① 母版两概念各 6 次 → 命中**计数闸**；
  ② 各 2 次、同段共现 1 段 → 两个闸都不达标（不算射程）；
  ③ 各 3 次、同段共现 2 段 → 命中**块级闸**（不需要计数达标）；
  ④ 语向只算两侧都是 `check` 的交集：一侧 `unverified` → 语向 0。
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
TOOL = os.path.join(KIT, "tools", "rule_p75_reach.py")

# 每段都同时含两个概念 → 几段就是几次对举
BOTH = "发票 %d 与合同 %d。" % (1, 1)


def _root():
    argv = sys.argv[1:]
    for i, a in enumerate(argv):
        if a == "--tmp" and i + 1 < len(argv):
            return argv[i + 1]
        if a.startswith("--tmp="):
            return a.split("=", 1)[1]
    # 缺省指仓库根 tmp/（不是 CWD/tmp）：避免在工具包内生成临时目录（v466）
    return os.path.join(os.path.dirname(KIT), "tmp")


def _pkg(root, name, zh, langs=("de",)):
    base = os.path.join(root, "submission", "blogs", name, "work", "blog",
                        name, "content")
    for lg in ("zh",) + tuple(langs):
        d = os.path.join(base, lg)
        os.makedirs(d, exist_ok=True)
        io.open(os.path.join(d, name + ".mdx"), "w", encoding="utf-8",
                newline="\n").write(zh if lg == "zh" else "Rechnung und Vertrag.")


FAM = {"发票": {"de": {"forms": ["Rechnung"], "mode": "check", "pair": "合同"},
                "fr": {"forms": ["facture"], "mode": "check", "pair": "合同"}},
       "合同": {"de": {"forms": ["Vertrag"], "mode": "check", "pair": "发票"},
                "fr": {"forms": ["contrat"], "mode": "unverified", "pair": "发票"}}}


def _run(root, fam):
    fp = os.path.join(root, "fam.json")
    io.open(fp, "w", encoding="utf-8", newline="\n").write(
        json.dumps(fam, ensure_ascii=False))
    out = os.path.join(root, "reach.tsv")
    rc = subprocess.run([sys.executable, "-u", TOOL, "--family", fp,
                         "--root", root, "--tsv", out],
                        capture_output=True, text=True, encoding="utf-8",
                        errors="replace")
    if rc.returncode != 0:
        raise RuntimeError("reach 失败：%s" % ((rc.stdout or "") + (rc.stderr or ""))[-400:])
    rows = {}
    for i, line in enumerate(io.open(out, encoding="utf-8")):
        if not i:
            continue
        p = line.rstrip("\n").split("\t")
        rows[p[3]] = p
    return rows


def main():
    root = os.path.join(_root(), "p75-reach-%d" % os.getpid())
    if os.path.isdir(root):
        shutil.rmtree(root)
    fails = 0
    try:
        # ① 两概念各 6 次（6 段各含一次）→ 计数闸
        _pkg(root, "T1", "\n\n".join([BOTH] * 6))
        # ② 各 2 次、同段 1 段 → 两闸都不达标
        _pkg(root, "T2", BOTH + "\n\n发票另述。\n\n合同另述。")
        # ③ 各 3 次、同段共现 2 段 → 块级闸（计数不足 5）
        _pkg(root, "T3", "\n\n".join([BOTH] * 2)
             + "\n\n发票另述。\n\n合同另述。")
        rows = _run(root, FAM)

        r1, r2, r3 = rows.get("T1"), rows.get("T2"), rows.get("T3")
        ok1 = r1 is not None and r1[8] == "1" and r1[4] == "6" and r1[5] == "6"
        ok2 = r2 is not None and r2[8] == "0" and r2[9] == "0"
        ok3 = r3 is not None and r3[8] == "0" and r3[9] == "1" and r3[6] == "2"
        # ④ 语向取交集：fr 合同是 unverified → 只剩 de
        ok4 = r1 is not None and r1[7] == "1"

        for label, ok in (("① 两概念各 6 次 → 计数闸", ok1),
                          ("② 各 2 次、对举 1 段 → 不入射程", ok2),
                          ("③ 各 3 次、对举 2 段 → 块级闸", ok3),
                          ("④ 语向只算两侧都 check 的交集", ok4)):
            print("  %-4s %-34s %s" % ("OK" if ok else "FAIL", label,
                                       "" if ok else "实测不符 %s" % (rows,)))
            fails += 0 if ok else 1
        print("P75 射程体检：4 个断言，FAIL %d" % fails)
    finally:
        if os.path.isdir(root):
            shutil.rmtree(root, ignore_errors=True)
    return 0 if not fails else 1


if __name__ == "__main__":
    sys.exit(main())
