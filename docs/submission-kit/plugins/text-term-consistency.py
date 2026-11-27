# -*- coding: utf-8 -*-
"""P74：术语库首选形的两种「有证据」偏差（禁用形 / 同篇混用）

背景：term-zh 给每个中文概念一个 47 语首选形。但**首选形不能当强判据**——
法规名与机构名在各语里有合法变体与合法改写（用代词、省略主语、换语序），
「与首选形不一致」绝大多数是正常译文。所以本条只审两种**能举证的**偏差：

1. 禁用形（error）：该语向出现了词表里 `meta.forbidden` 登记的词形。这是
   **枚举**出来的已知错译（例：ru 把商务部译成 Министерство торговли），
   不是启发式猜测，命中即错。登记门槛见 README：错形必须在语料里真实出现
   过、且正形在同一语向语料里 ≥3 次。
2. 同篇混用（warning）：同一篇同一语向里同时出现 ≥2 个**都被接受**的形态
   （首选形 + `meta.variants`）。单独用哪个都对，混用是缺陷——而它要求
   至少两种形态各出现一次，改写/省略根本不会触发。

刻意不做的：**缺失不判**。中文母版提到某机构、译文用代词或改写，是合法
译文，机器无法判「该提没提」；把它做成判据只会在 47 语上大面积误报。

边界：词形匹配走 `_lexicon.term_rx(form, lg)`，按语向的文字系统定边界
（汉字/片假名词允许假名紧贴、泰语走子串、拉丁语系仍是字母边界）。

射程：只覆盖 kind ∈ {org, law, doc, permit} 的专名概念。程序性名词
（备案/注册）语境变体太多，除非登记了 forbidden，否则不参与混用检查。
"""
from plugins._lexicon import term_rx
from plugins._lexicon import term_zh

RULE = "P74"
RULES = [RULE]
PHASE = 40
CATEGORY = "text"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["body"]
SEVERITY = "warning"
ENABLED = True

# 2026-11-18：`term-zh` 的 variants / forbidden 已按语向落地（首轮挖词完成），
# 原先的 `DATA_PENDING` 标记据此移除——`selftest/_rule_data.py` 要求「有标记必为
# 空、空则必有标记」，数据落地后继续挂着标记会反向报红（W4）。后续若再遇到
# 「机制在、数据空」，仍按同一约定重新登记标记。
# 写入口：glossary term --term <概念> --lang <语向> --add-forbidden/--add-variant

COVERAGE = {"langs": "all", "zones": ["frontmatter", "metadata", "body"]}

# 参与「同篇混用」的专名类别；term 类只受 forbidden 约束
ENTITY_KINDS = ("org", "law", "doc", "permit")

RATIONALE = {
    RULE: "v2.30 立规（术语库批二）：47 语法规名/机构名实测同一概念在语料里"
                    "有 11–24 种写法，最主流的只占 15–25%——说明「与首选形不同」"
                    "不构成错误，强判必然误报。改判两种有证据的偏差：①词表登记"
                    "的禁用形（枚举出来的已知错译，命中即错）；②同篇混用两个都"
                    "被接受的形态（单独用都对，混用才是缺陷，且要求两形各出现"
                    "一次才触发）。缺失一律不判——译文用代词或改写是合法的。",
}

# 边界按语向的文字系统走（`_lexicon.term_rx`）：ja 的汉字词允许假名紧贴，
# th 无词间距走子串，拉丁/西里尔仍是字母边界。原先一律用字母边界，实测
# ja 92%、th 92% 的出现被漏掉——规则零命中，看着像稿子很干净。
#
# 登记门槛（写进 term-zh 的 meta_json，缺一条就不许登记）：
#   variants  同一语向语料里两形各 ≥2 篇，且都是完整名称——全称与缩写
#             同篇并用是正常写法（ru Государственный совет / Госсовет），
#             把缩写登记进 variants 会让混用臂天天误报。
#   forbidden 该错形在语料真实出现过、且同语向首选形 ≥3 次；同时错形
#             不得是其他实体的合法名称（Министерство торговли 是别国商务部
#             的正式名），这类只能靠首选形 + variants 管。
# 射程：只覆盖 ENTITY_KINDS（org/law/doc/permit）。程序性术语（备案/注册）
# 语境变体太多，除已登记 forbidden 外不参与混用检查。缺失一律不判。


def _zones(art, lg):
    """→ [(区域名, 文本)]；缺失的字段跳过。references 在题录里（fm）。"""
    fm = art.fm(lg) or {}
    out = [("title", fm.get("title")), ("excerpt", fm.get("excerpt")),
           ("body", art.body(lg))]
    for ref in (fm.get("references") or []):
        if isinstance(ref, dict):
            out.append(("refs", ref.get("title")))
    return [(z, t) for z, t in out if t]


def audit(table, texts, kinds=ENTITY_KINDS):
    """纯函数：table=shape_term_zh 结果，texts=[(区域, 文本)]。

    → (bad, mixed)；bad=[(概念, 语向, 禁用形, 首选形, 区域)]，
      mixed=[(概念, 语向, [(形态, 次数)…])]。自检臂直接调它，不建包。
    """
    bad, mixed = [], []
    for concept, spec in sorted(table.items()):
        lg_map = spec.get("langs") or {}
        for lg, entry in sorted(lg_map.items()):
            pref = (entry.get("preferred") or "").strip()
            variants = [v for v in entry.get("variants") or () if v.strip()]
            forbidden = [f for f in entry.get("forbidden") or () if f.strip()]
            joined = "\n".join(t for _z, t in texts)
            for f in forbidden:
                rx = term_rx(f, lg, loose=True)
                if not rx:
                    continue
                for zone, text in texts:
                    if rx.search(text):
                        bad.append((concept, lg, f, pref, zone))
                        break
            if spec.get("kind") not in kinds:
                continue
            counts = []
            for form in [pref] + variants:
                rx = term_rx(form, lg)
                if not rx:
                    continue
                n = len(rx.findall(joined))
                if n:
                    counts.append((form, n))
            # 嵌套抑制：短形被长形包含时，短形那些命中可能全来自长形
            # （ja「関税」之于「関税庁」、es「aduana」之于「aduanas」的复数形），
            # 两形各算一次就会把「一个新形态」说成「混用」。
            counts = [(f, n) for f, n in counts
                      if not any(f != g and f in g for g, _m in counts)]
            if len(counts) >= 2:
                mixed.append((concept, lg, counts))
    return bad, mixed


def run(view, emit):
    table = term_zh(view)
    if not table:
        return
    for art in view.articles:
        for lg in sorted(art.parsed):
            lg_map = {}
            for concept, spec in table.items():
                if lg in (spec.get("langs") or {}):
                    lg_map[concept] = {"kind": spec.get("kind"),
                                       "langs": {lg: spec["langs"][lg]}}
            if not lg_map:
                continue
            texts = _zones(art, lg)
            if not texts:
                continue
            bad, mixed = audit(lg_map, texts)
            for concept, _lg, form, pref, zone in bad:
                emit(RULE, "error", "%s/%s" % (lg, art.slug),
                     "「%s」出现了术语库登记的禁用译法 %r（%s 区）；"
                     "首选形：%r" % (concept, form, zone, pref))
            for concept, _lg, counts in mixed:
                emit(RULE, "warning", "%s/%s" % (lg, art.slug),
                     "「%s」同篇混用 %d 种被接受的形态：%s；请统一为 %r"
                     % (concept, len(counts),
                        "、".join("%r×%d" % (f, n) for f, n in counts),
                        counts[0][0]))


def review(finding, view):
    return finding
