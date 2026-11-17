# -*- coding: utf-8 -*-
"""tools 目录索引：分组、用途、是否入口/守卫必需。

**这些工具是维护者侧的运营工具，不在 `check` 流水线上跑**。日常写稿检查只
依赖 `plugins/` 判据与 `glossary.db` 数据；这里的工具回答的是「数据质量如何、
阈值为什么这样定、候选词形怎么挖」。

为什么文件是平铺的：`submit.py glossary <action>` 透传时模块名必须唯一且可
`import`；分子包会撞关键字（`family/import.py` 不能写），也会让透传从
`tools.family_import` 变成长路径。因此**用前缀分组、不建子目录**：

    family_*     词族（concept-family）生命周期
    pair_*       概念对（P75）准入与可判别性
    term_*       术语（term-zh）候选、实频、回读
    rule_*       规则侧数据体检（数据源、射程）
    concept_*    概念词形的坐实（family 的前置步骤）
    form_*       词形探针（给一个正则，逐语向数命中）
    db_* / integrity_*   运维（库比对、封签）

`need` 三档，决定改动后的验证强度：

    entry   `submit.py` 直接挂载（改完必须 doctor + 对应 selftest 臂）
    guard   被自检臂或其它工具 import（改完必须跑相关臂）
    manual  手工按需运行（候选生成/一次性体检，不参与自动化）

新增工具必须在本表登记（`selftest/_file_whitelist.py` 会检查），否则自检红。
"""
import os
import sys

# 唯一入口纪律（v468）：`python tools/x.py` 一律拒绝，只能 `submit.py tools x`。
# 自检臂要用子进程验工具行为时，显式设置该环境变量（等同「由入口调用」）。
ENTRY_ENV = "SUBMIT_KIT_ENTRY"


def require_entry(name, cmd=None):
    """拒绝直接运行工具脚本；入口是 `submit.py tools <name>`。

    为什么禁止独立运行：工具的 `--tmp`、日志归档、白名单执法、封签校验都
    挂在入口上；单独跑脚本会绕过这些，出现「命令能跑但产物不归档」「改了库
    没 bump」这类不一致。工具是入口的子命令实现，不是独立程序。
    """
    if os.environ.get(ENTRY_ENV) == "submit.py":
        return
    cmd = cmd or ("tools %s" % name)
    sys.stderr.write(
        "拒绝直接运行 tools/%s.py：投稿工具只有一个入口。\n"
        "  正确用法：python submit.py %s [参数...]\n"
        "  查看索引：python submit.py tools\n" % (name, cmd))
    raise SystemExit(2)


CATALOG = {
    "family_audit.py": {
        "group": "family", "need": "guard",
        "desc": "召回体检：拿母版当尺子，量每个语向的词族够不够用",
    },
    "family_precision.py": {
        "group": "family", "need": "guard",
        "desc": "精度体检：族里的词形是不是只表这个概念（防误吸）",
    },
    "family_probe.py": {
        "group": "family", "need": "manual",
        "desc": "探针：块对齐看「母版这句译文写成什么」+ 整词实频",
    },
    "family_expand.py": {
        "group": "family", "need": "guard",
        "desc": "补形：把族从已知形态扩到该语向实际写法（候选→人工复核）",
    },
    "family_mine.py": {
        "group": "family", "need": "manual",
        "desc": "从平行语料里发现某概念在某语向的候选表达",
    },
    "family_seed.py": {
        "group": "family", "need": "manual",
        "desc": "从 term-zh 首选形播种词族 spec",
    },
    "family_spec.py": {
        "group": "family", "need": "guard",
        "desc": "spec 往返：库 ↔ JSON，以及三种格式互转",
    },
    "family_import.py": {
        "group": "family", "need": "entry",
        "desc": "入库：按召回体检值逐（概念, 语向）定 mode",
    },
    "family_recheck.py": {
        "group": "family", "need": "entry",
        "desc": "复校：按当前体检口径重定所有 check 格的 mode",
    },
    "family_trim.py": {
        "group": "family", "need": "entry",
        "desc": "清误吸：按人工否决表从已入库族里删词形",
    },
    "concept_family.py": {
        "group": "family", "need": "manual",
        "desc": "把候选词形坐实成词族（concept-family 的输入）",
    },
    "pair_open.py": {
        "group": "pair", "need": "entry",
        "desc": "开火准入：召回门槛 + 隔离试跑，决定概念对能不能开 check",
    },
    "pair_probe.py": {
        "group": "pair", "need": "manual",
        "desc": "按数字锚取对齐片段，看两侧是否真的对举",
    },
    "pair_separability.py": {
        "group": "pair", "need": "guard",
        "desc": "可判别性：这对概念值不值得立判据（覆盖率 + 通用度闸）",
    },
    "term_candidates.py": {
        "group": "term", "need": "manual",
        "desc": "术语候选提取：从已交付译文反推中文概念的本语说法",
    },
    "term_pref_audit.py": {
        "group": "term", "need": "guard",
        "desc": "首选形实频：登记的形在语料里到底出现几次（0 命中清单）",
    },
    "term_verify.py": {
        "group": "term", "need": "manual",
        "desc": "定稿回读：确认某概念某语向的标准译法",
    },
    "audit_prep.py": {
        "group": "term", "need": "guard",
        "desc": "逐语人工审计准备器：从 zh 母版生成 47 语对照审校包",
    },
    "rule_data_audit.py": {
        "group": "rule", "need": "guard",
        "desc": "判据数据源体检：每条规则读哪张词表、表里有没有有效行",
    },
    "rule_p75_reach.py": {
        "group": "rule", "need": "guard",
        "desc": "P75 射程体检：规则在多少（篇目 × 语向）上具备开火条件",
    },
    "form_probe.py": {
        "group": "rule", "need": "manual",
        "desc": "词形探针：给一个正则，逐语向数命中并打印上下文",
    },
    "db_diff.py": {
        "group": "ops", "need": "entry",
        "desc": "库逻辑比对：工作区 glossary.db vs HEAD，逐表逐行",
    },
    "integrity_seal.py": {
        "group": "ops", "need": "entry",
        "desc": "封签运维：keygen / sign / verify / status（发布方签，使用方验）",
    },
}

GROUPS = (
    ("family", "词族（concept-family）"),
    ("pair", "概念对（P75）"),
    ("term", "术语（term-zh）"),
    ("rule", "规则数据与射程"),
    ("ops", "运维"),
)

NEED_LABEL = {"entry": "入口", "guard": "守卫", "manual": "手工"}
