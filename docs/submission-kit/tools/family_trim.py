# -*- coding: utf-8 -*-
"""按人工否决表清掉**已入库族里**的误吸词形（v428）。

`family_expand.py --deny` 只管「下次扩展别再加回来」；`family_deny.json` 里
新增的条目（精度体检读上下文后裁决的）必须先从库里清掉存量，否则判据今天
还在拿 `විනාශ`（销毁）给「免税」计数。

用法（默认 dry-run）：
    python submit.py tools family_trim
    python submit.py tools family_trim --apply --merged 免税:si,放行:si
    python submit.py tools family_trim --deny tools/family_deny.json --apply

`--merged 概念:语向` 把指定格子标成 `merged`（该语本就不区分两概念）。
空族格子自动降级 `unverified`——族里一个词形都没有时绝不能留 `check`。
"""
# 治理声明：本文件属机制层，不承载策略数据；改动须走 README「治理」节的 L3 流程
#（先登记理由 → 行为级等价断言 → selftest --kit 全量），提交说明带 [arch]
#（commit-msg 钩子强制）。策略变更请改 plugins/ 判据或经 submit.py glossary 改库。
import argparse
import collections
import io
import json
import os
import sys

KIT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB = os.path.join(KIT, "data", "glossary.db")
DENY = os.path.join(KIT, "tools", "family_deny.json")
if KIT not in sys.path:
    sys.path.insert(0, KIT)
from core import db as core_db  # noqa: E402


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--deny", default=DENY)
    ap.add_argument("--apply", action="store_true", help="真正写库（默认只报告）")
    ap.add_argument("--merged", default="",
                    help="逗号分隔的 `概念:语向`，把这些格子标成 merged")
    a = ap.parse_args(argv)

    raw = json.load(io.open(a.deny, encoding="utf-8"))
    deny = {lg: {f.lower() for f in forms}
            for lg, forms in raw.items()
            if not lg.startswith("_") and isinstance(forms, list)}
    merged = set()
    for tok in a.merged.split(","):
        if ":" in tok:
            merged.add(tuple(tok.strip().split(":", 1)))

    conn = core_db.connect(DB, readonly=True)
    rows = conn.execute(
        "select key,value,target,meta_json from lexicons "
        "where id='concept-family' order by key,value").fetchall()
    conn.close()

    out, removed, emptied, demoted = [], [], [], []
    for concept, lg, target, meta in rows:
        m = json.loads(meta) if meta else {}
        forms = json.loads(target)
        banned = deny.get(lg) or set()
        keep = [f for f in forms if f.lower() not in banned]
        for f in set(forms) - set(keep):
            removed.append((concept, lg, f))
        mode = m.get("mode", "unverified")
        if not keep and mode == "check":
            mode = "unverified"
            m["note"] = "v428 词形级复核后该族为空，判据停用（族缺写法，非语言合并）"
            emptied.append((concept, lg))
        if (concept, lg) in merged:
            mode = "merged"
            m["note"] = ("v428：该语用同一词根表达两概念（නිදහස් / නිදහස් කිරීම），"
                         "词形无法判别，整语向跳过")
            demoted.append((concept, lg, "merged"))
        m["mode"] = mode
        out.append((concept, lg, json.dumps(keep, ensure_ascii=False),
                    json.dumps(m, ensure_ascii=False, sort_keys=True)))

    for concept, lg, f in sorted(removed):
        print("  剔除 %-5s %-3s %s" % (concept, lg, f))
    print("\n剔除词形 %d 个｜空族降级 %d 格 %s｜手工 merged %d 格 %s"
          % (len(removed), len(emptied), sorted(emptied),
             len(demoted), sorted(demoted)))
    cnt = collections.Counter(json.loads(r[3]).get("mode") for r in out)
    print("写库后 mode 分布：%s" % dict(cnt))

    if not a.apply:
        print("\n（dry-run，未写库；加 --apply 生效）")
        return 0
    # 落库走 core.db 统一写通道（selftest/_db_write_surface.py 禁裸 SQL 写）
    res = core_db.lexicon_replace_bulk(
        DB, "concept-family", [(c, lg, t, json.loads(m)) for c, lg, t, m in out])
    print("写入完成（%d 行，policy_version → %d）"
          % (res["rows"], res["policy_version"]))
    return 0


if __name__ == "__main__":
    import os as _os
    import sys as _sys
    _sys.path.insert(0, _os.path.dirname(_os.path.dirname(
        _os.path.abspath(__file__))))
    from tools import require_entry
    require_entry("family_trim")
    sys.exit(main())
