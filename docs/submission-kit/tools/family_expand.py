# -*- coding: utf-8 -*-
"""把词族从「已知几个形态」扩到「该语向实际出现的同词干形态」。

为什么需要：词族不全 = 误报的唯一来源。de 语料里表达「免税」更常说
`zollfrei` / `steuerfrei` / `befreit`，只登记 `Befreiung` 就会漏掉这些形态，
P75 的「A 族 0 次」前提被错误满足。上一轮 A3 一篇的 9 条误报全属此类。

做法（**只收语料实形，绝不生成构造成形**）：

1. **词干**：对每个已知词形按该语言的屈折后缀表剥尾（最长匹配优先），
   得到词干；词干长度须 ≥ 4 且 ≥ 原形的 60%（防「一刀切成一两个字母」）。
2. **同干实形**：候选必须是 `词干 + 该语言后缀表里的某个后缀`——**不是任意
   短尾巴**。这一条挡掉大部分跨词误吸：en `clear` + 任意 4 字符会捞到
   `clearly`，但 `ly` 不在屈折表里，故丢弃；ca `exemp` + 任意尾巴会捞到
   `exemple`（例子），`le` 不在表里，同样丢弃。
3. **多词短语保持短语完整**：`ترخیص کالا` 只扩最后一个 token，产出
   `ترخیص کالاهای` 这类短语变体，绝不产出裸 token `کالا`（那是「货物」，
   是全篇最泛的名词，一旦入族该语向永久失灵）。
4. **不得侵入对立族**：候选若已出现在对立概念的词形里则剔除（那是判别词，
   不是本族形态）。
5. **留痕 + 否决记录**：新增词形逐条写进 report（含实频 + 原词干）；人工
   复核后把不该收的写进 `--deny`（JSON：`{语向: [形]}`），下次运行自动
   跳过——机器提议、人工裁决，历史决定不丢。

无空格文字（ja/zh/th）不做展开——token 切分对它们不成立，形态扩展只会
产出整句噪声。老/缅/高棉同理。

用法：
    python submit.py tools family_expand --family tmp/term6/family.json \
        --out tmp/term6/family_expanded.json \
        --report tmp/term6/expand_report.txt \
        [--deny tmp/term6/expand_deny.json] [--min-count 2] [--max-affix 4]
"""
# 治理声明：本文件属机制层，不承载策略数据；改动须走 README「治理」节的 L3 流程
#（先登记理由 → 行为级等价断言 → selftest --kit 全量），提交说明带 [arch]
#（commit-msg 钩子强制）。策略变更请改 plugins/ 判据或经 submit.py glossary 改库。
import argparse
import collections
import glob
import io
import json
import os
import re
import sys
import unicodedata

KIT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.dirname(KIT)
sys.path.insert(0, KIT)

from core import db  # noqa: E402

# 无空格文字：不做 token 级展开
SPACELESS = {"ja", "zh", "th", "lo", "my", "km"}

# 屈折/派生后缀表（按最长匹配剥离；只剥**屈折与规则派生**，不剥改变词义的
# 后缀——-ly/-ness/-less/-ism 这类会引入别的概念，故意不在表里）。
def _load_lexicon(lid):
    """词族数据在 `lexicons`（family-stop/deriv/suffix），不硬编码在工具里。"""
    pol = db.current_policy(kit_dir=KIT)
    out = {}
    for r in (pol.lexicons or {}).get(lid) or ():
        out.setdefault(str(r.get("key") or ""), []).append(
            str(r.get("value") or ""))
    return out


SUFFIX = _load_lexicon("family-suffix")
DERIV = set(_load_lexicon("family-deriv").get("deriv", []))

# **派生后缀**（构成新词，不是屈折）：既不能剥，也不能往上加。
# v426 实测：de `Rechnung` 剥掉 `-ung` 得词干 `rechn`，再加 `-en/-er/-et`
# 产出 `rechnen`（计算）、`rechner`（计算器）、`rechnet`——同词干不同词的
# 典型误吸，且这些词在语料里确有实频，一路进了已开判据的词族。
# 规则：名词化/派生成分原样保留在词干里，只允许在其后接屈折后缀。


def _is_deriv(suf):
    return suf in DERIV


# 词形本身可能带连字符（en duty-free、fr sous-douane）：只剥最后一个 token
TOKEN = re.compile(r"[^\W\d_]+", re.UNICODE)


def norm(s):
    return unicodedata.normalize("NFKC", s)


def load_corpus():
    out = {}
    for f in glob.glob(os.path.join(ROOT, "submission/**/content/*/*.mdx"),
                       recursive=True):
        lg = os.path.basename(os.path.dirname(f))
        try:
            out.setdefault(lg, []).append(io.open(f, encoding="utf-8").read())
        except OSError:
            continue
    return {k: norm("\n".join(v)).lower() for k, v in out.items()}


def stems(form, lg):
    """返回该词形的可能词干（末尾 token 剥后缀；整形也作为词干）。"""
    words = TOKEN.findall(form.lower())
    if not words:
        return []
    # 词干基于最后一个 token（屈折发生在词尾），再把整形前缀一并计入
    word = words[-1]
    out = []
    for suf in sorted(SUFFIX.get(lg, []), key=len, reverse=True):
        if _is_deriv(suf):                 # 派生成分不剥（Rechnung ≠ rechnen）
            continue
        if word.endswith(suf) and len(word) - len(suf) >= 4:
            base = word[: len(word) - len(suf)]
            if len(base) >= 0.6 * len(word):
                out.append(base)
            break
    out.append(word)
    if len(words) > 1:                      # 多词短语：整串也算（防重复命中）
        out.append(form.lower())
    return sorted(set(out), key=len, reverse=True)


def compound_hits(counts, head, prefix_rx, min_count, lg=""):
    """能产复合后缀 + **构词前件白名单**。

    `-frei` / `-fri` / `-vrij` 这类成分本身不表「免税」——sv `skadegörarfri`
    是「无虫害」、nl `plaagvrij` 是「无虫害」、no `kostnadsfri` 是「免费」。
    所以必须同时限定**前件**（de `zoll|steuer|abgaben|einfuhr…`），否则会把
    完全不相关的复合词吸进族里；一旦入族，该语向的 P75 就永久失灵。

    逐 token 判定（不用带可选组的正则，避免回溯爆炸）。只对**单词形**概念
    生效；多词短语不做，否则会把整句尾巴吸进来。
    """
    if not head or not prefix_rx:
        return []
    pre = re.compile(r"^(?:%s)" % prefix_rx, re.I | re.UNICODE)
    tails = [""] + [x for x in SUFFIX.get(lg, []) if len(x) <= 4]
    out = []
    for tok, n in counts.items():
        if n < min_count:
            continue
        for tail in tails:
            if tail and not tok.endswith(tail):
                continue
            body = tok[: len(tok) - len(tail)]
            if not body.endswith(head) or len(body) <= len(head):
                continue
            stem = body[: -len(head)]
            if 3 <= len(stem) <= 14 and pre.search(stem):
                out.append((tok, n))
                break
    return sorted(out, key=lambda kv: -kv[1])


def hyphen_variants(form, lg, max_affix):
    """连字符复合词：**两截都屈折**。

    ru/uk/be 的 `счёт-фактура` 变格时前后两截一起变（`счёта-фактуры`、
    `счёту-фактуре`），只按末截剥后缀会永远产不出这些实形——v420 实测：ru
    发票族只有 `счёт-фактура`/`счёт-фактуру`，语料里 44 次 `фактур*` 的
    大量写法落在族外，语料级召回 0.52。

    → [(候选串, 说明)]，候选串保持原形大小写前缀。
    """
    if "-" not in form:
        return []
    head, _, tail = form.rpartition("-")
    if not head or not tail:
        return []
    sfx = [""] + [s for s in sorted(SUFFIX.get(lg, []), key=len)
                  if len(s) <= max_affix]
    heads = [head] + [head + s for s in sfx[1:]]
    # ⚠️ 末截必须先**剥掉原有屈折**再加后缀：`фактура` + `ы` 会得到
    # `фактураы`（v420 第一版就这么错，产出 1155 个废候选、真形一个没有）。
    tail_stems = [s for s in stems(tail, lg) if len(s) >= 4] or [tail]
    out = []
    for h in heads:
        for st in tail_stems:
            for s in sfx:
                cand = h + "-" + st + s
                if cand.lower() == form.lower():
                    continue
                out.append(cand)
    return out


def cell_forms(cell):
    """兼容两种词族格式：`{lg: [形]}`（concept_family 的 spec 风格）与
    `{lg: {"forms": [...], "mode": ...}}`（concept_family 的输出风格）。"""
    if isinstance(cell, dict):
        return tuple(cell.get("forms") or ())
    return tuple(cell or ())


def variants(form, lg, max_affix):
    """列出「词干 + 已知屈折后缀」的候选取法。

    → [(词干, 候选前缀, 后缀)]，候选 = 前缀 + 词干 + 后缀。
    多词短语的前缀含原短语前部（含分隔符），所以只会产出短语变体。

    以 `*` 结尾的是**复合词词干**（v441），本身就是通配：对它做屈折展开既
    没有意义（`Einreihungs*` 已覆盖 `Einreihungsentscheidung`），还会在回写时
    把星号抹掉、把机制悄悄废掉——所以直接返回空，让它原样留在族里。
    """
    if form.strip().endswith("*"):
        return []
    words = TOKEN.findall(form.lower())
    if not words:
        return []
    word = words[-1]
    pos = form.lower().rfind(word)
    prefix = form[:pos]                     # 保留原大小写与分隔符
    base = stems(form, lg)
    out = []
    for st in base:
        if st == form.lower():              # 整形：只补后缀
            head = prefix
            stem = word
        else:
            head = prefix
            stem = st
        for suf in [""] + sorted(SUFFIX.get(lg, []), key=len):
            if len(suf) > max_affix or _is_deriv(suf):
                continue                     # 不往词干上加派生后缀
            out.append((stem, head, suf))
    # 去重（同一词干可能被不同剥法重复产出）
    seen, uniq = set(), []
    for stem, head, suf in out:
        key = (head.lower(), (stem + suf).lower())
        if key in seen:
            continue
        seen.add(key)
        uniq.append((stem, head, suf))
    return uniq


def token_counts(text):
    """全文 token 词频（一次扫描，避免逐候选扫全文——那是 O(候选×全文)）。"""
    c = collections.Counter()
    for m in TOKEN.finditer(text):
        c[m.group(0).lower()] += 1
    return c


def expand(family, corp, min_count, max_affix, deny, compound=None,
           compound_min=1):
    report, added = [], {}
    cache = {}                       # 语向 → 词频表（同一语向被多个概念复用）
    for concept, per_lg in family.items():
        for lg, cell in sorted(per_lg.items()):
            if lg.startswith("_") or lg in SPACELESS:
                continue
            forms = cell_forms(cell)
            text = corp.get(lg, "")
            if not forms or not text:
                continue
            banned = {x.lower() for x in (deny.get(lg) or ())}
            if lg not in cache:
                cache[lg] = token_counts(text)
            counts = cache[lg]
            new = []
            for form in forms:
                for stem, head, suf in variants(form, lg, max_affix):
                    if len(stem) < 4:
                        continue
                    cand = head + stem + suf
                    low = cand.lower()
                    if low in banned:
                        continue
                    if any(low == f.lower() for f in forms):
                        continue
                    if low in new:
                        continue
                    # 单词形直接查词频表；多词短语要卡右边界，否则
                    # 「митне оформл」会把「митне оформлення」的前缀算成实频，
                    # 产出截断词形
                    if head.strip():
                        n = len(re.findall(re.escape(cand) + r"(?![^\W\d_])",
                                           text, re.UNICODE))
                    else:
                        n = counts.get((stem + suf).lower(), 0)
                    if n < min_count:
                        continue
                    new.append(low)
                    report.append("%-8s %-3s %-22s ← 词干 %-16s 实频 %d"
                                  % (concept, lg, cand, stem, n))
                # 连字符复合词：两截同变（счёта-фактуры / счёту-фактуре）
                if "-" in form:
                    for cand in hyphen_variants(form, lg, max_affix):
                        low = cand.lower()
                        if low in banned or low in new:
                            continue
                        if any(low == f.lower() for f in forms):
                            continue
                        n = len(re.findall(re.escape(cand) + r"(?![^\W\d_])",
                                           text, re.UNICODE))
                        if n < min_count:
                            continue
                        new.append(low)
                        report.append("%-8s %-3s %-22s ← 连字符双截屈折 实频 %d"
                                      % (concept, lg, cand, n))
            # 能产复合后缀（-frei/-free…）：概念定向 + 前件白名单，每语只探一次
            for mor, pre in (compound or {}).get((concept, lg), []):
                if not any(len(f.split()) == 1 for f in forms):
                    break
                for tok, n in compound_hits(counts, mor, pre, compound_min, lg):
                    if tok in banned or tok in new:
                        continue
                    if any(tok == f.lower() for f in forms):
                        continue
                    new.append(tok)
                    report.append("%-8s %-3s %-22s ← 复合后缀 -%s（前件 %s）实频 %d"
                                  % (concept, lg, tok, mor, pre, n))
            if new:
                added.setdefault(concept, {})[lg] = new
    return added, report


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default="",
                    help="含 submission/ 的项目根（缺省=工具包同级）")
    ap.add_argument("--family", required=True, help="词族 JSON（concept_family 输出）")
    ap.add_argument("--out", required=True, help="扩展后的词族 JSON")
    ap.add_argument("--report", default="", help="新增形态明细（含实频）")
    ap.add_argument("--pairs", default="",
                    help="对立概念对（词族文件未带 pair 时必写），如 免税=放行")
    ap.add_argument("--min-count", type=int, default=2,
                    help="语料实频下限（默认 2，单次出现多为噪声）")
    ap.add_argument("--max-affix", type=int, default=4,
                    help="词干后最多允许多少字符（默认 4，防跨词误吸）")
    ap.add_argument("--deny", default="",
                    help="人工否决记录 JSON：{语向: [形]}，命中即跳过。"
                         "不传时默认读 tools/family_deny.json（v428 起版本化，"
                         "避免「人工裁决过、下次扩展又加回来」）")
    ap.add_argument("--compound-min", type=int, default=1,
                    help="复合后缀候选的实频下限（默认 1：前件白名单已足够约束）")
    ap.add_argument("--compound", default="",
                    help="能产复合后缀，格式 `概念:语向:后缀=前件正则`，逗号分隔，"
                         "如 免税:de:frei=zoll|steuer|abgaben,免税:en:free=duty|tax"
                         "（后缀必须配前件白名单，否则会把同后缀的无关词吸进族）")
    a = ap.parse_args()
    if a.root:
        global ROOT
        ROOT = os.path.abspath(a.root)

    default_deny = os.path.join(KIT, "tools", "family_deny.json")
    deny_path = a.deny or default_deny
    deny = {}
    if os.path.exists(deny_path):
        raw_deny = json.load(io.open(deny_path, encoding="utf-8"))
        deny = {k: v for k, v in raw_deny.items()
                if not k.startswith("_") and isinstance(v, list)}
    raw = json.load(io.open(a.family, encoding="utf-8"))
    family = {c: v for c, v in raw.items() if isinstance(v, dict)}
    pairs = {}
    for concept, per_lg in family.items():
        for lg, cell in per_lg.items():
            if isinstance(cell, dict) and cell.get("pair"):
                pairs[concept] = cell["pair"]
                break
    for chunk in [x for x in (a.pairs or "").split(",") if x.strip()]:
        left, _, right = chunk.partition("=")
        pairs[left.strip()] = right.strip()
        pairs.setdefault(right.strip(), left.strip())
    comp = {}
    for chunk in [x for x in a.compound.split(",") if x.count(":") >= 2]:
        concept, lg, rest = [y.strip() for y in chunk.split(":", 2)]
        mor, _, pre = rest.partition("=")
        comp.setdefault((concept, lg), []).append((mor, pre))
    corp = load_corpus()

    added, report = expand(family, corp, a.min_count, a.max_affix, deny, comp,
                           a.compound_min)
    # 不得侵入对立族：候选出现在对立概念现有词形里的，剔除
    dropped = []
    for concept, per_lg in list(added.items()):
        pair = pairs.get(concept) or ""
        for lg, forms in list(per_lg.items()):
            rival = {f.lower() for f in
                     cell_forms((family.get(pair) or {}).get(lg))}
            keep = [f for f in forms if f.lower() not in rival]
            if len(keep) != len(forms):
                dropped += ["%s/%s 剔除（属对立族）：%s"
                            % (concept, lg, "、".join(sorted(set(forms) - set(keep))))]
            if keep:
                per_lg[lg] = keep
            else:
                del per_lg[lg]

    out = json.loads(json.dumps(raw))
    for concept, per_lg in added.items():
        for lg in per_lg:
            cell = out[concept][lg]
            cur = list(cell_forms(cell))
            if isinstance(cell, dict):
                cell["forms"] = cur + per_lg[lg]
            else:
                out[concept][lg] = cur + per_lg[lg]
    io.open(a.out, "w", encoding="utf-8", newline="\n").write(
        json.dumps(out, ensure_ascii=False, indent=1))
    if a.report:
        io.open(a.report, "w", encoding="utf-8", newline="\n").write(
            "\n".join(report + dropped))
    n = sum(len(v) for v in added.values())
    print("扩展 %d 个形态｜涉及 %d 概念 → %s"
          % (n, len(added), a.out))
    return 0


if __name__ == "__main__":
    import os as _os
    import sys as _sys
    _sys.path.insert(0, _os.path.dirname(_os.path.dirname(
        _os.path.abspath(__file__))))
    from tools import require_entry
    require_entry("family_expand")
    sys.exit(main())
