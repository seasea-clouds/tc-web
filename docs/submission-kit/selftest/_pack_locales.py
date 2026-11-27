# -*- coding: utf-8 -*-
"""自检：pack 只收 48 语实际文件完整的条目（core/pack.collect 门禁）。

三个正向形态：
  ① 48 语齐全 → 无 problem，条目可进包；
  ② 缺任一语文件 → problem 点名「48 语文件不完整」；
  ③ 语文件存在但为空 → 同样判半成品（不采信 submission.json.locales 声明）。
"""
import argparse
import io
import json
import os
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.dirname(HERE)
if KIT not in sys.path:
    sys.path.insert(0, KIT)

from core import pack                                         # noqa: E402
from core.consts import LOCALES                               # noqa: E402

fails = []
total = [0]


def chk(name, ok, detail=""):
    total[0] += 1
    print("%-4s %-42s %s" % ("PASS" if ok else "FAIL", name, detail))
    if not ok:
        fails.append(name)


def make_entry(root, slug="unit-test-slug", drop=(), empty=()):
    art = os.path.join(root, "blogs", "X", "work", "blog", slug)
    os.makedirs(art, exist_ok=True)
    with io.open(os.path.join(art, "submission.json"), "w",
                 encoding="utf-8", newline="\n") as fh:
        fh.write(json.dumps({"kind": "blog", "slug": slug,
                             "locales": list(LOCALES)}, ensure_ascii=False))
    for lg in LOCALES:
        d = os.path.join(art, "content", lg)
        os.makedirs(d, exist_ok=True)
        if lg in drop:
            continue
        with io.open(os.path.join(d, slug + ".mdx"), "w",
                     encoding="utf-8", newline="\n") as fh:
            fh.write("" if lg in empty else "正文\n")
    return art


def problem_for(root, slug="unit-test-slug"):
    plan, problems = pack.collect(root)
    return problems.get(slug), plan


def main():
    ap = argparse.ArgumentParser(description="pack 48 语完整性门禁自检")
    ap.add_argument("--tmp", required=True)
    args = ap.parse_args()
    tmp_root = os.path.abspath(args.tmp)
    os.makedirs(tmp_root, exist_ok=True)

    results = []
    cases = [((), ()),             # 48 语齐全
             (("ar",), ()),         # 缺 ar 文件
             ((), ("ko",)),         # ko 文件存在但为空
             ((), ())]              # 占位（清理循环用）
    for i, (drop, empty) in enumerate(cases, 1):
        root = os.path.join(tmp_root, "pack-locales-%d" % i)
        if os.path.isdir(root):
            shutil.rmtree(root)
        make_entry(root, drop=drop, empty=empty)
        prob, plan = problem_for(root)
        results.append((prob, plan))

    chk("48 语齐全放行", results[0][0] is None
        and len(results[0][1]) == 1, str(results[0][0]))
    chk("缺 1 语判半成品", bool(results[1][0])
        and "48 语文件不完整" in results[1][0]
        and "ar" in results[1][0], str(results[1][0]))
    chk("空语文件判半成品（不看 locales 声明）",
        bool(results[2][0]) and "48 语文件不完整" in results[2][0]
        and "ko" in results[2][0], str(results[2][0]))

    # 干净收场：只删本臂在 tmp 下自建的 4 个目录
    for i in range(1, 5):
        root = os.path.join(tmp_root, "pack-locales-%d" % i)
        if os.path.isdir(root):
            shutil.rmtree(root)

    print("\nFAIL %d / 断言 %d" % (len(fails), total[0]))
    return 0 if not fails else 1


if __name__ == "__main__":
    sys.exit(main())
