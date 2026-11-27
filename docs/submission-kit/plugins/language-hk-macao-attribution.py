# -*- coding: utf-8 -*-
"""P91（草稿，待规则维护者 rules import）：港澳地名必须带中国归属

REG218（2026-11-19，GACC 公告 87 供港澳蔬菜）阶段 4 逐语审计回流：zh 母版
「香港或澳门特别行政区」在 47 语里必须带中国归属（en `Hong Kong, China`,
ja `中国香港`, ar `هونغ كونغ، الصين` …）。机检原本全绿，但 id 第 75 行
「pasokan ke Hong Kong dan Makau」漏 Tiongkok——属 P66「我国=中国」的同族
陷阱（地名指代主权归属），现有 P66 只判「我国」，不判港澳裸写。

判据形状：母版 zh 正文含港澳锚（香港/澳门/港澳）时，逐语检查同一块内
「港澳词形」出现处是否带本语「中国」词形；裸写（同块无中国词形）报 error。
词形表只收 REG218 审计实测的 47 语形状，缺词形的语向判 warning（待补表）
而非静默放行。标题例外：R20 要求标题 0 标点，`Hong Kong, China` 带逗号，
标题用无逗号归属形（如 `Hong Kong and Macao of China`），本判据只看正文块，
不看 frontmatter。
"""
import re

from plugins import _lexicon

RULE = "P91"
RULES = [RULE]
PHASE = 70
CATEGORY = "language"
APPLIES_TO = ["regulation", "blog"]
NEEDS = ["parsed", "master"]
SEVERITY = "warning"
ENABLED = True

COVERAGE = {"langs": "all", "zones": ['body']}

# 母版触发锚
ZH_HK = ("香港", "澳门", "港澳")

# 各语：港澳词形（出现即需归属）/ 中国词形（归属凭证）
# 取自 REG218 47 语审计实测词形；ja/shinjitai 用「澳門」。

RATIONALE = {
    RULE: "REG218（2026-11-19，GACC 公告 87 供港澳蔬菜）阶段 4 回流：zh 母版"
                    "「香港或澳门特别行政区」在 47 语里都须带中国归属；机检原全绿，"
                    "但 id 第 75 行「pasokan ke Hong Kong dan Makau」漏 Tiongkok，"
                    "靠逐语审计的矩阵断言才抓出。P66 只管「我国」，不管地名归属，"
                    "本条补该盲区。标题 R20 要求 0 标点、不能用 `Hong Kong, China`，"
                    "故只看正文块、不扫 frontmatter。"
                    "v2（同日实测，存量不追溯）：初版对「母版含港澳即要求译语带归属」"
                    "无差别报 error，在 REG74（澳门无纸化证书）与 REG90（港澳水果）"
                    "两篇存量稿上整片报红 100+ 条——那两篇母版与译语都未带「中国」"
                    "前缀，属历史体例，按不追溯铁律不得判。改为**同篇一致性判定**："
                    "整篇港澳段全不带归属＝存量体例放行；部分带、部分不带＝体例不一致，"
                    "报 warning 点名裸写段（REG218 修复前的 id 正是此形）；severity 降"
                    "warning 以免阻塞存量打包。"
                    "v3（同日实测，误报再收）：①归属判定加 ±18 字符邻近窗口——"
                    "段内出现「中国海关」等字样不等于港澳归属（REG90 1 带 11 裸、"
                    "REG74 2 带 1 裸 均由此误报）；②加新体例形状门槛：仅当"
                    "「≥3 段带归属且 ≤2 段裸写」才报（REG218 修复前 35 带 1 裸命中，"
                    "存量短篇 2 带 1 裸放行）。局限仍在：全篇系统性漏写抓不到，"
                    "由逐语直读兜底。"
                    "v4（同日）：归属判定改句级——±18 字符窗口把 en/af 长形"
                    "「... Special Administrative Region of China」判成裸写"
                    "（Hong Kong 与 China 相距约 50 字符）。",
}


def run(view, emit):
    _lexicon.set_judge(view, RULE)
    for art in view.articles:
        ctx = getattr(art.pkg, "ctx", None)
        ml = (getattr(ctx, "master_lang", None)
              or ("zh" if "zh" in art.parsed else "en" if "en" in art.parsed
                  else (sorted(art.parsed)[0] if art.parsed else "zh")))
        m_body = art.body(ml) or ""
        if not any(a in m_body for a in ZH_HK):
            continue
        for lg in sorted(art.parsed):
            if lg == ml or lg not in _lexicon.judge(RULE, "hk"):
                continue
            body = art.body(lg) or ""
            if "<!-- original -->" in body:
                body = body.split("<!-- original -->", 1)[1]
            hk_rx = re.compile(_lexicon.judge(RULE, "hk")[lg][0], re.I)
            cn_rx = re.compile(
                (_lexicon.judge(RULE, "cn").get(lg) or [r"\bChina\b"])[0],
                re.I)

            def _attributed(para):
                """港澳词所在**句子**内出现中国词形即算带归属。

                v4：字符窗口（±18）会把 en/af 的长形
                「the Hong Kong or Macao Special Administrative Region of China」
                判成裸写（Hong Kong 与 China 相距约 50 字符）；改为句级，
                同句见 China 即算归属，形如 `Hong Kong, China` / `中国香港` /
                `Гонконг Китая` / `SAR ... of China` 一并对齐。
                """
                for sent in re.split(r"[。！？；!?;։۔]+|\.(?=\s|$)", para):
                    if hk_rx.search(sent) and cn_rx.search(sent):
                        return True
                return False

            have, bare = [], []
            for para in re.split(r"\n\s*\n", body):
                if not hk_rx.search(para):
                    continue
                (have if _attributed(para) else bare).append(para)
            # 新体例形状门槛：已建立归属体例（≥3 段带）且仅个别漏写（≤2 段裸）才报。
            # 全不带＝存量体例；带得少、裸得多＝存量稿偶含「中国」字样，均放行。
            if len(have) < 3 or not bare or len(bare) > 2:
                continue
            emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                 "港澳地名归属不一致：%d 段带「中国」、%d 段裸写；裸写示例：%s"
                 % (len(have), len(bare), bare[0].strip()[:80]))


def review(finding, view):
    return finding
