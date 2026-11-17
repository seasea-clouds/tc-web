# -*- coding: utf-8 -*-
"""plugins/_lexicon.py — 受控词表访问层（词形数据在库，判据在插件）。

【分工】
- **数据**：五类词表只存 `data/glossary.db` 的 `lexicons` 表，由
  `submit.py glossary lexicon` 维护，随策略库一起分发。
- **逻辑**：本文件只做「取行 → 按类型整形 → 编译正则 → 缓存」，不含任何
  规则编号、不产生 finding。
- **判据**：P30 / P38 / P66 / P68 / P71 调这里的函数取词表。

七类词表（`lexicons.id`）：
  country         语向 → 「我国」本国视角词形（正则，大小写不敏感）
  neighbor        语向 → (错形, 来源语, 本语正形, 实测依据)，整词边界
  latin-required  语向集合：本语正字法要求带变音/重音字母
  latin-ascii     语向 → ASCII 转写 → 带变音正形
  latin-taxon     拉丁学名成分（属名/种加词/命名人，全库一类）
  term-localization  英文术语 → 各语应有的本语词形（key=英文，value=语向，
                  target=本语词形）；P31 用它判「本语有词形却照抄英文」
  term-zh         母版中文概念 → 各语标准译法（key=中文概念，value=语向，
                  target=标准译法）。与 term-localization 方向相反：那张表
                  回答「英文该译成什么」，这张回答「这个中文名词在该语写作
                  什么」。法规名/机构名/许可证名的 47 语统一译法放这里，
                  用途是统一译法与人工查询，不作强判据（各语表达自由度高，
                  强行判红会误伤）。每个概念必须 47 语齐（doctor W4 校验）。
                  meta.kind 分五类：org 机构 / law 法规 / permit 许可证 /
                  doc 证单 / term 程序性术语与类名；全称与简称分列
                  （「中华人民共和国海关总署」与「海关总署」是两条）。
                  只有 org/law/doc/permit 参与 P74 的混用臂——term 类语境
                  变体太多，只定标准、只受 forbidden 约束。收录判据三条
                  同时满足：跨篇 ≥3 篇、有可核的官方英文名、47 语齐。
                  语料未证的语向标 meta.verified=false：构造形可以入库，
                  但不留痕就等于把未证当已证，下一轮没人知道该补哪里。
  forbidden-currency 其他货币的本地写法（key=货币标签，value=词形）
  latin-allow     拉丁放行词（scope 恒为 global）：品牌名 / 缩写 / 通用术语，
                  meta.kind 区分 brand / abbr / term
  term-variant    语向 → (错形, 正形, 说明)：同篇并见即「改稿只改一半」，
                  P64 用；value=错形、target=正形
  phrase-block    用途 → 语向 → (词形, 模式)：判据载荷的通用载体。
                  key=用途标签（negation / promise / ai-phrase-en / ai-phrase-zh /
                  ai-phrase-locale / shrink / threshold-exclusive /
                  long-scale-bad-unit），value=`语向` 或 `*`（不限语向），
                  target=词形/正则/模板（模板含 `{N}`），meta.mode 取
                  word | regex | template。**判据怎么用这些串由插件决定**，
                  本层只负责取行、整形、编译。

【词表 vs 常量】2026-11-15 划界：能逐语向枚举的**判据载荷**（黑名单、模板、
正误对、套话）一律进 lexicons，增补语向/词形不必改代码；**语言机制常量**
（数字读法 NUMBER_WORDS、脚本集合、连接词前后缀、缩写集）留在
`core/consts/`，因为它们描述「这门语言怎么运作」而不是「我们判什么」。
把这条线写进 `selftest/_word_data.py`，越线即 FAIL。


2026-11-15：`latin-allow` 的 scope=article（按篇放行）已整层撤除。它原本
按 slug 给单篇发词形豁免，实测 480 条没有一条是「本篇特有」——学名成分是
词类事实（迁 latin-taxon，由 P30 按结构识别），缩写全库通用（进 global）。
判据的射程只由「语向 + 词类 + 结构」决定，不再由篇目决定。

【为什么不做成契约】契约断言是 require/forbid，语义是「某篇某术语必须/禁止
写成某词形」，且要求锚点绑具体句；本表是语向级闭类事实与放行集，与篇目
无关（allow 更是 forbid 的反面）。硬塞进 terms/forms 会让 989 条契约里混入
九百多条无锚点的「词表行」，`glossary get/scan` 的语义也随之失真。

【失败姿态】库读不到由 C01 报配置错误（`configErrors`），本文件不静默放行：
`ctx.lexicons` 为空时各判据自然零命中，但 C01 会同时把这一状态判红。
"""
# 治理声明：本文件属机制层，不承载策略数据；改动须走 README「治理」节的 L3 流程
#（先登记理由 → 行为级等价断言 → selftest --kit 全量），提交说明带 [arch]
#（commit-msg 钩子强制）。策略变更请改 plugins/ 判据或经 submit.py glossary 改库。
from __future__ import annotations

import json
import re

from core.consts import KO_PARTICLES, P56_SCRIPT_RANGES, TERM_BOUNDARY

_RE_CACHE = {}


def _pattern(term, mode="word"):
    key = (mode, term)
    pat = _RE_CACHE.get(key)
    if pat is None:
        if mode == "regex":
            pat = re.compile(term, re.IGNORECASE | re.UNICODE)
        else:
            pat = re.compile(r"(?<!\w)" + re.escape(term) + r"(?!\w)",
                             re.IGNORECASE | re.UNICODE)
        _RE_CACHE[key] = pat
    return pat


# --------------------------------------------------- 术语词形匹配（边界策略）

def _cp_esc(v):
    return ("\\u%04x" % v) if v <= 0xFFFF else ("\\U%08x" % v)


def _script_of(ch):
    """字符 → (脚本名, 该脚本的字符类字符串)。认不出返回 (None, None)。"""
    cp = ord(ch)
    for name, ranges in P56_SCRIPT_RANGES:
        for lo, hi in ranges:
            if lo <= cp <= hi:
                return name, "".join("%s-%s" % (_cp_esc(a), _cp_esc(b))
                                     for a, b in ranges)
    return None, None


# 只有「汉字/片假名词」用脚本类做边界；拉丁、西里尔等仍用字母类，与既有
# 判据逐字一致（改宽会把紧贴品牌名的词也算命中）。
_SCRIPT_BOUND = ("HAN", "KATAKANA")


def term_rx(form, lg, loose=False):
    """术语词形 → 正则：**同文字连写才算「词内」**。

    与 `hits()` 的五种模式不同，这里的边界按「这门语言怎么写词」定（见
    `core.consts.TERM_BOUNDARY`），因为术语库的词形是**专名/程序名**，
    不是短语：

      letter    词由空格分隔 → 前后不许是字母（拉丁、西里尔、希腊……）
      script    汉字/片假名词 → 词界是「同文字连写」：假名是语法胶水，允许紧贴。
                ja「申告する」命中 申告；「関税庁」不算命中 関税
      spaceless 没有词间距（th）→ 子串
      particle  名词后可以贴助词（ko「관세청은」）→ 后界放行闭类助词

    为什么必须分策略：P74 原先一律用 `[^\W\d_]`，ja 里「申告」语料出现 344 次
    而判据一次也没命中（九成以上的汉字词前面是假名），th 同理——规则显示
    「零命中」，看上去像稿子很干净。

    `loose=True` 用于**命中即错**的禁用形：汉字连写的词界在日语里本来就模糊
    （「税関監督方式」是「税関監督」+「方式」，「関税庁」却是一个词），严格边界
    会把真实出现过的禁用形漏掉。所以「禁用形」取召回，「变体计数」取精度——
    后者还要靠嵌套抑制避免把长短形算成两形。
    """
    key = ("term", form, lg, loose)   # 缓存的每个参数都必须进键
    if key in _RE_CACHE:
        return _RE_CACHE[key]
    text = (form or "").strip()
    if len(text) < 2:
        return None
    esc = re.escape(text)
    mode = TERM_BOUNDARY.get(lg, "letter")
    if mode == "spaceless":
        pat = re.compile(esc, re.IGNORECASE | re.UNICODE)
    elif mode == "particle":
        # 助词按长度倒序，`에서` 才不会被 `에` 抢先吃掉一半
        tail = "|".join(re.escape(x) for x in
                        sorted(KO_PARTICLES, key=len, reverse=True))
        pat = re.compile(r"(?<![^\W\d_])%s(?:%s)?(?![^\W\d_])" % (esc, tail),
                         re.IGNORECASE | re.UNICODE)
    else:
        left = right = None
        if mode == "script" and loose:
            pat = re.compile(esc, re.IGNORECASE | re.UNICODE)
            _RE_CACHE[key] = pat
            return pat
        if mode == "script":
            name, cls = _script_of(text[0])
            left = cls if name in _SCRIPT_BOUND else None
            name, cls = _script_of(text[-1])
            right = cls if name in _SCRIPT_BOUND else None
        lb = "(?<![%s])" % left if left else r"(?<![^\W\d_])"
        la = "(?![%s])" % right if right else r"(?![^\W\d_])"
        pat = re.compile(lb + esc + la, re.IGNORECASE | re.UNICODE)
    _RE_CACHE[key] = pat
    return pat


def _meta(row):
    raw = row.get("meta_json") or "{}"
    try:
        return json.loads(raw)
    except (TypeError, ValueError):
        return {}


# ---------------------------------------------------------------- 整形（纯函数）

def compile_country(rows):
    """语向 → (compiled_pattern, ...)；词形按登记顺序保留。"""
    out = {}
    for r in rows:
        out.setdefault(r["key"], []).append(_pattern(r["value"], "regex"))
    return {k: tuple(v) for k, v in out.items()}


def compile_neighbor(rows):
    """语向 → ((错形, 来源语, 本语正形, 实测依据), ...)。"""
    out = {}
    for r in rows:
        m = _meta(r)
        out.setdefault(r["key"], []).append(
            (r["value"], m.get("from", ""), r["target"], m.get("evidence", "")))
    return {k: tuple(v) for k, v in out.items()}


def shape_required(rows):
    """语向集合：本语正字法要求带变音字母。"""
    return frozenset(r["value"] for r in rows)


def compile_ascii(rows):
    """语向 → ((compiled_pattern, ASCII 形, 带变音正形), ...)。"""
    out = {}
    for r in rows:
        out.setdefault(r["key"], []).append(
            (_pattern(r["value"]), r["value"], r["target"]))
    return {k: tuple(v) for k, v in out.items()}


def shape_term_localization(rows):
    """英文术语 → {语向: 本语词形}。"""
    out = {}
    for r in rows:
        out.setdefault(r["key"], {})[r["value"]] = r["target"]
    return out


def shape_forbidden_currency(rows):
    """货币标签 → (词形, ...)，保持登记顺序。"""
    out = {}
    for r in rows:
        out.setdefault(r["key"], []).append(r["value"])
    return {k: tuple(v) for k, v in out.items()}


def shape_allow(rows):
    """→ frozenset（全库放行词）。

    2026-11-15：按篇放行（scope=article）已撤除。原机制按 slug 给单篇发
    豁免，实测 480 条里没有一条是「本篇特有」——学名属词类事实（已迁
    latin-taxon，由 P30 结构判据承担），缩写属全库通用（已进 global）。
    历史实测：key 与真实归属篇目还会错配（`red` 登记在 announcement-105，
    实际出现在 referral 篇的图片路径里），按篇这条路本身不可靠。
    """
    return frozenset(r["value"] for r in rows)


def shape_taxon(rows):
    """→ frozenset（属名/种加词/命名人，小写）。

    P30 用它判断「某个大写首字母词是不是学名的属名」，只有命中才按学名
    结构剥离；不在表里的 `Bonded warehouse` 一类普通英文词组照旧受检。
    """
    return frozenset(r["value"].lower() for r in rows)


def shape_term_variant(rows):
    """语向 → ((正形, 错形, 说明), ...)。P64 判「同篇正误并存」。

    元组顺序与旧常量 `P64_TERM_VARIANTS` 一致（正形在前），避免调用方改判定
    顺序时把 good/bad 弄反——那个反转不会报错，只会把结论写反。
    """
    out = {}
    for r in rows:
        out.setdefault(r["key"], []).append(
            (r["target"], r["value"], _meta(r).get("label", "")))
    return {k: tuple(v) for k, v in out.items()}


def shape_phrase_block(rows):
    """用途 → {语向: ((词形, meta), ...)}；`*` 表示不限语向。

    行键写成 `用途|语向`（`lexicons` 主键是 (id, scope, key, value)，同一用途
    同一语向有十几条词形，语向必须编进 key 才能放得下），词形在 value。

    `meta` 是整行 meta 字典（至少含 `mode`，可含 `openers`、`good` 等附加事实）。
    为什么给整个字典而不是拆成「模式 + 旗标」两个位置：同一条短语的附加事实
    会继续长（P48 要「本语正确形」、ST08 要「是否句首填充语」），每长一个就
    改一次函数签名，五个消费者全要跟着改；给字典则加事实不动签名。

    `mode` 五值：`word`（整词边界）、`regex`（原样编译，大小写不敏感）、
    `regex-cs`（原样编译，**大小写敏感**——原文用的是不带 `re.I` 的 `re.search`，
    统一成不敏感会把 `moreover` 这类小写形式也算命中，判据悄悄变宽）、
    `template`（含 `{N}`，调用方替换后编译）、`substring`（casefold 子串包含，
    CJK 用，CJK 之间没有词边界）、`phrase`（转义后空格放宽成 `\\s+`，多词短语用）。
    """
    out = {}
    for r in rows:
        use, _, lang = r["key"].partition("|")
        meta = _meta(r)
        meta.setdefault("mode", "word")
        block = out.setdefault(use or r["key"], {})
        block.setdefault(lang or "*", []).append((r["value"], meta))
    return {k: {lg: tuple(v) for lg, v in d.items()} for k, d in out.items()}


def shape_concept_family(rows):
    """concept-family → {概念: {"pair": 对立概念, "note": …,
    "langs": {语向: {"forms": (词形…), "mode": "check|merged"}}}}。

    与 term-zh 的分工：term-zh 给**一个**首选形（可作判据、可作标准），
    concept-family 给**该语向表达这个概念的全部已知形态**（只用于识别，
    不作「必须写成这个」的判据）。target 存 JSON 数组；兼容 `|` 分隔。

    `mode` 是**语向级**的：同一概念在 bg 可能两族合一（不可判别），
    在 de 则可判别——把它挂在概念级会让一整条规则按最后一个语向的
    mode 决定行为。
    """
    out = {}
    for r in rows:
        meta = _meta(r)
        raw = r.get("target") or ""
        try:
            forms = json.loads(raw) if raw.strip().startswith("[") else \
                [x for x in raw.split("|") if x.strip()]
        except ValueError:
            forms = [x for x in raw.split("|") if x.strip()]
        entry = out.setdefault(r["key"], {"pair": meta.get("pair", ""),
                                          "note": meta.get("note", ""),
                                          "langs": {}})
        entry["langs"][r["value"]] = {
            "forms": tuple(f.strip() for f in forms if f.strip()),
            "mode": meta.get("mode", "check")}
    return out


def shape_term_zh(rows):
    """term-zh → {中文概念: {"kind":…, "langs": {语向: 词条}}}。

    词条 = {"preferred": 首选形, "variants": (…), "forbidden": (…)}。
    variants/forbidden 来自该行 meta_json，**逐语向**登记——同一概念在不同
    语向的可接受变体不同，合并成一张表会让 P74 在别的语向误报。
    """
    out = {}
    for r in rows:
        meta = {}
        raw = r.get("meta_json")
        if raw:
            try:
                meta = json.loads(raw)
            except ValueError:
                meta = {}
        entry = out.setdefault(r["key"], {"kind": meta.get("kind", ""),
                                          "note": meta.get("note", ""),
                                          "langs": {}})
        entry["langs"][r["value"]] = {
            "preferred": r.get("target") or "",
            "variants": tuple(v for v in (meta.get("variants") or ()) if v),
            "forbidden": tuple(v for v in (meta.get("forbidden") or ()) if v),
        }
    return out


# ---------------------------------------------------------------- 匹配（纯函数）

def country_hits_table(table, lang, text):
    """返回命中的本国视角词形（原始正则串），大小写不敏感。"""
    if not text:
        return []
    return [p.pattern for p in table.get(lang, ()) if p.search(text)]


def neighbor_hits_table(table, lang, text):
    """返回 [(错形, 来源语, 本语正形, 命中次数)]；整词边界。"""
    out = []
    for term, src, correct, _ev in table.get(lang, ()):
        n = len(_pattern(term).findall(text or ""))
        if n:
            out.append((term, src, correct, n))
    return out


def ascii_hits_table(table, lang, text):
    """返回 [(ASCII 形, 带变音正形, 命中次数)]，按次数降序。"""
    out = []
    for pat, form, correct in table.get(lang, ()):
        n = len(pat.findall(text or ""))
        if n:
            out.append((form, correct, n))
    out.sort(key=lambda x: (-x[2], x[0]))
    return out


# ---------------------------------------------------------------- 取用（带缓存）

def rows(view, name):
    ctx = getattr(view, "ctx", None)
    lx = getattr(ctx, "lexicons", None) if ctx is not None else None
    return (lx or {}).get(name) or ()


def shaped(view):
    """按 view 缓存一份整形结果；同一包内多语向复用。"""
    ctx = getattr(view, "ctx", None)
    cache = getattr(ctx, "lexicon_cache", None) if ctx is not None else None
    if cache is None:
        cache = {}
    if "v" not in cache:
        cache["v"] = {
            "country": compile_country(rows(view, "country")),
            "neighbor": compile_neighbor(rows(view, "neighbor")),
            "required": shape_required(rows(view, "latin-required")),
            "ascii": compile_ascii(rows(view, "latin-ascii")),
            "allow": shape_allow(rows(view, "latin-allow")),
            "taxon": shape_taxon(rows(view, "latin-taxon")),
            "term_zh": shape_term_zh(rows(view, "term-zh")),
            "family": shape_concept_family(rows(view, "concept-family")),
            "term_loc": shape_term_localization(
                rows(view, "term-localization")),
            "currency": shape_forbidden_currency(
                rows(view, "forbidden-currency")),
            "term_variant": shape_term_variant(rows(view, "term-variant")),
            "phrase_block": shape_phrase_block(rows(view, "phrase-block")),
        }
    return cache["v"]


def term_localization(view):
    return shaped(view)["term_loc"]


def term_zh(view):
    """中文概念 → 各语向首选形/可接受变体/禁用形（P74 用）。"""
    return shaped(view)["term_zh"]


def concept_family(view):
    """中文概念 → 各语向的**词形族**（P75 对立概念检查用）。"""
    return shaped(view)["family"]


def forbidden_currency(view):
    return shaped(view)["currency"]


def latin_required(view):
    return shaped(view)["required"]


def latin_allow(view, slug=None):
    """全库拉丁放行词（品牌/缩写/通用术语）。slug 参数已无意义，保留兼容。"""
    return shaped(view)["allow"]


def latin_taxon(view):
    """拉丁学名结构词表（属名/种加词/命名人，小写），P30 结构剥离用。"""
    return shaped(view)["taxon"]


def term_variant(view):
    """语向 → ((正形, 错形, 说明), ...)；P64 用。"""
    return shaped(view)["term_variant"]


def phrase_block(view, use):
    """用途标签 → {语向: ((词形, 模式), ...)}；没有该用途时返回空字典。

    缺用途返回 `{}` 而不是抛错：新规则先上代码、数据后补是常态，抛错会让
    整包检查崩掉（一个规则的数据缺失不该阻断其他 180 条）。但**空返回等于
    该规则零命中**，所以 `doctor` 对每个在用用途做非空校验，见
    `selftest/_word_data.py` 的用法清单。
    """
    return shaped(view)["phrase_block"].get(use, {})


def matcher(form, mode="word"):
    """编译一条短语：`word` 加整词边界，`regex`/`template` 原样。

    模板里的 `{N}` 不在这里替换——候选数字集合是运行期才知道的（母版该块
    出现了哪些阈值），由调用方替换后再编译。
    """
    if mode == "word":
        return _pattern(form)
    return re.compile(form, re.IGNORECASE | re.UNICODE)


def hits(form, mode, text):
    """按模式取命中：[(命中串, 起始下标)]，五种模式的语义只在这里定义一次。

    `word`      整词边界（拉丁语向）
    `regex`     原样编译
    `template`  原样编译（调用方已替换 `{N}`）
    `substring` casefold 子串包含（CJK 没有词边界，用 `word` 会全失配）
    `phrase`    转义后把空格放宽成 `\\s+`（多词短语的换行/多空格容错）

    返回下标而不是只返回串：判据要在消息里写「第 N 行」，没有下标就得再
    `src.find()` 一次——同一个词出现两次时会指到第一处，行号说谎。
    """
    if not form or not text:
        return []
    if mode == "substring":
        low, needle = text.casefold(), form.casefold()
        pos = low.find(needle)
        return [(form, pos)] if pos >= 0 else []
    flags = re.UNICODE if mode == "regex-cs" else (re.IGNORECASE | re.UNICODE)
    if mode == "phrase":
        pat = re.compile(re.escape(form).replace(r"\ ", r"\s+"), flags)
    elif mode == "word":
        pat = _pattern(form)
    else:
        pat = re.compile(form, flags)
    return [(m.group(0), m.start()) for m in pat.finditer(text)]
