# -*- coding: utf-8 -*-
"""完整性封签工具：生成密钥、签清单、验签、就地还原（机制层，写库无关）。

用法（发布方）：

    python submit.py tools integrity_seal keygen --install
        # 生成 .keys/seal.key（不进包、不进 git），并把公钥写进 core/integrity.py

    python submit.py tools integrity_seal sign
        # 产出 data/integrity.json / .sig / sealed.zip / trust_anchor.txt

用法（使用方，只读）：

    python submit.py tools integrity_seal verify
    python submit.py tools integrity_seal status
    python -u submit.py integrity --restore        # 还原机制层后再验

**公钥指纹要包外核对一次**：`sign` 会打印 `SHA256:<前16位>`，把它写进发布
说明/README；`verify` 也打印同一指纹，两者不一致就说明公钥被换过（连签名
一起换的那种）。这是本方案唯一必须人工确认的环节，其余全自动。
"""
import argparse
import datetime
import hashlib
import io
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.dirname(HERE)
if KIT not in sys.path:
    sys.path.insert(0, KIT)

from core import ed25519      # noqa: E402
from core import integrity    # noqa: E402

DEFAULT_KEY = os.path.join(KIT, ".keys", "seal.key")
INTEGRITY_MODULE = os.path.join(KIT, "core", "integrity.py")


def fingerprint(pub):
    return "SHA256:" + hashlib.sha256(pub).hexdigest()[:16]


def _load_key(path):
    if not os.path.exists(path):
        raise SystemExit("缺私钥 %s：先运行 keygen --install（发布方本机才需要）"
                         % path)
    raw = open(path, "r", encoding="ascii").read().strip()
    seed = bytes.fromhex(raw)
    if len(seed) != 32:
        raise SystemExit("私钥必须是 32 字节 hex")
    return seed


def _install_pubkey(pub_hex):
    src = open(INTEGRITY_MODULE, encoding="utf-8").read()
    marker = 'PUBLIC_KEY_HEX = ""'
    if marker in src:
        src = src.replace(marker, 'PUBLIC_KEY_HEX = "%s"' % pub_hex, 1)
    else:
        # 已安装过：整体替换旧值
        import re
        src = re.sub(r'PUBLIC_KEY_HEX = "[0-9a-f]*"',
                     'PUBLIC_KEY_HEX = "%s"' % pub_hex, src, count=1)
    io.open(INTEGRITY_MODULE, "w", encoding="utf-8", newline="\n").write(src)


def cmd_keygen(args):
    path = args.key or DEFAULT_KEY
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if os.path.exists(path) and not args.force:
        raise SystemExit("私钥已存在：%s（覆盖会作废旧签名，确需重建加 --force）"
                         % path)
    seed = ed25519.generate_seed()
    pub = ed25519.public_key(seed)
    with open(path, "w", encoding="ascii", newline="\n") as fh:
        fh.write(seed.hex() + "\n")
    try:
        os.chmod(path, 0o600)
    except OSError:
        pass
    print("私钥 → %s（32 字节 seed，勿外传）" % path)
    print("公钥 → %s" % pub.hex())
    print("指纹 → %s" % fingerprint(pub))
    if args.install:
        _install_pubkey(pub.hex())
        print("已写入 core/integrity.py 的 PUBLIC_KEY_HEX")
    else:
        print("下一步：把上面公钥写进 core/integrity.py 的 PUBLIC_KEY_HEX"
              "（或加 --install 自动写），再运行 sign")
    return 0


def cmd_sign(args):
    seed = _load_key(args.key or DEFAULT_KEY)
    pub = ed25519.public_key(seed)
    if integrity.PUBLIC_KEY_HEX and integrity.PUBLIC_KEY_HEX != pub.hex():
        raise SystemExit("私钥与 core/integrity.py 内置公钥不匹配：先 keygen "
                         "--install 或改回对应私钥")
    if not integrity.PUBLIC_KEY_HEX:
        _install_pubkey(pub.hex())
        print("PUBLIC_KEY_HEX 为空，已自动写入当前公钥")
        # 重新导入以取到新值（验签路径只读模块常量）
        import importlib
        importlib.reload(integrity)
    manifest = integrity.build_manifest(
        KIT, os.path.join(KIT, "data", "glossary.db"))
    manifest["signed_at"] = args.at or datetime.datetime.now().astimezone()\
        .isoformat(timespec="seconds")
    sig = integrity.sign_manifest(seed, manifest)
    raw = integrity.manifest_bytes(manifest)
    with open(os.path.join(KIT, integrity.MANIFEST), "wb") as fh:
        fh.write(raw)
    with open(os.path.join(KIT, integrity.SIGNATURE), "wb") as fh:
        fh.write(sig)
    with open(os.path.join(KIT, integrity.SEALED_ZIP), "wb") as fh:
        fh.write(integrity.pack_sealed_zip(KIT))
    anchor = ("公钥 %s\n指纹 %s\n清单摘要 %s\n签于 %s\n"
              % (pub.hex(), fingerprint(pub),
                 integrity.root_digest(manifest), manifest["signed_at"]))
    io.open(os.path.join(KIT, integrity.TRUST_ANCHOR), "w",
            encoding="utf-8", newline="\n").write(anchor)
    print("封签完成：sealed %d 个 / tracked %d 个 / 库表 %d 张"
          % (len(manifest["sealed"]), len(manifest["tracked"]),
             len(manifest.get("db", {}).get("tables", {}))))
    print("清单摘要 %s" % integrity.root_digest(manifest))
    print("公钥指纹 %s" % fingerprint(pub))
    print("已写出 %s / %s / %s / %s" % (integrity.MANIFEST,
                                        integrity.SIGNATURE,
                                        integrity.SEALED_ZIP,
                                        integrity.TRUST_ANCHOR))
    return 0


def _print_result(res, verbose=True):
    if res.get("reason") and res["reason"].startswith("未封签"):
        print("状态：未封签（%s）" % res["reason"])
        return 0
    if res.get("reason"):
        print("状态：**FAIL** — %s" % res["reason"])
    else:
        print("状态：OK（机制层与封签一致）")
    if res.get("root_digest"):
        print("清单摘要 %s（签于 %s）"
              % (res["root_digest"], res.get("signed_at") or "—"))
    if integrity.PUBLIC_KEY_HEX:
        print("公钥指纹 %s（与包外记录核对）"
              % fingerprint(bytes.fromhex(integrity.PUBLIC_KEY_HEX)))
    if verbose:
        for key, label in (("sealed_changed", "机制层被改"),
                           ("sealed_missing", "机制层缺失"),
                           ("sealed_extra", "机制层多出")):
            if res.get(key):
                print("%s %d 个：%s" % (label, len(res[key]),
                                        ", ".join(res[key][:8])))
        for key, label in (("tracked_changed", "判据插件有改动"),
                           ("tracked_missing", "判据插件缺失"),
                           ("tracked_extra", "判据插件新增")):
            if res.get(key):
                print("%s %d 个：%s" % (label, len(res[key]),
                                        ", ".join(res[key][:8])))
        db = res.get("db") or {}
        if db.get("status") == "silent_write":
            print("库：**表内容变了但 policy_version 未变**（绕过工具直接写库？）"
                  " %s" % ", ".join(db.get("tables_changed", [])))
        elif db.get("status") == "version_bumped":
            print("库：正常变更（policy %s → %s），需核对 changeset 记录"
                  % tuple(db.get("policy_version", [0, 0])))
        elif db.get("status") == "missing":
            print("库：缺失")
    return 0 if res.get("ok") or not res.get("reason") else 1


def cmd_verify(args):
    res = integrity.verify(KIT, os.path.join(KIT, "data", "glossary.db"))
    return _print_result(res, verbose=not args.quiet)


def cmd_status(args):
    mpath = os.path.join(KIT, integrity.MANIFEST)
    if not os.path.exists(mpath):
        print("未封签")
        return 0
    manifest = json.loads(open(mpath, encoding="utf-8").read())
    print("sealed %d 个 / tracked %d 个 / 库表 %d 张"
          % (len(manifest.get("sealed", {})), len(manifest.get("tracked", {})),
             len(manifest.get("db", {}).get("tables", {}))))
    print("清单摘要 %s" % integrity.root_digest(manifest))
    print("签于 %s" % (manifest.get("signed_at") or "—"))
    print("库 policy_version %s"
          % (manifest.get("db", {}).get("policy_version")))
    if integrity.PUBLIC_KEY_HEX:
        print("公钥指纹 %s"
              % fingerprint(bytes.fromhex(integrity.PUBLIC_KEY_HEX)))
    else:
        print("公钥：未内置")
    return 0


def main(argv=None):
    ap = argparse.ArgumentParser(description="机制层封签：keygen/sign/verify/status")
    sub = ap.add_subparsers(dest="cmd", required=True)
    g = sub.add_parser("keygen", help="生成私钥并（可选）安装公钥")
    g.add_argument("--key", help="私钥路径（缺省 .keys/seal.key）")
    g.add_argument("--install", action="store_true",
                   help="把公钥写进 core/integrity.py")
    g.add_argument("--force", action="store_true", help="覆盖已有私钥")
    g.set_defaults(func=cmd_keygen)

    s = sub.add_parser("sign", help="签清单并产出还原归档")
    s.add_argument("--key", help="私钥路径（缺省 .keys/seal.key）")
    s.add_argument("--at", help="签名时间（ISO；缺省取当前时间）")
    s.set_defaults(func=cmd_sign)

    v = sub.add_parser("verify", help="验签并列出差异")
    v.add_argument("--quiet", action="store_true", help="只打状态与摘要")
    v.set_defaults(func=cmd_verify)

    st = sub.add_parser("status", help="打印封签摘要")
    st.set_defaults(func=cmd_status)

    a = ap.parse_args(argv)
    return a.func(a)


if __name__ == "__main__":
    import os as _os
    import sys as _sys
    _sys.path.insert(0, _os.path.dirname(_os.path.dirname(
        _os.path.abspath(__file__))))
    from tools import require_entry
    require_entry("integrity_seal")
    sys.exit(main())
