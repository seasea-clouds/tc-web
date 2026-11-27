# -*- coding: utf-8 -*-
"""P78：领域术语禁用形（错形 → 本语正形），词表驱动、跨篇通用

REG92（2025 年第 253 号公告）逐语审计出 23 语 54 处真错。逐条回写稿件只解决
单篇；同类形状在后续同类公告里必然复现，所以把「哪一语不许写成什么、应写成
什么」收进策略库 `lexicons` 的 `phrase-block`（用途 `term-guard`），本判据
只负责按语向取行、按 meta.mode 匹配、报红时给出正形与缺陷族。

为什么不做成契约：`terms/forms` 的断言要求锚定「该篇哪句中文原文」，只对
单篇生效；本判据要管的是**语向级词形事实**（德语 von 后接第三格、波兰语
akcyza 是消费税不是海关、日语「隻」是船的量词……），与篇目无关。落点按
README「问题回流」：语义绑定缺陷 → 词表；判据逻辑 → plugins/ 一规则一文件。

数据行写法：key=`term-guard|<lang>`，value=错形或正则，meta 至少含
`mode`（word/phrase/regex/substring）与 `correct`（本语正形），可带
`family`（缺陷族）与 `note`（实测出处）。缺行时判据零命中，不影响其他规则。
"""
from plugins._lexicon import phrase_block, matcher

RULE = "P78"
RULES = [RULE]
PHASE = 50
CATEGORY = "text"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点）：标题/摘要/参考文献题名 + 正文
COVERAGE = {"langs": "all", "zones": ["frontmatter", "body"]}

RATIONALE = {
    RULE: "REG92（海关总署 2025 年第 253 号公告，2026-11-17 db-write-3 逐语审计）"
          "23 语 54 处真错里，绝大多数是「本语词形/搭配写错」而非风格差异："
          "de 的 vom indonesischen Seite 缺第三格、nl 的 de Quarantaineagentschap "
          "冠词性别错、pl 用 akcyza（消费税）指海关、ja/ko 把船的量词「隻/척」"
          "套到货物批次、hu 用 jelentés（报告）指公告、bg 正文机构名缺定冠词、"
          "ka 把 ხელისუფლება（政权）写成质量管理、ar 的 تلتزم 缺 بـ、be 把"
          "扑杀写成 адчужаны（异化）等。这些形状与篇目无关，只在单篇改稿等于"
          "下一同类公告重新踩一遍，故按语向缺陷族收进 lexicons（term-guard），"
          "由本判据跨篇报红；每条词形的实测出处见数据行 meta.note。"
          "全库校准（2026-11-17，142 包）后剔除 3 条会误伤存量/属体例差异的词形"
          "（sq 的 e 作连词、fa 的 نمونه گواهی 作「证书样本」、az 的「日+月+年-ci "
          "ildə」全库 40+ 处在用），保留 39 行 / 22 语；其中 az 的 quru heyvan 与 "
          "ka 的 ჩამონათვალი 在 REG6 存量各命中 1 处，按不追溯先降 warning"
          "（数据行 meta.severity），存量清掉后可升回 error。",
}

# 同一 (词形, 模式) 只编译一次：全库 140 包 × 48 语 × 40+ 词形，逐次编译会把
# check --all 拖慢一个量级（_lexicon.matcher 的 regex 分支不带缓存）。
_PAT = {}


def _compiled(form, mode):
    key = (form, mode)
    pat = _PAT.get(key)
    if pat is None:
        if mode == "substring":
            pat = None
        else:
            pat = matcher(form, mode)
        _PAT[key] = pat
    return pat


def _hits(form, mode, text):
    """→ [(命中串, 下标)]；substring 用 casefold 子串（CJK 无词边界）。"""
    if not form or not text:
        return []
    if mode == "substring":
        low, needle = text.casefold(), form.casefold()
        pos = low.find(needle)
        return [(form, pos)] if pos >= 0 else []
    pat = _compiled(form, mode)
    return [(m.group(0), m.start()) for m in pat.finditer(text)]


def _line_of(text, pos):
    return text.count("\n", 0, pos) + 1


def run(view, emit):
    table = phrase_block(view, "term-guard")
    if not table:
        return
    for art in view.articles:
        for lg in art.langs:
            rows = table.get(lg)
            if not rows:
                continue
            fm = art.fm(lg) or {}
            fields = [str(fm.get("title") or ""), str(fm.get("excerpt") or "")]
            refs = fm.get("references") or []
            if isinstance(refs, list):
                fields.extend(str(r.get("title") or "") for r in refs
                              if isinstance(r, dict))
            body = art.body(lg) or ""
            fields.append(body)
            text = "\n".join(fields)
            if not text.strip():
                continue
            for form, meta in rows:
                mode = (meta.get("mode") or "word").strip()
                found = _hits(form, mode, text)
                if not found:
                    continue
                correct = (meta.get("correct") or "").strip()
                family = (meta.get("family") or "").strip()
                detail = ("第 %d 行出现禁用形 %r（%d 处）%s；本语应写 %s"
                          % (_line_of(text, found[0][1]), found[0][0],
                             len(found),
                             ("，缺陷族：" + family) if family else "",
                             ("%r" % correct) if correct
                             else "（见 lexicons term-guard 该行 meta.correct）"))
                sev = (meta.get("severity") or SEVERITY).strip()
                emit(RULE, sev, "%s/%s" % (lg, art.slug), detail)


def review(finding, view):
    return finding
