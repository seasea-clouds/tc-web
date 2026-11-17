# -*- coding: utf-8 -*-
"""core/pkgio.py — 包读写与图片。

投稿包加载/打包、路径安全、图片尺寸与完整性。

M4（2026-11-12）后 core 只提供事实：本模块不得 import 任何判据实现，
也不得反向依赖 core.checker（装载顺序上它在更下层）。
"""
# 治理声明：本文件属机制层，不承载策略数据；改动须走 README「治理」节的 L3 流程
#（先登记理由 → 行为级等价断言 → selftest --kit 全量），提交说明带 [arch]
#（commit-msg 钩子强制）。策略变更请改 plugins/ 判据或经 submit.py glossary 改库。

import os
import re
import zipfile

from core.consts import (
    IMAGE_NAME_BAD_RE, IMAGE_NAME_SEO_RE, JUNK_NAMES, JUNK_PARTS,
    MAX_MEMBER_BYTES, MAX_PACKAGE_BYTES, MAX_PACKAGE_FILES,
)
from core.model import PackageInputError


def image_name_ok(name):
    """配图名是否有检索含义：小写多段 kebab-case，≥8 字符，非纯序号。"""
    stem = name[:-5] if name.lower().endswith(".webp") \
        else os.path.splitext(name)[0]
    return (len(stem) >= 8 and bool(IMAGE_NAME_SEO_RE.match(stem))
            and not IMAGE_NAME_BAD_RE.match(stem))


def _safe_rel(name):
    """归一化后仍拒绝绝对路径、'..'、盘符与反斜杠穿越。"""
    n = name.replace("\\", "/")
    if n.startswith("/") or re.match(r"^[A-Za-z]:", n):
        return None
    parts = n.split("/")
    if any(p in ("..", "") for p in parts if p not in (".", "")):
        return None
    if ".." in parts:
        return None
    return "/".join(p for p in parts if p not in ("", "."))


def load_package(path):
    """返回 (dict[相对路径: bytes], 解压后总字节数)。目录与 zip 同政策。

    A17/I14：读取前先校验成员数、单件大小、累计大小、重名与非法路径；
    目录分支同样返回 total_bytes，因此 S06 在两种输入下一致；拒绝符号链接，
    避免把包外内容读进来（打包侧同样不跟随）。
    """
    files = {}
    if os.path.isdir(path):
        total = 0
        count = 0
        root_abs = os.path.abspath(path)
        for root, dirs, names in os.walk(path, followlinks=False):
            dirs[:] = sorted(d for d in dirs
                             if not os.path.islink(os.path.join(root, d)))
            for n in sorted(names):
                full = os.path.join(root, n)
                if os.path.islink(full):
                    raise PackageInputError("目录内含符号链接，拒绝读取: %s"
                                            % os.path.relpath(full, path))
                if not os.path.abspath(full).startswith(root_abs + os.sep):
                    raise PackageInputError("路径越出包目录: %s" % n)
                rel = os.path.relpath(full, path).replace(os.sep, "/")
                if _safe_rel(rel) is None:
                    raise PackageInputError("非法相对路径: %s" % rel)
                sz = os.path.getsize(full)
                count += 1
                total += sz
                if count > MAX_PACKAGE_FILES:
                    raise PackageInputError("文件数 %d 超过上限 %d" %
                                           (count, MAX_PACKAGE_FILES))
                if sz > MAX_MEMBER_BYTES:
                    raise PackageInputError("单文件 %.1f MB 超过上限: %s" %
                                           (sz / 1048576.0, rel))
                if total > MAX_PACKAGE_BYTES:
                    raise PackageInputError("解压后总大小 %.1f MB 超过 60 MB" %
                                           (total / 1048576.0))
                with open(full, "rb") as fh:
                    files[rel] = fh.read()
        return files, total

    if not os.path.isfile(path):
        raise PackageInputError("找不到文件或目录: %s" % path)
    total = 0
    with zipfile.ZipFile(path) as zf:
        infos = [i for i in zf.infolist() if not i.is_dir()]
        if len(infos) > MAX_PACKAGE_FILES:
            raise PackageInputError("压缩包成员数 %d 超过上限 %d" %
                                   (len(infos), MAX_PACKAGE_FILES))
        seen = set()
        for info in infos:
            name = info.filename.replace("\\", "/")
            rel = _safe_rel(name)
            if rel is None:
                raise PackageInputError("压缩包内含非法路径: %s" % name)
            if rel in seen:
                raise PackageInputError("压缩包内归一化后重名成员: %s" % rel)
            seen.add(rel)
            total += info.file_size
            if info.file_size > MAX_MEMBER_BYTES:
                raise PackageInputError("压缩包成员 %.1f MB 超过上限: %s" %
                                       (info.file_size / 1048576.0, rel))
        if total > MAX_PACKAGE_BYTES:
            raise PackageInputError("解压后总大小 %.1f MB 超过 60 MB" %
                                   (total / 1048576.0))
        for info in infos:
            name = info.filename.replace("\\", "/")
            rel = _safe_rel(name)
            data = zf.read(info)
            # 声明大小与实际解压量不符（压缩炸弹/损坏）也要挡
            if len(data) > MAX_PACKAGE_BYTES - total + info.file_size + 1:
                raise PackageInputError("成员解压量与声明不符: %s" % rel)
            files[rel] = data
    return files, total


def webp_size(data):
    """解析 webp 宽高；失败返回 None。"""
    if len(data) < 30 or data[:4] != b"RIFF" or data[8:12] != b"WEBP":
        return None
    if int.from_bytes(data[4:8], "little") + 8 > len(data):
        return None          # RIFF 声明大于实际字节 = 被截断（A16）
    fourcc = data[12:16]
    try:
        if fourcc == b"VP8 ":
            w = int.from_bytes(data[26:28], "little") & 0x3FFF
            h = int.from_bytes(data[28:30], "little") & 0x3FFF
            return w, h
        if fourcc == b"VP8L":
            bits = int.from_bytes(data[21:25], "little")
            w = (bits & 0x3FFF) + 1
            h = ((bits >> 14) & 0x3FFF) + 1
            return w, h
        if fourcc == b"VP8X":
            w = int.from_bytes(data[24:27], "little") + 1
            h = int.from_bytes(data[27:30], "little") + 1
            return w, h
    except Exception:
        return None
    return None


def image_integrity(name, data):
    """A16：头部尺寸正确不代表载荷可解码。返回问题串或 None。

    WebP 校验 RIFF 声明长度与 chunk 边界；PNG 校验 IEND；JPEG 校验 EOI。
    只做结构完整性，不做像素级解码（发布前仍建议用图像库复核）。
    """
    low = name.lower()
    if low.endswith(".webp"):
        if len(data) < 30 or data[:4] != b"RIFF" or data[8:12] != b"WEBP":
            return "不是可识别的 WebP 容器"
        declared = int.from_bytes(data[4:8], "little") + 8
        if declared > len(data):
            return "RIFF 声明 %d 字节 > 实际 %d 字节（文件被截断）" % (
                declared, len(data))
        pos = 12
        while pos + 8 <= len(data):
            sz = int.from_bytes(data[pos + 4:pos + 8], "little")
            step = sz + (sz & 1)
            if pos + 8 + step > len(data):
                return "chunk 超出文件末尾（载荷不完整）"
            pos += 8 + step
        return None
    if low.endswith(".png"):
        if not data.startswith(b"\x89PNG\r\n\x1a\n"):
            return "PNG 签名缺失"
        if not data.endswith(b"IEND\xaeB`\x82"):
            return "PNG 缺 IEND 结束块（文件被截断）"
        return None
    if low.endswith((".jpg", ".jpeg")):
        if not data.startswith(b"\xff\xd8"):
            return "JPEG 缺 SOI 标记"
        if not data.endswith(b"\xff\xd9"):
            return "JPEG 缺 EOI 标记（文件被截断）"
        return None
    return None


def image_size(name, data):
    low = name.lower()
    if low.endswith(".webp"):
        return webp_size(data)
    if low.endswith(".png") and data[:8] == b"\x89PNG\r\n\x1a\n":
        return (int.from_bytes(data[16:20], "big"), int.from_bytes(data[20:24], "big"))
    if low.endswith((".jpg", ".jpeg")) and data[:2] == b"\xff\xd8":
        i = 2
        while i < len(data) - 9:
            if data[i] != 0xFF:
                i += 1
                continue
            marker = data[i + 1]
            if marker in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
                h = int.from_bytes(data[i + 5:i + 7], "big")
                w = int.from_bytes(data[i + 7:i + 9], "big")
                return w, h
            seg = int.from_bytes(data[i + 2:i + 4], "big")
            i += 2 + seg
        return None
    return None


def _is_junk(relpath):
    parts = relpath.replace("\\", "/").split("/")
    for p in parts:
        if p.startswith(".") and p not in (".", ".."):
            return True          # 隐藏文件/目录（含 .DS_Store）
        if p in JUNK_PARTS or p in JUNK_NAMES:
            return True
    return relpath.endswith((".pyc", ".pyo", "~"))


def pack_package(path, zip_path):
    """把投稿包目录打为 zip（先决条件：调用方已完成 check 且 0 error）。

    - 只接受目录输入；zip 输入请先解包修改后重打
    - 剔除系统垃圾/隐藏文件/pyc（与 S05 口径一致）
    - 路径排序写入，保证同内容产出字节稳定的包
    返回 (文件数, zip 字节数)。
    """
    if not os.path.isdir(path):
        raise ValueError("打包仅支持目录输入: %s" % path)
    if os.path.abspath(zip_path).startswith(os.path.abspath(path) + os.sep):
        raise ValueError("输出 zip 不能位于包目录内部")
    entries = []
    for root, dirs, names in os.walk(path):
        dirs[:] = sorted(d for d in dirs if not _is_junk(os.path.relpath(
            os.path.join(root, d), path)))
        for n in sorted(names):
            full = os.path.join(root, n)
            rel = os.path.relpath(full, path).replace(os.sep, "/")
            if not _is_junk(rel):
                entries.append((rel, full))
    if not entries:
        raise ValueError("包目录为空: %s" % path)
    if os.path.exists(zip_path):
        raise ValueError("输出 zip 已存在，拒绝静默覆盖: %s" % zip_path)
    # 其他问题 5：固定 ZipInfo 时间与属性，同内容两次打包字节稳定；
    # zf.write() 会保留源文件 mtime，仅改 mtime 就会产出不同的包。
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for rel, full in entries:
            if os.path.islink(full):
                continue          # 不把包外内容写进 zip
            zi = zipfile.ZipInfo(rel, date_time=(1980, 1, 1, 0, 0, 0))
            zi.compress_type = zipfile.ZIP_DEFLATED
            zi.create_system = 0
            zi.external_attr = 0o644 << 16
            with open(full, "rb") as fh:
                zf.writestr(zi, fh.read())
    return len(entries), os.path.getsize(zip_path)
