# -*- coding: utf-8 -*-
"""自检：文件白名单（工具级臂，`selftest --kit` 才跑）。

用户口径（v464）：**所有文件都必须命中白名单，不限制文件类型**；唯一例外
是 `plugins/` 下的 `.py`（策略面随时改）。非白名单文件由入口自动归档到
`tmp/待删除/foreign-<ts>/`，需要时 `submit.py restore <路径> --allow` 显式取回。

本臂钉死七件事：

  ① 真包现状：`scan(KIT)` 为零违规（目录结构干净是持续状态，不是一次性清理）；
  ② 代码层：`core/`、`tools/`、`selftest/` 只允许 `.py`，放 `.md`/`.json`/`.txt`
     一律违规；`plugins/` 的 `.py` 豁免但 `.json`/`.md` 不豁免；
  ③ 内容资产：`template/**` 整树允许（mdx/webp/json 都合法）；
  ④ 数据层：只放行逐文件清单（库、封签产物、whitelist.json），其余 `.json`
     一律违规——防「往 data/ 里塞笔记」；
  ⑤ `purge_foreign` 真能移走、**免疫射程小于违规判定**（`core/x.md` 必须能移，
     早期版本把它误判成免疫）、空父目录一并清理；
  ⑥ `restore` 不登记则下次入口再次归档；`--allow` 登记后保留；
  ⑦ 熔断：待移动超过 `PURGE_LIMIT` 时拒绝执行（防白名单写错把包拆掉）。

另含两条回归：`.gitignore` 不得被 `_rel_norm` 剥成 `gitignore`；`data/` 下的
封签四件不得被判违规（误判会删掉信任根）。
"""
import argparse
import io
import os
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.dirname(HERE)
if KIT not in sys.path:
    sys.path.insert(0, KIT)

from core import kit_hygiene as KH      # noqa: E402
from core import pack as PACK          # noqa: E402
from tools import CATALOG              # noqa: E402

fails = []
total = [0]


def check(name, ok, detail=""):
    total[0] += 1
    print("%-4s %-52s %s" % ("PASS" if ok else "FAIL", name, detail))
    if not ok:
        fails.append(name)


def write(root, rel, text=""):
    p = os.path.join(root, rel.replace("/", os.sep))
    os.makedirs(os.path.dirname(p), exist_ok=True)
    io.open(p, "w", encoding="utf-8", newline="\n").write(text)


def main(argv=None):
    ap = argparse.ArgumentParser(description="文件白名单自检")
    ap.add_argument("--tmp", metavar="DIR", required=True,
                    help="临时根目录（本臂要造隔离树）")
    args = ap.parse_args(argv)
    tmp_root = os.path.abspath(args.tmp)
    os.makedirs(tmp_root, exist_ok=True)

    # ① 真包
    findings, extras = KH.scan(KIT)
    check("真包无非白名单文件", not findings,
          ", ".join("%s %s" % (f[0], f[1]) for f in findings[:5]))
    check("工具包根不得有 tmp/（临时根在仓库 tmp，v466）",
          not os.path.isdir(os.path.join(KIT, "tmp")))
    check("pack 排除 tmp/（即使误建也不进分发包）",
          "tmp" in PACK.KIT_EXCLUDE_DIRS)
    on_disk = sorted(f for f in os.listdir(os.path.join(KIT, "tools"))
                     if f.endswith(".py") and f != "__init__.py")
    check("tools 索引覆盖全部工具（新增必须登记）",
          sorted(CATALOG) == on_disk,
          "未登记 %s / 多余 %s" % (sorted(set(on_disk) - set(CATALOG)),
                                   sorted(set(CATALOG) - set(on_disk))))

    # ② 目录规则（纯函数，不建树）
    cases = [
        ("core/a.py", True), ("core/consts/b.py", True),
        ("core/notes.md", False), ("core/data.json", False),
        ("plugins/rule.py", True), ("plugins/_lex.py", True),
        ("plugins/x.json", False), ("plugins/readme.md", False),
        ("tools/t.py", True), ("tools/notes.txt", False),
        ("tools/family_deny.json", True), ("tools/other.json", False),
        ("selftest/_a.py", True), ("selftest/a.md", False),
        ("template/blog/s/c/content/zh/x.mdx", True),
        ("template/blog/extra.png", True),
        ("template/regulation/s/submission.json", True),
        ("data/glossary.db", True), ("data/glossary.db-wal", True),
        ("data/integrity.json", True), ("data/integrity.sig", True),
        ("data/sealed.zip", True), ("data/trust_anchor.txt", True),
        ("data/whitelist.json", True), ("data/notes.json", False),
        ("submit.py", True), ("README.md", True), (".gitignore", True),
        ("NEWS.md", False), ("random.txt", False),
    ]
    bad = [(r, w, KH.is_allowed(r)) for r, w in cases if KH.is_allowed(r) is not w]
    check("目录/文件规则 30 例全部符合", not bad, str(bad[:3]))
    check("plugins 只豁免 .py（.json 仍违规）",
          KH.is_allowed("plugins/a.py") and not KH.is_allowed("plugins/a.json"))

    # ③ 隔离树
    work = os.path.join(tmp_root, "whitelist-arm")
    if os.path.isdir(work):
        shutil.rmtree(work)
    write(work, "submit.py", "# entry\n")
    write(work, "README.md", "# readme\n")
    write(work, ".gitignore", "tmp/\n")
    write(work, "core/a.py", "# core\n")
    write(work, "core/consts/b.py", "# consts\n")
    write(work, "plugins/rule.py", "# rule\n")
    write(work, "tools/t.py", "# tool\n")
    write(work, "selftest/_s.py", "# arm\n")
    write(work, "template/blog/s/c/zh.mdx", "content\n")
    write(work, "data/glossary.db", "")
    write(work, "data/integrity.json", "{}")
    write(work, "data/sealed.zip", "")
    write(work, "data/trust_anchor.txt", "anchor\n")

    f0, _e0 = KH.scan(work)
    check("隔离树基线零违规", not f0,
          ", ".join("%s %s" % (f[0], f[1]) for f in f0[:4]))
    check(".gitignore 不被剥成 gitignore（_rel_norm 回归）",
          KH._rel_norm(".gitignore") == ".gitignore", KH._rel_norm(".gitignore"))
    check("封签四件不判违规（信任根不可清）",
          not any(r == "H01" and p.startswith("data/") for r, p, _d in f0))

    write(work, "core/deep/notes.md", "# deep\n")
    write(work, "plugins/x.json", "{}\n")
    write(work, "tools/notes.txt", "t\n")
    write(work, "data/notes.json", "{}\n")
    findings, _extras = KH.scan(work)
    got = sorted(p for r, p, _d in findings if r == "H01")
    check("四类违规全部检出（含 core 深层）",
          got == ["core/deep/notes.md", "data/notes.json",
                  "plugins/x.json", "tools/notes.txt"], str(got))
    check("plugins 的 .py 不判违规", "plugins/rule.py" not in got)

    planned = KH.purge_foreign(work, dest_root=os.path.join(tmp_root, "wl-arch"),
                               apply=False)
    check("apply=False 只列不动",
          len(planned) == 4 and os.path.exists(os.path.join(work, "core/deep/notes.md")),
          str(planned))
    moved = KH.purge_foreign(work, dest_root=os.path.join(tmp_root, "wl-arch"))
    check("purge 移走全部违规", sorted(moved) == planned, str(moved))
    check("原位置已不存在",
          not os.path.exists(os.path.join(work, "core/deep/notes.md"))
          and not os.path.exists(os.path.join(work, "plugins/x.json")))
    check("空父目录已清理",
          not os.path.isdir(os.path.join(work, "core/deep")))
    check("豁免文件仍在（core/a.py / plugins/rule.py）",
          os.path.exists(os.path.join(work, "core/a.py"))
          and os.path.exists(os.path.join(work, "plugins/rule.py")))

    # ④ restore：不登记 → 再归档；--allow → 保留
    ok, msg = KH.restore(work, "core/deep/notes.md",
                         dest_root=os.path.join(tmp_root, "wl-arch"))
    check("restore 不登记也能取回", ok and os.path.exists(
        os.path.join(work, "core/deep/notes.md")), msg)
    moved2 = KH.purge_foreign(work, dest_root=os.path.join(tmp_root, "wl-arch"))
    check("未登记 → 再次归档", moved2 == ["core/deep/notes.md"], str(moved2))
    ok, msg = KH.restore(work, "core/deep/notes.md", allow=True,
                         dest_root=os.path.join(tmp_root, "wl-arch"))
    check("restore --allow 登记成功",
          ok and os.path.exists(os.path.join(work, "data", "whitelist.json")), msg)
    moved3 = KH.purge_foreign(work, dest_root=os.path.join(tmp_root, "wl-arch"))
    check("登记后不再归档", not moved3
          and os.path.exists(os.path.join(work, "core/deep/notes.md")),
          str(moved3))
    payload = io.open(os.path.join(work, "data", "whitelist.json"),
                      encoding="utf-8").read()
    check("whitelist.json 记录了路径与说明",
          "core/deep/notes.md" in payload and "note" in payload)

    # ⑤ 熔断
    for i in range(KH.PURGE_LIMIT + 2):
        write(work, "core/zz/bulk-%02d.md" % i, "x\n")
    blocked = KH.purge_foreign(work, dest_root=os.path.join(tmp_root, "wl-arch"))
    check("超阈值 → 熔断拒绝移动", blocked == [],
          "返回 %d 项" % len(blocked))

    # ⑥ 工具包内不许有临时目录（v466）：整目录归档，不逐文件搬
    shutil.rmtree(os.path.join(work, "core", "zz"), ignore_errors=True)
    arch = os.path.join(tmp_root, "wl-arch")
    write(work, "tmp/sub/tool.out", "x\n")
    f_tmp, e_tmp = KH.scan(work)
    check("kit 内 tmp/ 判 H01（整目录一条，不刷屏）",
          any(r == "H01" and p == "tmp" for r, p, _d in f_tmp)
          and "tmp" in e_tmp
          and len([1 for r, _p, _d in f_tmp if r == "H01"]) >= 1)
    moved_tmp = KH.purge_foreign(work, dest_root=arch)
    check("tmp/ 整目录移走", moved_tmp == ["tmp"]
          and not os.path.isdir(os.path.join(work, "tmp")), str(moved_tmp))
    kept = [os.path.join(d, "tmp", "sub", "tool.out")
            for d in os.listdir(arch)
            if os.path.exists(os.path.join(arch, d, "tmp", "sub", "tool.out"))]
    check("归档保留 tmp 内容（可回溯）", bool(kept), kept[:1])

    # ⑦ README 规则
    readme = io.open(os.path.join(KIT, "README.md"), encoding="utf-8").read()
    check("README 写明文件白名单规则",
          "文件白名单" in readme and "plugins" in readme and "restore" in readme)
    check("README 记录旧策略为何失效", "旧策略为什么没生效" in readme)

    print("\nFAIL %d / 断言 %d" % (len(fails), total[0]))
    return 0 if not fails else 1


if __name__ == "__main__":
    sys.exit(main())
