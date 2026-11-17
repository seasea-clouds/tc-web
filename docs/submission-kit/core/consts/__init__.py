# -*- coding: utf-8 -*-
"""core.consts — 常量与词表（全仓最低层）。

按定义顺序切成 8 个分片（numbers / metadata / thresholds / localization / claims / text_patterns / rules / punctuation）；本文件只做按序再导出，
对外统一导出全部常量（含下划线私有名），调用方仍写 from core.consts import X。
约束：不得 import 其他 core 模块，也不得 import plugins（A9 守卫）。
"""
# 治理声明：本文件属机制层，不承载策略数据；改动须走 README「治理」节的 L3 流程
#（先登记理由 → 行为级等价断言 → selftest --kit 全量），提交说明带 [arch]
#（commit-msg 钩子强制）。策略变更请改 plugins/ 判据或经 submit.py glossary 改库。

from .numbers import *                              # noqa: F401,F403
from .metadata import *                              # noqa: F401,F403
from .thresholds import *                              # noqa: F401,F403
from .localization import *                              # noqa: F401,F403
from .claims import *                              # noqa: F401,F403
from .text_patterns import *                              # noqa: F401,F403
from .rules import *                              # noqa: F401,F403
from .punctuation import *                              # noqa: F401,F403

