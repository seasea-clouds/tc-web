# -*- coding: utf-8 -*-
"""core/tmp_root.py — 统一临时根目录（--tmp）与「删除即归档」。

用户 2026-11-09 指令：指明 --tmp 临时根路径；所有非白名单文件、临时文件、
中间过程文件，删除时一律移动到 <tmp>/待删除/ 子树（不真删、不消耗沙箱
删除配额）；以后一切非投稿文档、临时文档、中间过程文档都以 --tmp 为根
组织目录结构。下文 <tmp> 泛指 --tmp 指定的临时根。

参数口径（2026-11-09 三次指令，命名与行为统一）：
  * **命名统一为 tmp**：CLI `--tmp`、模块 `core/tmp_root.py`、函数
    `resolve_tmp/argv_tmp/tmp_path`、参数 `tmp=`。
  * **只认显式指定**：显式参数或命令行 `--tmp <路径>` / `--tmp=<路径>`
    （submit.py 全部子命令与电池脚本均可透传）。**无环境变量、无默认值**。
  * **无仓库根概念**：本工具可随处移动使用，相对路径相对**当前工作目录**
    解析（与其他参数一致），不做任何仓库根/工具包根推导。
  * **未指定 --tmp 时报错**（与其他必要参数一致）：archive_delete /
    mkdtemp / tmp_path 在实际需要临时根而未指定时抛 RuntimeError，由
    submit.py 统一转为退出码 2。只读命令（doctor/version 等）不受影响。
  * **不许指向工具包内部**（v469）：`--tmp` 落在工具包内（含工具包根、子目录、
    经 `..`/大小写/软链绕回来的同一位置）一律抛 `TmpInsideKit`（RuntimeError
    子类），submit.py 转 rc=2。理由有二：① 工具包结构规则要求包内不得有
    `tmp/`（kit_hygiene 的 H01，会整目录归档），临时根落在包内等于用一次命令
    制造一次结构违规；② `pack` 会把包内内容打进分发包，待删除区与中间产物
    会跟着分发出去。判定用 `realpath` 归一，容器与工具包放在哪无关。

本模块零依赖（仅标准库），core/engine、core/db、plugins/*、tests/* 共用。
"""
# 治理声明：本文件属机制层，不承载策略数据；改动须走 README「治理」节的 L3 流程
#（先登记理由 → 行为级等价断言 → selftest --kit 全量），提交说明带 [arch]
#（commit-msg 钩子强制）。策略变更请改 plugins/ 判据或经 submit.py glossary 改库。
from __future__ import annotations

import os
import re
import shutil
import sys
import time
import uuid

PENDING_DIRNAME = "待删除"                    # <tmp> 下承载「待删除」的子树

# 工具包根（本文件在 <kit>/core/ 下）。仅用于「临时根不许落包内」的边界判定，
# 不引入仓库根/默认临时根概念——临时根仍然只认显式 --tmp。
KIT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

_ARGV_TMP_RE = re.compile(r"^--tmp(?:=(.+))?$")

_ERR_HINT = ("--tmp 未指定：本操作需要临时根目录（删除归档到 <tmp>/待删除/，"
             "中间过程产物以它为根）。请显式传 --tmp <路径>，例如 --tmp tmp")

_ERR_INSIDE_KIT = (
    "--tmp 指向工具包内部：%s\n"
    "  工具包根：%s\n"
    "  临时根必须在工具包之外。包内出现临时目录属结构违规（H01，入口会整目录"
    "归档），且 pack 会把包内内容打进分发包——待删除区与中间产物会跟着分发。\n"
    "  改成包外路径即可，例如 --tmp ../tmp（相对当前工作目录解析）。")


class TmpInsideKit(RuntimeError):
    """`--tmp` 落在工具包内。RuntimeError 子类：submit.py 统一转 rc=2。"""


def _canon(path):
    """真实路径 + 大小写归一（Windows 同一目录的不同写法要判成同一处）。"""
    return os.path.normcase(os.path.realpath(os.path.abspath(path)))


def is_inside_kit(path, kit_root=None):
    """path 是否落在工具包内（含工具包根本身）。跨盘符恒为 False。"""
    if not path:
        return False
    kit = _canon(kit_root or KIT_ROOT)
    p = _canon(path)
    if p == kit:
        return True
    try:
        return os.path.commonpath([p, kit]) == kit
    except ValueError:                     # Windows 不同驱动器
        return False


def assert_outside_kit(root, kit_root=None):
    """临时根落在工具包内 → 抛 TmpInsideKit；否则原样返回。"""
    if is_inside_kit(root, kit_root):
        raise TmpInsideKit(_ERR_INSIDE_KIT % (root, kit_root or KIT_ROOT))
    return root


def argv_tmp(argv=None):
    """扫 argv 取 --tmp <path> / --tmp=<path>；无则 None。"""
    args = sys.argv[1:] if argv is None else list(argv)
    for i, a in enumerate(args):
        m = _ARGV_TMP_RE.match(a)
        if not m:
            continue
        if m.group(1):
            return m.group(1)
        if i + 1 < len(args):
            return args[i + 1]
    return None


def resolve_tmp(explicit=None):
    """解析临时根目录：仅显式来源（参数 > 命令行 --tmp）。

    未指定返回 None（纯查询，不报错）；相对路径相对当前工作目录解析
    （与其他参数一致），不做仓库根推导。落在工具包内抛 TmpInsideKit
    （v469：临时根不许落包内，见模块头）。
    """
    raw = explicit or argv_tmp()
    if not raw:
        return None
    return assert_outside_kit(os.path.normpath(os.path.abspath(raw)))


def require_tmp(explicit=None):
    """显式解析临时根；未指定抛 RuntimeError（与其他必要参数一致）。"""
    root = resolve_tmp(explicit)
    if not root:
        raise RuntimeError(_ERR_HINT)
    return root


def tmp_path(*parts, tmp=None):
    """<tmp> 为根的子路径；未指定 --tmp 抛 RuntimeError。"""
    root = require_tmp(tmp)
    return os.path.normpath(os.path.join(root, *parts))


def pending_root(tmp=None):
    """「待删除」子树：<tmp>/待删除/；未指定 --tmp 抛 RuntimeError。"""
    return tmp_path(PENDING_DIRNAME, tmp=tmp)


def mkdtemp(prefix="", tmp=None):
    """带时间戳前缀的临时目录，建在 <tmp> 下；未指定 --tmp 抛 RuntimeError。"""
    root = require_tmp(tmp)
    d = os.path.normpath(os.path.join(
        root, "%s%s-%s" % (prefix, time.strftime("%Y%m%d-%H%M%S"),
                           uuid.uuid4().hex[:6])))
    os.makedirs(d, exist_ok=True)
    return d


def archive_delete(path, label=None, tmp=None):
    """删除替代：把待删目录/文件移动到 <tmp>/待删除/<label>-<ts>-<id>/ 下。

    未指定 --tmp 时抛 RuntimeError（与其他必要参数一致，不做静默降级）。
    空目录与不存在的路径无需临时根：空目录直接 rmdir（零配额成本），
    不存在的路径返回 None。返回归档落点路径；回退删除（移动失败）或
    无可删内容时返回 None。
    """
    if not path:
        return None
    if os.path.isdir(path) and not os.path.islink(path):
        is_dir = True
        if not os.listdir(path):
            os.rmdir(path)                       # 空目录直接删（零配额成本）
            return None
    elif os.path.lexists(path):
        is_dir = False
    else:
        return None
    root = require_tmp(tmp)
    dest_dir = os.path.join(
        root, PENDING_DIRNAME, "%s-%s-%s" % (
            label or "scratch", time.strftime("%Y%m%d-%H%M%S"),
            uuid.uuid4().hex[:6]))
    os.makedirs(dest_dir, exist_ok=True)
    dest = os.path.join(dest_dir, os.path.basename(os.path.normpath(path)))
    try:
        shutil.move(path, dest)
        return dest
    except OSError:
        if is_dir:
            shutil.rmtree(path, ignore_errors=True)
        else:
            try:
                os.remove(path)
            except OSError:
                pass
        return None
