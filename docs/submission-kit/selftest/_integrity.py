# -*- coding: utf-8 -*-
"""自检：不依赖 git 的完整性封签（工具级臂，`selftest --kit` 才跑）。

三道防线各由本臂钉死：

  ① **签名算法正确**：RFC 8032 §7.1 三组官方向量逐字节比对（私钥→公钥→
     签名→验签），外加「改一位必失败」「S≥L 必失败」。自己实现的密码学必须
     用官方向量自证，不能只测「能签能验」——那对错误实现在自洽时也成立。
  ② **检测有效**：在 `--tmp` 下造一棵最小工具树（core/、submit.py、tools/、
     selftest/、plugins/），首签后分别改机制层、改判据、改清单、多出文件，
     逐个验证判定与点名是否精确。
  ③ **还原闭环**：pack → 篡改 → restore → 字节一致 + 复验通过；同时拒绝
     zip slip（`../` 与不在封签集合内的路径一律不写）。

真包只做只读断言（已封签则必须通过；未封签则跳过），不修改真实文件。
"""
import argparse
import io
import json
import os
import shutil
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.dirname(HERE)
if KIT not in sys.path:
    sys.path.insert(0, KIT)

from core import ed25519      # noqa: E402
from core import integrity    # noqa: E402

fails = []
total = [0]


def check(name, ok, detail=""):
    total[0] += 1
    print("%-4s %-50s %s" % ("PASS" if ok else "FAIL", name, detail))
    if not ok:
        fails.append(name)


def _write(root, rel, text):
    p = os.path.join(root, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    io.open(p, "w", encoding="utf-8", newline="\n").write(text)


def _mini(root):
    _write(root, "core/a.py", "# core a\n")
    _write(root, "core/consts/b.py", "# consts b\n")
    _write(root, "submit.py", "# entry\n")
    _write(root, "tools/t.py", "# tool\n")
    _write(root, "selftest/_s.py", "# arm\n")
    _write(root, "plugins/_lex.py", "# shared\n")
    _write(root, "plugins/rule-x.py", "# policy\n")
    _write(root, "plugins/rule-y.py", "# policy\n")
    _write(root, "README.md", "readme\n")
    # 规则注册表 v628 起**不在 SEALED**（编写者随时 rules import 要能改写它），
    # 属运行时文件；判据层以「注册表 ↔ 插件 sha 自洽」为准。
    _write(root, "data/rules_registry.json",
           '{"rules":{"T01":{"severity":"error","desc":"probe"}}}\n')


VECTORS = [
    ("9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60",
     "d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a", "",
     "e5564300c360ac729086e2cc806e828a84877f1eb8e5d974d873e06522490155"
     "5fb8821590a33bacc61e39701cf9b46bd25bf5f0595bbe24655141438e7a100b"),
    ("4ccd089b28ff96da9db6c346ec114e0f5b8a319f35aba624da8cf6ed4fb8a6fb",
     "3d4017c3e843895a92b70aa74d1b7ebc9c982ccf2ec4968cc0cd55f12af4660c", "72",
     "92a009a9f0d4cab8720e820b5f642540a2b27b5416503f8fb3762223ebdb69da"
     "085ac1e43e15996e458f3613d0f11d8c387b2eaeb4302aeeb00d291612bb0c00"),
    ("c5aa8df43f9f837bedb7442f31dcb7b166d38535076f094b85ce3a2e0b4458f7",
     "fc51cd8e6218a1a38da47ed00230f0580816ed13ba3303ac5deb911548908025", "af82",
     "6291d657deec24024827e69c3abe01a30ce548a284743a445e3680d7db5ac3ac"
     "18ff9b538d16f290ae67f760984dc6594a7c15e9716ed28dc027beceea1ec40a"),
]


def main(argv=None):
    ap = argparse.ArgumentParser(description="完整性封签自检")
    ap.add_argument("--tmp", metavar="DIR", required=True,
                    help="临时根目录（本臂需要建隔离工具树）")
    args = ap.parse_args(argv)
    tmp_root = os.path.abspath(args.tmp)
    os.makedirs(tmp_root, exist_ok=True)

    # ① RFC 8032 向量
    for i, (sk_h, pk_h, msg_h, sig_h) in enumerate(VECTORS, 1):
        sk, pk = bytes.fromhex(sk_h), bytes.fromhex(pk_h)
        msg, want = bytes.fromhex(msg_h), bytes.fromhex(sig_h)
        check("RFC 8032 向量 %d：公钥一致" % i, ed25519.public_key(sk) == pk)
        got = ed25519.sign(sk, msg)
        check("RFC 8032 向量 %d：签名一致" % i, got == want)
        check("RFC 8032 向量 %d：验签通过" % i, ed25519.verify(pk, msg, want))
    bad = bytearray(bytes.fromhex(VECTORS[0][3]))
    bad[0] ^= 1
    check("改签名一位 → 拒绝",
          not ed25519.verify(bytes.fromhex(VECTORS[0][1]), b"", bytes(bad)))
    sk = bytes.fromhex(VECTORS[0][0])
    pk = bytes.fromhex(VECTORS[0][1])
    sig = bytearray(ed25519.sign(sk, b"x"))
    sig[32:] = (2 ** 252).to_bytes(32, "little")       # S = L → 必须拒绝
    check("S ≥ L → 拒绝", not ed25519.verify(pk, b"x", bytes(sig)))

    # ② 隔离树全链路
    work = os.path.join(tmp_root, "integrity-arm")
    if os.path.isdir(work):
        shutil.rmtree(work)
    _mini(work)
    os.makedirs(os.path.join(work, "data"), exist_ok=True)
    seed = ed25519.generate_seed()
    pub = ed25519.public_key(seed)
    manifest = integrity.build_manifest(work)
    integ = integrity.manifest_bytes(manifest)

    def verify_local(**kw):
        """用本臂的临时公钥验（不动 core.integrity 的全局常量）。"""
        import unittest.mock as _mock
        with _mock.patch.object(integrity, "PUBLIC_KEY_HEX", pub.hex()):
            return integrity.verify(work, **kw)

    def restore_local(**kw):
        """restore 现在要先验签拿清单，同样要临时公钥。"""
        import unittest.mock as _mock
        with _mock.patch.object(integrity, "PUBLIC_KEY_HEX", pub.hex()):
            return integrity.restore(work, **kw)

    with open(os.path.join(work, integrity.MANIFEST), "wb") as fh:
        fh.write(integ)
    with open(os.path.join(work, integrity.SIGNATURE), "wb") as fh:
        fh.write(ed25519.sign(seed, integ))
    with open(os.path.join(work, integrity.SEALED_ZIP), "wb") as fh:
        fh.write(integrity.pack_sealed_zip(work))

    res = verify_local()
    check("隔离树：首签验签通过", res["ok"], res["reason"])
    check("隔离树：SEALED 集合正确（7 个，注册表不在其中）",
          sorted(manifest["sealed"]) == ["README.md", "core/a.py",
                                         "core/consts/b.py", "plugins/_lex.py",
                                         "selftest/_s.py", "submit.py",
                                         "tools/t.py"],
          str(sorted(manifest["sealed"])))
    check("隔离树：TRACKED 只含判据插件",
          sorted(manifest["tracked"]) == ["plugins/rule-x.py",
                                          "plugins/rule-y.py"],
          str(sorted(manifest["tracked"])))
    check("清单序列化幂等", integrity.manifest_bytes(manifest) == integ)

    # 改机制层 → 精确点名
    _write(work, "core/a.py", "# core a tampered\n")
    res = verify_local()
    check("改机制层 → 判失败", not res["ok"])
    check("改机制层 → 精确点名", res["sealed_changed"] == ["core/a.py"],
          str(res["sealed_changed"]))
    n, errs = restore_local()
    check("restore → 字节还原",
          open(os.path.join(work, "core/a.py"), encoding="utf-8").read() == "# core a\n",
          "%d 个 / %s" % (n, errs[:1]))
    check("restore → 复验通过", verify_local()["ok"])

    # 改判据 → 严格口径判失败；strict=False 只列差异（过渡态核对用）
    _write(work, "plugins/rule-x.py", "# policy changed\n")
    res = verify_local()
    check("改判据 → 严格模式判失败（默认 strict）", not res["ok"], res["reason"])
    check("改判据 → 精确点名", res["tracked_changed"] == ["plugins/rule-x.py"],
          str(res["tracked_changed"]))
    check("改判据 → 原因指向插件封签", "判据插件" in (res["reason"] or ""),
          res["reason"])
    res = verify_local(strict=False)
    check("strict=False 只列差异不判失败", res["ok"], res["reason"])
    shutil.copyfile(os.path.join(work, integrity.SEALED_ZIP),
                    os.path.join(tmp_root, "arm-sealed.zip"))
    restore_local()

    # 改规则注册表 → v628 起**不**判封签失败（它已移出 SEALED，好让
    # rules import 随时改写）；判据层靠「注册表 ↔ 插件 sha 自洽」约束。
    # 先把判据恢复原样，避免 tracked 差异污染本用例。
    _write(work, "plugins/rule-x.py", "# policy\n")
    _write(work, "data/rules_registry.json",
           '{"rules":{"T02":{"severity":"error","desc":"tamper"}}}\n')
    res = verify_local()
    check("注册表不在 SEALED（v628）：改它不判封签失败",
          res["ok"] and "data/rules_registry.json" not in res["sealed_changed"],
          str(res["sealed_changed"]))
    check("注册表不在封签资产（sealed.zip 不含它）",
          "data/rules_registry.json" not in manifest["sealed"])

    # 多出/缺失机制层文件
    _write(work, "core/new.py", "# extra\n")
    res = verify_local()
    check("多出机制层文件 → 判失败", not res["ok"]
          and res["sealed_extra"] == ["core/new.py"], str(res["sealed_extra"]))
    os.remove(os.path.join(work, "core/new.py"))
    os.remove(os.path.join(work, "core/consts/b.py"))
    res = verify_local()
    check("机制层文件缺失 → 判失败", not res["ok"]
          and res["sealed_missing"] == ["core/consts/b.py"],
          str(res["sealed_missing"]))
    restore_local()

    # 改清单不重签 → 签名不成立
    mpath = os.path.join(work, integrity.MANIFEST)
    raw = open(mpath, "rb").read()
    with open(mpath, "wb") as fh:
        fh.write(raw.replace(b'"format":1', b'"format":2', 1))
    res = verify_local()
    check("改清单 → 签名不成立", "签名不成立" in res["reason"], res["reason"])
    with open(mpath, "wb") as fh:
        fh.write(raw)

    # zip slip 拒绝
    import zipfile
    slip = os.path.join(tmp_root, "slip.zip")
    with zipfile.ZipFile(slip, "w") as zf:
        zf.writestr("../evil.py", "evil\n")
        zf.writestr("submit.py", "# entry\n")
    n, errs = restore_local(zip_path=slip)
    check("zip slip 被拒", n == 1 and any("跳过" in e for e in errs),
          "恢复 %d / %s" % (n, errs))
    check("zip slip 未写出", not os.path.exists(
        os.path.join(tmp_root, "evil.py")))

    # ③ 真包只读断言
    real = integrity.verify(KIT, os.path.join(KIT, "data", "glossary.db"))
    if real.get("reason", "").startswith("未封签"):
        print("提示：真包未封签，跳过真包断言")
    else:
        check("真包验签通过", real["ok"], real["reason"])
        anchor = os.path.join(KIT, integrity.TRUST_ANCHOR)
        if integrity.PUBLIC_KEY_HEX and os.path.exists(anchor):
            import hashlib
            fp = hashlib.sha256(
                bytes.fromhex(integrity.PUBLIC_KEY_HEX)).hexdigest()[:16]
            check("包外锚点指纹一致", fp in open(anchor, encoding="utf-8").read(),
                  fp)

    # ④ 分发口径（2026-11-16）：包内必须带公钥与封签，**绝不带私钥**。
    #    工具包要能整体拷走分发给所有写作者，接收方无 .keys 也能验真伪。
    from core import pack as _pack
    need = {"data/integrity.json", "data/integrity.sig",
            "data/sealed.zip", "data/trust_anchor.txt",
            "data/rules_registry.json"}
    check("分发白名单含封签四件与规则注册表", need <= _pack.KIT_DATA_KEEP,
          str(sorted(need - _pack.KIT_DATA_KEEP)))
    check("规则注册表入包（接收方需据它校验插件指纹）",
          _pack.kit_skip("rules_registry.json",
                         "data/rules_registry.json") is None)
    check("sealed.zip 不被 .zip 扩展名挡掉",
          _pack.kit_skip("sealed.zip", "data/sealed.zip") is None)
    check("封签清单与签名入包",
          _pack.kit_skip("integrity.json", "data/integrity.json") is None
          and _pack.kit_skip("integrity.sig", "data/integrity.sig") is None)
    check("信任根入包",
          _pack.kit_skip("trust_anchor.txt",
                         "data/trust_anchor.txt") is None)
    check("运行库入包",
          _pack.kit_skip("glossary.db", "data/glossary.db") is None)
    check("data 目录私货不入包",
          _pack.kit_skip("random.json", "data/random.json") is not None)

    for bad_arc in (".keys/seal.key", "core/cert.pem", "tools/id_rsa.key"):
        try:
            _pack.kit_skip(os.path.basename(bad_arc), bad_arc)
        except RuntimeError:
            ok = True
        else:
            ok = False
        check("密钥材料拒绝打包：%s" % bad_arc, ok)

    mpath = os.path.join(KIT, integrity.MANIFEST)
    if os.path.exists(mpath):
        man = json.loads(io.open(mpath, encoding="utf-8").read())
        keys = list(man.get("sealed") or {}) + list(man.get("tracked") or {})
        check("封签清单不含私钥路径",
              bool(keys) and not [k for k in keys if ".keys" in k
                                  or k.lower().endswith((".key", ".pem"))])
    szip = os.path.join(KIT, integrity.SEALED_ZIP)
    if os.path.exists(szip):
        import zipfile as _zfm
        with _zfm.ZipFile(szip) as _z:
            names = _z.namelist()
        check("还原归档不含私钥",
              not [n for n in names if ".keys" in n
                   or n.lower().endswith((".key", ".pem"))])
        check("还原归档只含封签路径",
              set(names) == set(integrity.sealed_paths(KIT)),
              "%d vs %d" % (len(names), len(integrity.sealed_paths(KIT))))

    # 库快照忽略 build_id：打包时重算构建号，不该被误判成「绕过工具写库」
    import sqlite3
    snap_dir = tempfile.mkdtemp(prefix="snap-", dir=tmp_root)
    snaps = []
    try:
        for bid in ("aaa", "bbb"):
            p = os.path.join(snap_dir, "s-%s.db" % bid)
            con = sqlite3.connect(p)
            con.execute(
                "CREATE TABLE meta(policy_version INTEGER, build_id TEXT)")
            con.execute("INSERT INTO meta VALUES(7, ?)", (bid,))
            con.execute("CREATE TABLE t(x TEXT)")
            con.execute("INSERT INTO t VALUES('v')")
            con.commit()
            con.close()
            snaps.append(integrity.db_snapshot(p))
    finally:
        shutil.rmtree(snap_dir, ignore_errors=True)
    check("库快照忽略 build_id（分发包重算构建号不误报）",
          snaps[0] == snaps[1])

    # sign 缺省必须写当前时间：空的 signed_at 让 status 显示「签于 —」，
    # 接收方无法判断包是何时签的（--at 仍可手工覆盖做可重现构建）。
    with io.open(os.path.join(KIT, integrity.MANIFEST), encoding="utf-8") as fh:
        signed_at = json.load(fh).get("signed_at") or ""
    check("清单带签名时间（sign 缺省取当前时间）",
          bool(signed_at) and "T" in signed_at, signed_at[:25])

    print("\nFAIL %d / 断言 %d" % (len(fails), total[0]))
    return 0 if not fails else 1


if __name__ == "__main__":
    sys.exit(main())
