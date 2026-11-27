# -*- coding: utf-8 -*-
"""工具级自检：check 的默认射程＝指定单篇；全库须 --all + 确认（2026-11-17）。

背景：用户要求「编写者默认只查自己的稿件（中文+译文），只有明确要求才全库扫描」。
钉死四件事：
  ① check <单篇路径> 默认只查该篇（PASS，不误扫全库）；
  ② 旧 --batch 已失效（argparse rc=2，不保留向后兼容）；
  ③ check <投稿目录根> 没带 --all → 明确提示「想全库检查请 --all --yes」，
     而不是把根目录当成一个包跑、刷 F10；
  ④ --all 无 --yes（非交互）拒绝 rc=2；--all --yes 放行并真跑批量。

`_` 前缀：验的是 CLI 射程守卫，无对应插件，按 A6/A7 不占正名臂；由
`selftest --kit` 单独计数。子进程用 --tmp 隔离，日志不落共享 tmp 正文。
"""
import os
import shutil
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.dirname(HERE)
if KIT not in sys.path:
    sys.path.insert(0, KIT)

fails = []
total = [0]


def check(name, ok, detail=""):
    total[0] += 1
    print("%-4s %-52s %s" % ("PASS" if ok else "FAIL", name, detail))
    if not ok:
        fails.append(name)


def run(args, stdin_data=None):
    env = dict(os.environ)
    env.pop("SUBMIT_KIT_ENTRY", None)
    return subprocess.run([sys.executable, "-u", "submit.py"] + args,
                          cwd=KIT, env=env, input=stdin_data,
                          capture_output=True, text=True,
                          encoding="utf-8", errors="replace")


def main(argv=None):
    ap = __import__("argparse").ArgumentParser()
    ap.add_argument("--tmp", required=True)
    args = ap.parse_args(argv)
    # 子进程 cwd=KIT：相对 --tmp 会在工具包内解析而被入口判为非法（rc=2）
    tmp_root = os.path.abspath(args.tmp)
    if not os.path.isdir(tmp_root):
        os.makedirs(tmp_root)

    # ①②③ 用临时投稿根：一篇 blog + 同名 regulations/ 目录（冒充两条线）
    with tempfile.TemporaryDirectory(prefix="checkscope-", dir=tmp_root) as box:
        root = os.path.join(box, "submission")
        os.makedirs(os.path.join(root, "regulations"))   # 让根目录形状成立
        # 从夹具复制一篇真实 blog 条目，避免依赖仓库真实稿件
        sys.path.insert(0, HERE)
        import _harness as H
        # fixture 结构是 <fixture>/<slug>/{submission.json,content/...}，
        # 其 <slug> 层就是 work/blog/<slug>，故复制到 work/blog 下即可。
        src = H.FIXTURES["blog"]
        slug = os.listdir(src)[0]
        dst = os.path.join(root, "blogs", slug, "work", "blog")
        shutil.copytree(src, dst)
        entry = os.path.join(root, "blogs", slug)

        # ① 默认单篇：只查该篇，PASS（0 error）
        r = run(["check", entry, "--tmp", tmp_root])
        check("check 单篇默认只查该篇（PASS）",
              r.returncode == 0 and "结果：PASS" in (r.stdout or ""),
              "rc=%d" % r.returncode)

        # ② 旧 --batch 失效（argparse 拒绝，不保留兼容）
        r = run(["check", entry, "--batch", "--tmp", tmp_root])
        check("--batch 已失效（rc=2 未知参数）",
              r.returncode == 2 and "--batch" in (r.stderr or ""),
              "rc=%d" % r.returncode)

        # ③ 根目录无 --all：提示全库耗时，不误判 F10
        r = run(["check", root, "--tmp", tmp_root])
        text = (r.stderr or "") + (r.stdout or "")
        check("根目录无 --all → 提示 --all --yes",
              r.returncode == 2 and "--all" in text and "--yes" in text
              and "耗时" in text,
              "rc=%d" % r.returncode)
        check("根目录提示不误报 F10",
              "F10" not in text, "rc=%d" % r.returncode)

        # ④ --all 无 --yes（非交互）拒绝
        r = run(["check", root, "--all", "--tmp", tmp_root])
        check("--all 无 --yes 拒绝（rc=2）",
              r.returncode == 2 and "--yes" in (r.stderr or ""),
              "rc=%d" % r.returncode)

        # ④b --all --yes 放行（真跑批量；本临时根只有一篇，秒级）
        r = run(["check", root, "--all", "--yes", "--tmp", tmp_root])
        check("--all --yes 放行并批量检查",
              r.returncode == 0 and "批量结果" in (r.stdout or ""),
              "rc=%d" % r.returncode)

    print("\nFAIL %d / 断言 %d" % (len(fails), total[0]))
    return 0 if not fails else 1


if __name__ == "__main__":
    sys.exit(main())
