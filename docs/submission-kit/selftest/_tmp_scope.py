# -*- coding: utf-8 -*-
"""自检：`--tmp` 不许落在工具包内部（工具级臂，`selftest --kit` 才跑）。

用户口径（v469）：「传入的临时目录路径，如果在投稿工具内也要报错」。这条
不是洁癖——工具体系里有两处硬约束会被它同时踩坏：

  · `kit_hygiene` 的 H01：工具包内不得有 `tmp/`，入口会**整目录**归档；
    临时根指进包里，等于每条命令都先制造一次结构违规；
  · `pack` 只排除包内 `tmp/`，其它包内目录会被打进分发包——待删除区与
    中间产物会跟着分发出去（v466 曾实测 46911 个垃圾文件进包）。

本臂钉死六件事：

  ① 工具包根、包内子目录、经 `..`/大小写绕回来的同一位置 → `TmpInsideKit`；
  ② 包外路径（父目录、兄弟 `tmp/`）照常放行，返回值是绝对归一路径；
  ③ 未指定 `--tmp` 仍是 `None`（纯查询不报错，口径不变）；
  ④ 拒绝发生在**移动之前**：`archive_delete` 拿坏 tmp 不会动掉目标文件；
  ⑤ 命令层：`version` 与 `tools <名字>` 透传都给 rc=2 + 一行提示，**不是
     Traceback**（透传在 argparse 之前，容易漏掉这条路径）；
  ⑥ 拒绝路径不留副作用：包内不会因此多出 `tmp/`。
"""
import argparse
import io
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.dirname(HERE)
if KIT not in sys.path:
    sys.path.insert(0, KIT)

from core import tmp_root as TR          # noqa: E402

fails = []
total = [0]


def check(name, ok, detail=""):
    total[0] += 1
    print("%-4s %-56s %s" % ("PASS" if ok else "FAIL", name, detail))
    if not ok:
        fails.append(name)


def run(args, cwd=None):
    env = dict(os.environ)
    env.pop("SUBMIT_KIT_ENTRY", None)
    return subprocess.run([sys.executable, "-u"] + args, cwd=cwd or KIT,
                          env=env, capture_output=True, text=True,
                          encoding="utf-8", errors="replace")


def raises_inside(path):
    """resolve_tmp 对该路径是否抛 TmpInsideKit；返回 (raised, 详情)。"""
    try:
        got = TR.resolve_tmp(path)
        return False, "未报错，解析为 %s" % got
    except TR.TmpInsideKit as exc:
        return True, str(exc).splitlines()[0][:60]
    except Exception as exc:                 # 类型不对也是错
        return False, "%s: %s" % (type(exc).__name__, exc)


def main(argv=None):
    ap = argparse.ArgumentParser(description="--tmp 边界自检")
    ap.add_argument("--tmp", metavar="DIR", required=True,
                    help="临时根目录（本臂在它下面造隔离夹具）")
    args = ap.parse_args(argv)
    tmp_root = os.path.abspath(args.tmp)
    box = os.path.join(tmp_root, "tmp-scope")
    os.makedirs(box, exist_ok=True)
    parent = os.path.dirname(KIT)

    # ① 包内三档 + 绕行写法
    check("TmpInsideKit 是 RuntimeError 子类（入口转 rc=2 的前提）",
          issubclass(TR.TmpInsideKit, RuntimeError))
    check("模块认定的工具包根 = 本臂的 KIT",
          os.path.normcase(os.path.realpath(TR.KIT_ROOT))
          == os.path.normcase(os.path.realpath(KIT)), TR.KIT_ROOT)

    cases = [
        ("工具包根", KIT),
        ("包内子目录 <kit>/tmp", os.path.join(KIT, "tmp")),
        ("包内深层 <kit>/core/scratch", os.path.join(KIT, "core", "scratch")),
        (".. 绕回包内", os.path.join(KIT, "core", "..", "tmp")),
    ]
    if os.name == "nt" and KIT.upper() != KIT:
        cases.append(("大小写变体", os.path.join(KIT.upper(), "TMP")))
    for label, p in cases:
        ok, detail = raises_inside(p)
        check("拒绝 %s" % label, ok, detail)

    # 相对写法：以工具包为工作目录时，`--tmp tmp` 就是包内 —— 这类最容易被
    # 手滑写出来，用子进程固定 cwd=KIT 才测得到（本臂自身 cwd 不确定）。
    r = subprocess.run(
        [sys.executable, "-u", "-c",
         "import sys; sys.path.insert(0, %r);"
         "from core import tmp_root as t;"
         "t.resolve_tmp('tmp')" % KIT],
        cwd=KIT, capture_output=True, text=True, encoding="utf-8",
        errors="replace")
    check("拒绝相对写法（cwd=工具包时的 tmp）",
          r.returncode != 0 and "TmpInsideKit" in (r.stderr or ""),
          "rc=%d" % r.returncode)

    # ② 包外放行
    for label, p in (("父目录 <repo>", parent),
                     ("兄弟 tmp/", os.path.join(parent, "tmp")),
                     ("临时根自身", tmp_root)):
        try:
            got = TR.resolve_tmp(p)
            ok = got == os.path.normpath(os.path.abspath(p))
            detail = got if ok else "解析异常：%s" % got
        except Exception as exc:
            ok, detail = False, "%s: %s" % (type(exc).__name__, exc)
        check("放行 %s" % label, ok, detail)

    # ③ 未指定仍是 None（子进程保证 argv 里没有 --tmp）
    r = subprocess.run(
        [sys.executable, "-u", "-c",
         "import sys; sys.path.insert(0, %r);"
         "from core import tmp_root as t;"
         "print(repr(t.resolve_tmp()), repr(t.argv_tmp([])))" % KIT],
        cwd=KIT, capture_output=True, text=True, encoding="utf-8",
        errors="replace")
    check("未指定 --tmp 时仍返回 None（纯查询不报错）",
          r.returncode == 0 and (r.stdout or "").strip() == "None None",
          (r.stdout or "").strip()[:60])

    # ④ 拒绝发生在移动之前
    victim = os.path.join(box, "victim.txt")
    io.open(victim, "w", encoding="utf-8", newline="\n").write("keep me\n")
    try:
        TR.archive_delete(victim, label="tmp-scope", tmp=os.path.join(KIT, "tmp"))
        moved_ok, note = False, "未报错就返回了"
    except TR.TmpInsideKit:
        moved_ok, note = True, ""
    check("archive_delete 遇包内 tmp 抛错", moved_ok, note)
    check("目标文件未被移动/删除", os.path.exists(victim))

    # ⑤ 命令层（含 argparse 之前的透传路径）
    bad = os.path.join(KIT, "tmp")
    r = run(["submit.py", "version", "--tmp", bad])
    check("version --tmp <kit>/tmp → rc=2",
          r.returncode == 2 and "工具包内部" in (r.stderr or ""),
          "rc=%d" % r.returncode)
    check("报错不含 Traceback", "Traceback" not in (r.stderr or ""),
          (r.stderr or "").strip().splitlines()[-1][:70]
          if (r.stderr or "").strip() else "")
    r = run(["submit.py", "version", "--tmp=" + bad])
    check("--tmp=<kit>/tmp 同样拒绝", r.returncode == 2
          and "工具包内部" in (r.stderr or ""), "rc=%d" % r.returncode)
    r = run(["submit.py", "tools", "family_audit", "--tmp", bad])
    check("tools 透传也先过边界（rc=2 而非 Traceback）",
          r.returncode == 2 and "Traceback" not in (r.stderr or ""),
          "rc=%d %s" % (r.returncode,
                        (r.stderr or "").strip().splitlines()[-1][:50]
                        if (r.stderr or "").strip() else ""))
    good = os.path.join(box, "ok")
    r = run(["submit.py", "version", "--tmp", good])
    check("包外 tmp 正常放行（rc=0）", r.returncode == 0
          and "submit.py v" in (r.stdout or ""), "rc=%d" % r.returncode)
    check("命令层日志按包外 tmp 落盘",
          os.path.isdir(os.path.join(good, "logs")))

    # ⑥ 无副作用
    check("包内未因此生出 tmp/", not os.path.isdir(os.path.join(KIT, "tmp")))

    # 收尾：夹具归档（不真删）
    TR.archive_delete(box, label="tmp-scope", tmp=tmp_root)

    print("\nFAIL %d / 断言 %d" % (len(fails), total[0]))
    return 0 if not fails else 1


if __name__ == "__main__":
    sys.exit(main())
