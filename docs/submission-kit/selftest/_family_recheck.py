# -*- coding: utf-8 -*-
"""自检：mode 复校的**证据样本量下限**（工具级臂）。

v429 拿同一召回阈值把 35 格降级，事后才发现其中 14 格是 `免税`：全库 zh
母版只有 4 篇提到它、3 篇 ≥2 次，召回值在 2~3 篇上从 0.000 抖到 2.545，
根本不足以推翻人工逐语核实。修法是 `family_recheck --min-pkg 5`：证据篇目
不足的格子不因召回低而降级。这类「算得没错、但样本不够」的偏差不会报错，
只让判据覆盖悄悄缩水，必须有臂钉住。

三条断言（假 audit TSV + 真库的 mode，dry-run 不写库）：
  ① 证据 2 篇、召回 0 的格子 → 判「保留」，不得降级；
  ② 证据 21 篇、召回 0.10 的格子 → 判「降级」；
  ③ `--restore-thin` 只恢复带 v428 复校标记且证据不足的格子，不误开其它。
"""
import io
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.dirname(HERE)

# 工具的唯一入口是 submit.py；本臂用子进程验工具行为，显式标记为“入口调用”
os.environ.setdefault("SUBMIT_KIT_ENTRY", "submit.py")
TOOL = os.path.join(KIT, "tools", "family_recheck.py")

HEADER = "concept\tlang\tmode\tn_pkg\tok\tzero\trecall\ttotal\n"
# 免税 de（证据 2 篇）/ 放行 de（证据 21 篇）在真库里都是 check，
# 用假召回值测分流，不依赖真实语料数。
BODY = ("免税\tde\tcheck\t2\t0\t2\t0.000\t0.000\n"
        "放行\tde\tcheck\t21\t0\t21\t0.000\t0.100\n")


def _tmp_root():
    argv = sys.argv[1:]
    for i, a in enumerate(argv):
        if a == "--tmp" and i + 1 < len(argv):
            return argv[i + 1]
        if a.startswith("--tmp="):
            return a.split("=", 1)[1]
    # 缺省指仓库根 tmp/（不是 CWD/tmp）：避免在工具包内生成临时目录（v466）
    return os.path.join(os.path.dirname(KIT), "tmp")


def run(audit, *extra):
    r = subprocess.run([sys.executable, "-u", TOOL, "--audit", audit] + list(extra),
                       capture_output=True, text=True, encoding="utf-8",
                       errors="replace")
    if r.returncode != 0:
        raise RuntimeError("recheck 失败：%s" % (r.stdout or "")[-400:])
    return r.stdout or ""


def main():
    root = os.path.join(_tmp_root(), "family-recheck-%d" % os.getpid())
    os.makedirs(root, exist_ok=True)
    try:
        audit = os.path.join(root, "audit.tsv")
        io.open(audit, "w", encoding="utf-8", newline="\n").write(HEADER + BODY)

        out = run(audit)
        ok1 = ("保留 免税    de  证据仅 2 篇" in out
               and "降级 免税" not in out)
        ok2 = "降级 放行    de" in out

        out2 = run(audit, "--restore-thin")
        # 恢复只作用于「v428 复校标记 + 证据不足」的 unverified 格子；
        # 假 TSV 里 de 是 check，不应被当成恢复对象。
        ok3 = "恢复 免税    de" not in out2 and "恢复 " in out2

        # ④ TSV 未覆盖的格子必须整格跳过。单概念 TSV（--concepts 免税,放行）
        #    去跑全库复校时，把「缺测」当「样本 0」会改写其它概念的 note，
        #    甚至把它们的 check 误降级。
        thin = os.path.join(root, "thin.tsv")
        io.open(thin, "w", encoding="utf-8", newline="\n").write(
            HEADER + "免税\tde\tcheck\t2\t0\t2\t0.000\t0.000\n")
        out4 = run(thin, "--concepts", "放行", "--upgrade")
        ok4 = "跳过 " in out4 and "放行" not in out4

        fails = 0
        for label, ok in (("① 小样本格子只保留、不降级", ok1),
                          ("② 样本足且召回低 → 降级", ok2),
                          ("③ 恢复开关不误开健康格子", ok3),
                          ("④ TSV 未覆盖的格子整格跳过", ok4)):
            print("  %-4s %-32s %s" % ("OK" if ok else "FAIL", label,
                                       "" if ok else "实测不符"))
            fails += 0 if ok else 1
        print("词族 mode 复校：4 个断言，FAIL %d" % fails)
        return 0 if not fails else 1
    finally:
        for name in os.listdir(root):
            os.remove(os.path.join(root, name))
        os.rmdir(root)


if __name__ == "__main__":
    sys.exit(main())
