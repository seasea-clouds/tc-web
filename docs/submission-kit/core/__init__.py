# -*- coding: utf-8 -*-
"""检查器内核：只提供事实与调度（判据在 plugins/）。

db（策略库）/ view（事实）/ checker（调度）/ loader（插件）/ pkgio / frontmatter。
core 不含任何稿件判据，也没有统一门面。
"""
# 治理声明：本文件属机制层，不承载策略数据；改动须走 README「治理」节的 L3 流程
#（先登记理由 → 行为级等价断言 → selftest --kit 全量），提交说明带 [arch]
#（commit-msg 钩子强制）。策略变更请改 plugins/ 判据或经 submit.py glossary 改库。
