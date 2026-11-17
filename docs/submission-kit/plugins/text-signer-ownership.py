# -*- coding: utf-8 -*-
"""R08：不得把签字人写成包/交付物的所有者

签字人＝责任人，已交付件归品牌方。en 按句判（主语＋归属谓语＋宾语三要素必须
同句，跨句不成形状）；zh 词形本身不跨句末标点，整段直接判。
四组正则都在 `lexicons` 的 phrase-block（用途 signer-agent /
signer-ownership-pred / signer-owned-object / signer-own-zh），增补改库即可。
"""
import re

from core.consts import DUP_SENT_SPLIT_RE
from plugins._lexicon import phrase_block

RULE = "R08"
RULES = [RULE]
PHASE = 40
CATEGORY = "text"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["parsed"]
SEVERITY = "error"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": ["en", "zh"], "zones": ['body']}

RATIONALE = {
    RULE: "v1.37 实测：解读段写过「本署拥有本方案的全部权利」「the Authority owns "
                    "the deliverables」，把责任主体写成了成果所有者，与「已交付件归"
                    "品牌方」的约定相反，法务要求整类禁止。只在 en / zh 母版口径生效："
                    "其余语向靠译文忠实母版，同一句在三要素齐备时不会凭空长出归属"
                    "谓语；对 47 语逐语维护归属谓语表成本远高于收益，故射程收窄到两语。"
                    "与 R07 一样先剥链接目标与外链 URL，避免把 URL 里的英文当正文判。",
}


_CACHES = {}


def _regs(view):
    """四组正则从库取（行序 = 组内分支序，模块级缓存）。

    四个用途各自显式传字面量（_rule_data 靠扫描 phrase_block 调用点核对
    数据源，变量传参会被判空转）。"""
    agent = phrase_block(view, "signer-agent").get("*", ())
    pred = phrase_block(view, "signer-ownership-pred").get("*", ())
    obj = phrase_block(view, "signer-owned-object").get("*", ())
    zh = phrase_block(view, "signer-own-zh").get("*", ())
    key = (tuple((w, m.get("mode")) for w, m in agent + pred + obj + zh),)
    return _CACHES.setdefault(key, {
        "signer-agent": [re.compile(w) for w, _m in agent],
        "signer-ownership-pred": [re.compile(w) for w, _m in pred],
        "signer-owned-object": [re.compile(w) for w, _m in obj],
        "signer-own-zh": [re.compile(w) for w, _m in zh],
    })


def _hit(text, lang, regs):
    if lang == "zh":
        for pat in regs["signer-own-zh"]:
            m = pat.search(text)
            if m:
                return m.group(0)
        return None
    for sent in DUP_SENT_SPLIT_RE.split(text):
        if (any(p.search(sent) for p in regs["signer-agent"])
                and any(p.search(sent) for p in regs["signer-ownership-pred"])
                and any(p.search(sent) for p in regs["signer-owned-object"])):
            return sent.strip()
    return None


def run(view, emit):
    regs = _regs(view)
    for art in view.articles:
        for lg in ("en", "zh"):
            if lg not in art.parsed:
                continue
            body = art.body(lg) or ""
            scan = re.sub(r"\]\([^)]+\)", "]()", body)
            scan = re.sub(r"https?://\S+", " ", scan)
            h = _hit(scan, lg, regs)
            if h:
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "正文把签字人写成包/交付物的所有者（母版口径：签字人＝责任人，"
                     "已交付件归品牌方）: %r" % h[:70])


def review(finding, view):
    return finding
