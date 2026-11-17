# -*- coding: utf-8 -*-
"""按当前 `family_audit` 口径复校所有 `check` 格子的 mode（v428）。

背景：v425 给召回体检加了**互斥计数**（上位/下位词形只算一次），口径变了，
但 `免税/放行` 这一对的 `check` 是 v413 阶段人工逐语核实的，之后从未按新口径
复校。v428 用 git 里的旧库做 A/B 才看清：31 个格子**修剪前就低于阈值**，与
本次删词形无关。按「定 mode 的唯一依据是语料级召回」的既有纪律，统一复校。

行为：**只降级，不升级**。
    check 且召回 < 阈值 → unverified（note 记下召回值，供后续补词形）
    merged / unverified  → 原样保留（不拿机器数去推翻人工裁决）

⚠️ **样本量下限 `MIN_PKG = 5`（v430）**。v429 拿同一阈值把 35 格降级，事后
核对才发现其中 14 格是 `免税`：全库 zh 母版只有 4 篇提到「免税」、3 篇 ≥2 次，
召回值在 2~3 篇上从 0.000 抖到 2.545，根本不足以推翻 v413 的人工逐语核实。
`放行` 有 21 篇证据，低召回是可信的。所以证据篇目 < 5 的格子**不因召回低
而降级**，只在 note 里标记样本不足，待人审或补语料。

阈值按概念对：免税/放行/发票/合同 = 0.70；增值税/消费税 = 0.80（后者两族
用量会超过母版，过计会喂坏归因口径，故抬阈值）。

用法：
    python submit.py tools family_recheck --audit tmp/x/audit.tsv            # dry-run
    python submit.py tools family_recheck --audit tmp/x/audit.tsv --apply
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
if KIT not in sys.path:
    sys.path.insert(0, KIT)
from core import db as core_db  # noqa: E402

HIGH = {"增值税", "消费税"}
DEFAULT_THR = 0.70
HIGH_THR = 0.80


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--audit", required=True, help="family_audit --tsv 产物")
    ap.add_argument("--thr", type=float, default=DEFAULT_THR)
    ap.add_argument("--high-thr", type=float, default=HIGH_THR)
    ap.add_argument("--min-pkg", type=int, default=5,
                    help="证据篇目下限：低于此值不因召回低而降级（默认 5）")
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--restore-thin", action="store_true",
                    help="把 v429 因小样本误降的格子升回 check（一次性修复，"
                         "只对 note 标记为 v428 复校、且证据篇目 < --min-pkg 的生效）")
    ap.add_argument("--concepts", default="",
                    help="只处理这些概念（逗号分隔）；空=全部。防止单概念 TSV "
                         "误伤其它概念的 note")
    ap.add_argument("--upgrade", action="store_true",
                    help="补词形后把**召回达标**的格子恢复为 check。只作用于"
                         "此前因召回不足被降级（note 带 v428 复校标记）且证据"
                         "篇目 ≥ --min-pkg 的格子，不碰从未核实的 unverified")
    a = ap.parse_args(argv)

    rec = {}
    for i, line in enumerate(io.open(a.audit, encoding="utf-8")):
        if not i:
            if not line.startswith("concept\tlang\tmode"):
                raise SystemExit("TSV 表头不符，请确认是 family_audit 产物")
            continue
        p = line.rstrip("\n").split("\t")
        if len(p) >= 8:
            rec[(p[0], p[1])] = (int(p[3]), float(p[7]))  # n_pkg, total

    conn = core_db.connect(DB, readonly=True)
    rows = conn.execute(
        "select key,value,target,meta_json from lexicons "
        "where id='concept-family' order by key,value").fetchall()
    conn.close()

    out, drops, thin, restored, upgraded = [], [], [], [], []
    skipped = 0
    only = {x.strip() for x in a.concepts.split(",") if x.strip()}
    for concept, lg, target, meta in rows:
        m = json.loads(meta) if meta else {}
        mode = m.get("mode", "unverified")
        if only and concept not in only:
            skipped += 1
            out.append((concept, lg, target,
                        json.dumps(m, ensure_ascii=False, sort_keys=True)))
            continue
        if (concept, lg) not in rec:
            # audit TSV 可以是单概念的（`--concepts 免税,放行`）。TSV 里没有
            # 这行 ≠ 证据为 0：拿「缺测」当「样本不足」会去改写其它概念的
            # note，甚至把它们的 check 误降级。整格跳过，原样写回。
            skipped += 1
            out.append((concept, lg, target,
                        json.dumps(m, ensure_ascii=False, sort_keys=True)))
            continue
        pair = rec.get((concept, lg))
        n_pkg = pair[0] if pair else 0
        just_restored = False
        thr0 = a.high_thr if concept in HIGH else a.thr
        r0 = pair[1] if pair else None
        if (a.upgrade and mode == "unverified" and n_pkg >= a.min_pkg
                and r0 is not None and r0 >= thr0
                and "v428 按当前召回口径复校" in (m.get("note") or "")):
            mode = "check"
            just_restored = True
            m["note"] = ("v431 补形后语料级召回 %.2f ≥ %.2f（证据 %d 篇），"
                         "恢复判据。词形仍以本表为准，语义抽查过。" % (r0, thr0, n_pkg))
            upgraded.append((concept, lg, r0, n_pkg))
        if (a.restore_thin and mode == "unverified" and n_pkg < a.min_pkg
                and "v428 按当前召回口径复校" in (m.get("note") or "")):
            mode = "check"
            just_restored = True
            m["note"] = ("v430 恢复：v429 的降级依据是 %d 篇证据的召回值，低于"
                         "样本下限 %d，不足以推翻人工逐语核实结论。待该概念"
                         "证据篇目补足后重新按召回复校。" % (n_pkg, a.min_pkg))
            restored.append((concept, lg, n_pkg))
        if mode == "check":
            thr = a.high_thr if concept in HIGH else a.thr
            r = pair[1] if pair else None
            if n_pkg < a.min_pkg:
                thin.append((concept, lg, n_pkg, r))
                if (r is not None and r < thr and not just_restored
                        and "v430 恢复" not in (m.get("note") or "")):
                    # 不覆盖 v430 的恢复理由，否则再次常规复校会把「为什么
                    # 这个格子是 check」的审计线索洗掉。
                    m["note"] = ("证据篇目仅 %d 篇（< --min-pkg %d），召回 %.2f "
                                 "不作判据；沿用人工逐语核实结论。补语料后复校。"
                                 % (n_pkg, a.min_pkg, r))
            elif r is None or r < thr:
                drops.append((concept, lg, r, thr, mode))
                mode = "unverified"
                m["note"] = ("v428 按当前召回口径复校：语料级召回 %s < %.2f，"
                             "判据停用（v425 互斥计数后口径已变，旧的人审 check "
                             "未复校）。补词形后重跑 family_audit 再启用。"
                             % ("%.2f" % r if r is not None else "缺测", thr))
            m["mode"] = mode
        out.append((concept, lg, target,
                    json.dumps(m, ensure_ascii=False, sort_keys=True)))

    for c, lg, r, thr, old in sorted(drops):
        print("  降级 %-5s %-3s check→unverified  召回=%s < %.2f"
              % (c, lg, "%.3f" % r if r is not None else "缺测", thr))
    for c, lg, r, n in sorted(upgraded):
        print("  升级 %-5s %-3s unverified→check  召回=%.2f（证据 %d 篇）"
              % (c, lg, r, n))
    for c, lg, n in sorted(restored):
        print("  恢复 %-5s %-3s unverified→check（证据仅 %d 篇）" % (c, lg, n))
    for c, lg, n, r in sorted(thin):
        if any(x[0] == c and x[1] == lg for x in restored):
            continue
        print("  保留 %-5s %-3s 证据仅 %d 篇，召回 %s 不作判据"
              % (c, lg, n, "%.3f" % r if r is not None else "缺测"))
    cnt = collections.Counter(json.loads(r[3]).get("mode") for r in out)
    print("\n复校降级 %d 格｜小样本保留 %d 格｜小样本恢复 %d 格｜补形升级 %d 格"
          "｜跳过 %d 格（TSV 未覆盖）｜写库后 mode：%s"
          % (len(drops), len(thin) - len(restored),
             len(restored), len(upgraded), skipped, dict(cnt)))

    if not a.apply:
        print("（dry-run，未写库；加 --apply 生效）")
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
    require_entry("family_recheck")
    sys.exit(main())
