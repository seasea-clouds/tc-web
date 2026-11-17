# -*- coding: utf-8 -*-
"""F10：编码保真 —— 非法 UTF-8 一律报错，不得以替换字符继续检查。

四个红面（同一规则的四种入口，判定口径与历史逐字一致）：
  1. 条目内非 mdx 文本文件解码失败（slug=包内完整路径）
  2. 某语 mdx 解码失败（slug=条目 slug，detail 带语言路径）
  3. submission.json 解码失败（slug=条目 slug）
  4. 解码成功但含 U+FFFD（warning，说明源头已被二次替换）

为什么必须硬红：用 replace 兜底会把坏字节变成「看着正常」的正文，后续
S08 术语契约、P55 数字比对全部基于错误文本，结论不可信。
"""

RULE = "F10"
RULES = [RULE]
PHASE = 10
CATEGORY = "input"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["decode_errors", "mdx"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['any']}

RATIONALE = {
    RULE: "2026-11-08 实测（REG16 47 语重译）：某语 mdx 由 GBK 编辑器保存后再转 UTF-8，"
          "字节被二次替换，正文里出现成片 U+FFFD；当时解码用 errors='replace' 硬撑过去，"
          "S08 全绿，人工读到才发现在讲另一种水果。现在一律 strict 解码并给字节偏移，"
          "偏移能让作者直接定位是哪个字符写坏，不用整篇重打。",
}


def run(view, emit):
    for art in view.articles:
        for tail, off, byte in art.decode_errors:
            key = "%s/%s/%s" % (art.kind_dir, art.slug, tail)
            emit(RULE, SEVERITY, key,
                 "非法 UTF-8 字节（偏移 %d，字节 0x%02X）：文件编码损坏，"
                 "拒绝以替换字符继续检查" % (off, byte))
        for lg, rec in sorted(art.mdx_info.items()):
            err = rec.get("decode_error")
            if not err:
                continue
            off, byte = err
            emit(RULE, SEVERITY, art.slug,
                 "%s 非法 UTF-8 字节（偏移 %d，字节 0x%02X）"
                 % (rec["tail"], off, byte))
        if art.meta_state == "bad_json" and art.meta_error \
                and art.meta_error[0] == "decode":
            emit(RULE, SEVERITY, art.slug,
                 "submission.json 非法 UTF-8 字节（偏移 %d）" % art.meta_error[1])
        for tail in art.replacement_chars:
            key = "%s/%s/%s" % (art.kind_dir, art.slug, tail)
            emit(RULE, "warning", key,
                 "正文含 U+FFFD 替换字符，请确认源文件编码未被二次替换")


def review(finding, view):
    return finding
