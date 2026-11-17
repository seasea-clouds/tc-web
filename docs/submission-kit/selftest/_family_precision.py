# -*- coding: utf-8 -*-
"""自检：词族**精度体检**（工具级臂，`selftest --kit` 才跑）。

最要紧的一条是防工具自己失效：v428 之前 `family_precision` 只遍历「证据篇目」
（母版提到该概念的篇目），于是误吸词形在**完全不谈这个概念的篇目**里的出现
根本进不了统计。实测 de `rechnen`（计算）全库 14 次，13 次落在不提「发票」的
篇目，旧口径下命中 0 —— 拿一个已知的误吸去测，工具都报不出来。这种「0 命中」
不报错、却让整条体检形同虚设，必须有臂钉住。

四个断言（假语料树，不读 submission/）：
  ① 误吸词形只出现在非证据篇目时，**必须被报出来**；
  ② 其 TSV 行的 `offtopic` 记满、`precision` 为 0（四类归因正确）；
  ③ 合法词形在「本概念块 / 对立概念块」上分别记账（块对齐没坏）；
  ④ 只表本概念的词形不被误报（不制造假警报）。
"""
import io
import json
import os
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.dirname(HERE)

# 工具的唯一入口是 submit.py；本臂用子进程验工具行为，显式标记为“入口调用”
os.environ.setdefault("SUBMIT_KIT_ENTRY", "submit.py")
TOOL = os.path.join(KIT, "tools", "family_precision.py")


def _tmp_root():
    argv = sys.argv[1:]
    for i, a in enumerate(argv):
        if a == "--tmp" and i + 1 < len(argv):
            return argv[i + 1]
        if a.startswith("--tmp="):
            return a.split("=", 1)[1]
    # 缺省指仓库根 tmp/（不是 CWD/tmp）：避免在工具包内生成临时目录（v466）
    return os.path.join(os.path.dirname(KIT), "tmp")


def _pkg(root, name, zh, de):
    base = os.path.join(root, "submission", "blogs", name, "work", "blog",
                        name, "content")
    for lg, text in (("zh", zh), ("de", de)):
        d = os.path.join(base, lg)
        os.makedirs(d, exist_ok=True)
        io.open(os.path.join(d, name + ".mdx"), "w",
                encoding="utf-8", newline="\n").write(text)


def _rows(path):
    out = {}
    for i, line in enumerate(io.open(path, encoding="utf-8")):
        if not i:
            continue
        p = line.rstrip("\n").split("\t")
        out[(p[0], p[2])] = tuple(int(x) for x in p[3:8]) + (float(p[8]),)
    return out


def main():
    root = os.path.join(_tmp_root(), "family-precision-%d" % os.getpid())
    if os.path.isdir(root):
        shutil.rmtree(root)
    try:
        # 证据篇目：两块都提「发票」，两个合法词形各命中一次
        _pkg(root, "P_OWN",
             "按发票结算。\n\n发票留存三年。",
             "Die Rechnung wird ausgestellt.\n\nfattura wird archiviert.")
        # 混合篇目：块 1 提「发票」，块 2 只提「合同」（对立概念）
        _pkg(root, "P_BOTH",
             "按发票结算。\n\n双方签订合同。",
             "Die Rechnung wird ausgestellt.\n\nDie Rechnung gilt; der Vertrag gilt.")
        # 离题篇目：整篇与「发票」无关，只有误吸词形 rechnen（计算）
        _pkg(root, "P_OFF",
             "按公式核算。\n\n数字要复核。",
             "neu zu rechnen ist.\n\nDie Konstanten sind zu rechnen.")

        fam = {
            "发票": {"de": {"forms": ["Rechnung", "rechnen", "fattura"],
                            "mode": "check", "pair": "合同"}},
            "合同": {"de": {"forms": ["Vertrag"], "mode": "check",
                            "pair": "发票"}},
        }
        fam_p = os.path.join(root, "family.json")
        io.open(fam_p, "w", encoding="utf-8", newline="\n").write(
            json.dumps(fam, ensure_ascii=False))
        tsv = os.path.join(root, "p.tsv")
        rc = subprocess.run([sys.executable, "-u", TOOL, "--family", fam_p,
                             "--root", root, "--min-occ", "1",
                             "--min-prec", "0.5", "--max-offtopic", "0.5",
                             "--tsv", tsv],
                            capture_output=True, text=True, encoding="utf-8",
                            errors="replace")
        if rc.returncode != 0:
            raise RuntimeError("precision 失败：%s" % (rc.stdout or "")[-400:])
        rows = _rows(tsv)
        bad = (rc.stdout or "")

        r_bad = rows.get(("发票", "rechnen"))
        r_ok = rows.get(("发票", "Rechnung"))
        ok1 = "rechnen" in bad
        ok2 = bool(r_bad and r_bad[4] == 2 and r_bad[5] == 0.0)  # offtopic=2, prec=0
        ok3 = bool(r_ok and r_ok[1] >= 2 and r_ok[2] >= 1)        # own>=2, other>=1
        ok4 = "fattura" not in bad

        fails = 0
        for label, ok in (
                ("① 误吸只在非证据篇目也必须报", ok1),
                ("② 误吸归因 offtopic=2 / 精度=0", ok2),
                ("③ 合法词形分清本概念块与对立块", ok3),
                ("④ 纯本概念词形不误报", ok4)):
            print("  %-4s %-38s %s" % ("OK" if ok else "FAIL", label,
                                       "" if ok else "实测不符"))
            fails += 0 if ok else 1
        print("词族精度体检：4 个断言，FAIL %d" % fails)
        return 0 if not fails else 1
    finally:
        if os.path.isdir(root):
            shutil.rmtree(root, ignore_errors=True)


if __name__ == "__main__":
    sys.exit(main())
