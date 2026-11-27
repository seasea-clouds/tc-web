# -*- coding: utf-8 -*-
"""自检：文件白名单（工具级臂，`selftest --kit` 才跑）。

用户口径（v500）：**所有文件都必须命中白名单**，且 `plugins/` 不再按
扩展名整目录放行——插件必须逐文件命中 `data/rules_registry.json` 的
sha256。未登记或内容不符由入口归档到 `tmp/待删除/foreign-<ts>/`；合法
变更只有 `submit.py rules import|delete` 一条路。其余非白名单文件同样
归档；需要时直接从 `<tmp>/待删除/` 拷回（v629 起无 restore 命令）。

本臂钉死八件事：

  ① 真包现状：`scan(KIT)` 为零违规（目录结构干净是持续状态，不是一次性清理）；
  ② **逐文件清单**（v628）：允许存在 = 运行时文件 + SEALED + template 资产 +
     注册表登记插件；`core/`、`tools/`、`selftest/` 凭空多出的 `.py` 同样违规；
  ③ 内容资产：`template/**` 逐文件登记（assets），新增须维护者重签；
  ④ 数据层：只放行运行时逐文件清单（库、封签产物、rules_registry.json），
     旧 `whitelist.json` 不再承认；
  ⑤ `purge_foreign` 真能移走、**免疫射程小于违规判定**（`core/x.md` 必须能移，
     早期版本把它误判成免疫）、空父目录一并清理；
  ⑥ `restore` 只负责取回；**没有 `--allow`**，清单外文件下次仍会归档；
  ⑦ 熔断：待移动超过 `PURGE_LIMIT` 时拒绝执行（防白名单写错把包拆掉）；
  ⑧ 插件指纹：未登记的新 `.py` 与已登记文件的任何字节改动都判 H01，
     堵死「直接往 plugins/ 塞规则」与「原地改判据」。未在注册表登记时
     只报「缺注册表」且**不归档**（否则一次误删注册表会拆掉整条判据链）。

另含两条回归：`.gitignore` 不得被 `_rel_norm` 剥成 `gitignore`；`data/` 下的
封签四件不得被判违规（误判会删掉信任根）。
"""
import argparse
import hashlib
import io
import json
import os
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.dirname(HERE)
if KIT not in sys.path:
    sys.path.insert(0, KIT)

from core import kit_hygiene as KH      # noqa: E402
from core import pack as PACK          # noqa: E402
from core import integrity as IG       # noqa: E402
from core import ed25519               # noqa: E402
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

    # ② 逐文件清单（v628）：允许存在 = 运行时 + SEALED + assets + 注册表插件
    allowed = IG.allowed_files(KIT)
    man0, merr0 = IG.load_manifest(KIT)
    check("真包封签清单可验签", bool(man0), merr0)
    check("清单含框架文件 / 模板资产 / 注册表",
          "submit.py" in allowed
          and any(a.startswith("core/") for a in allowed)
          and any(a.startswith("template/") for a in allowed)
          and "data/rules_registry.json" in allowed)
    check("清单不含凭空文件（core 新 .py / 根层杂项 / 旧 whitelist）",
          "core/evil.py" not in allowed and "root-evil.txt" not in allowed
          and "data/whitelist.json" not in allowed)

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
    rule_sha = hashlib.sha256(b"# rule\n").hexdigest()
    write(work, "data/rules_registry.json", json.dumps({
        "format": 1, "core": ["C01", "H01", "H02"],
        "rules": {"T01": {"severity": "error", "desc": "probe"}},
        "plugins": {"rule.py": {"plugin": "rule", "rules": ["T01"],
                                "sha256": rule_sha}},
        "shared": {}, "selftest": {},
    }, ensure_ascii=False, indent=1) + "\n")

    # 隔离树用**临时密钥**签一份新格式清单（不复制真私钥）：没有清单时
    # allowed 只剩运行时文件，基线会满屏 H01，测不出真实语义。
    seed = ed25519.generate_seed()
    pub = ed25519.public_key(seed)
    IG.PUBLIC_KEY_HEX = pub.hex()
    man_w = IG.build_manifest(work)
    io.open(os.path.join(work, "data", "integrity.json"), "wb").write(
        IG.manifest_bytes(man_w))
    io.open(os.path.join(work, "data", "integrity.sig"), "wb").write(
        IG.sign_manifest(seed, man_w))
    io.open(os.path.join(work, "data", "sealed.zip"), "wb").write(
        IG.pack_sealed_zip(work))

    f0, _e0 = KH.scan(work)
    check("隔离树基线零违规", not f0,
          ", ".join("%s %s" % (f[0], f[1]) for f in f0[:4]))
    check(".gitignore 不被剥成 gitignore（_rel_norm 回归）",
          KH._rel_norm(".gitignore") == ".gitignore", KH._rel_norm(".gitignore"))
    check("封签四件不判违规（信任根不可清）",
          not any(r == "H01" and p.startswith("data/") for r, p, _d in f0))

    # ⑧ 插件指纹：未登记 / 已登记但内容改了，都必须判 H01 且进 extras
    write(work, "plugins/extra-gate.py", "# extra\n")
    f_new, e_new = KH.scan(work)
    check("未登记插件判 H01（扩展名整目录放行已取消）",
          any(r == "H01" and p == "plugins/extra-gate.py"
              for r, p, _d in f_new)
          and "plugins/extra-gate.py" in e_new)
    os.remove(os.path.join(work, "plugins", "extra-gate.py"))

    write(work, "plugins/rule.py", "# rule tampered\n")
    f_tam, e_tam = KH.scan(work)
    check("已登记插件内容改动判 H01（指纹不符）",
          any(r == "H01" and p == "plugins/rule.py" for r, p, _d in f_tam)
          and "plugins/rule.py" in e_tam)
    write(work, "plugins/rule.py", "# rule\n")
    check("插件指纹还原后转绿", not KH.scan(work)[0])

    # 缺注册表：只报不动（拆包防线），且不把插件当违规文件整批归档
    reg_path = os.path.join(work, "data", "rules_registry.json")
    reg_backup = io.open(reg_path, encoding="utf-8").read()
    os.remove(reg_path)
    f_noreg, e_noreg = KH.scan(work)
    check("缺注册表只报不归档（避免拆包）",
          any(r == "H01" and p == "data/rules_registry.json"
              for r, p, _d in f_noreg)
          and "data/rules_registry.json" not in e_noreg
          and "plugins/rule.py" not in e_noreg)
    write(work, "data/rules_registry.json", reg_backup)

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

    # ④ restore 已移除（v629）：取回路径改为「直接从待删除拷回」
    check("restore 命令已移除（编写者取回无意义，维护者直接拷回）",
          not hasattr(KH, "restore"))
    check("旧 whitelist.json 不再被承认（清单外，会被归档）",
          "data/whitelist.json" not in IG.allowed_files(work))

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
    check("README 写明逐文件清单与入口自愈",
          "文件白名单" in readme and "plugins" in readme and "入口自愈" in readme)

    print("\nFAIL %d / 断言 %d" % (len(fails), total[0]))
    return 0 if not fails else 1


if __name__ == "__main__":
    sys.exit(main())
