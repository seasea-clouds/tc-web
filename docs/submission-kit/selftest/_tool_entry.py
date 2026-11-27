# -*- coding: utf-8 -*-
"""自检：工具的唯一入口是 submit.py（工具级臂，`selftest --kit` 才跑）。

钉死四件事：
  ① `tools/*.py` 都装了 `require_entry` 守卫，且都在 CATALOG 里登记；
  ② 直接 `python tools/x.py` 被拒绝（退出码 2，提示正确入口）；
  ③ `python submit.py tools <名字> [...]` 能跑通并原样转发参数；
  ④ 未知工具给退出码 2 与索引提示，不是 traceback。

为什么要这条臂：工具一旦能被单独运行，`--tmp`、日志归档、白名单执法、
封签校验都会被绕过，出现「命令能跑但产物不落盘」的不一致。
"""
import argparse
import json
import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.dirname(HERE)
if KIT not in sys.path:
    sys.path.insert(0, KIT)

from tools import CATALOG  # noqa: E402

fails = []
total = [0]


def check(name, ok, detail=""):
    total[0] += 1
    print("%-4s %-56s %s" % ("PASS" if ok else "FAIL", name, detail))
    if not ok:
        fails.append(name)


def run(args, with_entry=False):
    env = dict(os.environ)
    env.pop("SUBMIT_KIT_ENTRY", None)          # 直接运行场景：确保没有入口标记
    if with_entry:
        env["SUBMIT_KIT_ENTRY"] = "submit.py"
    return subprocess.run([sys.executable, "-u"] + args, cwd=KIT, env=env,
                          capture_output=True, text=True,
                          encoding="utf-8", errors="replace")


def main(argv=None):
    ap = argparse.ArgumentParser(description="工具入口自检")
    ap.add_argument("--tmp", metavar="DIR", required=True,
                    help="临时根目录（本臂不写文件，保持与其他臂一致）")
    args = ap.parse_args(argv)
    # 子进程 cwd=KIT：相对 --tmp 会在工具包内解析而被入口判为非法（rc=2）
    args.tmp = os.path.abspath(args.tmp)

    tools_dir = os.path.join(KIT, "tools")
    files = sorted(f for f in os.listdir(tools_dir)
                   if f.endswith(".py") and f != "__init__.py")
    missing_guard = []
    for fn in files:
        body = open(os.path.join(tools_dir, fn), encoding="utf-8").read()
        if "require_entry(" not in body:
            missing_guard.append(fn)
    check("每个工具都装 require_entry 守卫", not missing_guard,
          ", ".join(missing_guard[:5]))
    check("tools 索引覆盖全部工具（含新增）",
          sorted(CATALOG) == files,
          "未登记 %s" % sorted(set(files) - set(CATALOG)))

    # ② 直接运行被拒（语料工具 + 运维工具各测一个）
    for name in ("family_audit", "db_diff"):
        r = run(["tools/%s.py" % name, "--help"])
        check("直接运行 %s 被拒绝" % name,
              r.returncode == 2 and "submit.py tools" in (r.stderr or ""),
              "rc=%d" % r.returncode)

    # ③ 经入口可运行（参数原样转发）
    r = run(["submit.py", "tools", "family_audit", "--help"])
    check("入口转发 --help 成功", r.returncode == 0 and "usage:" in r.stdout,
          "rc=%d %s" % (r.returncode, (r.stderr or "")[:60]))
    r = run(["submit.py", "tools", "rule_p75_reach", "--help"])
    check("入口转发第二个工具成功", r.returncode == 0 and "usage:" in r.stdout,
          "rc=%d" % r.returncode)

    # ④ 未知工具：退出码 2 + 指路，不能是 traceback
    r = run(["submit.py", "tools", "no_such_tool"])
    check("未知工具 → rc=2 且给索引提示",
          r.returncode == 2 and "查看索引" in (r.stderr or "")
          and "Traceback" not in (r.stderr or ""),
          "rc=%d" % r.returncode)

    # ⑤ 索引列表与机器可读输出
    r = run(["submit.py", "tools"])
    check("索引列表可用",
          r.returncode == 0 and "个维护者工具" in r.stdout, "rc=%d" % r.returncode)
    r = run(["submit.py", "tools", "--json"])
    ok_json = False
    if r.returncode == 0:
        try:
            data = json.loads(r.stdout)
            ok_json = isinstance(data, list) and len(data) == len(CATALOG)
        except ValueError:
            ok_json = False
    check("--json 可解析且条数与索引一致", ok_json, "rc=%d" % r.returncode)

    # ⑥ hooks 安装器同样只走入口
    r = run(["tools/hooks/install_hook.py"])
    check("直接运行 hooks 安装器被拒绝",
          r.returncode == 2 and "submit.py hooks install" in (r.stderr or ""),
          "rc=%d" % r.returncode)
    r = run(["submit.py", "hooks", "--help"])
    check("hooks 子命令可用", r.returncode == 0 and "install" in r.stdout,
          "rc=%d" % r.returncode)

    # ⑦ 入口级 --tmp 由 submit.py 消费，不透传给工具的 argparse
    # （tools/<工具>.py 自己没有 --tmp 参数，漏传就 rc=2）
    r = run(["submit.py", "tools", "integrity_seal", "status",
             "--tmp", args.tmp])
    check("tools 透传剥离 --tmp <dir>",
          r.returncode == 0 and "sealed" in (r.stdout or ""),
          "rc=%d %s" % (r.returncode,
                        (r.stderr or "").strip().splitlines()[-1][:60]
                        if (r.stderr or "").strip() else ""))
    r = run(["submit.py", "tools", "integrity_seal", "status",
             "--tmp=" + args.tmp])
    check("tools 透传剥离 --tmp=<dir>",
          r.returncode == 0 and "sealed" in (r.stdout or ""),
          "rc=%d" % r.returncode)

    # ⑧ start 的下一步提示按线分支：法规线无配图，不能再提示 cover.webp
    with tempfile.TemporaryDirectory(prefix="tool-start-",
                                     dir=args.tmp) as box:
        r = run(["submit.py", "start", "regulation",
                 "--slug=reg-start-guide", "--root=" + box,
                 "--entry-name=REG999-guide", "--title=演练",
                 "--tmp", args.tmp])
        text = (r.stdout or "") + (r.stderr or "")
        check("start regulation 提示不提 cover.webp/配图",
              r.returncode == 0 and "cover.webp" not in text
              and "无配图" in text, "rc=%d" % r.returncode)
        check("start 提示仍含 preview/check/pack",
              all(k in text for k in ("preview", "check", "pack")),
              "rc=%d" % r.returncode)

    # ⑨ 工具的错误输入要给干净 rc=2，不许把 FileNotFoundError 裸抛出来
    r = run(["submit.py", "tools", "audit_prep",
             "--entry", os.path.join(args.tmp, "no-such-entry"),
             "--out", os.path.join(args.tmp, "no-such-audit")])
    check("audit_prep 错误 entry → rc=2 无 Traceback",
          r.returncode == 2 and "Traceback" not in (r.stderr or "")
          and "--entry" in (r.stderr or ""),
          "rc=%d" % r.returncode)

    print("\nFAIL %d / 断言 %d" % (len(fails), total[0]))
    return 0 if not fails else 1


if __name__ == "__main__":
    sys.exit(main())
