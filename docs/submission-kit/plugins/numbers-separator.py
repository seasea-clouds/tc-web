# -*- coding: utf-8 -*-
"""P57：同一语种内小数点与千分位必须统一按本语规范书写

33 语用小数逗号、其余用小数点；千分位按语种取空格 / 点 / 逗号。P04/P19/P55
用 NUM_SEP 同时收两种分隔符，混写全放行——只有逐语一致性判据能抓。
"""
from core.consts import _P57_CLAUSE_RE
from core.textutil import separator_hits, separator_shapes

RULE = "P57"
RULES = [RULE]
PHASE = 50
CATEGORY = "numbers"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed"]
SEVERITY = "warning"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ['body', 'frontmatter']}

RATIONALE = {
    RULE: "v1.74 A1 审读实测：r1 在 de/nl/es/pt 等语混用 9.1 与 9,1、5,000 与 "
                    "5.000，P04/P55 都放行（NUM_SEP 两者都收），跨语数字判据看不见"
                    "同篇内部的排版分裂。v1.94 做过「豁免镜像母版形」的反证实验："
                    "把 M1 443 处、A8 336 处、M2 46 处按本语规范本地化后官方尺 0 error"
                    "0 warning，说明本地化一条都不撞跨语判据——所以豁免不做，只在文案"
                    "上把「镜像母版形」标出来。v2.20 追加条款编号豁免（「第 8.8 条」"
                    "的 8.8 是标识符不是小数，否则 33 语同形假阳）。档位 warning："
                    "排版债不阻断打包。",
}


def run(view, emit):
    for art in view.articles:
        zh_body = art.body("zh") or ""
        mirror = separator_shapes(" ".join(
            [str((art.fm("zh") or {}).get("title") or ""),
             str((art.fm("zh") or {}).get("excerpt") or ""), zh_body]))
        exempt = frozenset(m.group(1) for m in _P57_CLAUSE_RE.finditer(zh_body))
        for lg in sorted(art.parsed):
            fm = art.fm(lg) or {}
            hits = []
            for name, text in (("title", fm.get("title", "")),
                               ("excerpt", fm.get("excerpt", "")),
                               ("body", art.body(lg))):
                for tok, why in separator_hits(lg, str(text), mirror,
                                               exempt=exempt):
                    hits.append((name, tok, why))
            if not hits:
                continue
            emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                 "数字格式与语种规范不一致: "
                 + "；".join("%s %r（%s）" % (f, t, w) for f, t, w in hits[:4])
                 + ("；等共 %d 处" % len(hits) if len(hits) > 4 else ""))


def review(finding, view):
    return finding
