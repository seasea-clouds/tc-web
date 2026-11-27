# -*- coding: utf-8 -*-
"""自检：入口自愈（工具级臂，`selftest --kit` 才跑）。

钉死五件事（用户 2026-11-19 口径：每次运行立刻复原，只有维护者可改）：

  ① 框架文件被**修改** → 从 sealed.zip 逐字节还原；
  ② 框架文件被**删除** → 还原；
  ③ 清单外新增（根层 / core/ 里凭空多出的 .py）→ 归档到 `待删除/`；
  ④ 判据插件被手改（与注册表 sha 不符）→ 归档；
  ⑤ 维护者模式（本机有 `.keys/seal.key`）→ 跳过自愈，改动留给他重签。

隔离树用**临时密钥**签清单，不复制真私钥、不碰真工作区。
"""
import io
import os
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.dirname(HERE)
if KIT not in sys.path:
    sys.path.insert(0, KIT)

from core import ed25519, integrity, selfheal          # noqa: E402

SKIP = {".keys", ".git", "__pycache__", ".cache", ".state", "tmp", ".clean",
        "template"}
fails = []
total = [0]


def check(name, ok, detail=""):
    total[0] += 1
    print("%-4s %-44s %s" % ("PASS" if ok else "FAIL", name, detail))
    if not ok:
        fails.append(name)


def _argv_tmp():
    for i, a in enumerate(sys.argv):
        if a == "--tmp" and i + 1 < len(sys.argv):
            return sys.argv[i + 1]
        if a.startswith("--tmp="):
            return a.split("=", 1)[1]
    return None


def _copy(src, dst):
    os.makedirs(dst, exist_ok=True)
    for name in os.listdir(src):
        if name in SKIP:
            continue
        s, d = os.path.join(src, name), os.path.join(dst, name)
        if os.path.isdir(s):
            _copy(s, d)
        else:
            shutil.copy2(s, d)


def main():
    tmp = _argv_tmp()
    if not tmp:
        print("需要 --tmp <目录>：本臂要造隔离工具包")
        return 2
    base = os.path.join(os.path.abspath(tmp), "selfheal-arm")
    if os.path.isdir(base):
        shutil.rmtree(base)
    dst = os.path.join(base, "kit")
    scratch = os.path.join(base, "scratch")
    os.makedirs(scratch, exist_ok=True)
    _copy(KIT, dst)

    # 临时密钥签新格式清单（旧公钥换成本次测试公钥）
    man = integrity.build_manifest(dst, os.path.join(dst, "data", "glossary.db"))
    seed = ed25519.generate_seed()
    pub = ed25519.public_key(seed)
    integrity.PUBLIC_KEY_HEX = pub.hex()
    io.open(os.path.join(dst, "data", "integrity.json"), "wb").write(
        integrity.manifest_bytes(man))
    io.open(os.path.join(dst, "data", "integrity.sig"), "wb").write(
        integrity.sign_manifest(seed, man))
    io.open(os.path.join(dst, "data", "sealed.zip"), "wb").write(
        integrity.pack_sealed_zip(dst))

    check("清单：sealed/tracked/assets 三段齐全",
          bool(man["sealed"]) and bool(man["tracked"])
          and "assets" in man,
          "%d/%d/%d" % (len(man["sealed"]), len(man["tracked"]),
                        len(man.get("assets") or {})))
    check("隔离树为编写者模式（无 .keys）", not selfheal.is_maintainer(dst))

    # ① 改
    target = "core/consts/thresholds.py"
    p = os.path.join(dst, target.replace("/", os.sep))
    orig = open(p, "rb").read()
    open(p, "ab").write(b"\n# evil\n")
    rep = selfheal.heal(dst, tmp=scratch)
    check("改框架文件 → 逐字节还原",
          target in rep["restored"] and open(p, "rb").read() == orig)

    # ② 删
    victim = "tools/db_diff.py"
    vp = os.path.join(dst, victim.replace("/", os.sep))
    os.remove(vp)
    rep = selfheal.heal(dst, tmp=scratch)
    check("删框架文件 → 还原", victim in rep["restored"] and os.path.isfile(vp))

    # ③ 增（根层 + core/）
    r = os.path.join(dst, "root-evil.txt")
    c = os.path.join(dst, "core", "evil_extra.py")
    io.open(r, "w", encoding="utf-8", newline="\n").write("x\n")
    io.open(c, "w", encoding="utf-8", newline="\n").write("# x\n")
    rep = selfheal.heal(dst, tmp=scratch)
    check("清单外新增 → 归档（根层 + core/）",
          not os.path.exists(r) and not os.path.exists(c)
          and "root-evil.txt" in rep["archived"]
          and "core/evil_extra.py" in rep["archived"])

    # ④ 手改判据
    plug = sorted(man["tracked"])[0]
    pp = os.path.join(dst, plug.replace("/", os.sep))
    open(pp, "ab").write(b"\n# evil plugin\n")
    rep = selfheal.heal(dst, tmp=scratch)
    check("手改判据 → 归档（注册表 sha 不符）",
          not os.path.exists(pp) and plug in rep["archived"])

    # ⑤ 维护者模式
    os.makedirs(os.path.join(dst, ".keys"), exist_ok=True)
    io.open(os.path.join(dst, ".keys", "seal.key"), "wb").write(b"0" * 32)
    rep = selfheal.heal(dst, tmp=scratch)
    check("维护者模式 → 跳过自愈",
          rep["mode"] == "maintainer" and not rep["restored"])

    print("\nFAIL %d / 断言 %d" % (len(fails), total[0]))
    return 0 if not fails else 1


if __name__ == "__main__":
    sys.exit(main())
