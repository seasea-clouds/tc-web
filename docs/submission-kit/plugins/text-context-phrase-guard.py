# -*- coding: utf-8 -*-
"""P98：上下文触发短语禁用形（产品清单 / 国名限定层）

REG232（市场监管总局 2025 年第 57 号公告）逐语审计：产品清单块里多语把
「电动砂轮机」译成磨轮/整流器/熔炉（`slypwiele` / `τροχοί λείανσης` /
`rectificadores` / `உருக்கி` / `հալիչ`），把「电锤」译成凿锤；国名块里
ur/ne 丢失「人民」限定层。两类错形只在**母版对应块出现产品清单/国名**时
才判，避免全库把「磨轮」「熔炉」等本语合法词误伤。

数据在 `lexicons` 的 `phrase-block`：用途 `product-term-wrong` 与
`country-name-wrong`，key=`用途|语向`，value=错形/正则，meta.mode 取
word/regex，meta.correct 给本语正形，meta.family 记缺陷族。
"""
import re

from plugins._lexicon import phrase_block, matcher

RULE = "P98"
RULES = [RULE]
PHASE = 60
CATEGORY = "text"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed", "master"]
SEVERITY = "error"
ENABLED = True

COVERAGE = {"langs": "all", "zones": ["body"]}

# 机制在、数据空：现有 country-name-wrong|ur 一行尚未命中任何母版触发块，
# 产品清单错形表仍为空。按 _rule_data ③ 登记，待补数据后删除本标记。
DATA_PENDING = ("REG232 产品清单/国名错形：机制已接入 phrase-block，"
                "现有 ur 国名行尚未命中母版触发块，产品清单错形表待补；"
                "补齐有效数据后删除本行")

RATIONALE = {
    RULE: "REG232（2026-11-20 逐语审计）：产品清单是高频错译区——da 把"
          "「电锤」写成 mejselhamre（凿锤）、sv 把「指定」写成 utsedd（被任命）、"
          "af 把「电动砂轮机」写成 slypwiele（磨轮）、el 写成 τροχοί λείανσης"
          "（磨轮）、ca 写成 rectificadores（整流器）、ta 写成 உருக்கி（熔炉）、"
          "hy 写成 հալիչ（熔炉）；ur/ne 的「中华人民共和国」丢「人民」限定层。"
          "这些词在本语其他语境合法，不能进 P84 全库禁用表，否则下一篇讲磨轮、"
          "熔炉的文章整片误报。本条只在母版同序块出现产品清单词/国名时，"
          "才查该语同序块的禁用形；数据按语向登记在 phrase-block，"
          "新增语向不改判据。",
}

_CONTEXT_TRIGGERS = ("电动砂轮机", "电钻", "电锤", "熔断体", "汽车安全带",
                     "汽车安全玻璃", "汽车行驶记录仪", "第三方认证评价", "出厂",
                     "16种产品", "16 种产品")
_COUNTRY_TRIGGER = "中华人民共和国"


def _blocks(text):
    return [b.strip() for b in re.split(r"\n\s*\n", text or "") if b.strip()]


def _hits(form, mode, text):
    if not form or not text:
        return []
    if mode == "substring":
        return [form] if form.casefold() in text.casefold() else []
    return [m.group(0) for m in matcher(form, mode).finditer(text)]


def _check_table(view, emit, art, use, trigger, label):
    table = phrase_block(view, use)
    if not table:
        return
    base = _blocks(art.body("zh") or "")
    triggers = trigger if isinstance(trigger, (tuple, list)) else (trigger,)
    for lg in sorted(art.parsed):
        if lg == "zh":
            continue
        rows = table.get(lg)
        if not rows:
            continue
        cur = _blocks(art.body(lg) or "")
        for i, zh_block in enumerate(base):
            if not any(t in zh_block for t in triggers) or i >= len(cur):
                continue
            text = cur[i]
            for form, meta in rows:
                mode = (meta.get("mode") or "word").strip()
                found = _hits(form, mode, text)
                if not found:
                    continue
                correct = (meta.get("correct") or "").strip()
                family = (meta.get("family") or "").strip()
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "第%d块%s命中禁用形 %r（%d 处）%s；本语应写 %s"
                     % (i + 1, label, found[0], len(found),
                        ("，缺陷族：" + family) if family else "",
                        ("%r" % correct) if correct else "（见词表 meta.correct）"))


def run(view, emit):
    for art in view.articles:
        if "zh" not in art.parsed:
            continue
        _check_table(view, emit, art, "reg-context-wrong",
                     _CONTEXT_TRIGGERS, "法规短语")
        _check_table(view, emit, art, "country-name-wrong",
                     _COUNTRY_TRIGGER, "国名限定")


def review(finding, view):
    return finding
