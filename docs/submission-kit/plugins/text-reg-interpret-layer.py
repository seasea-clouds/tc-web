# -*- coding: utf-8 -*-
"""P77：法规解读段同序块的压缩比与数字锚存活

解读段是「结论 / 全链条走过一遍 / 例外与退路」的分层结构。压缩守 R21 上限时
压掉的必须只是修饰语：某块比中文母版同序块短得明显（低于该语族实测下沿），
或中文块里的数字在该块整个消失，都说明有一层被压没了。

v468（REG91 回流）：日期里的**月份**不参与数字锚。中文「2025 年 12 月 25 日」
在 40 多个语向按本语习惯写成「25 December 2025」/「25 Δεκεμβρίου 2025」，
月份是词形（P62 已明定「月份是词形，不判」），数字 12 必然不出现；此前把
月份算作硬锚，REG91 一篇就报 44 条 warning，全是同一形状的假阳。豁免只去掉
月份：年与日仍是硬锚，整条日期被压掉照样报红。
"""
import re
RULE = "P77"
RULES = [RULE]
PHASE = 40
CATEGORY = "text"
APPLIES_TO = ["regulation"]
NEEDS = ["parsed", "master"]
SEVERITY = "warning"
ENABLED = True

# 判据真实射程（自检台架据此校验注入点；写窄了会误报，写宽了等于没校验）
COVERAGE = {"langs": "all", "zones": ["body"]}

RATIONALE = {
    RULE: "REG89 实测（GACC 公告 101）：ja 首段把「输华名单」压成「許可リスト」，"
                    "R21 压到 298 字符仍全绿；ko 首段同形（허용 목록丢「중국」）；"
                    "bn 把 ISPM 15 写成本语数字后，同块数字面组仍非空，P19/P36 都看不见。"
                    "机检 PASS ≠ 语义终审：本条只筛「压缩过头」与「同块数字锚丢失」两种"
                    "形状，给出待回读清单，不代替逐语直读。阈值取自本篇 47 语实测下沿"
                    "（非 CJK 1.12/1.94/2.49、CJK 0.96/0.89/1.14）再留一成余量。"
                    "v468（REG91 回流）：`YYYY 年 M 月 D 日` / `YYYY-MM-DD` 的月份"
                    "不参与数字锚，只豁免月份数字（P62 已定「月份是词形，不判」），"
                    "年与日照旧；该形状属忠实翻译，不是压缩丢层。",
}

_MARK = "<!-- original -->"
_VIS_RE = r"[\s\*_`#>\-\[\]()]"
_FLOOR_OTHER = (0.80, 1.30, 1.55)
_FLOOR_CJK = (0.60, 0.65, 0.80)
_DIGIT_RE = r"\d{2,}"
_DATE_CN_RE = r"(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日"
_DATE_ISO_RE = r"(\d{4})-(\d{1,2})-(\d{1,2})"


def _date_month_tokens(block):
    """zh 块里日期写法的月份数字（`YYYY 年 M 月 D 日` / `YYYY-MM-DD`）。

    月份在译语里普遍写作月名词形，数字面消失是忠实翻译而非压缩丢层；
    只豁免月份，年（4 位）与日仍留在 required 集里，日期整条丢失仍报红。
    """
    t = _norm_digits(block)
    out = set()
    for m in re.finditer(_DATE_CN_RE, t):
        out.add(m.group(2))
    for m in re.finditer(_DATE_ISO_RE, t):
        out.add(m.group(2))
    return out


def _vis(s):
    import re
    return len(re.sub(_VIS_RE, "", s))


def _blocks(text):
    return [b.strip() for b in text.split("\n\n") if b.strip()]


def _norm_digits(s):
    out = []
    for ch in s:
        if ch.isdigit() and not ("0" <= ch <= "9"):
            try:
                import unicodedata
                out.append(str(unicodedata.digit(ch)))
                continue
            except (TypeError, ValueError):
                pass
        out.append(ch)
    return "".join(out)


def _missing_anchors(zh_block, t_block):
    """中文块 required 数字锚在该译块缺失的清单（日期月份豁免）。

    单独成函数，供 `selftest/_interpret_date_anchor.py` 直接断言：
    月份豁免必须是「只减月份」，不能顺手把年/日或非日期数字一起放掉。
    """
    z_digits = set(re.findall(_DIGIT_RE, _norm_digits(zh_block)))
    if not z_digits:
        return []
    exempt = _date_month_tokens(zh_block)
    t_norm = _norm_digits(t_block)
    return sorted(d for d in (z_digits - exempt) if d not in t_norm)


def run(view, emit):
    import re
    for art in view.articles:
        zh_body = art.body("zh") or ""
        if not zh_body:
            continue
        zh_head = (zh_body.split(_MARK, 1)[0] if _MARK in zh_body else zh_body)
        zh_blocks = _blocks(zh_head)
        zh_total = _vis(zh_head)
        if not zh_blocks or zh_total < 15:
            continue
        for lg in sorted(art.parsed):
            if lg == "zh":
                continue
            body = art.body(lg) or ""
            if not body:
                continue
            head = (body.split(_MARK, 1)[0] if _MARK in body else body)
            blocks = _blocks(head)
            t_total = _vis(head)
            cjk = lg in ("ja", "ko")
            # ① 整段压缩：整段只有中文的六成（CJK 四成）以下
            total_floor = 0.40 if cjk else 0.60
            if t_total < zh_total * total_floor:
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "解读段整段疑似压缩丢层：译段 %d 字符，只有中文段的 %.0f%%"
                     "（下沿 %.0f%%）——压缩只删修饰语，限定层与处置层必须留"
                     % (t_total, 100.0 * t_total / zh_total,
                        100.0 * total_floor))
            fl = _FLOOR_CJK if cjk else _FLOOR_OTHER
            for i in range(min(3, len(zh_blocks), len(blocks))):
                z_len = _vis(zh_blocks[i])
                if z_len < 60:
                    continue
                t_len = _vis(blocks[i])
                if t_len and t_len < z_len * fl[i]:
                    emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                         "解读第 %d 块疑似压缩丢层：译块 %d 字符，只有中文同序块的"
                         " %.0f%%（该语族下沿 %.0f%%）"
                         % (i + 1, t_len, 100.0 * t_len / z_len, 100.0 * fl[i]))
                if t_len:
                    missing = _missing_anchors(zh_blocks[i], blocks[i])
                    if missing:
                        emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                             "解读第 %d 块数字锚丢失：中文块有 %s，译块同序块没有"
                             "（数字锚逐块存活，换算成本语数词也会丢）"
                             % (i + 1, "、".join(missing[:4])))


def review(finding, view):
    return finding
