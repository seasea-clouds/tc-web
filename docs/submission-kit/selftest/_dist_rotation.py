# -*- coding: utf-8 -*-
"""自检：core/pack.rotate_zips —— dist/ 清场最终口径

为什么是 `_` 前缀：本模块没有对应插件（打包是文件系统作业，不是稿件判据），
`submit.py selftest --kit` 会把这些 `_` 臂单独跑一遍。

为什么必须有这条臂：2026-11-12 用户两次收紧口径后，dist/ 里**只允许**
「工具包最新 5 份 + 全文档包最新 5 份 + manifest.json」。旧实现只认两种命名且
给 `--out` 留了保护集，22 个 `submission-<SLUG>-48langs.zip` 历史单篇包与任意
非 zip 文件因此永远清不掉；判据一旦回归成旧口径，产物区重新长满垃圾而打包
本身仍「成功」，没有任何地方会红。本臂把口径钉死在注入式断言上。

四个断言：
  ① 配额与清零：7+7 两类包 + 3 单篇包 + 自定义名 zip + 非 zip 文件 + 目录
     → 只剩 5+5+manifest.json；
  ② 留的是最新 5 份（按 mtime）；
  ③ 幂等：同一目录再跑一次移除 0 项，且不会动 manifest.json；
  ④ 白名单外一律清：连子目录、隐藏文件都不留。
全程只在 `--tmp` 下造目录，不碰真实 `submission/dist/`。
"""
import json
import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
_KIT = os.path.dirname(_HERE)
sys.path.insert(0, _KIT)

from core import pack                                            # noqa: E402


def _argv_tmp():
    for i, a in enumerate(sys.argv):
        if a == "--tmp" and i + 1 < len(sys.argv):
            return sys.argv[i + 1]
        if a.startswith("--tmp="):
            return a.split("=", 1)[1]
    return None


def _touch(path, mtime):
    with open(path, "wb") as fh:
        fh.write(b"PK\x05\x06" + b"\x00" * 18)     # 空 zip 骨架，只为占位
    os.utime(path, (mtime, mtime))


def _build(base, kits=7, packs=7):
    d = os.path.join(base, "dist")
    os.makedirs(d, exist_ok=True)
    for i in range(1, kits + 1):
        _touch(os.path.join(d, "submission-kit-v%d-2026010%d.zip" % (100 + i, i % 9 + 1)),
               1_700_000_000 + i)
    for i in range(1, packs + 1):
        _touch(os.path.join(d, "submission-2026010%d-r%d.zip" % (i % 9 + 1, i)),
               1_700_001_000 + i)
    # 白名单外：单篇包、`--out` 自定义名、非 zip 文件、目录、隐藏文件
    for i in range(1, 4):
        _touch(os.path.join(d, "submission-X%d-48langs.zip" % i), 1_700_002_000 + i)
    _touch(os.path.join(d, "my-handover-20261112.zip"), 1_700_003_000)
    with open(os.path.join(d, "notes.txt"), "w", encoding="utf-8", newline="\n") as fh:
        fh.write("keep me\n")
    with open(os.path.join(d, ".hidden"), "w", encoding="utf-8", newline="\n") as fh:
        fh.write("hidden\n")
    stage = os.path.join(d, ".staging")
    os.makedirs(stage, exist_ok=True)
    with open(os.path.join(stage, "leftover.txt"), "w", encoding="utf-8",
              newline="\n") as fh:
        fh.write("stale\n")
    with open(os.path.join(d, "manifest.json"), "w", encoding="utf-8",
              newline="\n") as fh:
        json.dump({"probe": True}, fh)
    return d


def main():
    if not _argv_tmp():
        print("需要 --tmp <目录>：本臂要造临时 dist/，不允许落到工具包内")
        return 2
    base = os.path.join(os.path.abspath(_argv_tmp()), "dist-rotation")
    os.makedirs(base, exist_ok=True)
    fails = 0

    d = _build(os.path.join(base, "case1"))
    before = sorted(os.listdir(d))
    removed = pack.rotate_zips(d)
    left = sorted(os.listdir(d))
    kits = [f for f in left if f.startswith("submission-kit-")]
    packs = [f for f in left if f.startswith("submission-2026")]
    ok1 = (len(kits) == 5 and len(packs) == 5 and len(left) == 11
           and "manifest.json" in left)
    print("  %-4s %-26s 工具包 %d / 全文档 %d / 目录条目 %d / 移除 %d"
          % ("OK" if ok1 else "FAIL", "① 配额 5+5+清零",
             len(kits), len(packs), len(left), len(removed)))
    fails += 0 if ok1 else 1

    # ② 留下的必须是最新 5 份
    newest_kits = {"submission-kit-v10%d-2026010%d.zip" % (i, i % 9 + 1)
                   for i in range(3, 8)}
    ok2 = set(kits) == newest_kits
    print("  %-4s %-26s %s"
          % ("OK" if ok2 else "FAIL", "② 留的是最新 5 份",
             "是" if ok2 else "实际 %s" % sorted(kits)))
    fails += 0 if ok2 else 1

    # ③ 幂等 + manifest 未被改动
    removed2 = pack.rotate_zips(d)
    mf = os.path.join(d, "manifest.json")
    ok3 = removed2 == [] and json.load(open(mf, encoding="utf-8")) == {"probe": True}
    print("  %-4s %-26s 第二次移除 %d，manifest 原样"
          % ("OK" if ok3 else "FAIL", "③ 幂等且不动 manifest", len(removed2)))
    fails += 0 if ok3 else 1

    # ④ 白名单外条目全被清（含自定义名 / 非 zip / 目录 / 隐藏文件）
    outsiders = ["my-handover-20261112.zip", "notes.txt", ".hidden", ".staging"]
    ok4 = all(x not in left for x in outsiders) and not any(
        f.endswith("-48langs.zip") for f in left)
    print("  %-4s %-26s 清掉 %d/%d 类白名单外条目（原 %d 项）"
          % ("OK" if ok4 else "FAIL", "④ 白名单外一律清除",
             len(outsiders), len(outsiders), len(before)))
    fails += 0 if ok4 else 1

    print("dist 清场：4 个断言，FAIL %d" % fails)
    return 0 if not fails else 1


if __name__ == "__main__":
    raise SystemExit(main())
