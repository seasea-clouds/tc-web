# -*- coding: utf-8 -*-
"""完整性封签：机制层文件清单的签名、验签与还原（不依赖 git）。

**为什么不依赖 git**：分发给外部写作者的工具包通常不带 `.git`（体积、许可、
误操作），而「机制层被改」这件事必须能在**裸目录**里被发现。本模块只读文件
系统与 SQLite，不调用 git。

**两类文件，两种纪律**（口径见 README「治理」节）：

    SEALED   机制层：core/、submit.py、tools/、selftest/、plugins/_*.py
             必须与签名清单**逐字节一致**。改动需私钥重签；分发后无私钥，
             因此「改了就验不过」。
    TRACKED  判据插件 plugins/*.py（不含 `_`）
             允许修改，但必须留痕：相对封签的差异会被列出，供复核 RATIONALE
             与 check 结果；不是「篡改」，是「变更审计」。

策略库（glossary.db）单独记**内容快照**：逐表有序行哈希 + `policy_version`。
表哈希变了而版本号没变 → 说明有人绕过工具直接写库（异常）；版本号也变了 →
正常变更，需核对 changeset 记录。

**还原**：`sign` 同时产出 `data/sealed.zip`（SEALED 文件的原始字节）。
SEALED 被改后可用它就地还原，不必有 git 历史；zip 本身被替换时，其摘要
已进签名，验签会失败 → 从原始发布包重新取。

**信任根**：公钥硬编码在本文件 `PUBLIC_KEY_HEX`，其指纹另记在
`data/trust_anchor.txt` 与 README。包内一切都能被改，唯有「指纹与包外记录
是否一致」需要人核对一次——这是本方案无法自动化的部分，如实写在这里。
"""
import fnmatch
import hashlib
import io
import json
import os
import sqlite3
import zipfile

from core import ed25519

MANIFEST = "data/integrity.json"
SIGNATURE = "data/integrity.sig"
SEALED_ZIP = "data/sealed.zip"
TRUST_ANCHOR = "data/trust_anchor.txt"

# 机制层：改它等于改判据引擎，必须持私钥重签
SEALED_GLOBS = ("core/*.py", "core/consts/*.py", "submit.py",
                "tools/*.py", "tools/hooks/*.py", "selftest/*.py",
                "plugins/_*.py")
# 判据面：允许改，但相对封签的差异要列出来（变更审计）
TRACKED_GLOBS = ("plugins/*.py",)

# 扫描时永远跳过的路径（运行时产物，不属于发布内容）
SKIP_DIRS = {"__pycache__", ".state", ".clean", ".cache", ".keys", "tmp"}
SKIP_SUFFIX = (".pyc", ".pyo", ".log", ".db-wal", ".db-shm")
SKIP_FILES = {MANIFEST, SIGNATURE, SEALED_ZIP, TRUST_ANCHOR,
              "data/glossary.db"}

# 首签后由 `submit.py tools integrity_seal` 的 keygen/sign 写入（32 字节公钥 hex）
PUBLIC_KEY_HEX = "8c873cd466e550f8502ab1825b65acfaafb5bcb0b1296e7bd425f0331fc45220"


def _rel(root, path):
    return os.path.relpath(path, root).replace("\\", "/")


def _sha256_bytes(data):
    return hashlib.sha256(data).hexdigest()


def sealed_paths(root):
    """→ 排序后的 SEALED 相对路径（不读内容，便于快速判断集合）。"""
    out = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for name in filenames:
            if name.endswith(SKIP_SUFFIX):
                continue
            rel = _rel(root, os.path.join(dirpath, name))
            if rel in SKIP_FILES:
                continue
            if any(fnmatch.fnmatch(rel, pat) for pat in SEALED_GLOBS):
                out.append(rel)
    return sorted(out)


def tracked_paths(root, sealed=None):
    sealed = set(sealed or sealed_paths(root))
    out = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for name in filenames:
            if name.endswith(SKIP_SUFFIX):
                continue
            rel = _rel(root, os.path.join(dirpath, name))
            if rel in sealed or rel in SKIP_FILES:
                continue
            if any(fnmatch.fnmatch(rel, pat) for pat in TRACKED_GLOBS):
                out.append(rel)
    return sorted(out)


def scan(root):
    """→ {"sealed": {rel: sha256}, "tracked": {rel: sha256}}"""
    sealed = sealed_paths(root)
    out = {"sealed": {}, "tracked": {}}
    for rel in sealed:
        with open(os.path.join(root, rel), "rb") as fh:
            out["sealed"][rel] = _sha256_bytes(fh.read())
    for rel in tracked_paths(root, set(sealed)):
        with open(os.path.join(root, rel), "rb") as fh:
            out["tracked"][rel] = _sha256_bytes(fh.read())
    return out


def db_snapshot(db_path):
    """→ {"policy_version": int, "tables": {表名: sha256}}；库缺失返回 None。

    表哈希按「表名 + 排序后的整行」计算，与页布局、VACUUM 无关——只反映
    逻辑内容（与 tools/db_diff.py 同口径，那边比的是 HEAD 副本）。
    """
    if not os.path.exists(db_path) or os.path.getsize(db_path) == 0:
        return None
    con = sqlite3.connect("file:%s?mode=ro" % db_path, uri=True)
    try:
        names = [r[0] for r in con.execute(
            "SELECT name FROM sqlite_master WHERE type='table' "
            "AND name NOT LIKE 'sqlite_%' ORDER BY name")]
        tables = {}
        for name in names:
            h = hashlib.sha256()
            h.update(name.encode("utf-8"))
            cols = [r[1] for r in con.execute(
                'PRAGMA table_info("%s")' % name)]
            bi = cols.index("build_id") if "build_id" in cols else -1
            # 按整行排序后再哈希：VACUUM 可能重排 rowid，不排序会让
            # 分发包里的净化快照被误判成「绕过工具写库」（2026-11-16 修）。
            # build_id 是打包时重算的构建产物，不属逻辑内容——分发包的
            # 库快照若把它算进去，接收方必然误报。
            rows = []
            for row in con.execute('SELECT * FROM "%s"' % name):
                if bi >= 0:
                    row = tuple("" if i == bi else v
                                for i, v in enumerate(row))
                rows.append(repr(row))
            for r in sorted(rows):
                h.update(r.encode("utf-8"))
            tables[name] = h.hexdigest()
        pv = 0
        if "meta" in names:
            row = con.execute("SELECT policy_version FROM meta").fetchone()
            pv = int(row[0]) if row else 0
        return {"policy_version": pv, "tables": tables}
    finally:
        con.close()


def build_manifest(root, db_path=None):
    data = scan(root)
    manifest = {
        "format": 1,
        "sealed": data["sealed"],
        "tracked": data["tracked"],
    }
    if db_path:
        snap = db_snapshot(db_path)
        if snap:
            manifest["db"] = snap
    return manifest


def manifest_bytes(manifest):
    """规范化序列化：排序键 + 紧凑分隔符 + ASCII 转义，保证跨平台一致。"""
    return json.dumps(manifest, sort_keys=True, ensure_ascii=True,
                      separators=(",", ":")).encode("utf-8")


def root_digest(manifest):
    return _sha256_bytes(manifest_bytes(manifest))


def sign_manifest(seed, manifest):
    return ed25519.sign(seed, manifest_bytes(manifest))


def verify(root, db_path=None):
    """→ 结果字典。`ok=False` 表示 SEALED 被改/缺失/多出，或签名不成立。

    tracked 差异不算失败（判据允许改），`db` 异常单独标记。
    """
    res = {"ok": False, "reason": "", "sealed_changed": [], "sealed_missing": [],
           "sealed_extra": [], "tracked_changed": [], "tracked_missing": [],
           "tracked_extra": [], "db": {}, "root_digest": "", "signed_at": ""}
    mpath = os.path.join(root, MANIFEST)
    spath = os.path.join(root, SIGNATURE)
    if not os.path.exists(mpath) or not os.path.exists(spath):
        res["reason"] = "未封签：缺 %s 或 %s" % (MANIFEST, SIGNATURE)
        return res
    raw = open(mpath, "rb").read()
    sig = open(spath, "rb").read()
    if not PUBLIC_KEY_HEX:
        res["reason"] = "未内置公钥：PUBLIC_KEY_HEX 为空，无法验签"
        return res
    try:
        pub = bytes.fromhex(PUBLIC_KEY_HEX)
    except ValueError:
        res["reason"] = "PUBLIC_KEY_HEX 不是合法 hex"
        return res
    if not ed25519.verify(pub, raw, sig):
        res["reason"] = "签名不成立：清单被改过，或用另一把私钥重签过"
        return res
    try:
        manifest = json.loads(raw.decode("utf-8"))
    except ValueError:
        res["reason"] = "清单不是合法 JSON"
        return res
    res["root_digest"] = root_digest(manifest)
    res["signed_at"] = manifest.get("signed_at", "")

    now = scan(root)
    old_sealed = manifest.get("sealed") or {}
    old_tracked = manifest.get("tracked") or {}
    res["sealed_changed"] = sorted(k for k in old_sealed
                                   if k in now["sealed"]
                                   and now["sealed"][k] != old_sealed[k])
    res["sealed_missing"] = sorted(set(old_sealed) - set(now["sealed"]))
    res["sealed_extra"] = sorted(set(now["sealed"]) - set(old_sealed))
    res["tracked_changed"] = sorted(k for k in old_tracked
                                    if k in now["tracked"]
                                    and now["tracked"][k] != old_tracked[k])
    res["tracked_missing"] = sorted(set(old_tracked) - set(now["tracked"]))
    res["tracked_extra"] = sorted(set(now["tracked"]) - set(old_tracked))

    db_diff = {}
    if db_path and manifest.get("db"):
        snap = db_snapshot(db_path)
        if not snap:
            db_diff = {"status": "missing"}
        else:
            old = manifest["db"]
            changed = sorted(t for t, v in old.get("tables", {}).items()
                             if snap["tables"].get(t) != v)
            added = sorted(set(snap["tables"]) - set(old.get("tables", {})))
            dropped = sorted(set(old.get("tables", {})) - set(snap["tables"]))
            if changed or added or dropped:
                db_diff = {
                    "status": ("version_bumped"
                               if snap["policy_version"] != old.get(
                                   "policy_version")
                               else "silent_write"),
                    "policy_version": [old.get("policy_version"),
                                       snap["policy_version"]],
                    "tables_changed": changed, "tables_added": added,
                    "tables_dropped": dropped,
                }
            else:
                db_diff = {"status": "same",
                           "policy_version": [old.get("policy_version"),
                                              snap["policy_version"]]}
    res["db"] = db_diff
    res["ok"] = not (res["sealed_changed"] or res["sealed_missing"]
                     or res["sealed_extra"])
    if not res["ok"]:
        res["reason"] = "机制层与封签不一致"
    return res


def pack_sealed_zip(root, paths=None):
    """把 SEALED 文件原件打进 zip（stored，字节级），用于无 git 还原。"""
    paths = paths or sealed_paths(root)
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_STORED) as zf:
        for rel in paths:
            zf.write(os.path.join(root, rel), arcname=rel)
    return buf.getvalue()


def restore(root, zip_path=None):
    """用封签归档覆盖 SEALED 文件 → (恢复数, 错误)。

    只恢复封签集合内的路径，且拒绝 `..` 与绝对路径（防 zip slip）。
    """
    zip_path = zip_path or os.path.join(root, SEALED_ZIP)
    if not os.path.exists(zip_path):
        return 0, ["缺归档 %s：从原始发布包重新解压" % zip_path]
    allowed = set(sealed_paths(root))
    n, errors = 0, []
    with zipfile.ZipFile(zip_path) as zf:
        for name in zf.namelist():
            norm = name.replace("\\", "/").lstrip("/")
            if ".." in norm.split("/") or norm not in allowed:
                errors.append("跳过非封签路径：%s" % name)
                continue
            dest = os.path.join(root, norm)
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            with zf.open(name) as src, open(dest, "wb") as out:
                out.write(src.read())
            n += 1
    return n, errors
