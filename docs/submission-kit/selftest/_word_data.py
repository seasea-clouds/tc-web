# -*- coding: utf-8 -*-
"""自检：判据词形只能住在两个地方之一（工具级臂，`selftest --kit` 才跑）。

界线（v442 立规）：
  · **语言机制常量**（这门语言怎么运作：数字读法、量级词、连接词前后缀、
    脚本集合、缩写集、否定词）→ `core/consts/`；
  · **判据载荷**（我们决定要判什么：黑名单、模板、正误对、套话、承诺）
    → `data/glossary.db` 的 `lexicons`，插件经 `plugins/_lexicon.py` 取；
  · **诊断文案**（finding 里的中文说明）→ 留在常量里无所谓，它不是判据。

为什么必须有这条臂：2026-11-15 审计发现 9 个词形常量（合计 594 条）住在
`core.consts`，其中 5 个只有插件用、2 个还让 core 拥有了单条规则的判据
（P49/P59）。迁完如果不钉住，下一个人复制粘贴就会搬回来，而「判据静默
零命中」这种故障在机检里表现为满分绿。

七个断言：
  ① 真实 consts：每个含非拉丁词形的绑定都在白名单里（新增必须写理由）；
  ② 真实库：七个在用用途齐全且行数与基线一致（数据被误删会在这里红）；
  ③ 匹配模式自证：word 不命中词内、substring 命中 CJK 子串、phrase 容换行、
     template 经 {N} 替换可编译；
  ④ 负向：库里清空一个用途 → 本臂必须报「用途缺失」（防「库坏了＝稿子干净」）；
  ⑤ 负向：词形行写成空串 → 必须报；
  ⑥ 负向：consts 里新写一个领域词形绑定 → 必须报；
  ⑦ 语言机制词形不许在插件里再抄一遍（P48 触发词「万亿」曾硬编码三处）。
"""
import ast
import os
import re
import shutil
import sqlite3
import sys
import unicodedata

_HERE = os.path.dirname(os.path.abspath(__file__))
_KIT = os.path.dirname(_HERE)
sys.path.insert(0, _KIT)

from plugins import _lexicon                                     # noqa: E402

# ① 白名单：变量名 → 归类理由。新增条目必须能说清「这是语言机制，不是我们判的内容」。
ALLOWED = {
    "NUMBER_WORDS": "各语数字读法",
    "NUMBER_WORD_ALTS": "数字读法的并列写法",
    "_P47_STEMS": "数字词干（P47 量级识别）",
    "_P47_WORDS": "数字词形",
    "_P47_FREE_STEM": "数字词干例外",
    "_CN_DIGITS": "中文数字字",
    "_CN_UNITS": "中文数位",
    "_CN_UNIT_MULT": "中文数位倍率",
    "CN_UNIT_TRILLION": "万亿（10^12）的中文写法，正则/倍率/P48 触发共用",
    "_UNIT_WORD_MULT": "各语量级词倍率",
    "_TH_UNIT_WORDS": "泰语数字个位",
    "_TH_TENS_PREFIXES": "泰语十位前缀",
    "SCRIPT_TESTS": "各语正字法校验用字符集",
    "P56_LANG_SCRIPTS": "语向 → 书写系统",
    "P08_LOCAL_SUFFIX": "屈折/附着后缀（词边界判定用）",
    "P08_LOCAL_PREFIX": "附着前缀（词边界判定用）",
    "P58_ABBR": "本语缩写集（句末判定用）",
    "P59_NEGWORDS": "各语否定词（极性判定用）",
    "KO_PARTICLES": "韩语助词/格标记（闭类语法词，术语词边界放行用）",
    "REDUPLICATION_OK": "合法叠词白名单",
    "REPEAT_LEXEME_NEXT": "叠词左邻词",
    # 诊断/呈现用，不是判据
    "RULE_META": "规则标题与说明文案",
    "_DETAIL_LABELS": "finding 明细标签",
    "REGISTER_MARKERS": "语域标记（判定用正则）",
    "REDUPLICATION_REWRITE_HINT": "叠词改写提示",
    "_DIGITS": "本语数字字符集",
    "_PREFIX": "复合词前缀（词边界判定用）",
    "FOREIGN_MONEY_SIGNS": "货币符号集（符号，不是词形）",
    "_CJK_CONT": "CJK 续行字符集（断行判定用）",
    "P42_TH_RE": "泰语引用正则（书写系统事实）",
    "P44_KO_COUNTER_RE": "韩语量词正则（书写系统事实）",
    "_CN_NUM_RE": "中文数字正则",
    "_CN_ORD_RE": "中文序数正则",
    "_CN_DIGIT_CHARS": "中文数字字符集",
    "_BLOCK_MISALIGN_H2_HINT": "块错位提示文案（诊断）",
}

# 前缀家族：同族常量不必逐条写，但家族理由必须写清（粗粒度，靠评审兜住）。
ALLOWED_PREFIX = {
    "LBL_": "块大纲维度标签（finding 明细文案；插件按名定位维度，必须是跨文件键）",
}

# ② 在用用途 → 行数基线。改动数据要同步改这里（数字变了必须是有意的）。
USE_BASELINE = {
    "negation": 16,
    "promise": 53,
    "ai-phrase-en": 29,
    "ai-phrase-zh": 15,
    "ai-phrase-locale": 309,
    "shrink": 13,
    "threshold-exclusive": 130,
    "long-scale-bad-unit": 21,
    "para-opener": 2,
    "reversal-hook": 4,
    "origin-page": 5,
    "origin-tool": 2,
    # P1（v457）/P2（v458）批次迁库后的基线；改动数据必须同步改这里
    "approx-word": 68,
    "cta-text": 2,
    "delivery-noun": 4,
    "delivery-unit": 2,
    "ecommerce-spaced": 1,
    "ecommerce-spaced-langs": 12,
    "org-renamed": 32,
    "p0-tier-token": 1,
    "p08-latin-stem": 35,
    "p08-unit-core": 24,
    "p52-latin-langs": 28,
    "p52-residue-hard": 13,
    "p52-residue-soft": 12,
    "p53-variant-pairs": 7,
    "p54-doc-word": 6,
    "p54-prep": 2,
    "price-currency": 5,
    "price-qualifier": 11,
    "price-symbol": 4,
    "r23-url-drift": 2,
    "signer-agent": 2,
    "signer-own-zh": 1,
    "signer-owned-object": 3,
    "signer-ownership-pred": 6,
}
VARIANT_MIN = 14


def check_unit_literals(kit):
    """⑦ 量级词形只许有一个来源。

    2026-11-15 实测：`"万亿"` 在 `core/consts` 的 `_CN_UNIT_RE`/`_CN_UNIT_MULT`
    与 `plugins/numbers-long-scale.py` 的触发条件里各写一份。改一处漏一处就是
    **P48 静默零命中**，而机检全绿——这类缺陷没有报错，只有「某条规则再也没
    命中过」。插件要用，就 import 常量，不要重打一遍字。
    """
    from core.consts import CN_UNIT_TRILLION, _CN_UNIT_MULT, _CN_UNIT_RE
    problems = []
    if CN_UNIT_TRILLION not in _CN_UNIT_RE.pattern:
        problems.append("W7 常量 %r 不在 _CN_UNIT_RE 里（正则与常量已漂移）"
                        % CN_UNIT_TRILLION)
    if CN_UNIT_TRILLION not in _CN_UNIT_MULT:
        problems.append("W7 常量 %r 不在 _CN_UNIT_MULT 里（倍率表与常量已漂移）"
                        % CN_UNIT_TRILLION)
    tokens = tuple(k for k in _CN_UNIT_MULT if len(k) >= 2)
    base = os.path.join(kit, "plugins")
    for fn in sorted(os.listdir(base)):
        if not fn.endswith(".py"):
            continue
        path = os.path.join(base, fn)
        tree = ast.parse(open(path, encoding="utf-8").read(), path)
        for node in ast.walk(tree):
            if (isinstance(node, ast.Constant) and isinstance(node.value, str)
                    and node.value.strip() in tokens):
                problems.append(
                    "W7 plugins/%s 第 %d 行重写了量级词形 %r："
                    "改成 import core.consts 的常量"
                    % (fn, getattr(node, "lineno", 0), node.value))
    return problems


def _argv_tmp():
    for i, a in enumerate(sys.argv):
        if a == "--tmp" and i + 1 < len(sys.argv):
            return sys.argv[i + 1]
        if a.startswith("--tmp="):
            return a.split("=", 1)[1]
    return None


def _non_latin_short(s):
    if len(s) > 24 or not s.strip():
        return False
    for ch in s:
        if ch.isalpha():
            try:
                if not unicodedata.name(ch).startswith("LATIN"):
                    return True
            except ValueError:
                return True
    return False


def consts_bindings(kit):
    """→ [(file, name, n_words)]：consts 里带非拉丁词形的绑定。"""
    out = []
    base = os.path.join(kit, "core", "consts")
    for fn in sorted(os.listdir(base)):
        if not fn.endswith(".py") or fn == "__init__.py":
            continue
        p = os.path.join(base, fn)
        tree = ast.parse(open(p, encoding="utf-8").read(), p)
        for node in ast.walk(tree):
            if not isinstance(node, (ast.Assign, ast.AnnAssign)):
                continue
            targets = node.targets if isinstance(node, ast.Assign) else [node.target]
            names = [t.id for t in targets if isinstance(t, ast.Name)]
            if not names:
                continue
            n = sum(1 for x in ast.walk(node.value)
                    if isinstance(x, ast.Constant) and isinstance(x.value, str)
                    and _non_latin_short(x.value))
            if n:
                out.append((fn, names[0], n))
    return out


def check_consts(kit):
    problems = []
    for fn, name, n in consts_bindings(kit):
        if name in ALLOWED:
            continue
        if any(name.startswith(p) for p in ALLOWED_PREFIX):
            continue
        problems.append(
            "W1 core/consts/%s 的 `%s` 含 %d 条非拉丁词形，但不在白名单："
            "领域词形应进 lexicons（glossary lexicon add），"
            "确属语言机制请在 selftest/_word_data.py 的 ALLOWED 里写明理由"
            % (fn, name, n))
    return problems


def _rows(db, use):
    conn = sqlite3.connect(db)
    try:
        return conn.execute(
            "SELECT key, value, meta_json FROM lexicons "
            "WHERE id='phrase-block' AND key LIKE ?", (use + "|%",)).fetchall()
    finally:
        conn.close()


def check_db(db):
    problems = []
    conn = sqlite3.connect(db)
    try:
        ids = {r[0] for r in conn.execute("SELECT DISTINCT id FROM lexicons")}
        for lid in ("term-variant", "phrase-block"):
            if lid not in ids:
                problems.append("W2 词表缺类：%s（迁移未完成）" % lid)
        empty = conn.execute(
            "SELECT count(*) FROM lexicons WHERE value=''").fetchone()[0]
        if empty:
            problems.append("W2 词表有空词形行：%d" % empty)
        nv = conn.execute(
            "SELECT count(*) FROM lexicons WHERE id='term-variant'").fetchone()[0]
        if nv < VARIANT_MIN:
            problems.append("W2 term-variant 行数 %d < %d（P64 词对被删）"
                            % (nv, VARIANT_MIN))
    finally:
        conn.close()
    for use, want in USE_BASELINE.items():
        got = len(_rows(db, use))
        if got != want:
            problems.append("W2 用途 %-20s 行数 %d，基线 %d" % (use, got, want))
    return problems


def check_modes(db):
    """③ 五种模式语义：只在 _lexicon.hits 里定义一次，这里用样本自证。"""
    problems = []
    if _lexicon.hits("delve", "word", "we delved into it"):
        problems.append("W3 word 模式误命中词内（Word-boundary 失效）")
    if not _lexicon.hits("无法出口", "substring", "这批货无法出口到中国"):
        problems.append("W3 substring 模式未命中 CJK 子串")
    if not _lexicon.hits("en resumen", "phrase", "texto\nen  resumen final"):
        problems.append("W3 phrase 模式未容忍换行/多空格")
    row = _rows(db, "threshold-exclusive")
    if row:
        tpl = row[0][1]
        try:
            re.compile(tpl.replace("{N}", "(?:10)"))
        except re.error as exc:
            problems.append("W3 threshold 模板不可编译：%s" % exc)
    return problems


def check_negative(db, tmp):
    """④⑤⑥ 三个负向：库坏了、行空了、consts 又长了词形，都必须报。"""
    problems = []
    copy = os.path.join(tmp, "word-data", "glossary_copy.db")
    os.makedirs(os.path.dirname(copy), exist_ok=True)
    shutil.copyfile(db, copy)
    conn = sqlite3.connect(copy)
    try:
        conn.execute("DELETE FROM lexicons WHERE id='phrase-block' "
                     "AND key LIKE 'negation|%'")
        conn.commit()
    finally:
        conn.close()
    if not any("negation" in p for p in check_db(copy)):
        problems.append("W4 清空 negation 用途后未报缺失（判据会静默零命中）")

    conn = sqlite3.connect(copy)
    try:
        conn.execute("DELETE FROM lexicons WHERE id='phrase-block' "
                     "AND key LIKE 'negation|%'")
        conn.execute("INSERT INTO lexicons(id,scope,key,value,target,"
                     "meta_json,ord) VALUES('phrase-block','global',"
                     "'negation|*','','','{}',999)")
        conn.commit()
    finally:
        conn.close()
    if not any("空词形" in p for p in check_db(copy)):
        problems.append("W5 空词形行未报（库里空串会让判据永远不命中）")

    fake = os.path.join(tmp, "word-data", "fakekit")
    os.makedirs(os.path.join(fake, "core", "consts"), exist_ok=True)
    with open(os.path.join(fake, "core", "consts", "x.py"), "w",
              encoding="utf-8", newline="\n") as fh:
        fh.write('BAD_TERMS = ["植物检疫证书", "упаковочные предприятия"]\n')
    if not any("BAD_TERMS" in p for p in check_consts(fake)):
        problems.append("W6 consts 新增领域词形未被拦（白名单机制失效）")
    return problems


def main():
    tmp = _argv_tmp()
    if not tmp:
        print("需要 --tmp <目录>：负向断言要造临时副本，不允许落到工具包内")
        return 2
    db = os.path.join(_KIT, "data", "glossary.db")
    problems = []
    problems += check_consts(_KIT)
    problems += check_db(db)
    problems += check_modes(db)
    problems += check_unit_literals(_KIT)
    problems += check_negative(db, os.path.abspath(tmp))
    for p in problems:
        print("  FAIL", p)
    print("词形归属：7 断言（白名单 / 库基线 / 模式自证 / 量级词单源 / 三负向），"
          "FAIL %d" % len(problems))
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
