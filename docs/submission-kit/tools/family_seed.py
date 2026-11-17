# -*- coding: utf-8 -*-
"""从 term-zh（首选形）**播种**词族 spec：把已有的单形扩展成「该语向候选形态」。

为什么不直接手工写：term-zh 已经有 44 个概念 × 47 语的首选形（人工核准、
有语料证据）。成对判据需要的是「同一概念的多个形态」，所以以首选形为种子，
交给 `concept_family.py` 做语料坐实、交给 `family_expand.py` 做形态扩展，
人工只在 report 上裁决——不重复造 47 语数据。

用法：
    python submit.py tools family_seed --concepts 增值税=消费税,归类=税号 \
        --out tmp/term6/seed_pairs.json
"""
# 治理声明：本文件属机制层，不承载策略数据；改动须走 README「治理」节的 L3 流程
#（先登记理由 → 行为级等价断言 → selftest --kit 全量），提交说明带 [arch]
#（commit-msg 钩子强制）。策略变更请改 plugins/ 判据或经 submit.py glossary 改库。
import argparse
import io
import json
import os
import sys

KIT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, KIT)
from core import db  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--concepts", required=True,
                    help="概念对，逗号分隔，每对形如 增值税=消费税")
    ap.add_argument("--out", required=True)
    ap.add_argument("--db", default=os.path.join(KIT, "data", "glossary.db"))
    a = ap.parse_args()

    want = []
    for chunk in [x for x in a.concepts.split(",") if x.strip()]:
        left, _, right = chunk.partition("=")
        want += [left.strip(), right.strip()]

    conn = db.connect(a.db, readonly=True)
    rows = conn.execute(
        "SELECT key, value, target, meta_json FROM lexicons WHERE id='term-zh'"
    ).fetchall()
    conn.close()

    seed, missing = {}, []
    for key, lg, form, meta in rows:
        if key not in want:
            continue
        forms = [form]
        try:
            extra = json.loads(meta or "{}").get("variants") or []
        except ValueError:
            extra = []
        forms += [x for x in extra if x and x not in forms]
        seed.setdefault(key, {})[lg] = forms
    for c in want:
        if c not in seed:
            missing.append(c)

    io.open(a.out, "w", encoding="utf-8", newline="\n").write(
        json.dumps(seed, ensure_ascii=False, indent=1))
    print("播种 %d 概念：%s" % (len(seed), "、".join(
        "%s(%d 语)" % (k, len(v)) for k, v in seed.items())))
    if missing:
        print("⚠️ term-zh 里没有：%s（先入词库再播种）" % "、".join(missing))
    return 0


if __name__ == "__main__":
    import os as _os
    import sys as _sys
    _sys.path.insert(0, _os.path.dirname(_os.path.dirname(
        _os.path.abspath(__file__))))
    from tools import require_entry
    require_entry("family_seed")
    sys.exit(main())
