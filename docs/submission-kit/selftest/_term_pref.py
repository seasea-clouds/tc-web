# -*- coding: utf-8 -*-
"""自检：term-zh 首选形必须在语料里真实使用（工具级臂，`selftest --kit` 才跑）。

P74 的两条判据（禁用形 / 同篇混用）都以 `term-zh.target` 为基准。基准本身若
不是语料实形，登记「禁用形」就没有参照物——「这不是首选形」不等于「这是错的」。

实测（2026-11-16）：2068 行里 **169 行首选形 0 命中**、196 行 ≤2 次。0 命中的
`law` 占 82 行（法名全称，译文普遍省略「中华人民共和国」前缀或换语序）。这是
**数据债**，不是代码缺陷，两条出路写在 `tools/term_pref_audit.py` 的说明里。

本臂钉住的是「不许变得更差」：

  ① 0 命中的行数 ≤ 基线（新增类别/概念的词形必须先在语料里核对过）；
  ② `law` 类的 0 命中占比 ≤ 基线（法名是最容易「凭字面翻译」入库的一类）；
  ③ 汇总打印分布，便于每轮肉眼扫一眼债务有没有变形。

为什么阈值而不是逐行白名单：169 行逐条欠账、每行都要人工定夺；白名单会长成
第二份词表，而阈值能让「新增即报警」这件事立即生效。
"""
import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
_KIT = os.path.dirname(_HERE)
sys.path.insert(0, _KIT)
sys.path.insert(0, os.path.join(_KIT, "tools"))

import term_pref_audit as TPA                                    # noqa: E402

# 2026-11-16 首测基线。往下调（把行对齐语料）随时可以；往上调必须在提交信息里
# 写明为什么新增了这一批 0 命中。
BASELINE_ZERO = 169
BASELINE_LAW_ZERO = 82


def main():
    rows = TPA.load_rows()
    texts = TPA.corpus_texts({r[2] for r in rows})
    s = TPA.summarise(TPA.audit(rows, texts))

    problems = []
    if s["zero"] > BASELINE_ZERO:
        problems.append("W1 首选形 0 命中的行 %d > 基线 %d（新增词形没对齐语料）"
                        % (s["zero"], BASELINE_ZERO))
    law_zero = s["zero_by_kind"].get("law", 0)
    if law_zero > BASELINE_LAW_ZERO:
        problems.append("W2 law 类 0 命中 %d > 基线 %d（法名凭字面翻译入库）"
                        % (law_zero, BASELINE_LAW_ZERO))

    for p in problems:
        print("  FAIL", p)
    print("首选形实频：%d 行，0 命中 %d（law %d）／≤2 次 %d，FAIL %d"
          % (s["total"], s["zero"], law_zero, s["low"], len(problems)))
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
