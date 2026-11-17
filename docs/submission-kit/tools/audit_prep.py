# -*- coding: utf-8 -*-
"""逐语人工审计准备器：从 zh 母版生成 47 译语的逐块对照与关键锚简报。

用法（仓库根执行）：
  python -u submission-kit/tools/audit_prep.py \
      --entry submission/regulations/REG16-.../ --out tmp/audit/REG16

产出（全部落在 --out 下，不写 submission/）：
  pairs/<lang>.md       每语逐块 ZH ↔ 译语对照
  brief/<lang>.md       题录 + 自动挑选的关键锚块（供子代理逐语复核）
  anchors.md            关键锚的 47 语并列视图（供主线程人工横向核对）
  suspects.md           自动疑点（缺学名／块数不齐／中文残留／英文整串缺失）
  front_outliers.md     题录层横向视图 + 契约覆盖率（低置信度，交人工裁定）
  review_checklist.md   逐语审校必检清单与离群判定口径（全项目统一）
  suspects.md 另含 v2.22 契约 forbid 词形跨层泄漏疑点（S08/S09/S11 只判锚层）
  suspects.md 另含 v2.28 ar 公告发布机关被降格为进口主体的属格歧义疑点（R11）

设计口径（2026-11-08 REG16 / 2026-11-09 D3 / 2026-11-10 D4 三轮实证）：
  * 唯一基准＝zh 母版；en 只是首个译语，不作基准、不作中转。
  * 锚点自动挑选：母版中含拉丁学名、英文整串、百分比、法规序号或数字阈值的块，
    加解读段（`<!-- original -->` 之前的块）与末尾 3 块（落款）。
  * 只生成只读对照，不改稿、不判分；人工判定仍以回读 zh 母版为准。
  * **机检 PASS ≠ 语义终审**：D3 单篇 0 finding 仍抓出 7 条语义真错，
    D4 单篇 0 finding 仍抓出 3 语摘要漏层 + 1 语正字法串味。

v2.21（2026-11-10）新增 front_outliers.md / review_checklist.md：
  把 D3、D4 两轮主线程逐篇审计反复验证的「跨语离群」方法论沉淀为
  工具产出，而不是留在某篇的 tmp/ 里。所有执行人、两线内容、每篇审校
  自动得到同一份必检清单与同一套假阳性过滤口径，不再依赖个人记忆。
"""
# 治理声明：本文件属机制层，不承载策略数据；改动须走 README「治理」节的 L3 流程
#（先登记理由 → 行为级等价断言 → selftest --kit 全量），提交说明带 [arch]
#（commit-msg 钩子强制）。策略变更请改 plugins/ 判据或经 submit.py glossary 改库。
from __future__ import annotations

import argparse
import json
import re
import statistics
import sys
from pathlib import Path

_VERBATIM_PROBE_LEN = 40

# v2.28 / R11：ar 语向「公告发布机关被主动允许动词降格为间接宾语」词形族。
# 两次独立实证：REG77（82 号）阶段 4 与 REG81（80 号）阶段 4，ar 出稿都写成
#   يجيز الإعلان رقم N للإدارة العامة للجمارك استيراد...
# 主动及物动词 يجيز 搭配 لـ，使所属定语被读成「给/为海关总署」，成
# 「公告准许海关总署进口」。正形是标准属格
#   يجيز إعلان الإدارة العامة للجمارك رقم N استيراد...
# 匹配前剥阿拉伯变音符与 tatweel；动词/机关名按语向构词族覆盖，不按当篇词形写死。
_AR_ISSUER_OBJ_RE = re.compile(
    r"(?:يجيز|يسمح|أجاز|يأذن|يتيح|أتاح)\s+"
    r"(?:الإعلان|البيان|القرار|المرسوم)\s+رقم\s*[0-9\u0660-\u0669]+\s+"
    r"لل?(?:إدارة|وزارة|هيئة|مصلحة|جهة|مؤسسة)"
)


def _ar_issuer_obj_hit(text):
    """给定 ar 文本，命中「发布机关被写成进口主体」形状则返回匹配串，否则 None。

    纯函数、无 IO，供探针与工具级自检臂共用；不 emit error、不改稿。
    """
    flat = re.sub(r"[\u064b-\u065f\u0670\u0640]", "", text)
    m = _AR_ISSUER_OBJ_RE.search(flat)
    return m.group(0) if m else None


def _issuer_genitive_probe(content, langs, slug):
    """v2.28：把 R11 的 ar 属格歧义防线前移到每次审校自动下发的 suspects.md。

    只在解读首块扫（两次实证都在 b1），避免官方全文块中合法介词结构误报；
    低置信度疑点，最终仍回读 zh 母版人工定性。按 README「禁止为看起来有防线
    造假红判据」，这是只读运营工具的疑点生成器，不是 plugins/ 稿件判据。
    """
    if "ar" not in langs:
        return []
    p = content / "ar" / (slug + ".mdx")
    if not p.exists():
        return []
    text = p.read_text(encoding="utf-8", errors="replace")
    body = text.split("---", 2)[2] if text.count("---") >= 2 else text
    first = next((b.strip() for b in body.split("\n\n") if b.strip()), "")
    hit = _ar_issuer_obj_hit(first)
    if not hit:
        return []
    return ["ar 解读首块疑似把公告发布机关写成进口主体（R11，REG77/REG81 两次实证）："
            "命中 %r；应回读 zh 母版确认「海关总署」是发布机关，并改用标准属格 "
            "`إعلان الإدارة العامة للجمارك رقم N`" % hit[:80]]


def _verbatim_en_probe(inner):
    """从中文引号内容中取出须逐字保留的英文官方串前缀（v2.27）。

    REG30（GACC 2026 年第 124 号）包装标识引号内是
    「中文标识串/英文官方串」双语并列：中文部分各语会本地化，
    对整段做前缀比对会让 47 语全部误报「英文声明整句疑似缺失」。
    这里只比对斜杠后的英文逐字串；无斜杠的纯英文声明保持原行为。
    """
    verbatim = inner.rsplit("/", 1)[-1].strip()
    return verbatim[:_VERBATIM_PROBE_LEN]


# 工具层（tools/）可以同时依赖框架层（core/）与实现层（plugins/）；反之
# 不成立——core/ 不得 import plugins（A9 守卫），所以本文件 2026-11-13 从
# core/ 迁到 tools/。词形数据全部在策略库 lexicons 表。
KIT = Path(__file__).resolve().parents[1]
if str(KIT) not in sys.path:
    sys.path.insert(0, str(KIT))

from plugins import _lexicon                                    # noqa: E402

# 策略库只读：契约覆盖率与词表都用它；工具包被搬走或 db 暂不可用时静默
# 降级（审校准备器是只读辅助工具，不能因策略库问题阻断出材料）。
try:
    from core import db as _pdb              # noqa: E402
except Exception:                            # pragma: no cover
    _pdb = None

_COUNTRY_TABLE = []


def _country_table():
    """策略库 country 词表（懒加载一次，读不到就是空表）。"""
    if not _COUNTRY_TABLE:
        rows = ()
        if _pdb is not None:
            try:
                pv = _pdb.load_policy(str(KIT / "data" / "glossary.db"))
                rows = (pv.lexicons or {}).get("country") or ()
            except Exception:
                rows = ()
        _COUNTRY_TABLE.append(_lexicon.compile_country(rows))
    return _COUNTRY_TABLE[0]

FM = re.compile(r"\A---\n.*?\n---\n+", re.S)
SPLIT = re.compile(r"\n[ \t]*\n")
SCI = re.compile(r"\b[A-Z][a-z]+ [a-z][a-z\-]+\b")
ENG_QUOTE = re.compile(r"[A-Z][a-z]+ [a-z]+[^\n]{40,}")
# 分层标点：仅用于「低置信度排版提示」，绝不作判据（见 CHECKLIST 的 K02）。
LAYER_SEP = re.compile(r"[.;:,\u060C\u0964\u3001\uFF0C\uFF1B\uFF1A]")


def read_blocks(path: Path):
    src = path.read_text(encoding="utf-8")
    m = FM.match(src)
    if not m:
        raise RuntimeError("无 frontmatter: %s" % path)
    return m.group(0), src, [b.strip() for b in SPLIT.split(src[m.end():].strip("\n")) if b.strip()]


def fields(head: str):
    out = {}
    for line in head.splitlines():
        if ":" in line and not line.startswith("---"):
            k, v = line.split(":", 1)
            out[k.strip()] = v.strip().strip('"')
    return out


REVIEW_CHECKLIST = """# 47 语逐篇人工审校必检清单（全项目统一口径）

本清单由 `submission-kit/tools/audit_prep.py` 每次审校自动生成。
依据：47 语逐篇主线程直读得出的通用口径（与 `reference/README.md`
R1–R12 同文同序）。**机检 0 finding 不是终点**。

## 1. 基准与判定顺序

1. 唯一基准 = `content/zh/` 母版；`en` 只是首个译语与 M09 题录载体，
   不作基准、不作中转。翻译判定必须回读 zh 原文，不采信跨会话摘要。
2. 疑点先横向比对 47 语，再回读 zh 母版裁定，最后才动稿。
3. 不得用分组子代理结论代替主线程判定：子代理容易整批判 CLEAN，主体错位
   只有主线程逐段回读 zh 母版才抓得到。

## 2. 离群判据（D3/D4 反复验证）

- **44–46 语都有、独 1–4 语没有 = 漏层嫌疑**，回读 zh 母版判真错；
- 多数语种都没有、少数有 = 合理压缩或本土化异形，登记 KEEP 不改稿；
- 同型缺陷必须横向复核**全部 47 语**，不得只按分组上报的语种修。
- 典型真错形状：标题第一分句动作整层退化成名词短语（D3 ru/uk/be/bg）、
  标题第二分句丢境内/境外对立（D3 el/nl/hy）、标题丢条件/闸门层
  「五单齐全才走得通」（O4 ca/es/fr/ro/pt）、摘要丢「周期／金额／频次」
  之一（D3 en/bg/ka/hy）、摘要丢「未决前置事项让开跑流程停下」（D4 en/it/nl）、
  摘要方向反转「前提→阻止」（O4 no/sr/sk/af/sw）、
  摘要丢「产品获准准入」结论层只剩条件清单（REG75 ar/fa/he/hy/ur 实证：
  97–156 字符、无数字、机检全绿，与已交付同语篇目回归对照才定性为真错）、
  解读首段四层结论整层脱落（REG77-134 el/az：准入／来源限定／双主体注册／每批凭证，
  因 R21 1000 字符上限挤压丢后两层，机检 0 error 全绿）、
  来源国（动物）与加工注册国（企业）互换（REG77-134 fi：约旦注册企业写成澳大利亚注册设施）、
  标题/摘要为守 85 字符把产品场景词压成上位泛词（REG84：22 语标题、9 语摘要，同语正文却用完整
  宠物形；机检全绿）、解读 b01 与标签引文同时丢场景层（REG84：8 语 b01、8 语标签引文）。

## 3. 每语八项必检

1. 标题：动作与方向、场景限定、境内外对立、条件/闸门层（O4）、
   术语与正文一致、拼写完整（**场景限定＝产品类别词必须与同语正文/摘要同形；
   85 字符装不下时只删「卫生」并列名词，不得把 `pet food` 压成 `feed`**）；
2. 摘要：母版每一层语义（逐项核完／责任人+最晚日期／未决前置停下／
   凭证对应关系／归档与复核）、**方向层**（前提 vs 阻止、主动 vs 被动、
   谁对谁施动——O4 no/sr/sk/af/sw 实测：名词全在场救不了方向反）、
   长度上限、无数字；
3. 首段：结论与适用条件、前 100 字内是否答「能不能／多少／多久」；法规解读 b1
   另核四层结论与「来源国／加工注册国」两个地域限定的方向（R11，REG77-134 el/az/th/fi）；
4. worked example：一个产品／一批货／一次流程的完整走法，数字不串位；
5. 金额与门槛：5 万美元方向、文号年份、税额/应税额/实缴/凭证/状态逐列；
6. 否定与情态：「通常」「仅」「不靠」「挡不住」「三选一」等限定词；
7. 术语跨层一致：正文、题录、references 标题用同一词形；官方机构专名
   必须是中国机构（REG18/A1）；
8. 结尾 CTA：路径 `/<lang>/packages/`、本语链接文字、末行句末标点、
   全文唯一链接。

法规线另加：文号与日期方向、适用范围与例外、官方英文声明整句、
拉丁学名逐字、附件表格逐行、条号全角括号、**官方数字序号（N）括号形**
（REG77 实证：点形同时撞 R22 与 P42 hy，见根 README「各语硬约定」）、
**公告发布机关不得误当进口主体**（R11；ar 语向的主动允许动词＋`لـ` 属格歧义
已由 v2.28 自动疑点探针写入 `suspects.md`，仍须回读 zh 母版定性）。

## 4. 已验证的假阳性（不要据此改稿）

| 编号 | 现象 | 结论 |
|---|---|---|
| K01 | 自动扫描「数字个数差 1」 | 母版用中文数字（第三十八条），脚本只数阿拉伯数字；45+ 语同形差 1 即假阳性 |
| K02 | 块长离群全为 ja/ko | CJK 信息密度约为拉丁语 40–50%，W02 已压到阈值内，不是压缩丢层 |
| K03 | 横向视图末 40 字符未见否定词 | 截断假象，必须回读完整末句（cs/el/fi/pl/ar 五语实测均保留） |
| K04 | `six rows` / `six demo rows` | 数字拼写本土化，语义与母版一致 |
| K05 | 摘要「演示数据仅作说明」层多数语压缩 | 母版摘要已达长度上限，结论段完整保留校正层＝合理取舍 |
| K06 | refs 国别词形未收进扫描词表 | `Kine`／`Кине`／`中華人民共和国`／`중화인민공화국` 均正确，词表噪音 |

**front_outliers.md 的分层标点数只作排版提示**：D4 实测 de/es/fr 仅 7、
th 仅 2、ja 仅 5，是语言标点习惯差异，不是漏层；en/it/nl 修复前 10/10/8、
中位数 12，信号与真错重合但假红率过高，**不得据此自动判红**。

## 5. 修复与回流纪律

- 逐条 count 断言 + LF 归一（Windows CRLF 会让正文粘成 1 块）；
  批量修复脚本一律 Write 成文件放 `tmp/` 再执行。
- **成对标点替换纪律（O4 实测教训）**：把 em dash `—…—` 批量替换成
  括号 `（…）` 之类的**成对结构**改动时，逐处按对复核左右两侧确实落在
  同一句——O4 be/bg/ru/uk 四语的四接口分工句中同句有两个独立 dash 对，
  全局正则把相邻对的左半与右半误配，破折号变孤括号、语义结构破坏；
  此类损伤机检全绿，只有逐块回读才暴露。凡替换涉及配对/嵌套符号，
  修后必须按块复读受影响句，不得只 count 替换次数。
- 修复后用 `git diff --unified=0` 逐 hunk 复核，复跑 `check`。
- 台账 `findings.md`：47 语逐语结论 + 修复清单 + KEEP 理由。
- **按根 README「发现的问题必须回流」**：可机检缺陷当轮通用化进
  `plugins/` 判据或 `data/glossary.db` 契约，
  补负向电池臂，走固定链；禁止只改单篇了事，禁止只写 `tmp/`。

## 6. 历史真错区：语义层必查类目（v2.22 沉淀，逐轮追加）

以下八类均在多轮 47 语逐篇审计中**机检 0 finding 却被主线程直读抓出**，
每语逐块复核时按类扫一遍，不得只靠机检绿灯或分组子代理结论：

| 类型 | 实测出处 | 现在的防线 |
|---|---|---|
| 「我国」主体误译（本国视角） | REG18 三轮，27 语 57 处；REG88 四语族漏判（bg `нашата държава`/fa `کشور ما`/sr `наше земље`/ta `எங்கள் நாட்டின்`，机检 0 error 全绿） | P66 + 策略库 lexicons（country）；词表须按语种**构词族**登记，缺族即漏判；P66 只检 zh 含「我国」的块，块外 `자국` 一类「本国」写法不属误译 |
| 进出口方向译反 | REG18 en B03「暂停输华」 | `body:reg18-b03-suspend-direction` |
| 摘要主体/动作方向反 | REG21 ja/ko「许可对华出口」 | `excerpt:reg21-lesotho-import-direction` |
| 中性阻滞升级成违规查获 | REG21 ko B03「적발」 | `body:reg21-b03-inspection-delay` |
| 同篇术语跨块异词 | REG21 el 卫生证书 B02 与 B26/B29 | `body` + `excerpt` 双契约 |
| 标题术语降级（离群） | REG22 en Inspection ≠ Quarantine | `title:reg22-en-quarantine-not-inspection` |
| 整层语义丢失（44 有 3 无） | D3 摘要丢频次、D4 摘要丢前置层、REG22 块 1 漏译 | `require_all` 契约 + 横向离群视图 |
| 标题条件/闸门层丢失 | O4 ca/es/fr/ro/pt 丢「五单齐全才走得通」 | `title:o4-five-docs-gate`（数词+条件推进词形双侧锁定） |
| 摘要方向反转（前提→阻止） | O4 no/sr/sk/af/sw「五单是前提」写成「五单阻止」 | `excerpt:o4-five-docs-prereq-direction`（方向连接词形锁定） |
| 近缘语言正字法串味 | D4 no 混入 da `beløb` 15 处 | P68 + 策略库 lexicons（neighbor）+ banned 契约 |
| 摘要照抄英文紧凑形模板 | REG24 20 语摘要 wks/15-day/dual-reg. | 横向对照 REG21 存量纯本语形口径；题录层逐语读 |
| 官方标准名跨块异形 | REG24 bn/ne/si/ta ISPM 名、ka 误加商品名 4 处 | 同名同词必查（SPEC 12）；逐块横向比对 |
| 编辑性残留语混进条文 | REG24 az B29「不是第 10 号而是第 12 号」 | 逐块对照 zh 母版，多出的限定语一律回读定性 |
| 同形同名单不可区分 | REG24 az/ms/th B15 两种粉蚧本语名相同 | 害虫名单逐行核对，俗名须可区分 |
| 机转/转写残留 | REG24 sr 拉丁全文（L03）、罗马数字混形 | L03 必查；转写稿抽样核对 digraph 与结构标记 |
| 包装厂/企业层级降级 | REG19 be 全篇 12 处「包装厂」→ `цэх*`（车间） | 不可机检，见第 7 节 R1；企业注册块逐语确认主体层级 |
| 「我国」主体整个省略 | REG19 id L23 省略中国主体，负向词表零命中 | 不可机检，见第 7 节 R2；引言块逐语确认中国词形在场 |

## 7. 不可机检判定口径（不得造全局判据）

以下各条已由全库探针证明「机检化必然误伤已过审存量」或属判据自然膨胀，
按根 README「发现的问题必须回流」落 `reference/README.md`「逐语审校：
不可机检口径 R1–R12」（受版本管理的唯一规格落点）；本清单只负责每次审校
自动下发逐语必检动作：

| 口径 | 为什么不可机检 | 逐语必检 |
|---|---|---|
| R1 包装厂/企业层级降级 | 全局 banned 会追溯误伤已过审存量 | 企业注册块确认主体是「企业／厂」，不得降为车间 |
| R2 「我国」主体整个省略 | 正向 require 会误伤省略主体的存量；负向词表抓不到「省略」 | 引言块逐语确认显式出现该语「中国」词形，P66 全绿也必查 |
| R3 跨层泄漏疑点 | 有意全文扫描；官方英文逐字串互含对方禁用词形属设计性命中 | 命中位置是否在锚块内；在官方逐字串内登记 KEEP，不得改稿 |
| R4 散文压成电报体 | 形态探针在全库法规长条误伤面大，无区分度；摘要结论层跨语言无统一构词族，正向 require 会误伤已过审存量 | 出稿规格不设段落长度上限；每句须有谓语与连接关系；**题录层 title/excerpt 同样逐语确认有谓语**；法规摘要＝结论层＋条件层两层必齐，只写条件清单即无主语名词罗列（REG75 实证 ar/fa/he/hy/ur 5 语，S09/S11 全绿仍漏）。与已交付同语篇目做回归对照（REG70 同 5 语均带结论层）判真错，不按风格异形 KEEP |
| R5 地名归属 | 不设判据以免追溯误伤已过审存量 | zh 写全「中国香港／中国澳门／中国台湾」，47 语带中国归属 |
| R6 法规长段 W02 超长段落 | 条文自然膨胀，压缩会触发 R4 电报体 | 只核告警块条件是否逐项落地、有无漏译串块；语义完整登记 KEEP，不得删事实或升级为 error |
| R7 风格层 | 各语标题标点、搭配与隐喻习惯不同，做成全局判据会误伤存量 | 并列补逗号或连接词；回指写成「再看一遍」类自然表述；「头程方式」= mode of transport；「瀑布图」= waterfall chart；「跑到规模化」= 进入下一阶段；「摊在每一单」用 allocate/apportion 类动词，折算须有谓语 |
| R8 术语层 | 货币单位名与「口径/拍脑袋」按语种而异，契约覆盖不全 | 人民币在 hr 写 juan、az 写 yuan、ar 写不变化形 يوان；「口径」= 衡量标准；「拍脑袋」= 凭猜测，不写体感字面搭配 |
| R9 词干替换黏着残形 | 沿用已交付同型底稿换国名/机构名时，替换点与格尾黏着在每语各不相同，无法用统一正则判 | 换名按该语格变体穷举替换并做二次收口；逐语确认新词形后接格尾成立（REG39 实证：bn「কম্বোডিয়াে」应为 কম্বোডিয়ায়、sk「Kambodžae」应为 Kambodži），不能只靠「旧国名零残留」过关 |
| R10 日期体例与文号符号 | 全库误伤探针实测 `\d{1,2}, 20\d{2}` 有 580 处同形（法规条款引用、编号、金额），按形状判必然成片假红；按本语月份名建词表又与「不按篇登记词形」冲突 | 落款／实施日期逐语核对「本语月份名＋日＋年」，不得写英文式「月 日, 年」；hu 等不得写 `2026. szeptember 28.`（R22 判有序列表）。文号符号用本语缩写（hr `br.` / sl `št.` / pl `nr`），拉丁文字语向不残留西里尔 `№`（REG69 实证：da/fi/hu/no 日期、hr/sl 编号符号共 6 处真错）。全语横向离群比对：44–46 语同形、独 1–4 语离群即判真错 |
| R11 机构全称限定层与双主体施动方向 | 机构名按语种无统一构词族、逐篇专名不同，按篇登记词形违反「契约锚点须绑具体句／按缺陷族登记」；机检 0 error 全绿仍漏 | 官方机构全称逐层核对（「牧／农／渔业」三层、「东岸共和国」国体层），不得压成两层或借用邻国官方部委现名；引言块与议定书块同形，国名用本语形（pt `Uruguai`，不残留西语 `Uruguay`）。「A 方推荐＋B 方注册」双主体句逐语确认两个动作施动方各自在场，不得把推荐也归给注册方（REG70 实证：pl 与 pt 共 3 处真错）。**REG77 实证补充**：①「海关总署公告第 N 号准许…进口」里「海关总署」是发布机关，不得写成「公告准许海关总署进口」；ar 原稿 `أجاز لـ` 强搭配使所属定语易被读成间接宾语，改标准属格消除歧义，不追溯修改已交付 REG75 同型结构。②**回归样本同型即 KEEP**：REG77 de 解读段电报体初判 R4 真错，回读 REG75 已交付 de 稿（993/1000、逐块同型）后改判 KEEP；横向离群只是探针，定性必须回读 zh 母版与已交付同语篇目，禁止对新稿做风格性重译。全语横向离群比对：44–46 语三层完整、独 1–2 语缺层即判真错。**REG77-134 实证补充（解读 b1 结论层）**：① 解读首段四层（准入／来源限定／双主体注册／每批凭证）不得因 R21 1000 字符上限挤压而整层脱落（el/az 缺后两层，机检 0 error 全绿）；②「A 方推荐＋B 方注册」不得把推荐并入注册方（th）；③ **来源国（动物）与加工注册国（企业）两个地域限定不可互换**（fi 把「澳源动物在约旦注册企业加工」写成「澳大利亚的注册设施」，方向反）。**不建判据**：结论层与地域限定跨语言无统一构词族，按词形登记必然误伤已过审存量；维持阶段 4 逐语直读 ＋ 全语 b1 横向并列视图，44–46 语四层完整、独 1–4 语缺层即判真错。**REG81 实证补充（同族复发）**：REG81（80 号）阶段 4 又抓到 ar `يُجيز الإعلان رقم 80 للإدارة العامة للجمارك استيراد...`，与 REG77 已消除的形状同族，证明只把实证写进 R 口径与清单**不足以拦住出稿阶段复发**；本轮把该防线前移为 `audit_prep.py` 的自动疑点探针（v2.28，ar 解读首块扫「主动允许动词＋公告号＋لـ＋机关名」词形族，写入 `suspects.md`），并配 `selftest/_audit_issuer_probe.py` 注入报红／还原转绿自检臂。仍**不建 plugins 判据**：这是只读疑点，不 emit error；已交付 REG75/REG77 同型结构不追溯修改 |
| R12 题录与解读块的产品场景限定层 | `text-term-consistency`(P74) 只审 org/law/doc/permit 专名，产品类别词不在射程；为守 MAX_TITLE=85 / R21 / 摘要 185 而压成上位泛词的形状跨语言无统一构词族，按词形登记会误伤存量 | 标题/摘要/解读 b01/标签引文与官方条款**同词形**，取同语正文正在用的形（fr `animaux de compagnie`、cs `zájmový chov`、sw `wanyama wa nyumbani`）；装不下时只删「卫生」并列名词，场景层与来源国层必须保留；标签引文在 b02 与官方包装标识条两处同源须同时改（REG84 实证：22 语标题、9 语摘要、8 语 b01、8 语标签引文机检全绿却缺层） |

**不得为「看起来有防线」而造假红判据或宽锚契约**：任何机检化尝试必须
先跑全库误伤探针，并在负向电池补反证臂。

**契约 forbid 的射程边界**：S08 只判锚块、S09 只判摘要、S11 只判标题。
旧形被搬到别的块/层时三条都全绿；`suspects.md` 的「契约禁用词形跨层泄漏」
疑点专扫这个盲区，命中必须人工回读 zh 母版定性。

**登记 require/forbid 前的两条铁律（REG24 电池实测）**：①预扫口径必须与
判据射程一致——require 词形必须命中**锚块内**（全文命中≠锚块命中，REG24
sl/sw 曾因词形在 B15 而锚选 B20 打假红）；②forbid 旧形在锚块内若有合法
实义同形（REG24 sl ščitkar＝介壳虫合法、sw inzi mbivu＝果实蝇合法），
不得登记 forbid，改用短语级 forbid 或只 require。
"""



def _contract_forbid_leaks(content, langs, slug, zh_f, zh_body):
    """v2.22：契约 forbid 词形的跨层泄漏疑点（只读、低置信度）。

    盲区实证（REG21 47 语逐篇人工审计，2026-11-10）：el「卫生证书」
    旧形 πιστοποιητικό υγείας 同时出现在解读段 B02 与摘要，而 S08 只判
    锚块、S09 只判摘要、S11 只判标题；当时补了 body + excerpt 两条独有
    锚契约才把两处都钉死。若旧形被搬到第三个未登记锚的块，机检依旧全绿。

    本疑点对**本篇激活的全部带 zh 锚契约**，把 forbid 词形拿到该语向的
    整篇（title / excerpt / references / 全部正文块）扫一遍：命中即提示
    人工复核，不判错、不改稿。正常修复稿应 0 命中；命中时要么是真回退，
    要么是该词形在本篇另有合法实义，按 README 交主线程回读 zh 母版裁定。

    只扫带 zh 锚且在本篇 zh 母版命中的契约（篇级契约），不扫全局 banned
    （P43 本就全篇扫描，重复提示只会刷屏）。策略库不可用时静默降级。
    """
    if _pdb is None:
        return []
    try:
        pv = _pdb.load_policy(str(KIT / "data" / "glossary.db"))
        spec = _pdb.policy_spec(pv)
    except Exception:
        return []
    active = []
    # 同上：块级契约取自 spec["terms"]，不能写 spec["body"]。
    for section, key in (("body", "terms"), ("excerpt", "excerpt"),
                         ("title", "title"), ("refs", "refs")):
        for it in spec.get(key) or []:
            if not isinstance(it, dict):
                continue
            anchor = str(it.get("zh") or "").strip()
            if not anchor:
                continue
            hay = (str(zh_f.get("title") or "") if section == "title"
                   else str(zh_f.get("excerpt") or "") if section == "excerpt"
                   else zh_body)
            if anchor in hay:
                active.append((str(it.get("id") or "?"), it))
    if not active:
        return []

    out = []
    for lang in langs:
        if lang == "zh":
            continue
        p = content / lang / (slug + ".mdx")
        if not p.exists():
            continue
        whole = p.read_text(encoding="utf-8")
        for cid, it in active:
            forb = it.get("forbid") or {}
            if not isinstance(forb, dict):
                continue
            forms = list(forb.get(lang) or []) + list(forb.get("*") or [])
            hits = [f for f in forms if isinstance(f, str) and f and f in whole]
            if hits:
                out.append(
                    "%s 契约 %s 的禁用词形「%s」在本篇全文出现（%d 形命中）："
                    "S08/S09/S11 只判锚块/锚层，须回读 zh 母版确认是旧形搬运"
                    "还是本语合法实义" % (lang, cid, "、".join(hits[:3]), len(hits)))
    return sorted(set(out))


def _contract_coverage(zh_f, zh_body, langs):
    """统计本篇 zh 母版激活的题录契约及其语向覆盖率。

    返回 [(契约 id, 段, 覆盖语向数, 未覆盖语向前 8 个, 未覆盖总数)]；
    策略库不可用返回 []。
    """
    if _pdb is None:
        return []
    try:
        pv = _pdb.load_policy(str(KIT / "data" / "glossary.db"))
        spec = _pdb.policy_spec(pv)
    except Exception:
        return []
    out = []
    all_langs = [l for l in langs if l != "zh"]
    # 2026-11-10 负向电池 G3 臂实测：policy_spec 的块级段键名是 "terms"，
    # 不是 "body"。旧版遍历 "body" 恒取空，351 条块级契约从未进入覆盖率
    # 统计；显示名仍用 "body" 便于阅读。这是「发现的问题必须回流」的修法，
    # 不是改稿。
    for section, key in (("title", "title"), ("excerpt", "excerpt"),
                         ("body", "terms"), ("refs", "refs"),
                         ("banned", "banned")):
        for it in spec.get(key) or []:
            if not isinstance(it, dict):
                continue
            anchor = str(it.get("zh") or "").strip()
            if not anchor:
                continue  # 无 zh 锚的全局条款不在本篇覆盖率口径内
            hay = (zh_f.get("title", "") if section == "title"
                   else zh_f.get("excerpt", "") if section == "excerpt"
                   else zh_body)
            if anchor not in hay:
                continue
            covered = set()
            wildcard = False
            for key in ("require", "require_all", "forbid", "forbid_re"):
                v = it.get(key) or {}
                if not isinstance(v, dict):
                    continue
                for lg in v:
                    if str(lg) == "*":
                        wildcard = True
                    else:
                        covered.add(str(lg))
            if section == "banned":
                covered.add(str(it.get("lang") or ""))
            n = len(all_langs) if wildcard else len(covered & set(all_langs))
            missing = [] if wildcard else [l for l in all_langs if l not in covered]
            out.append((str(it.get("id")), section, n, missing[:8], len(missing)))
    return sorted(out, key=lambda x: (x[4] == 0, x[1], x[0]))


def write_front_outliers(out, langs, content, slug, zh_f, zh_body):
    """题录横向视图 + 契约覆盖率；全部为低置信度提示，交人工裁定。"""
    rows = []
    for lang in langs:
        p = content / lang / (slug + ".mdx")
        head, _, _ = read_blocks(p)
        f = fields(head)
        ti, ex = f.get("title", ""), f.get("excerpt", "")
        rows.append((lang, len(ti), len(ex), len(LAYER_SEP.findall(ex)), ti, ex))
    non_zh = [r for r in rows if r[0] != "zh"]
    med_sep = statistics.median(r[3] for r in non_zh) if non_zh else 0
    med_len = statistics.median(r[2] for r in non_zh) if non_zh else 0

    lines = ["# 题录层横向视图与契约覆盖率（低置信度，须回读 zh 母版裁定）", "",
             "母版 title: " + zh_f.get("title", ""), "",
             "母版 excerpt: " + zh_f.get("excerpt", ""), "",
             "译语 %d ｜摘要分层标点中位数 %.1f ｜摘要长度中位数 %.1f" %
             (len(non_zh), med_sep, med_len), "",
             "> **口径**：分层标点数与长度只用于发现「值得横向看一眼」的离群项。",
             "> D4 实测 de/es/fr 仅 7、th 仅 2、ja 仅 5 属语言习惯差异；",
             "> 该信号假红率过高，**不得据此自动判红或改稿**（见 review_checklist.md K02/K04）。", "",
             "## 1. 分层标点数最低 10 项（人工复核候选）", "",
             "| 语向 | title 长 | excerpt 长 | 分层标点 | 与中位差 |", "|---|---|---|---|---|"]
    for lang, lt, le, sep, _, _ in sorted(non_zh, key=lambda r: r[3])[:10]:
        lines.append("| %s | %d | %d | %d | %+d |" % (lang, lt, le, sep, sep - med_sep))
    lines += ["", "## 2. 摘要长度最短 10 项（人工复核候选）", "",
              "| 语向 | excerpt 长 | 与中位差 |", "|---|---|---|"]
    for lang, _, le, _, _, _ in sorted(non_zh, key=lambda r: r[2])[:10]:
        lines.append("| %s | %d | %+d |" % (lang, le, le - med_len))

    cov = _contract_coverage(zh_f, zh_body, langs)
    lines += ["", "## 3. 本篇激活的题录/块级契约覆盖率", "",
              "> 篇级 zh 锚契约只保护显式列出 require 词形的语向；",
              "> 未覆盖语向若同时出现在第 1/2 段离群候选里，优先级最高，须逐语回读 zh 母版。", ""]
    if not cov:
        lines.append("- 策略库不可用，或本篇无带 zh 锚的契约（跳过覆盖率统计）。")
    else:
        lines += ["| 契约 id | 段 | 覆盖语向数 | 未覆盖数 | 未覆盖语向（前 8） |",
                  "|---|---|---|---|---|"]
        for cid, sec, n, miss, nmiss in cov:
            lines.append("| %s | %s | %d | %d | %s |" %
                         (cid, sec, n, nmiss, ", ".join(miss) if miss else "—"))
    lines += ["", "## 4. 判定与回流", "",
              "1. 44–46 语都有、独 1–4 语没有 = 漏层嫌疑，回读 zh 母版；",
              "2. 真错改稿，合理异形登记 KEEP；",
              "3. 可机检缺陷当轮回流进判据/契约 + 负向电池 + 固定链，禁止只改单篇。", ""]
    (out / "front_outliers.md").write_text("\n".join(lines), encoding="utf-8", newline="\n")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--entry", required=True, help="条目根或 work/<kind>/<slug> 目录")
    ap.add_argument("--out", required=True, help="输出目录（建议放仓库根 tmp/audit/）")
    ap.add_argument("--max-anchors", type=int, default=28)
    args = ap.parse_args()

    entry = Path(args.entry).resolve()
    if not entry.exists():
        print("[audit_prep] --entry 不存在：%s（传条目根或 work/<kind>/<slug>）"
              % args.entry, file=sys.stderr)
        return 2
    works = sorted(p for p in entry.glob("work/*/*") if p.is_dir()) or [entry]
    work = works[0]
    slug = work.name
    content = work / "content"
    zh_path = content / "zh" / (slug + ".mdx")
    if not zh_path.is_file():
        print("[audit_prep] 未找到 zh 母版：%s（--entry 传条目根或 "
              "work/<kind>/<slug>）" % zh_path, file=sys.stderr)
        return 2
    zh_head, zh_src, zh_bs = read_blocks(zh_path)
    zh_f = fields(zh_head)
    zh_body = "\n".join(zh_bs)
    n = len(zh_bs)

    sub = work / "submission.json"
    sub_meta = json.loads(sub.read_text(encoding="utf-8")) if sub.exists() else {}

    # 自动挑锚：解读段 + 含学名/英文串/百分号/阈值的块 + 末尾 3 块
    try:
        cut = zh_bs.index("<!-- original -->")
    except ValueError:
        cut = 0
    sci_all = sorted({m.group(0) for b in zh_bs for m in SCI.finditer(b)})
    eng_all = [b for b in zh_bs if ENG_QUOTE.search(b) and "This consignment" in b]
    key = set(range(cut)) | set(range(max(0, n - 3), n))
    for i, b in enumerate(zh_bs):
        if (SCI.search(b) or "%" in b or "ISPM" in b
                or re.search(r"\d{3,}|\d+\s*(小时|个|天|公顷)", b)
                or "This consignment" in b):
            key.add(i)
    key = sorted(key)[:args.max_anchors]

    out = Path(args.out).resolve()
    (out / "pairs").mkdir(parents=True, exist_ok=True)
    (out / "brief").mkdir(parents=True, exist_ok=True)
    langs = sorted(p.parent.name for p in content.glob("*/*.mdx"))
    suspects = []

    for lang in langs:
        p = content / lang / (slug + ".mdx")
        head, src, bs = read_blocks(p)
        f = fields(head)
        pair = ["# %s 逐块对照（基准＝zh 母版，共 %d 块）" % (lang, n), "",
                "## 题录", "", "title: " + f.get("title", ""), "",
                "excerpt: " + f.get("excerpt", ""), ""]
        for i in range(n):
            pair += ["### b%02d" % (i + 1), "", "ZH : " + zh_bs[i].replace("\n", " "), "",
                     "%s : %s" % (lang.upper(), bs[i].replace("\n", " ") if i < len(bs) else "(缺块)"), ""]
        (out / "pairs" / (lang + ".md")).write_text("\n".join(pair), encoding="utf-8", newline="\n")

        brief = ["# %s 关键锚简报（基准＝zh 母版）" % lang, "",
                 "title: " + f.get("title", ""), "", "excerpt: " + f.get("excerpt", ""), "",
                 "## 关键锚块（%d 块；完整 %d 块见 pairs/%s.md）" % (len(key), n, lang), ""]
        for i in key:
            brief += ["### b%02d" % (i + 1), "ZH: " + zh_bs[i].replace("\n", " "),
                      "%s: %s" % (lang.upper(), bs[i].replace("\n", " ") if i < len(bs) else "(缺块)"), ""]
        (out / "brief" / (lang + ".md")).write_text("\n".join(brief), encoding="utf-8", newline="\n")

        # 自动疑点（机检之外的语义层粗筛，交人工复核）
        if len(bs) != n:
            suspects.append("%s 块数 %d ≠ zh %d" % (lang, len(bs), n))
        if lang != "zh":
            missing = [s for s in sci_all if s not in src]
            if missing:
                suspects.append("%s 缺拉丁串: %s" % (lang, ", ".join(missing[:4])))
            for e in eng_all:
                inner = e.split("“")[-1].split("”")[0]
                probe = _verbatim_en_probe(inner)
                if probe and probe not in src:
                    suspects.append("%s 英文声明整句疑似缺失" % lang)
            if re.search(r"[\u4e00-\u9fff]", src[FM.match(src).end():]) and lang not in ("ja", "zh"):
                suspects.append("%s 正文残留中文简体字" % lang)
            # 2026-11-09 REG18 三轮实抓：中文公告「我国」=中国（发布方），
            # 直译成目标语读者本国视角（我が国／ons land／nước ta…）是
            # 主体错误，长度/数字/术语判据全绿，词表见策略库 lexicons 表（country）。
            self_hits = _lexicon.country_hits_table(
                _country_table(), lang, src[FM.match(src).end():])
            if self_hits:
                suspects.append("%s 疑似「我国」本国视角误译: %s" %
                                (lang, ", ".join(self_hits[:3])))
            # 2026-11-09 REG21 实抓：frontmatter 摘要里的 ISO 连写日期形
            # （2026-7-3）不受 P36/R22 管辖，机检全绿但会与同篇其余语向的
            # 自然日期形混用，列表页体例不一致。此处只提示、不判错误；
            # 最终口径见各篇 SPEC（摘要允许数字形以镜像 P55 数字，
            # 正文与落款一律自然形）。
            fm_txt = FM.match(src).group(0) if FM.match(src) else ""
            m_ex = re.search(r'^excerpt:\s*"?(.*?)"?\s*$', fm_txt, re.M)
            if m_ex and re.search(r"\b20\d\d-\d{1,2}-\d{1,2}\b",
                                  m_ex.group(1)):
                suspects.append(
                    "%s 摘要含 ISO 连写日期形（须与同篇其余语向统一；"
                    "正文/落款一律自然形）" % lang)

    # v2.22：契约 forbid 词形跨层泄漏（S08/S09/S11 只判锚层，机检盲区）
    suspects.extend(_contract_forbid_leaks(content, langs, slug, zh_f, zh_body))
    # v2.28：ar 公告发布机关属格歧义（R11；REG77/REG81 两次实证，出稿阶段复发）
    suspects.extend(_issuer_genitive_probe(content, langs, slug))

    # 横向锚视图
    anchor_lines = ["# 关键锚 47 语横向视图（人工复核用）", "",
                    "zh 块数 %d ｜译语 %d ｜自动锚 %d" % (n, len(langs), len(key)), ""]
    for i in key:
        anchor_lines += ["## b%02d（zh）" % (i + 1), zh_bs[i], ""]
        for lang in langs:
            p = content / lang / (slug + ".mdx")
            _, _, bs = read_blocks(p)
            anchor_lines.append("- **%s**: %s" % (lang, (bs[i] if i < len(bs) else "(缺)").replace("\n", " ")[:400]))
        anchor_lines.append("")
    (out / "anchors.md").write_text("\n".join(anchor_lines), encoding="utf-8", newline="\n")
    (out / "suspects.md").write_text(
        "# 自动疑点（须回读 zh 母版人工判定，机检 PASS ≠ 语义终审）\n\n"
        "# 已验证假阳性不入本表：中文数字差 1、CJK 块长离群、截断视图否定词、\n"
        "# 数字拼写本土化、摘要长度上限内的合理压缩（详见 review_checklist.md）。\n\n"
        + ("\n".join("- " + s for s in suspects) if suspects else "- 无\n"),
        encoding="utf-8", newline="\n")

    # v2.21：全项目统一的审校口径与题录横向视图（所有人可用，不依赖 tmp/）
    (out / "review_checklist.md").write_text(REVIEW_CHECKLIST,
                                             encoding="utf-8", newline="\n")
    write_front_outliers(out, langs, content, slug, zh_f, zh_body)

    print("条目:", entry.name, "｜zh 块数:", n, "｜译语:", len(langs))
    print("关键锚:", len(key), "｜拉丁串:", len(sci_all), "｜自动疑点:", len(suspects))
    print("新增产出: front_outliers.md / review_checklist.md")
    print("输出:", out)
    print("submission.json locales:", len(sub_meta.get("locales", [])))
    for s in suspects[:10]:
        print("  !", s)


if __name__ == "__main__":
    import os as _os
    import sys as _sys
    _sys.path.insert(0, _os.path.dirname(_os.path.dirname(
        _os.path.abspath(__file__))))
    from tools import require_entry
    require_entry("audit_prep")
    main()
