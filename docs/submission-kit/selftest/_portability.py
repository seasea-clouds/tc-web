# -*- coding: utf-8 -*-
"""自检：跨平台可移植性（工具级臂，`selftest --kit` 才跑）。

为什么必须有这条臂：工具要能整包拷到另一台 Windows 或 Linux 上用。
平台差异不会让判据变红——它让命令在另一台机器上直接崩，或静默写出
不同字节（CRLF / GBK）。把「不许出现平台专属调用」「文本写必须显式
编码与行尾」做成断言，才能在改动时立刻发现回归。

四个断言：
  ① 顶层不得 import winreg / msvcrt / fcntl（Windows 专属模块只能函数内
     条件导入，例如 doctor --fix-longpaths）；
  ② 不得出现 os.startfile 与 subprocess(shell=True)；
  ③ 所有文本写文件（mode 含 w 不含 b）必须显式 encoding 与 newline；
  ④ 源码字符串常量里不得有盘符绝对路径（D:\\ / C:/）。
"""
import ast
import glob
import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
_KIT = os.path.dirname(_HERE)

_BANNED_TOP = {"winreg", "msvcrt", "fcntl", "_winapi", "nt"}
_BANNED_ATTR = {"startfile"}


def _py_files():
    out = []
    for base, dirs, files in os.walk(_KIT):
        dirs[:] = [d for d in dirs
                   if d not in ("__pycache__", ".cache", ".state", ".clean")]
        out.extend(os.path.join(base, f) for f in files if f.endswith(".py"))
    return sorted(out)


def main():
    files = _py_files()
    trees = {}
    bad_import, bad_call, bad_write, bad_literal = [], [], [], []
    for p in files:
        try:
            tree = ast.parse(open(p, encoding="utf-8").read())
        except SyntaxError as exc:
            bad_import.append((p, "语法错误：%s" % exc))
            continue
        trees[p] = tree
        rel = os.path.relpath(p, _KIT).replace(os.sep, "/")
        for node in tree.body:                      # 只看模块顶层
            mods = []
            if isinstance(node, ast.Import):
                mods = [a.name.split(".")[0] for a in node.names]
            elif isinstance(node, ast.ImportFrom) and node.module:
                mods = [node.module.split(".")[0]]
            for m in mods:
                if m in _BANNED_TOP:
                    bad_import.append((rel, "顶层 import %s（行 %d）"
                                       % (m, node.lineno)))
        for node in ast.walk(tree):
            if isinstance(node, ast.Attribute) and node.attr in _BANNED_ATTR:
                bad_call.append((rel, "os.%s（行 %d）" % (node.attr, node.lineno)))
            if isinstance(node, ast.Call):
                fn = getattr(node.func, "attr", "") or getattr(node.func, "id", "")
                if fn in ("Popen", "run", "call", "check_call", "check_output"):
                    for kw in node.keywords:
                        if kw.arg == "shell" and isinstance(kw.value, ast.Constant) \
                                and kw.value.value is True:
                            bad_call.append((rel, "subprocess shell=True（行 %d）"
                                             % node.lineno))
                if fn == "open" and len(node.args) >= 2:
                    mode = node.args[1]
                    if isinstance(mode, ast.Constant) and isinstance(mode.value, str) \
                            and "w" in mode.value and "b" not in mode.value:
                        kws = {k.arg for k in node.keywords}
                        if "encoding" not in kws or "newline" not in kws:
                            bad_write.append((rel, "文本写缺 encoding/newline（行 %d）"
                                              % node.lineno))
            if isinstance(node, ast.Constant) and isinstance(node.value, str):
                v = node.value
                if len(v) >= 3 and ((v[1:3] in (":\\", ":/")) and v[0].isalpha()):
                    bad_literal.append((rel, "盘符字面量 %r（行 %d）"
                                        % (v[:24], node.lineno)))

    fails = 0
    for label, rows, limit in (
            ("① 无顶层平台专属 import", bad_import, 3),
            ("② 无 startfile / shell=True", bad_call, 3),
            ("③ 文本写显式 encoding+newline", bad_write, 3),
            ("④ 无盘符绝对路径字面量", bad_literal, 3)):
        ok = not rows
        print("  %-4s %-30s %s" % ("OK" if ok else "FAIL", label,
                                   "检查 %d 个文件" % len(files) if ok
                                   else "%d 处：%s" % (len(rows), rows[:limit])))
        fails += 0 if ok else 1

    print("可移植性：4 个断言，FAIL %d" % fails)
    return 0 if not fails else 1


if __name__ == "__main__":
    raise SystemExit(main())
