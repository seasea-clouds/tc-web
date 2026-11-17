# -*- coding: utf-8 -*-
"""P75：对立概念是否被译成了同一个词（概念合并）

背景：词库（term-zh）只收「有据且唯一」的概念；但真正容易译错的是**成对
概念**——免税/放行、注册/备案、申报/报关单、发货人/收货人、销毁/退运。
这些概念在中文母版里常常同句对举（「免税放行」「退回或销毁」），译文一旦
用同一个词，读者就分不出两件事，而这恰恰是最难靠「首选形比对」发现的：
两边都对不上首选形，却都「像那么回事」。

判据（只查有证据的部分）：

1. **词族**（`concept-family`）给每个语向一组「表达该概念的全部已知形态」，
   不要求唯一、不作「必须这么写」的判据。
2. **判别词剔除**：若某词形同时属于对立两族（如 bg `освобождаване` 既表
   免税又表放行），说明该语本身不区分，**该语向整体跳过**（mode=merged），
   绝不在这种语言上判红。
3. **归因**（触发条件一，计数口径）：母版用了 A（zh_a 次）、B（zh_b 次）；
   译文里 A 族 0 次，且 B 族的用量比母版自身的 zh_b 多出来的部分**恰好
   约等于 zh_a**（容差 max(1, 50%·zh_a)）——这才说明 B 的词形把 A 的量也
   吸收了。容差按**本概念**的次数算，不按对立概念：早期版本按对立概念算
   容差，在 de（母版 免税1/放行8、译文 Freigabe 6 次）上误报，实测后改掉。
4. **对举丢失**（触发条件二，块级口径）：母版有 **≥2 段**同时出现两族
   （中文惯用对举「免税放行」「退回或销毁」），而译文**没有任何一段**同时
   出现两族，且对立族用量不低于母版自身的用量——说明那些对举在译文里被
   并成了一个词。门槛取 2 是因为译者拆段是常态，单处对举不足以证伪。
   本口径**不要求本族整篇 0 次**：本族在别处出现过、计数口径因此失效，
   但对举全部消失，仍构成合并证据——这正是它补的盲区。
4. 缺失不判：母版没提 A 就完全不查；译文用别的说法（同义改写）也不判——
   只有**出现了对立概念的专属词形**才算证据。

射程：只查 body（正文），`langs: all`；配置来自词表，不写死任何文章。
"""
import re

from core.textutil import blocks as _blocks
from plugins._lexicon import concept_family

RULE = "P75"
RULES = [RULE]
PHASE = 41
CATEGORY = "text"
APPLIES_TO = ["blog", "regulation"]
NEEDS = ["body"]
SEVERITY = "warning"
ENABLED = True

COVERAGE = {"langs": "all", "zones": ["body"]}

RATIONALE = {
    RULE: "v413 立规：词库只收「有据且唯一」的概念，收不进去的恰恰是最易译错的"
                    "成对概念（免税/放行、注册/备案、申报/报关单、销毁/退运）。"
                    "改为查**关系**而不是查词形：词族给出每语表达该概念的全部已知"
                    "形态；用「归因」判据定量比对——对立词形多出来的用量要恰好等于"
                    "本概念在母版的次数才算合并；两族在某个语向本就合一"
                    "（如 bg освобождаване）则整体跳过。缺失、同义改写、该词在本篇"
                    "另有大量一般用法，全部不判。校准过程：初版「A 族 0 次即报」在"
                    "A3 一篇上出 10 条（9 条是同义改写），加计数区间后 1 条，改成"
                    "归因判据后 0 条；全库现 0 命中，判据留在自检臂里可证伪。"
                    "v415 再加两处：块级「对举全丢」口径（≥2 段才判，防拆段误报）、"
                    "占比 <20% 与被吸收侧 <2 次的两道防噪闸（A4 的 el/hr/ne 三条"
                    "「放行 1 次 / 免税 12 次」假阳性）；同时把未经人工补全同义词的"
                    "词族标 mode=unverified、不参与判红——播种族在 A4 一篇上出过 "
                    "13 条假阳性（es declaración、no avtale、sv punktskatt 都属"
                    "同义改写，屈折扩展补不了）。v416 又加绝对量下限 MIN_N=3："
                    "全库 635 条告警里 598 条是「放行 1 次 / 译文免税词 2 次」"
                    "这类小计数巧合（容差最小 1，计数 1 时任何差 1 都成立）；"
                    "块级口径再加「本族用量不足母版一半」，挡掉「对举两半被拆到"
                    "相邻段」的排版差异。"
                    "v421 给块级口径加 `本族 ≥1 次` 前置：本族整篇 0 次时「对举"
                    "全丢」必然成立，而真实原因通常是族里缺该写法（ja A4 写「発票」、"
                    "sw 写 `risiti`、ru 合同写 `контракт`），A4 一篇实测 3 条"
                    "（ja/ru/sw）全属此类——族缺词不能当概念合并判。"
                    "v441 词形末尾写 `*` 表示复合词词干（前缀匹配）：de "
                    "`Einreihung` 在 `Einreihungsentscheidung` 里既非词首也非词尾，"
                    "按词边界永远 0 命中，而语料里这个复合形出现 29 次——不认词干，"
                    "归类族在 de/nl/no/sv/af/da/fi 七语上召回只有 0.27~0.43，"
                    "块级判据就会把「族缺复合形」读成「被税号吸收」。词干必须有"
                    "显式词根（`Einreihungs*` 不含 `Einreihung`），所以基础形照收，"
                    "两条一起才覆盖「带连接语素的复合词」与「裸词」两种形态。",
}

# 归因口径的**绝对量下限**：两侧在母版里各至少 3 次。
# v415 实测：免税/放行 一对在全库产生 635 条告警，其中 598 条是「放行 1 次、
# 译文用免税词 2 次」这类小计数巧合——tolerance 最小为 1，计数为 1 时任何
# 差 1 都「约等于」，判据退化成噪声。两侧各 3 次才能让容差有意义。
MIN_N = 3
# 计数口径（归因）另有更严的下限：见 audit() 里的注释。块级口径仍用 MIN_N。
MIN_ATTR = 5

_LETTER = r"[^\W\d_]"
# 前置附着成分：希伯来语把 ה/ב/ל/ו/ש/כ/מ 直接粘在名词上（החוזה =「这份合同」），
# 阿拉伯语粘 ال/و/ب/ل/ف/ك（والاتفاق =「以及协议」）。不认这些前缀，词族里
# 的裸形在正文里永远命中 0 次，判据就会把「译对了」当成「没译」——v415 实测
# 希伯来语 חוזה 正文 8 次全带 ה 前缀，触发 3 条假阳性。
_PREFIX = {
    "he": r"[הבלוושכמ]{0,2}",
    "ar": r"(?:[وفبلك]?ال|[وفبلك]){0,2}",
    "fa": r"(?:[وفبلك]?ال|[وفبلك]){0,2}",
}
# 无空格文字（中日韩、泰、老、缅、高棉）：不能加词边界——`[^\W\d_]` 在中日韩
# 语言里把汉字/假名/谚文也算成字母，「货免税放」里匹配「免税」会因左侧「货」
# 而失败（v413 自检臂实测）。
_SPACELESS = re.compile(r"[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af"
                        r"\u0e00-\u0e7f\u0e80-\u0eff\u1000-\u109f"
                        r"\u1780-\u17ff]")

# 零宽连接符（波斯语/乌尔都语/阿拉伯语把复合词连起来写：`می‌پردازد`）。
# 词形里写普通空格、正文里写 ZWNJ，匹配就永远 0 次——而 0 次在 P75 里是
# 「证据」。统一折成空格再比，两侧都折，等价且不改变语义。
_INVIS = re.compile("[\u200b\u200c\u200d\u2060\ufeff\u00ad]")


def _prep(s):
    return _INVIS.sub(" ", s or "")


def _rx(form, lg=""):
    """词形 → 正则。词形末尾写 `*` 表示**复合词词干**（前缀匹配）。

    日耳曼语系与芬兰语把术语焊成一个词（de `Einreihungsentscheidung`、
    nl `indelingsbeslissing`、fi `luokituspäätös`），词边界正则在接缝处失效——
    `Einreihung` 在 `Einreihungsentscheidung` 里既不是词首也不是词尾，永远 0 命中。
    斯拉夫语是反过来的：术语拆成多个词、逐词变格（v439 的 `kodu taryfowego`）。
    两种形态学缺口修法不同，但都不能靠枚举——前者要词干，后者要变格表。
    """
    form = _prep(form).strip()
    prefix = form.endswith("*")
    if prefix:
        form = form[:-1].strip()
    if len(form) < 2:
        return None           # 裸 `*` 或单字符词干没有区分力
    esc = re.escape(form)
    tail = r"[\w\-]*" if prefix else ""
    if _SPACELESS.search(form):
        return re.compile(esc + tail, re.I | re.U)
    pre = _PREFIX.get(lg, "")
    if prefix:
        return re.compile(r"(?<![^\W\d_])%s%s%s" % (pre, esc, tail), re.I | re.U)
    return re.compile(r"(?<![^\W\d_])%s%s(?![^\W\d_])" % (pre, esc),
                      re.I | re.U)


def _count(forms, text, lg=""):
    text = _prep(text)
    n = 0
    for f in forms:
        rx = _rx(f, lg)
        if rx:
            n += len(rx.findall(text or ""))
    return n


def _marks(forms, text, lg=""):
    out = []
    for f in forms:
        rx = _rx(f, lg)
        if rx:
            out.extend((m.start(), m.end()) for m in rx.finditer(text or ""))
    return out


def _pair_counts(a, b, text, lg=""):
    """两族各自的命中数，**同一处文本只算一次**。

    这对「上位/下位概念」是必须的：en `declaration`（申报行为）是
    `customs declaration`（报关单）的一个词，按词边界计数时后者会同时算进
    前者——于是 申报 永远「有命中」，合并方向永远测不出来，归因口径的
    「多出来的量」也被污染。17/47 语向是这种嵌套（ca/cs/en/es/fr/hi/hr/id/
    it/ka/ms/ne/pt/ro/sk/sr/sw）。

    规则：某处文本若已被**更长的**对立族词形覆盖，就不计入本族。
    """
    t = _prep(text)
    sa, sb = _marks(a, t, lg), _marks(b, t, lg)

    def keep(mine, other):
        n = 0
        for s, e in mine:
            if any(os_ <= s and e <= oe and (oe - os_) > (e - s)
                   for os_, oe in other):
                continue
            n += 1
        return n

    return keep(sa, sb), keep(sb, sa)


def audit(table, zh_text, texts):
    """纯函数：table=shape_concept_family 结果，zh_text=母版正文，
    texts=[(语向, 译文)]。
    → [(概念, 对立概念, 语向, 母版次数, 本族命中, 对立族命中, 判据)]

    v421 把「本族命中」一并返回：旧版消息里硬写「本族 0 次」，而块级口径
    允许本族 ≥1 次，消息会把「只有 2 次」说成「0 次」，读日志的人无从判断。

    自检臂直接调它，不建包。
    """
    out = []
    for concept, spec in sorted(table.items()):
        pair = spec.get("pair") or ""
        if not pair or pair not in table or pair < concept:
            continue                      # 每对只从字典序小的一侧审一次
        other = table[pair]
        zh_a = _count((concept,), zh_text)
        zh_b = _count((pair,), zh_text)
        if not zh_a and not zh_b:
            continue
        # 母版里的对举段数（用**中文概念名**判，不能用译文词形——那是另一门语言）
        zh_both = len([blk for blk in _blocks(zh_text)
                       if _count((concept,), blk) and _count((pair,), blk)])
        for lg, cell_a in sorted((spec.get("langs") or {}).items()):
            forms_a = cell_a.get("forms") or ()
            cell_b = (other.get("langs") or {}).get(lg) or {}
            forms_b = cell_b.get("forms") or ()
            if cell_a.get("mode") != "check" or cell_b.get("mode") != "check":
                continue
            if not forms_a or not forms_b:
                continue
            # 判别词剔除：两族共有的词形不具区分力
            shared = {f.lower() for f in forms_a} & {f.lower() for f in forms_b}
            a = tuple(f for f in forms_a if f.lower() not in shared)
            b = tuple(f for f in forms_b if f.lower() not in shared)
            if not a or not b:
                continue
            text = dict(texts).get(lg) or ""
            if not text:
                continue
            hit_a, hit_b = _pair_counts(a, b, text, lg)
            # 「归因」判据（v414 校准，替代初版的「A 族 0 次即报」）：
            #   对立概念的词形比母版自身用量多出来的部分 extra，应当恰好约等于
            #   本概念在母版的次数——那才说明它把本概念的量也吸收了。
            #     de：母版 免税1/放行8，译文 Freigabe 6 次 → extra=-2，不判（译文
            #         用同义改写或称「缺失」，不是合并）。
            #     ne：母版 放行8/免税1，译文免税词 19 次 → extra=18 ≫ 8，不判
            #         （该词在本篇另有大量一般用法）。
            #   真合并：extra ≈ 本概念次数（容差 max(2, 50%)）。
            tol_a = max(1.0, 0.5 * zh_a)      # 容差按**本概念**的次数算，不按对立概念
            tol_b = max(1.0, 0.5 * zh_b)
            # 计数口径的绝对量下限取 5（比块级口径的 3 更严）：归因是「多出来的
            # 用量 ≈ 缺失量」的等量代换，n=3~4 时容差 max(1, 0.5n) 与信号本身
            # 同量级，任何「差 1」都成立。v421 实测 F1 一篇 6 条告警的母版计数
            # 全在 3~5，全是巧合（ja 的 发票 写作インボイス、az 写 `faktura`、
            # sv 写 `faktureringen`、ur 写 `بلنگ`、sr 另有写法，都在族外）。
            # 占比门槛：被吸收的那一侧在母版里占比 <20% 时，「译文该族 0 次」
            # 与统计噪声不可区分。A4 的 el/hr/ne 上 zh 放行 1 次、免税 12 次，
            # 译文免税词 13 次 → 差 1 正好落进容差，实测三条全假。
            hit = False
            if (zh_a >= MIN_ATTR and zh_b >= MIN_ATTR and hit_a == 0
                    and abs((hit_b - zh_b) - zh_a) <= tol_a):
                out.append((concept, pair, lg, zh_a, hit_a, hit_b, "计数"))
                hit = True
            elif (zh_b >= MIN_ATTR and zh_a >= MIN_ATTR and hit_b == 0
                    and abs((hit_a - zh_a) - zh_b) <= tol_b):
                out.append((pair, concept, lg, zh_b, hit_b, hit_a, "计数"))
                hit = True
            if hit or zh_both < 2:
                continue
            # 块级口径（局部合并）：母版有 ≥2 段**同时出现两族**的对举，
            # 译文一段都没有，且对立族用量不低于母版自身的用量。
            #   · 门槛取 2 而不是 1：译者在长段处拆段是常态，单处对举被拆开
            #     就能满足条件，会产出误报。
            #   · 不要求本族整篇 0 次：这正是本口径的价值——本族在别处出现过
            #     （计数口径因此失效），但对举全部消失，仍是合并的证据。
            tg_both = len([blk for blk in _blocks(text)
                           if all(_pair_counts(a, b, blk, lg))])
            if tg_both:
                continue
            # 还要求**本族用量不足母版的一半**：译者把对举的两半拆到相邻两段
            # 是常见排版差异，两族都在、只是没同段，不能算合并（自检臂负向 1
            # 就是这个形态）。本族用量腰斩 + 对举全丢，才是合并。
            # v421 追加 `hit_a >= 2`：本族**整篇 0~1 次**不是合并，是族里缺这个
            # 写法（ja A4 用「発票」、sw 用 `risiti`、ru 合同用 `контракт`，
            # 都不在族里；sv F1 只用一次 `kontrakt`，其余是 `kontrakts-` 复合词，
            # 词边界不认）。这种情形下「对举全丢」必然成立，判据会把「同义改写
            # 未收」当成「概念被并」，A4 一篇实测 3 条、F1 一篇 1 条全属此类。
            if (zh_a >= MIN_N and zh_b >= MIN_N
                    and hit_a >= 2 and hit_a * 2 < zh_a and hit_b >= zh_b):
                out.append((concept, pair, lg, zh_a, hit_a, hit_b, "对举"))
            elif (zh_a >= MIN_N and zh_b >= MIN_N
                    and hit_b >= 2 and hit_b * 2 < zh_b and hit_a >= zh_a):
                out.append((pair, concept, lg, zh_b, hit_b, hit_a, "对举"))
    return out


def run(view, emit):
    table = concept_family(view)
    if not table:
        return
    for art in view.articles:
        zh = art.body("zh")
        if not zh:
            continue
        texts = [(lg, art.body(lg)) for lg in sorted(art.parsed) if lg != "zh"]
        for concept, pair, lg, zh_n, mine_n, other_n, why in audit(table, zh, texts):
            emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                 "母版出现「%s」%d 次，但译文里「%s」族只有 %d 次、对立概念"
                 "「%s」的词形出现 %d 次（判据：%s）——疑似把两个概念译成了"
                 "同一个词" % (concept, zh_n, concept, mine_n, pair, other_n, why))


def review(finding, view):
    return finding
