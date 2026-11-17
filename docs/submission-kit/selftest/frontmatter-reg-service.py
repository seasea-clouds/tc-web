# -*- coding: utf-8 -*-
"""自检：R19 —— 法规 relatedService 必须指向站内真实服务页"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate(work):
    # 站内不存在的服务路径：法规页底部「相关服务」入口变死链
    H.patch_json(work, "relatedService", "/services/clearance/", kind="regulation")


if __name__ == "__main__":
    raise SystemExit(H.main([("R19", mutate, "题录服务路径不存在")]))
