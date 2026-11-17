# -*- coding: utf-8 -*-
"""概念对**开火准入**：按「各侧召回门槛 + 隔离试跑放行」逐语向定 mode。

为什么需要单独一个工具：`family_import` 按**单一**召回阈值定 mode，而编码型
概念对（归类/税号）的门槛是**两侧各一条线**——税号在译文里常只写「编码」，
召回天然到不了 0.70；归类侧若族薄，`hit_a*2 < zh_a` 会把「缺屈折」读成
「被吸收」。单阈值一定会开错边。

准入判据（v440 落定，来自 v439 的隔离试跑）：
  ① 每个在 --gate 里点名的概念，该语向的**语料级召回**（TSV 的 total 列）
     都要过线；
  ② 该语向还要在 --clear 里（隔离试跑跑完全部高射程篇目、P75 零假阳性）。
     不给 --clear 时只按召回判，并在输出里点名「未经试跑」。

为什么要 --clear 这一道：召回只证明「族覆盖了语料」，证明不了「判据在这个
语言上不会误伤」。v439 实测 pl 的 `kodu taryfowego`（属格）不在族里，块级
判据把「缺屈折」当成「被税号吸收」，判了一条假阳性——召回当时是达标的。

没被点名的语向不动（v433 教训：TSV 未覆盖的整格跳过，不能当「证据 0 篇」
去改写别人的 note）。

用法：
    python submit.py tools pair_open --family tmp/fam.json --audit tmp/audit.tsv \
        --gate "归类=0.50,税号=0.40" --clear ja,ko,vi --dry-run
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
from core import db as core_db          # noqa: E402

DB = os.path.join(KIT, "data", "glossary.db")


def parse_gate(spec):
    out = {}
    for part in (spec or "").split(","):
        part = part.strip()
        if not part:
            continue
        if "=" not in part:
            raise SystemExit("--gate 要写成 概念=阈值")
        k, v = part.split("=", 1)
        out[k.strip()] = float(v)
    return out


def load_audit(path):
    """TSV → {(concept, lang): (recall_total, n_pkg)}；列名以 family_audit 为准。"""
    out = {}
    lines = [ln for ln in io.open(path, encoding="utf-8").read().splitlines() if ln.strip()]
    head = lines[0].split("\t")
    idx = {name: i for i, name in enumerate(head)}
    for ln in lines[1:]:
        c = ln.split("\t")
        if len(c) < len(head):
            continue
        try:
            tot = float(c[idx["total"]])
        except (KeyError, ValueError):
            continue
        out[(c[idx["concept"]], c[idx["lang"]])] = (tot, int(c[idx["n_pkg"]]))
    return out


def decide(family, audit, gate, clear=None):
    """纯函数：→ [{lang, recall:{c:v}, mode, why}]，只含能判定的语向。

    clear=None 表示「没做试跑」——只按召回判，并在理由里写明；给空集合表示
    「做了试跑、但一个都没放行」，两者语义不同，不能合并（前者是缺步骤，
    后者是步骤做了结论是「不许」）。
    """
    langs = sorted({lg for c in family for lg in family[c]})
    out = []
    for lg in langs:
        rec = {}
        missing = [c for c in gate if (c, lg) not in audit]
        if missing:
            out.append(dict(lang=lg, recall=rec, mode=None,
                            why="TSV 未覆盖 %s，跳过" % ",".join(missing)))
            continue
        for c in gate:
            rec[c] = audit[(c, lg)][0]
        fail = [c for c in gate if rec[c] < gate[c]]
        if fail:
            why = "召回未达标 " + " ".join(
                "%s=%.2f<%.2f" % (c, rec[c], gate[c]) for c in fail)
            out.append(dict(lang=lg, recall=rec, mode="unverified", why=why))
            continue
        if clear is not None and lg not in clear:
            out.append(dict(lang=lg, recall=rec, mode="unverified",
                            why="召回达标但未经隔离试跑放行"))
            continue
        out.append(dict(lang=lg, recall=rec, mode="check",
                        why="召回达标" + ("＋试跑零假阳" if clear is not None
                                          else "（未做试跑）")))
    return out


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--family", required=True)
    ap.add_argument("--audit", required=True)
    ap.add_argument("--gate", required=True)
    ap.add_argument("--clear", default=None,
                    help="试跑放行的语向（逗号分隔）；不给＝没做试跑，只按召回判")
    ap.add_argument("--db", default=DB)
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args(argv)

    family = json.load(io.open(a.family, encoding="utf-8"))
    gate = parse_gate(a.gate)
    clear = (None if a.clear is None
             else {x.strip() for x in a.clear.split(",") if x.strip()})
    rows = decide(family, load_audit(a.audit), gate, clear)

    for r in rows:
        rec = " ".join("%s=%.2f" % (c, v) for c, v in sorted(r["recall"].items()))
        print("  %-4s %-22s %-11s %s" % (r["lang"], rec, r["mode"] or "skip", r["why"]))
    opened = [r["lang"] for r in rows if r["mode"] == "check"]
    print("\n开火 %d 格：%s" % (len(opened), ",".join(opened)))
    if a.dry_run:
        return 0

    # 落库走 core.db 统一写通道（selftest/_db_write_surface.py 禁裸 SQL 写）。
    # 整批一次 bump 由 lexicon_patch_meta 保证，逐行 bump 会把 policy_version
    # 推高 90 多次，审计线反而难读。
    patches = []
    for r in rows:
        if not r["mode"]:
            continue                      # TSV 未覆盖：整格不动
        for c, forms in family.items():
            if r["lang"] not in forms:
                continue
            meta = {"mode": r["mode"],
                    "note": "v440 准入：%s；%s" % (
                        "、".join("%s 召回 %.2f" % (k, v)
                                  for k, v in sorted(r["recall"].items())),
                        r["why"])}
            patches.append((c, r["lang"],
                            json.dumps(list(forms[r["lang"]]),
                                       ensure_ascii=False), meta))
    res = core_db.lexicon_patch_meta(a.db, "concept-family", patches)
    print("已写 %d 格、跳过 %d 格（库中无该行），policy_version → %d"
          % (res["written"], res["skipped"], res["policy_version"]))
    return 0


if __name__ == "__main__":
    import os as _os
    import sys as _sys
    _sys.path.insert(0, _os.path.dirname(_os.path.dirname(
        _os.path.abspath(__file__))))
    from tools import require_entry
    require_entry("pair_open")
    sys.exit(main())
