# -*- coding: utf-8 -*-
"""P94：官方病名清单整串未本地化（裸英文病名 ≥3 个）

法规原文的动物疫病清单在中文母版里是「本语病名（官方拉丁括注）」形状；
译文若把整条清单照抄成英文（Bovine Tuberculosis / Rinderpest / Sheep pox
and Goat pox …），括号外的本语病名一个都没有，读者拿不到可读的疫病名。
P30 靠字符集只能看到「夹用英文」，P31 的词表只覆盖个别借词，整块清单级
的漏译两道都看不见。

判据口径：
  * 只数**括号外**的官方病名（紧跟 （ / ( 的括注形态放过，那是合规写法）；
  * 同一块裸英文病名 ≥3 个才报（1–2 个属借词惯例，交人工裁定）；
  * zh / en 不判（中文母版与英文版本身就是这两个形状的合法方）。
"""

import re

RULE = "P94"
RULES = [RULE]
PHASE = 40
CATEGORY = "language"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["body"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ["body"]}

RATIONALE = {
    RULE: "REG211（2026-11-20，GACC 公告 245 挪威乳品）阶段 4 人工全文审核实测："
                    "sq 译稿第 21 块的九个动物疫病名整串留英文（Bovine Tuberculosis、"
                    "Paratuberculosis、Rinderpest、Rift Valley fever、Peste des petits "
                    "ruminants、Sheep pox and Goat pox、Scrapie、Contagious bovine "
                    "pleuropneumonia 全裸列），本语病名一个都没有；同一批语种里 fa 把"
                    "牛瘟写成「آفت گاوی」（口蹄疫词根）、hu 写成 marhapestest、sk 写成"
                    "kláskavá obrna、tr 写成 çiğdem，都是「清单还在、病名没译」的同一类"
                    "缺陷。P30 只看字符集（sq 是拉丁字母，判据看不见），P31 的词表只收"
                    "个别借词，清单级漏译两道全漏，故另立本条。",
}


def _blocks(body):
    return [b.strip() for b in re.split(r"\n\s*\n", body) if b.strip()]


NAMES = (r"Bovine Tuberculosis|Paratuberculosis|Rinderpest|"
         r"Rift Valley fever|Peste des petits ruminants|"
         r"Sheep pox and Goat pox|Scrapie|"
         r"Contagious bovine pleuropneumonia")

# 括号外的官方病名：紧跟开括号的括注形态不计数
_PAT = re.compile(r"(?<![(\uFF08\u00AB\"'])(?:%s)" % NAMES)


def run(view, emit):
    pat = _PAT
    for art in view.articles:
        for lg in sorted(art.parsed):
            if lg in ("zh", "en"):
                continue
            for i, b in enumerate(_blocks(art.body(lg) or ""), 1):
                hits = pat.findall(b)
                if len(hits) >= 3:
                    emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                         "第%d块病名清单整串未本地化：%d 个官方病名以英文裸列（%s），"
                         "本语病名缺失"
                         % (i, len(hits), "、".join(sorted(set(hits))[:4])))


def review(finding, view):
    return finding
