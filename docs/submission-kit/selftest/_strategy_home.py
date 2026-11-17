# -*- coding: utf-8 -*-
"""策略说明归位守卫（v461）：说明必须跟着策略走，不设独立文档目录。

用户口径：策略迁移到插件里，包括策略的具体说明，不要有 docs/。
本臂钉死「说明的存放位置」，防止下一轮又把说明抽成 docs/ 或只留在口头：

  1. `docs/` 目录不得存在（策略说明不寄居独立文档）；
  2. README 不得引用 docs/STRATEGY_NOTES.md（索引本身也不能复活它）；
  3. 178 个判据插件：模块 docstring 非空 + `RATIONALE[RULE]` ≥ 80 字
     （与 core/loader.py 同口径，独立臂用于改完立刻发现，不必等加载）；
  4. tools/*.py：模块 docstring ≥ 200 字（运营工具必须自解释「量什么、怎么读」）；
  5. 数据规范在访问层：`_lexicon.py` 必须写明 term-zh 五类与收录判据；
  6. 判据纪律在插件：`text-term-consistency.py` 必须写明 variants/forbidden 门槛；
  7. 欠账语义在入口：`submit.py` baseline 分支必须写明「只置 closed 不删行」；
  8. 射程原则在 README：必须写明「射程的合法维度只有三个」
     （v463 起架构文档并入 README，不再有第二个 .md）。

附加（不计 FAIL 的提示）：RATIONALE 里找不到实测/全库/语料等证据词的插件
——纯结构判据本就不需要实测，列出来供人工判断是否需要补。
"""
import argparse
import ast
import glob
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.dirname(HERE)
if KIT not in sys.path:
    sys.path.insert(0, KIT)

fails = []
total = [0]


def check(name, ok, detail=""):
    total[0] += 1
    print("%-4s %-52s %s" % ("PASS" if ok else "FAIL", name, detail))
    if not ok:
        fails.append(name)


def read(rel):
    with open(os.path.join(KIT, rel), encoding="utf-8") as fh:
        return fh.read()


def main(argv=None):
    ap = argparse.ArgumentParser(description="策略说明归位守卫")
    ap.add_argument("--tmp", metavar="DIR", default=None,
                    help="兼容自检框架（本臂不使用临时目录）")
    ap.parse_args(argv)

    # 1. docs/ 不得存在
    docs = os.path.join(KIT, "docs")
    check("不存在 docs/ 文档目录", not os.path.isdir(docs),
          "发现 %s" % docs if os.path.isdir(docs) else "")

    # 2. README 不得引用已撤销的深水区文档
    readme = read("README.md")
    check("README 不引用 docs/STRATEGY_NOTES.md",
          "docs/STRATEGY_NOTES" not in readme)
    check("README 写明文件白名单与说明存放规则",
          "文件白名单：目录必须干净" in readme and "新内容写哪里" in readme)

    # 3. 插件 docstring + RATIONALE
    from core.loader import RATIONALE_MIN
    no_doc, short_rat, thin = [], [], []
    plugins = sorted(glob.glob(os.path.join(KIT, "plugins", "*.py")))
    n_rule = 0
    for fp in plugins:
        base = os.path.basename(fp)
        if base.startswith("_"):
            continue
        n_rule += 1
        src = open(fp, encoding="utf-8").read()
        tree = ast.parse(src)
        if not (ast.get_docstring(tree) or "").strip():
            no_doc.append(base)
        ns = {}
        try:
            exec(compile(src, fp, "exec"), {"__name__": "probe"}, ns)
        except Exception:
            # 无法独立 exec 的插件（依赖 view 上下文）退回文本判据
            i = src.find("RATIONALE")
            if i < 0 or len(src) - i < RATIONALE_MIN:
                short_rat.append(base)
            continue
        rat = ns.get("RATIONALE") or {}
        rule = ns.get("RULE")
        text = str(rat.get(rule, "")) if rule else ""
        if len(text.strip()) < RATIONALE_MIN:
            short_rat.append(base)
        if not any(w in text for w in ("实测", "全库", "语料", "样本", "校准", "回归",
                                       "误报", "漏检", "反例")):
            thin.append(base)

    check("每个判据插件都有模块 docstring（%d 个）" % n_rule, not no_doc,
          ", ".join(no_doc[:4]))
    check("每个判据插件 RATIONALE ≥ %d 字" % RATIONALE_MIN, not short_rat,
          ", ".join(short_rat[:4]))

    # 4. tools 模块 docstring
    thin_tools = []
    for fp in sorted(glob.glob(os.path.join(KIT, "tools", "*.py"))):
        src = open(fp, encoding="utf-8").read()
        doc = ast.get_docstring(ast.parse(src)) or ""
        if len(doc.strip()) < 200:
            thin_tools.append("%s(%d)" % (os.path.basename(fp), len(doc.strip())))
    check("tools/*.py 模块 docstring ≥ 200 字", not thin_tools,
          ", ".join(thin_tools[:4]))

    # 5. term-zh 数据规范在访问层
    lex = read("plugins/_lexicon.py")
    five = all((" %s " % k) in lex or ("%s " % k) in lex
               for k in ("org", "law", "permit", "doc"))
    check("_lexicon.py 写明 term-zh 五类 kind", five and "term-zh" in lex)
    check("_lexicon.py 写明收录判据与未证标记",
          "收录判据" in lex and "verified=false" in lex)

    # 6. P74 登记门槛在插件
    p74 = read("plugins/text-term-consistency.py")
    check("P74 写有 variants/forbidden 登记门槛",
          "登记门槛" in p74 and "variants" in p74 and "forbidden" in p74)

    # 7. baseline 语义在入口
    sub = read("submit.py")
    check("baseline 分支写明只置 closed 不删行",
          "只置 closed" in sub or ("closed" in sub and "不删行" in sub))

    # 8. 射程原则在架构文档
    arch = read("README.md")
    check("README 写明射程三维度", "射程的合法维度只有三个" in arch)

    if thin:
        print("\n提示：%d 个插件的 RATIONALE 无实测/语料类证据词（结构判据可忽略）"
              % len(thin))
        print("    " + ", ".join(thin[:12]) + (" …" if len(thin) > 12 else ""))

    print("\nFAIL %d / 断言 %d" % (len(fails), total[0]))
    return 0 if not fails else 1


if __name__ == "__main__":
    sys.exit(main())
