# -*- coding: utf-8 -*-
"""自检：概念对可判别性体检（工具级臂，`selftest --kit` 才跑）。

为什么要有它：`pair_separability.py` 的结论是「这对概念值不值得立判据」的
第一道闸。它错的方式都很安静——把话题词当术语、把固定连用当对照段、静默跳过
通用度闸——任何一种都会让人去补一堆用不上的词形（`免税/放行` 空转四轮就是
没有这道闸的代价）。

三个断言（假语料树，不读 submission/）：
  ① 两侧各有独占词 → 判为「两侧都有稳定术语」；
  ② 母版每段都同时含两概念（固定连用）→ 判为「无从判别」；
  ③ 全语料通用词（每段都出现的 from/the）不得进候选。
"""
import io
import os
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.dirname(HERE)

# 工具的唯一入口是 submit.py；本臂用子进程验工具行为，显式标记为“入口调用”
os.environ.setdefault("SUBMIT_KIT_ENTRY", "submit.py")
TOOL = os.path.join(KIT, "tools", "pair_separability.py")

ZH_SEP = ("# T\n\n归类的依据是商品描述。\n\n归类的结论由海关作出。\n\n"
          "税号决定清单行。\n\n税号写在报关单上。\n")
EN_SEP = ("# T\n\nThe classification follows the product description.\n\n"
          "The classification is decided by customs.\n\n"
          "The tariff code fixes the list line.\n\n"
          "The tariff code appears on the declaration.\n")
ZH_FIX = "# T\n\n退运或者销毁由海关监督。\n\n退运或者销毁前需报批。\n"

# 通用度闸的分母是「该语向全部块」，假语料太小会让**所有**词都超过 15% 而
# 一律被滤掉（第一版断言 ① 就是因此在 4 段的语料上失败）。加一批无关段落
# 把分母撑起来，才能测出「术语 vs 话题词」的区分。
ZH_FILL = "# F\n\n" + "\n\n".join("第%d段讲的是仓储与运输安排。" % i
                                     for i in range(1, 15))
EN_FILL = "# F\n\n" + "\n\n".join(
    "Paragraph %d covers warehousing and transport arrangements." % i
    for i in range(1, 15))
EN_FIX = ("# T\n\nReturn or destruction is supervised by customs.\n\n"
          "Approval is needed before return or destruction.\n")


def _root():
    argv = sys.argv[1:]
    for i, a in enumerate(argv):
        if a == "--tmp" and i + 1 < len(argv):
            return argv[i + 1]
        if a.startswith("--tmp="):
            return a.split("=", 1)[1]
    # 缺省指仓库根 tmp/（不是 CWD/tmp）：避免在工具包内生成临时目录（v466）
    return os.path.join(os.path.dirname(KIT), "tmp")


def _pkg(root, name, zh, en):
    base = os.path.join(root, "submission", "blogs", name, "work", "blog",
                        name, "content")
    for lg, text in (("zh", zh), ("en", en)):
        d = os.path.join(base, lg)
        os.makedirs(d, exist_ok=True)
        io.open(os.path.join(d, name + ".mdx"), "w", encoding="utf-8",
                newline="\n").write(text)


def _run(root, pairs, show=3):
    rc = subprocess.run([sys.executable, "-u", TOOL, "--pairs", pairs,
                         "--root", root, "--show", str(show)],
                        capture_output=True, text=True, encoding="utf-8",
                        errors="replace")
    if rc.returncode != 0:
        raise RuntimeError("separability 失败：%s"
                           % ((rc.stdout or "") + (rc.stderr or ""))[-400:])
    return rc.stdout


def main():
    root = os.path.join(_root(), "sep-%d" % os.getpid())
    if os.path.isdir(root):
        shutil.rmtree(root)
    fails = 0
    try:
        _pkg(root, "S1", ZH_SEP, EN_SEP)
        _pkg(root, "S2", ZH_FIX, EN_FIX)
        _pkg(root, "S3", ZH_FILL, EN_FILL)
        out1 = _run(root, "归类=税号")
        ok1 = ("两侧都有稳定术语 1 语向" in out1 and "classificatio" in out1
               and "tariff" in out1)

        out2 = _run(root, "退运=销毁")
        ok2 = "无从判别" in out2

        # ③ 通用词的通用度闸：`the`/`and` 每段都有，不得出现在候选里。
        #    （第一版就是漏了这道闸，`from`/`general` 直接进了候选。）
        ok3 = True
        for line in out1.splitlines():
            if ":" in line and ("归类:" in line or "税号:" in line):
                for junk in ("the(", "and(", "from("):
                    if junk in line:
                        ok3 = False
        for label, ok in (("① 两侧各有独占词 → 有稳定术语", ok1),
                          ("② 固定连用 → 无从判别", ok2),
                          ("③ 通用词不得进候选", ok3)):
            print("  %-4s %-34s %s" % ("OK" if ok else "FAIL", label,
                                       "" if ok else "实测不符"))
            fails += 0 if ok else 1
        print("概念对可判别性：3 个断言，FAIL %d" % fails)
        return 0 if not fails else 1
    finally:
        if os.path.isdir(root):
            shutil.rmtree(root, ignore_errors=True)


if __name__ == "__main__":
    sys.exit(main())
