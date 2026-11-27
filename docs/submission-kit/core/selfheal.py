# -*- coding: utf-8 -*-
"""入口自愈：编写者模式下把工具包还原到「封签 + 注册表」定义的状态。

用户口径（2026-11-19）：做不到禁止编写者改文件，那就**每次运行立刻复原**——
被修改/被删除的框架文件还原，名单之外的新增文件移入 `<tmp>/待删除/`；只有
维护者（持私钥）可以改。

三类状态机：

  * **维护者模式**：本机存在 `.keys/seal.key`。跳过自愈——维护者正在改代码，
    改动要能存活到他重签。`integrity` 仍会如实报告差异。
  * **编写者模式**：
      - 封签验签失败（清单/签名被改）→ 直接拒绝运行：清单已不可信，任何
        「按清单复原」都没有依据，只能从原始分发包重新解压。
      - SEALED 文件被改/被删 → 从 `data/sealed.zip` 逐字节还原。
      - 清单外文件 → 归档到 `<tmp>/待删除/`。
      - 判据层以 `data/rules_registry.json` 为准：插件/自检臂的 sha 必须与
        注册表一致；不符的归档（无法还原内容——注册表只存 sha）。`rules
        import|delete` 会同步更新两者，所以刚导入的规则不会被误清。

为什么注册表不在 SEALED：编写者随时 `rules import` 必须能改写注册表；若它
受封签保护，下一次入口会把刚导入的规则还原掉。代价是「手写插件 + 手改注册表」
可以自洽绕过 import 的静态校验——这属判据面（编写者本就可写），由
`integrity` 的 tracked 偏离与审计追责，而不是靠私钥。

本模块零副作用之外的写入仅限：还原封签文件、归档清单外文件。
"""
import os
import zipfile

from core import integrity, rule_registry, tmp_root

PRIVATE_KEY = os.path.join(".keys", "seal.key")


def is_maintainer(kit_dir):
    """持私钥即维护者：维护者本机可自由改框架代码，靠重签定版。"""
    return os.path.isfile(os.path.join(kit_dir, PRIVATE_KEY))


def _sha(path):
    import hashlib
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()


def _extract(zf, name, dest):
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with zf.open(name) as src, open(dest, "wb") as out:
        out.write(src.read())


def heal(kit_dir, tmp=None):
    """→ {"mode", "restored", "archived", "errors", "fatal"}。

    `fatal` 非空表示清单不可信，调用方应拒绝继续运行。
    `tmp` 为 None 时尝试从命令行 --tmp 解析；仍无则跳过归档（只做还原）。
    """
    rep = {"mode": "writer", "restored": [], "archived": [],
           "errors": [], "fatal": ""}
    if is_maintainer(kit_dir):
        rep["mode"] = "maintainer"
        return rep

    man, err = integrity.load_manifest(kit_dir)
    if err:
        rep["fatal"] = err
        return rep

    if tmp is None:
        try:
            tmp = tmp_root.resolve_tmp(None)
        except tmp_root.TmpInsideKit:
            tmp = None

    if "assets" not in man:
        rep["fatal"] = ("封签清单缺 assets 段：清单不可信，"
                        "请从原始分发包重新解压")
        return rep
    sealed = man.get("sealed") or {}
    zip_path = os.path.join(kit_dir, integrity.SEALED_ZIP)
    zf = zipfile.ZipFile(zip_path) if os.path.exists(zip_path) else None
    try:
        names = set(zf.namelist()) if zf else set()
        # ① 还原：SEALED 被改 / 被删
        for rel, want in sorted(sealed.items()):
            p = os.path.join(kit_dir, rel.replace("/", os.sep))
            got = _sha(p) if os.path.isfile(p) else None
            if got == want:
                continue
            if rel not in names:
                rep["errors"].append("无法还原 %s：sealed.zip 缺该文件" % rel)
                continue
            _extract(zf, rel, p)
            rep["restored"].append(rel)

        # ② 归档：清单外文件（逐文件全集 = 运行时 + SEALED + assets + 注册表插件）
        allowed = integrity.allowed_files(kit_dir, man)
        for dirpath, dirnames, filenames in os.walk(kit_dir):
            dirnames[:] = [d for d in dirnames if d not in integrity.SKIP_DIRS]
            for name in filenames:
                if name.endswith(integrity.SKIP_SUFFIX):
                    continue
                p = os.path.join(dirpath, name)
                rel = integrity._rel(kit_dir, p)
                if rel in allowed or rel in integrity.SKIP_FILES:
                    continue
                if tmp is None:
                    rep["errors"].append("清单外文件未归档（缺 --tmp）：%s" % rel)
                    continue
                tmp_root.archive_delete(p, label="selfheal", tmp=tmp)
                rep["archived"].append(rel)

        # ③ 判据层：插件/自检臂 sha 必须与注册表一致
        data, _e = rule_registry.try_load(kit_dir)
        if data:
            for key, sub in (("plugins", "plugins"), ("selftest", "selftest")):
                for name, rec in (data.get(key) or {}).items():
                    rel = "%s/%s" % (sub, name)
                    p = os.path.join(kit_dir, rel.replace("/", os.sep))
                    want = str(rec.get("sha256") or "")
                    got = _sha(p) if os.path.isfile(p) else None
                    if got == want:
                        continue
                    if got is None:
                        rep["errors"].append("判据缺失：%s（注册表有登记，"
                                             "无内容备份，请重新 import）" % rel)
                    elif tmp is not None:
                        tmp_root.archive_delete(p, label="selfheal-plugin",
                                                tmp=tmp)
                        rep["archived"].append(rel)
                    else:
                        rep["errors"].append("判据与注册表不符（缺 --tmp 未归档）：%s"
                                             % rel)
    finally:
        if zf:
            zf.close()
    return rep
