# -*- coding: utf-8 -*-
"""自检：块大纲「维度 ↔ 标签」的位置契约（工具级臂，`selftest --kit` 才跑）。

`core.textutil.block_outline` 给每个块一个 detail 元组（按位置表达维度），
`core.consts._DETAIL_LABELS` 给同一位置一个中文标签。两者**只靠顺序对应**：

  · `outline_diff` 用 `labels[j]` 说「第几块哪一维不同」；
  · `plugins/parity-inline-emphasis.py` 用 `labels.index(LBL_BOLD)` 定位加粗数——
    标签对不上时它 `continue`，**整条 P26 静默零命中**。

也就是：顺序一错，报告会张冠李戴（说「斜体数不同」其实是行内代码数），
而判据会静默失效；两者都不报错。这条臂把位置钉住。

四个断言：
  ① 九种块类型都有标签，且标签数 == block_outline 给出的维度数；
  ② 位置语义：加粗/斜体/行内代码在各类块里的下标就是约定值；
  ③ 插件按名引用的维度（`EMPHASIS_DIMS` + 逐项加粗分布）都在表里出现；
  ④ 负向：表里少一个标签 / 改名 → ① 或 ③ 必须红。
"""
import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
_KIT = os.path.dirname(_HERE)
sys.path.insert(0, _KIT)

from core.consts import (                                        # noqa: E402
    _DETAIL_LABELS, LBL_BOLD, LBL_CODE, LBL_ITEM_BOLD, LBL_ITALIC, LBL_LEVEL,
)
from core.textutil import block_outline                           # noqa: E402

# 覆盖九种块类型：H2/H3/H4、LIST、TABLE、QUOTE、CODE、IMG、PARA
PROBE = """## 二级 **粗**

### 三级 *斜*

#### 四级 `code`

- 条目一 **粗**
- 条目二

| a | b |
| --- | --- |
| 1 | 2 |

> 引用一行

```py
x = 1
```

![示意](https://example.com/a.webp)

普通段落 **粗** 与 *斜* 与 `code`
"""

# ② 位置约定：kind → {下标: 标签}。这就是 block_outline 里 detail 元组的意思。
EXPECT = {
    "H2": {0: LBL_LEVEL, 1: LBL_BOLD, 2: LBL_ITALIC, 3: LBL_CODE},
    "H3": {0: LBL_LEVEL, 1: LBL_BOLD, 2: LBL_ITALIC, 3: LBL_CODE},
    "H4": {0: LBL_LEVEL, 1: LBL_BOLD, 2: LBL_ITALIC, 3: LBL_CODE},
    "LIST": {3: LBL_BOLD, 4: LBL_ITALIC, 5: LBL_CODE, 6: LBL_ITEM_BOLD},
    "TABLE": {3: LBL_BOLD, 4: LBL_ITALIC, 5: LBL_CODE},
    "QUOTE": {1: LBL_BOLD, 2: LBL_ITALIC, 3: LBL_CODE},
    "PARA": {0: LBL_BOLD, 1: LBL_ITALIC, 2: LBL_CODE},
}


def dims_of(outline):
    """→ {kind: 维度数}（同一类型多次出现取第一次）。"""
    out = {}
    for k, d in outline:
        out.setdefault(k, len(d))
    return out


def check_table(table, outline):
    """纯函数：可对真实表与内存副本各跑一次（负向断言要后者）。"""
    problems = []
    dims = dims_of(outline)
    for k, n in sorted(dims.items()):
        labels = table.get(k)
        if labels is None:
            problems.append("W1 块类型 %s 没有标签（报告会退化成「维度0」）" % k)
        elif len(labels) != n:
            problems.append("W1 %s 标签 %d 个，block_outline 给 %d 个维度"
                            "（位置会整体错位）" % (k, len(labels), n))
    for k in sorted(set(table) - set(dims)):
        problems.append("W1 表里有 %s，但探针体没造出这种块（断言覆盖不到）" % k)
    for k, want in sorted(EXPECT.items()):
        labels = table.get(k) or ()
        for j, lab in sorted(want.items()):
            if j >= len(labels):
                continue          # 已在 ① 里报过，不重复
            if labels[j] != lab:
                problems.append("W2 %s 第 %d 维是 %r，按 block_outline 应为 %r"
                                % (k, j, labels[j], lab))
    return problems


def check_plugin_dims(table):
    """③ 插件按名定位的维度必须在表里存在，否则规则静默跳过。"""
    problems = []
    # 插件文件名带连字符，不能按模块名 import，只能按路径加载
    import importlib.util
    spec = importlib.util.spec_from_file_location(
        "p26", os.path.join(_KIT, "plugins", "parity-inline-emphasis.py"))
    P26 = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(P26)
    wanted = tuple(P26.EMPHASIS_DIMS) + (LBL_ITEM_BOLD,)
    seen = {lab for labels in table.values() for lab in labels}
    for lab in wanted:
        if lab not in seen:
            problems.append("W3 插件按名引用的维度 %r 不在任何块的标签里"
                            "（P26 会静默跳过）" % lab)
    return problems


def main():
    problems = []
    outline = block_outline(PROBE)
    problems += check_table(_DETAIL_LABELS, outline)
    problems += check_plugin_dims(_DETAIL_LABELS)

    # ④ 负向一：少一个标签（顺序错位的典型形态）
    shrunk = dict(_DETAIL_LABELS)
    shrunk["H2"] = shrunk["H2"][:-1]
    if not check_table(shrunk, outline):
        problems.append("W4 H2 少一个标签未被发现（维度数校验失效）")

    # ④ 负向二：全表改名（等价于「有人直接在表里重打了字面量」）。
    # 只改一个块不够——别的块还留着旧名，插件的按名查找照样命中；
    # 真故障形态是表里全改了、插件 import 的常量没改。
    renamed = {k: tuple("加粗处数" if x == LBL_BOLD else x for x in v)
               for k, v in _DETAIL_LABELS.items()}
    if not (check_table(renamed, outline) or check_plugin_dims(renamed)):
        problems.append("W4 全表把加粗数改名后未报（P26 会静默零命中）")

    for p in problems:
        print("  FAIL", p)
    print("块大纲标签位置契约：4 断言（维度数 / 位置语义 / 插件引用 / 两负向），"
          "FAIL %d" % len(problems))
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
