# -*- coding: utf-8 -*-
"""自检：P67 —— 富字段列表块整层压缩"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402

LEDGER = ("- DA-2024-001, 2024-03-11, 提交方：华东食品, 驳回意见：标签缺净含量, "
          "审核人：张某\n"
          "- DA-2024-002, 2024-03-12, 提交方：南洋乳业, 驳回意见：缺少卫生证书, "
          "审核人：李某\n"
          "- DA-2024-003, 2024-03-13, 提交方：北疆果业, 驳回意见：产地未标注, "
          "审核人：王某\n"
          "- DA-2024-004, 2024-03-14, 提交方：东海水产, 驳回意见：冷链记录缺失, "
          "审核人：赵某\n"
          "- DA-2024-005, 2024-03-15, 提交方：西岭茶业, 驳回意见：成分表不全, "
          "审核人：钱某\n"
          "- DA-2024-006, 2024-03-16, 提交方：中原粮贸, 驳回意见：包装破损, "
          "审核人：孙某")
THIN = ("- DA-2024-001\n- DA-2024-002\n- DA-2024-003\n"
        "- DA-2024-004\n- DA-2024-005\n- DA-2024-006")


def mutate(work):
    # 48 语都追加同一台账块（保持块数对齐），fr 把三层文字字段压成一句
    root = H.article_root(work, "blog")
    for p in sorted((root / "content").glob("*/*.mdx")):
        lang = p.parent.name
        block = THIN if lang == "fr" else LEDGER
        H.write_body(p, H.body_of(p).rstrip("\n") + "\n\n" + block + "\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("P67", mutate, "fr 台账块整层压缩")]))
