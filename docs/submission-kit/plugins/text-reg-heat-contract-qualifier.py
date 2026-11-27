# -*- coding: utf-8 -*-
"""R25：引号契约短语（加热温度/时长）限定词守卫

GACC 公告家族反复出现标准契约短语「中心温度不低于 N℃ 加热至少 M 秒」：
双段限定（温度侧「不低于」+ 时长侧「至少」）。P36 只对数字位做逐块奇偶校验，
限定词掉一半时数字仍在位——REG226 实证 vi/th 第二处引号（b27）掉了温度侧、
en/fa 全文掉了时长侧（含解读段），全部 0 报错通过，靠主线程逐语审计才发现。

判据：zh 正文出现锚点正则「中心温度不低于(\d+(\.\d+)?)℃加热至少(\d+(\.\d+)?)秒」
时，对各语正文中同时含温度值与时长值（时长允许十进制点/逗号变体）的行，
限定词记号（LEXICON[lg] 子串计数，温度侧/时长侧允许单 token 双用，如
en at least / hu legalább / sw angalau / ja 以上）必须 >= 2，缺段报红。

词表按 REG226 交付 47 语实况抽取（每语契约短语两段限定词原文），新形态
（同义限定词、分钟级时长、其他锚点句式）在交付中发现后扩表，RATIONALE 记录。
REG226 全库探针：48 份文件 LOW-lines 0（词表齐备后）。
"""
import re

RULE = "R25"
RULES = [RULE]
PHASE = 40
CATEGORY = "text"
APPLIES_TO = ["regulation"]
NEEDS = ["parsed"]
SEVERITY = "error"
ENABLED = True

COVERAGE = {"langs": "all", "zones": ["body"]}

# zh 锚点：标准加热契约短语（温度侧不低于必现；时长侧「至少」可选——母版
# 自身掉「至少」时锚点不得失配，zh 行按词表计数照样报红）
_ZH_ANCHOR_RE = re.compile(r"中心温度不低于(\d+(?:\.\d+)?)℃加热(?:至少)?(\d+(?:\.\d+)?)秒")

# 各语限定词记号（温度侧+时长侧并集；单 token 可双用）。
# 底账＝REG226 交付 47 语 b15/b27 契约短语 + 解读段实况（见 REG226 findings.md 二-3）。
LEXICON = {
    "zh": ["不低于", "至少"],
    "en": ["at least", "no lower than", "not lower than", "no less than", "not less than"],
    "es": ["no inferior a", "al menos", "como mínimo", "por lo menos"],
    "fr": ["non inférieure", "non inférieur", "au moins"],
    "de": ["mindestens", "nicht niedriger", "nicht weniger"],
    "it": ["non inferiore", "almeno"],
    "pt": ["não inferior", "pelo menos", "no mínimo"],
    "nl": ["minimaal", "ten minste", "tenminste", "minstens", "niet lager"],
    "sv": ["minst", "inte lägre"],
    "da": ["mindst", "ikke lavere"],
    "no": ["minst", "ikke lavere"],
    "fi": ["vähintään", "ei alhaisempi", "ei matalampi"],
    "ca": ["no inferior", "almenys", "com a mínim"],
    "ja": ["以上", "少なくとも"],
    "ko": ["이상", "최소", "낮지 않"],
    "ru": ["не ниже", "не менее", "по меньшей мере", "как минимум"],
    "uk": ["не нижче", "не менше"],
    "be": ["не ніжэй", "не менш"],
    "bg": ["не под", "поне", "не по-ниско", "не по-малко"],
    "el": ["τουλάχιστον", "όχι χαμηλότερη", "όχι χαμηλότερο", "όχι κατώτερη"],
    "tr": ["en az", "aşağı olmayan", "daha düşük olmayan"],
    "cs": ["ne nižší než", "nejméně", "aspoň", "ne nižší"],
    "sk": ["nie nižšiu ako", "najmenej", "aspoň", "nie nižšiu"],
    "pl": ["nie niższej niż", "co najmniej", "przynajmniej", "nie niższej"],
    "hu": ["legalább", "nem alacsonyabb"],
    "ro": ["cel puțin", "nu mai puțin", "nu mai mică", "nu mai mic"],
    "hr": ["najmanje", "ne blaža", "ne niže"],
    "sr": ["најмање", "не нижи", "мање од"],
    "sl": ["najmanj", "nižja od", "vsaj", "ne nižja"],
    "id": ["tidak lebih rendah", "minimal", "tidak kurang dari", "sekurang-kurangnya"],
    "ms": ["tidak kurang", "minima", "sekurang-kurangnya", "minimum"],
    "vi": ["không thấp hơn", "ít nhất", "không dưới", "không thấp"],
    "th": ["ไม่ต่ำกว่า", "อย่างน้อย"],
    "ar": ["لا تقل عن", "على الأقل", "على الاقل"],
    "fa": ["حداقل", "کمتر نباشد"],
    "ur": ["کم نہ ہو", "کم از کم"],
    "he": ["לפחות", "שאינה נמוכה", "לא פחות"],
    "hi": ["से कम नहीं", "न्यूनतम", "कम से कम", "से नीचे नहीं"],
    "bn": ["নিচে নয়", "ন্যূনতম", "কম নয়", "অন্তত"],
    "ne": ["कम नहुने", "कम्तीमा", "भन्दा कम"],
    "ta": ["குறையாமல்", "குறைந்தது", "குறைவாக இல்லாத"],
    "si": ["අඩු නොවන", "අඩුම තරම්", "අඩුනොවන"],
    "ka": ["არანაკლებ", "მინიმუმ"],
    "hy": ["առնվազն", "ոչ ցածր"],
    "sw": ["angalau", "isiyopunguzwa", "isiyo pungua"],
    "af": ["minstens", "ten minste", "tenminste", "nie laer"],
    "sq": ["së paku", "jo më të ulët", "të paktën", "jo më pak"],
    "az": ["aşağı olmamaqla", "aşağı olmayan", "ən azı", "ən az"],
}

RATIONALE = {
    RULE: "v1.00 立规（REG226 实证，2026-11-22）：GACC 公告家族标准契约短语"
          "「中心温度不低于70℃加热至少3.6秒」为双段限定（温度侧+时长侧）。"
          "P36 数字奇偶只保证 70/3.6 在位，限定词掉一半不报错——REG226 机检 "
          "PASS 0e/0w 后主线程 47 语逐块审计揪出 11 处：vi/th 第二处引号(b27)"
          "掉温度侧（b15 同短语齐全，属漏抄）；en/fa 全文掉时长侧（含解读段）；"
          "de/es/fr/he/it/pt/sq 解读段(b02)掉时长侧。全部人工补齐后按 47 语"
          "实况建 LEXICON 词表，48 份文件行级探针 LOW-lines 0，零误伤回灌。"
          "判据行级触发：行内同时含锚点温度值与时长值（[.,] 变体）即校验，"
          "不依赖引号配对（da/no/sv „…”、ca/fr/sq «»/„””、ja/ko 全角引号各异）。"
          "限定词计数允许单 token 双用（en at least×2、hu legalább×2、sw "
          "angalau×2、ja/ko 以上/이상×2 同形合法）。扩展点：分钟级时长"
          "（加热至少N分钟）、其他锚点句式（灭菌温度等）交付中发现后扩"
          "_ZH_ANCHOR_RE 与词表。",
}


def run(view, emit):
    for art in view.articles:
        if not art.is_reg:
            continue
        zh_body = art.body("zh") or ""
        m = _ZH_ANCHOR_RE.search(zh_body)
        if not m:
            continue
        tnum, dnum = m.group(1), m.group(2)
        t_re = re.compile(r"(?<!\d)%s(?!\d)" % re.escape(tnum))
        # 时长值允许十进制点/逗号变体（3.6 / 3,6）
        d_re = re.compile(r"(?<!\d)%s(?!\d)"
                          % re.escape(dnum).replace(r"\.", r"[.,]"))
        for lg in sorted(art.parsed):
            toks = LEXICON.get(lg)
            if not toks:
                continue
            body = art.body(lg) or ""
            lines = []
            for i, ln in enumerate(body.split("\n"), 1):
                if not (t_re.search(ln) and d_re.search(ln)):
                    continue
                if sum(ln.count(tok) for tok in toks) < 2:
                    lines.append(i)
            if lines:
                emit(RULE, SEVERITY, "%s/%s" % (lg, art.slug),
                     "第 %s 行出现加热契约短语（温度 %s℃/时长 %s 秒）但限定词"
                     "记号不足 2 个（zh 双段：不低于+至少；同义限定词不在 "
                     "LEXICON[%s] 时扩表），参见 REG226 vi/th/en/fa 实证"
                     % (", ".join(str(n) for n in lines[:6]), tnum, dnum, lg))


def review(finding, view):
    return finding
