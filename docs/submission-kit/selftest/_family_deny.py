# -*- coding: utf-8 -*-
"""自检：人工否决表 / 空族 / mode 的库级不变量（工具级臂）。

三条都是「错了不会报错、只会让判据悄悄失准」的类型：
  ① 否决表里的词形**一个都不许在库里**。`--deny` 只管下次扩展，存量得靠
     `family_trim --apply` 清；漏了就等于人工裁决白做（v428 前的 pt
     `faturação` 就在 deny 表里躺了两轮，库里却还在给「发票」计数）。
  ② 空族不许是 `check`。一个词形都没有的族永远 0 命中，P75 会静默，
     元数据却说判据启用。
  ③ 扩展工具必须默认读取版本化否决表，否则「裁决过、下次又加回来」。
"""
import io
import json
import os
import sqlite3
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.dirname(HERE)
DENY = os.path.join(KIT, "tools", "family_deny.json")
DB = os.path.join(KIT, "data", "glossary.db")
EXPAND = os.path.join(KIT, "tools", "family_expand.py")


def main():
    raw = json.load(io.open(DENY, encoding="utf-8"))
    deny = {lg: {f.lower() for f in forms}
            for lg, forms in raw.items()
            if not lg.startswith("_") and isinstance(forms, list)}
    ok0 = bool(deny) and all(
        isinstance(forms, list) and all(isinstance(x, str) for x in forms)
        for k, forms in raw.items() if not k.startswith("_"))

    c = sqlite3.connect(DB)
    rows = c.execute(
        "select key,value,target,meta_json from lexicons "
        "where id='concept-family'").fetchall()
    c.close()

    leaked = []
    empty = []
    for concept, lg, target, meta in rows:
        m = json.loads(meta) if meta else {}
        forms = json.loads(target)
        bad = (deny.get(lg) or set()) & {f.lower() for f in forms}
        for f in sorted(bad):
            leaked.append((concept, lg, f))
        if not forms and m.get("mode") == "check":
            empty.append((concept, lg))
    ok1 = not leaked
    ok2 = not empty

    src = io.open(EXPAND, encoding="utf-8").read()
    ok3 = "family_deny.json" in src and "default_deny" in src

    fails = 0
    for label, ok, extra in (
            ("① 否决表格式合法", ok0, ""),
            ("② 否决词形未回流到库", ok1, str(leaked[:4])),
            ("③ 空族不得为 check", ok2, str(empty[:4])),
            ("④ 扩展工具默认读版本化否决表", ok3, "")):
        print("  %-4s %-34s %s" % ("OK" if ok else "FAIL", label,
                                   "" if ok else extra))
        fails += 0 if ok else 1
    print("词族否决表：4 个断言，FAIL %d" % fails)
    return 0 if not fails else 1


if __name__ == "__main__":
    sys.exit(main())
