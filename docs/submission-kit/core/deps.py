# -*- coding: utf-8 -*-
"""core/deps.py — 必装依赖门禁。

PyYAML 是**必装**依赖，不是可选优化：

  * frontmatter 解析唯一权威（F01/F09）——没有它就无法区分
    「文件坏了」和「解析器看不懂」，任何 PASS 都不可信；
  * 图片尺寸/像素校验（I02/I03）读 webp/png 头部；
  * 术语库导出与法规两段式结构校验共用同一 YAML 语义。

因此缺依赖时**整条命令退出（rc=2）并打印安装命令**，绝不允许
「降级解析后照常给结论」——降级路径会让格式错误的稿子在本地全绿、
到站方 gray-matter 才炸，这是历史实测过的失败模式。

本模块只做检测与提示，不改任何业务行为。
"""
# 治理声明：本文件属机制层，不承载策略数据；改动须走 README「治理」节的 L3 流程
#（先登记理由 → 行为级等价断言 → selftest --kit 全量），提交说明带 [arch]
#（commit-msg 钩子强制）。策略变更请改 plugins/ 判据或经 submit.py glossary 改库。

import sys

# (import 名, 发行包名)
REQUIRED = (("yaml", "PyYAML"),)
# 发行包名 → pip 安装名（两者大小写不同，pip 不区分但提示要照实写）
PIP_NAME = {"PyYAML": "pyyaml"}


def missing():
    """返回 [(import 名, 发行包名)]；全部可用时返回空列表。"""
    out = []
    for mod, dist in REQUIRED:
        try:
            __import__(mod)
        except Exception:
            out.append((mod, dist))
    return out


def install_cmd(dist):
    """给出可直接粘贴的安装命令（用当前解释器，不猜环境）。"""
    return '"%s" -m pip install %s' % (sys.executable,
                                       PIP_NAME.get(dist, dist.lower()))


def require(purpose="本命令"):
    """缺必装依赖即退出 rc=2；返回 None 表示依赖齐全。"""
    miss = missing()
    if not miss:
        return
    lines = ["[依赖缺失] %s 需要必装依赖，但导入失败：" % purpose, ""]
    for mod, dist in miss:
        lines.append("  - %s（import %s）" % (dist, mod))
    lines += ["", "安装（必装项，装一次即可）：", "  " + install_cmd(miss[0][1]), "",
              "为什么是必装：",
              "  · frontmatter 解析（F01/F09）以 PyYAML 为唯一权威；",
              "  · 图片尺寸与像素校验（I02/I03）读 webp/png 头部；",
              "  · 术语库导出与法规结构校验共用同一 YAML 语义。",
              "",
              "缺依赖时工具直接退出，不用降级解析给结论——降级会让格式坏的稿子",
              "本地全绿、到站方 gray-matter 才炸（v1.18 实测）。"]
    sys.stderr.write("\n".join(lines) + "\n")
    raise SystemExit(2)


def status():
    """doctor 用：返回 {"ok": bool, "items": [...]}。"""
    items = []
    for mod, dist in REQUIRED:
        try:
            m = __import__(mod)
            ver = getattr(m, "__version__", "?")
            items.append({"module": mod, "dist": dist, "ok": True,
                          "version": str(ver)})
        except Exception as exc:
            items.append({"module": mod, "dist": dist, "ok": False,
                          "version": "", "error": "%s: %s"
                          % (type(exc).__name__, exc)})
    return {"ok": all(i["ok"] for i in items), "items": items}
