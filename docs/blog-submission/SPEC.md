# 投稿规范（Submission Spec · 博客 + 法规）

版本：v1.58 ｜ 适用站点：sinotradecompliance.com 博客（48 语言）
本规范是**硬性验收标准**：投稿包必须能被 `submitter_check.py` 全部判绿（0 error），否则退回重写。
站点侧不做二次润色、不做内容改写——**脚本通过即视为定稿，直接上线**。

> **文档分工**：本规范 = **全部验收规则**（含 ST / P 系列完整规则表，第 7、8 节），是唯一权威来源；
> `README.md` = **使用说明**（上手、命令、流程、避坑），不重复规则正文。
> v1.4 起新增 L07/L08（标题与参考未翻译检测）与 P14–P17（隐形字符、标点前空格、标记配对、重复句）；v1.5 起新增 P18–P20（配图顺序、事实编号、关键代码的跨语言一致性）；v1.6 起新增 P21/P22（分节列表项数、正文块顺序的跨语言一致性），并把 W02 的段落长度判定改为按文字系统分档；v1.7 起基准语言改为**中文优先**，新增 P23（逐块一一对应：段落/标题/列表/图片/表格的位置与规模全部对齐）与数字词表（跨语言数字比对）；v1.8 起新增 P24–P29（表格列数、列表符号、行内强调、链接目标、frontmatter 结构、链接语言前缀），并把 P23 的比对从「标量规模」升级为「多维元组」。
> 各条款括注的编号（S/F/M/L/I/B/R/W 与 ST/P）即脚本实际执行的规则，可对照排查。

---

## 0. 一句话流程

```
写 48 语言 → 制图 → python3 submitter_check.py <目录> --pack=<名字>.zip（全绿才出包）→ 提交 zip
```

---

## 1. 目录结构（必须逐字节照此布局）

单个 zip 可含**多篇文章**，每篇一个 `<slug>` 目录。同一个包既能投博客文章，也能投法规文章——由 `submission.json` 的 `kind` 决定（缺省 `blog`），两类共用**同一套检查规则**：

```
<anything>.zip
└── articles/
    ├── <slug>/                        ← 小写字母/数字/连字符，3–60 字符
    │   ├── submission.json            ← 元数据
    │   ├── content/
    │   │   ├── en/<slug>.mdx
    │   │   ├── zh/<slug>.mdx
    │   │   └── …（共 48 个语言目录，见第 4 节清单）
    │   └── images/
    │       └── <slug>/
    │           ├── cover.webp          ← 必需，1200×630
    │           └── fig-01.webp …       ← 可选，正文配图
    └── <second-slug>/
        └── …（同上）
```

**禁止**（S05）：包内出现 `.DS_Store`、`__MACOSX`、任何隐藏文件（`.` 开头）、`.pyc`、`.md`/`.txt`/`.docx` 说明文件、原始 `jpg/png/psd/ai` 素材、任何未在 `content/` 与 `images/` 下的文件。
（检查层判 error；用 `--pack` 打包时脚本还会按同口径过滤一层兜底。）

**S 系列规则（包与目录层级）**

| 规则 | 级别 | 判定 |
|---|---|---|
| S01 | error | 压缩包顶层必须是 `articles/` 目录 |
| S02 | error | 缺少第 4 节清单里的语言目录 |
| S03 | error | 出现清单之外的未知语言目录 |
| S04 | error | mdx 路径必须为 `content/<lang>/<slug>.mdx` |
| S05 | error | 包内含系统垃圾文件（`.DS_Store`、`__MACOSX`、`.` 开头隐藏文件、`.pyc`、`.md`/`.txt`/`.docx` 说明文件、`jpg/png/psd/ai` 原始素材） |
| S06 | error | 压缩包总大小 > 60 MB |
| S07 | error | 文本文件行尾/编码卫生：`content/<lang>/<slug>.mdx` 与 `submission.json` 必须为 LF 行尾、无 UTF-8 BOM（v1.18）。CRLF 会让正文分块（按 `\n\n` 切块）失效——整篇正文粘成一个块，P21/P22/P23/P27 对比基准时全线误报（F1 实测一次行尾污染产出 168 个假 error，根因与内容无关）；流水线应在打包前规范化，本规则在检查层兜底 |
| S08 | error | 块级术语契约（可选，`--glossary=<file>` 传入才检查，v1.19）。用 zh 锚点短语定位母版块序号，再校验各语言同一块内「必须出现（`require`）/ 不得出现（`forbid`）」的短语；`*` 表示对所有语言生效；v1.21 起可用 `"scope": "all"` 让该条款覆盖母版中**每一处**含锚点的块（默认只查首次出现的那一块）——「同一概念首现正确、后文换词」只能靠逐块覆盖抓到。v1.25 起可加 `"count": true`：校验 require 词形在该块的出现**次数** ≥ 母版锚点次数（多词形按命中区间并集计数），抓「首两处译对、第三处退成代词/弱词」。**v1.48 起可加 `"forbid_licensed_by": {"<语种>": "<母版来源词>"}`**：同一块里母版自己出现该来源词时，该语种的禁用形按来源词出现数封顶放行（th 的 ประกาศ 既是「公告」也是「宣布」的合法译形），超出才判红且红面写清授权数与实测数；母版同块没有来源词（n=0）时与旧行为逐字一致。没有这层授权就只能二选一：要么误报合法的「公告」，要么删掉禁用条款放过真正的「申报→宣布」错译。v1.26 起术语表内建为工具包通用资产 `glossary.json`（跨文章积累），`--glossary` 可省略；锚点在某文章母版找不到的条款自动跳过，文章自带 `pipeline/glossary.json` 优先覆盖。**S09 摘要契约不进通用表**（绑定单篇摘要的结构，跨文章套用必然错配），只认文章自带或显式传参。专治**译反方向**：监管↔准入、固体饮料↔即饮、不会丢↔会丢这类错误语法结构全对，P 族与 ST 族一条都拦不住（F1 实证：一次基准记反导致 15 语约 60 处正确译文被改错，全部机检通过） |
| S09 | error | 摘要术语契约（可选，`--glossary=<file>` 的 `"excerpt"` 段，v1.20）。对 `frontmatter.excerpt` 做「必须出现（`require`）/ 不得出现（`forbid`）」校验，`*` 为所有语言兜底。摘要此前只受长度约束（F07），母版按「四层框架」罗列而译文漏掉一层时，正文全对、长度合规，P/F/L 三族零命中（F1 实证：15 语摘要漏掉「政策依据」层，瑞典语修改后仍只剩三项） |
| S10 | error | 路径白名单（v1.22）：包内只允许 `submission.json`、`images/**.webp`、`content/<lang>/<slug>.mdx` 三种位置，其余一律报 error 并点名路径。此前的空档：非 mdx 的杂项文件既不被 S04（只查 mdx 路径）覆盖，`.json/.webp` 又在 S05 白名单内，于是 `content/_blocks.json`（926KB，F1 实测）被静默接受并进了 zip（51→52 文件） |
| S11 | error | 标题术语契约（v1.37，glossary 的 `"title"` 段）。对 `frontmatter.title` 判「必须出现（`require`）/ 不得出现（`forbid`）」词形，`*` 为所有语言兜底；与 S09 同理**只从文章级表加载**（标题承载哪几层是单篇决定）。来源：F2《十四个工作包与三步进场》47 语人工逐篇审校——标题此前只受 F03 长度约束，母版第二分句「把保税项目拆成可验收的交付物」在 45 语整层丢失（ja/ko 有第二段但换成别的内容）一路绿灯，「三步进场」的宾语被 8 语换成「中国海关仓／海关市场」同样无规则出声。标题是列表页里读者唯一必读的一行，漏一层＝整层承诺对外消失 |

---

## 2. submission.json

```json
{
  "slug": "green-coffee-beans-china",
  "title": "Green Coffee Beans Import Requirements for China",
  "date": "2026-10-20",
  "category": "Food & Beverage",
  "author": "David Zhang",
  "excerpt": "How green coffee beans enter China: GACC registration under Decree 280, the announcement 219 route for raw agricultural products, labeling and the paperwork that clears customs.",
  "locales": ["en", "zh", "es", "fr", "de", "…（此处省略，实际必须正好是第 4 节的 48 个）"],
  "images": ["cover.webp", "fig-01.webp"],
  "imageRights": "All images are original or licensed for commercial use; no third-party copyrighted material."
}
```

- `slug` 由投稿者自拟，但必须：全小写、只用 `a-z0-9-`、3–60 字符、不与站内已有文章重复（脚本会查重，M03）。
- `kind`（v1.59）：`"blog"`（缺省，进博客站）或 `"regulation"`（进法规库）。法规要求的额外字段见第 12 节。
- `date` 为 `YYYY-MM-DD`。**允许未来日期**：站方按该日期定时上架，未到日期的稿子不出现在列表/首页/搜索/sitemap，也不生成页面（v1.59；上限一年以后，明显笔误仍会报错）。
- `author` 固定写 `David Zhang`。
- `locales` 必须列出实际提交的语言，且必须**正好是第 4 节的 48 个**（上例为节选，多一个少一个都判错）。
- `images` 与实际文件一一对应。

**M 系列规则（submission.json）**

| 规则 | 级别 | 判定 |
|---|---|---|
| M01 | error | 缺少 `submission.json` |
| M02 | error | 缺少必填字段 |
| M03 | error | slug 与站内已有文章重复 |
| M04 | error | `date` 不是 `YYYY-MM-DD` |
| M05 | error | `category` 不在 7 个允许值内（大小写、空格、`&` 都要一致） |
| M06 | error | `author` 不是固定的 `David Zhang` |
| M07 | error | `locales` 不是正好 48 个 |
| M08 | error | `images` 清单与实际文件不一致 |
| M09 | error | `submission.json` 的 `title`/`excerpt` 与 en frontmatter 不一致（v1.34）：站方列表页读 submission.json、文章页读 mdx frontmatter，两者漂移会让列表与文章展示不同标题/摘要（F1 实测：submission 残留旧标题）。缺 en 语言或缺字段时静默跳过 |

---

## 3. frontmatter（每个语言文件都一样，只有值不同）

文件开头必须**恰好**是这 6 个字段，顺序不限，不得增删：

```yaml
---
title: "Green Coffee Beans Import Requirements for China"
slug: "green-coffee-beans-china"
date: "2026-10-20"
category: "Food & Beverage"
excerpt: "How green coffee beans enter China: GACC registration under Decree 280 …"
references:
  - title: "GACC Order No. 280: Administrative Provisions on Registration of Overseas Food Manufacturing Enterprises"
    url: "https://www.customs.gov.cn/"
---
```

硬性要求（F 系列）：

- `title`：≤85 字符。**只禁「作分隔用」的标点**：冒号（数字间的比例/时间除外）、em dash/横线 `—` `―` `－`（任何位置）、en dash/figure dash/减号 `–` `‒` `−`（只放行 `2–4` / `S0–S13` 一类数字/编号区间）、作分隔的连字符（贴空白、标题首尾、`--` 连写）。**词内连字符合法**：`e-commerce` / `cross-border` / `U.S.-China` 照写；亚美尼亚 `֊`、希伯来 `־` 等文字系统自带的词内连字符不在射程。无空格的 `Title-Subtitle` 与词内同形，按词内放行——标题分句用逗号/句号。v1.41 起替代旧的「一律禁 `- — –`」口径。
- `slug`：48 个文件完全一致，等于目录名、等于 `submission.json` 的 slug。
- `date`：48 个文件完全一致。
- `category`：只能是以下 7 个值之一（大小写、空格、`&` 都要一致）：
  `Brand Protection` / `Compliance Guide` / `Cosmetics` / `E-commerce` / `Food & Beverage` / `Label Compliance` / `Product Certification`
- `excerpt`：≤185 字符，不得与 `title` 相同；48 语言各自撰写，**不得英文回退**（L01/L02），任意两语言之间也不得完全相同（L06）。
- `references`：0–6 条（F08）；每条必须有 `title` 与 `https://` 开头的 `url`；**非英文语言的参考标题必须翻译**，不得与 en 完全相同（L08，error）。
- frontmatter 之外的内容一律视为正文；正文里**再出现** `---` 分隔线（B03）或 `## References` 章节都会判错。

**F 系列规则（frontmatter）**

| 规则 | 级别 | 判定 |
|---|---|---|
| F01 | error | frontmatter 结构失败（缺 `---` 开头或未正确闭合） |
| F02 | error | 缺必填字段，或出现多余字段 |
| F03 | error | `title` 空值 / 超长（>85 字符）/ 分隔符形状（冒号、em dash/横线、作分隔的 en dash/减号/连字符；词内连字符与数字区间放行，口径见第 3 节） |
| F04 | error | `slug` 与目录名不一致 |
| F05 | error | `date` 与 `submission.json` 不一致 |
| F06 | error | `category` 与 `submission.json` 不一致 |
| F07 | error | `excerpt` 超长（>185 字符） |
| F08 | error | `references` 超过 6 条 |
| F09 | error | frontmatter 必须能被 YAML 解析（装了 PyYAML 用 `safe_load` 权威校验；没装用内置增强校验：tab 缩进 / 文档分隔符 / 键值行结构 / 未闭合引号 / 裸 `: `）。PyYAML 报错时附内置子集校验定位的具体病因（v1.18）；最高频根因是 excerpt 等裸值含 `': '`（如枚举式 ` Vier lae: ...`），给值加 YAML 引号即可，站方 gray-matter 与 PyYAML 同口径 |

---

## 4. 48 个语言目录（缺一即拒）

| # | 目录 | 语言 | # | 目录 | 语言 |
|---|------|------|---|------|------|
| 1 | en | English | 25 | da | Dansk |
| 2 | zh | 简体中文 | 26 | no | Norsk |
| 3 | es | Español | 27 | uk | Українська |
| 4 | fr | Français | 28 | bg | Български |
| 5 | de | Deutsch | 29 | hr | Hrvatski |
| 6 | ja | 日本語 | 30 | sr | Српски |
| 7 | pt | Português | 31 | sk | Slovenčina |
| 8 | ru | Русский | 32 | sl | Slovenščina |
| 9 | ar | العربية | 33 | ms | Bahasa Melayu |
| 10 | ko | 한국어 | 34 | ka | ქართული |
| 11 | it | Italiano | 35 | he | עברית |
| 12 | nl | Nederlands | 36 | sw | Kiswahili |
| 13 | tr | Türkçe | 37 | bn | বাংলা |
| 14 | vi | Tiếng Việt | 38 | ca | Català |
| 15 | id | Bahasa Indonesia | 39 | fa | فارسی |
| 16 | th | ไทย | 40 | ur | اردو |
| 17 | hi | हिन्दी | 41 | ta | தமிழ் |
| 18 | pl | Polski | 42 | af | Afrikaans |
| 19 | sv | Svenska | 43 | sq | Shqip |
| 20 | el | Ελληνικά | 44 | az | Azərbaycan |
| 21 | cs | Čeština | 45 | hy | Հայերեն |
| 22 | ro | Română | 46 | be | Беларуская |
| 23 | hu | Magyar | 47 | ne | नेपाली |
| 24 | fi | Suomi | 48 | si | සිංහල |

**本地化不是翻译腔**：每篇非英文版本要用目标市场的说法写——当地的产业、当地读者关心的品类、（如适用）当地出口路径；但**不得虚构该国已获对华准入**，也不得写「该国无法向中国出口」这类绝对断言。

**跨语言一致性**（同 slug 多语言时自动启用，`--no-parity` 可跳过；规则明细见第 8 节）：各语言的 `##` 小节数（P02）、引用的图片集合（P03）、关键数字（P04）必须对齐；**分节列表项数（P21）、正文块顺序（P22）、逐块一一对应（P23）同样必须对齐**；alt 文本跨语言相同会提示未翻译（P11，warning）。

**基准语言**（v1.7）：默认取**中文**（`zh`）——中文稿是撰稿母版，段落结构以它为准；没有中文时退回英文。命令行 `--master=<lang>`（如 `--master=en`）可显式指定。

**L 系列规则（语言与本地化）**：L01–L05 为「本语言是否真的写成了本语言」，L06–L08 属跨语言一致性，见第 8 节。

| 规则 | 级别 | 判定 |
|---|---|---|
| L01 | error | `title` 与 en 完全相同（疑似未翻译） |
| L02 | error | `excerpt` 与 en 完全相同 |
| L03 | error | 正文未使用该语言的文字系统（疑似英文回退） |
| L04 | error | 非中日韩语种正文出现中文字符（疑似中文回退） |
| L05 | error | 正文与 en 相似度过高（疑似未翻译） |

---

## 5. 正文规则

**结构（B 系列）**

- 不使用一级标题（`#`，B01），文章标题来自 frontmatter；小节用 `##`，最多到 `###`；非英文小节标题不得与 en 完全相同（L07，warning）。
- `##` / `###` 后必须有且只有一个空格。
- 正文不得出现 `---` 分隔线（B03，渲染成 `<hr>`，视觉断裂）。
- 不得出现 `## References` 章节（参考文献只能放 frontmatter）。
- 不得使用 JSX / HTML 标签（`<div>`、`<img>`、`<br>` 等），不得使用 `{...}` 表达式。
- 不得用框线字符（`┌ ─ │ └`）或箭头画流程图，流程图请写成列表或普通段落。
- 列表项必须以 `- ` 开头、**每项独占一行**，项与项之间**不留空行**（B07，会导致渲染成多个列表）；一行不得写多个列表项（B08）。
- 正文里的图片单独成行：`![说明文字](/images/blog/<slug>/fig-01.webp)`。
- **破折号（ST01/ST02，error 级）**：正文不用 em dash（`——` / `—`），改冒号、拆句或括号；en dash（`–`）仅用于数字/编号区间（`2–4`、`S0–S13`），全篇一致。
- 各语言小节数与图片引用必须与 en 对齐（P02/P03，见第 8 节）；同一图片不得在一篇内重复引用（P01）。
- **逐块结构必须与基准语言一比一对应**（P21/P22/P23，见第 8 节）：同一份内容在所有语言里应当以相同的结构呈现。列表不得在某些语言里被压成散文段落，图片不得在某些语言里跑到列表前面，表格行数、列表条目数也必须一致。
- **数字的书写形式可以不同，数值必须相同**：中文写「十四个工作包」，其他语言可写 “fourteen work packages” / “quatorze” / “चौदह”；脚本内置各语言数字词表做归一（v1.13 起直接内嵌在脚本里），换一种写法不算缺失，换一个数值才算。

**结尾 CTA（必需，B09 脚本卡死）**

文章最后 10 行内必须有且只有这一条链接：

```
[Contact us](/en/packages/)
```

- 路径必须是 `/<本文件语言>/packages/`（zh 用 `/zh/packages/`，ar 用 `/ar/packages/`……）。
- 链接文字：`en` 用 `Contact us`；`zh` 用 `联系我们`；其他语言用**本语言的「联系我们」**，不得保留英文 `Contact us`。
- **文风（P12，warning 提示）**：CTA 用一句自然的完整句把联系动作带出来、链接内嵌句中，不用冒号引出、不写裸链接。例：`Contact us for a free compliance assessment. Tell us about your products and we will identify the regulations that apply to your business.`

**内容红线（R 系列，机器判定，命中即拒）**

| 规则 | 级别 | 判定 |
|---|---|---|
| R01 | error | 正文出现 `248` / `249`（任何数字形式）——现行法条一律写 **280 号令**；历史沿革不作为正文内容 |
| R02 | error | 正文出现旧机构名 `MOA` / `CFDA`——现行机构名：**MARA**（原 MOA）、**SAMR**（原 CFDA） |
| R03 | error | 正文出现**符号或代码形态**的金额（`$` `€` `£` `¥` 加数字，或 `USD/EUR/CNY/RMB` 加数字）；不写报价、不写预算。v1.24 起豁免**带约数标记的换算**（about/environ/rund/circa/unos/около/약/约 等 + 数字），因为「约 700 美元」这类限额/税额折算是内容而非报价；无标记的「500 dollars」仍拦 |
| R04 | error | 出现交付周期承诺：`delivery` / `lead time` / `turnaround` 附近出现 `N days/weeks` |
| R05 | error | 绝对否定：`cannot be exported`、`cannot export to China`、`not possible to export`、`impossible to export`、`无法出口`、`不能出口` 等 |
| R06 | error | 过度承诺：英文 `we arrange shipping`、`we organize the shipment`、`guarantee`、`100% success`、`near-100%`、`within 24 hours`；v1.49 起按语种加**第一人称/本方案 + 保证·承诺动词**的承诺句形（`PROMISE_BY_LANG`，48 语各一条，如 es `garantizamos`、ja `私たちは…保証します`、zh `我们保证`）。裸词干不入表：语料里「平台保证金」（deposit / security bond 义）与母版引用词本身共 14 处都是合法用法，窄臂实测五包 0 命中；红面带命中原文（不可打印字符按 `%r` 转义显示，如 fa 的 ZWNJ） |
| R08 | error | 签字人归属反模式（v1.37，只挂 en/zh 两个母版语向）：同一句里「签字人主语 + 所有权谓语 + 包/交付物宾语」三要素齐备即报错——即把母版的「签字的人就是这个包的责任人」（accountable）写成「签字人拥有这个包」（产权）。三要素必须同句，跨句不成形状；合法句 "the deliverables belong to the brand"（交付件归品牌方，无签字人主语）与 "who signs off on the report"（无所有权谓语）都不落卡。**为什么只判这两语**：本族语里「责任」与「所有」是两个词，没有词表就无从在 46 个语向上判定用了哪一个（de verantworten / pl właścicielem 的差别只有登记过才知道）；而 en 是这批偏移实际的出发语言（F2 的 ar/fa/he/ur 摘要与 en 逐短语同形，连母版没有的 "an exit gate at every stage" 都照搬），zh 是唯一基准——在源头设卡才拦得住扩散。其余语向由文章级 S08 条款（require 责任词形 / forbid 所有权词形）逐语兜住，两条臂各盖一侧，不重叠也不互相顶替。zh 另用一条词形正则：CJK 连写切不开句，不许拿英文切句器当中文切句器 |
| R07 | error / warning | 制作工具痕迹（v1.35）：对外文案不得暴露配图的制作来源——图是 deck PPTX 管线做的，但文章只说「这是文章的图」，不得出现「PPT」「幻灯片」「第 15 页」「p15」一类话术。分层口径（先实测 P0/F1/F2 全量再定案）：**error** ①来源页码引用（`p15`/`page 15`/`slide 3`/`第 15 页`/`スライド3`，正文与 title/excerpt 均查）；②图片 alt 内出现工具词（图注点名来源是最典型的泄漏形状）；③title/excerpt 出现工具词（元数据没有「修辞」空间）。**warning** ④散文里的工具词：可能是合法修辞，不阻塞、人工判定——F2 实证 en "Nor are the four reports four slide decks"、ja スライド資料、ko 슬라이드（对应 zh「四份报告也不是四份演示文稿」），这类句子讲的是报告不是幻灯片，不暴露本文配图来源。zh「演示文稿」不进散文词表；拉丁词加词边界（de "stoppt" 内含 ppt、de "Deck"=甲板，无边界会误报，F2 de 三处实测）；扫描前剥链接目标与外链 URL。**error** ⑤`submission.json` 的字符串字段（v1.38 补）：逐字段扫 title/excerpt/imageRights/author/category/slug/date，命中工具词或页码形状即报错并指名「哪个字段·命中什么」——实证 P0/F1/F2 三包 `imageRights` 逐字相同地写着 "…exports from the author's own SinoTrade proposal deck"，v1.35 把射程写在正文/alt/title/excerpt 就漏掉了整份元数据，三包一起绿灯。列表值（`locales` 语言码、`images` 文件名）故意不进射程：结构枚举不对外成句，文件名里的 `p15`/`deck` 只会造出假泄漏（控制组 E 钉住这一条：清单与文件不符 ⇒ M08 出声，证明值被读到而 R07 不出声） |

> **R03 与 P32/P33 的分工**：R03 拦的是「不写报价」这条商业红线，命中形态与 P33 重叠；**法规限额与案例金额本身是允许写的**——中文基准写「5000 元」「50 美元」不触发 R03，写 `$50` / `360 USD` 才会同时被 R03 与 P33 判错。P32 管外币**词**，P33 管**符号与代码**，见第 8 节。

> Emoji 列表混排（多个 emoji 项目写在同一行）属 B11，见本节 B 系列表。

**B 系列规则（正文结构）**

| 规则 | 级别 | 判定 |
|---|---|---|
| B01 | error | 使用一级标题 `#`（文章标题来自 frontmatter，小节用 `##`，最多 `###`） |
| B02 | error | 标题缺少空格（`##标题`） |
| B03 | error | 正文出现 `---` 分隔线（渲染成 `<hr>`） |
| B04 | error | 正文出现 `## References` 章节（只能放 frontmatter） |
| B05 | error | 正文含 HTML/JSX 标签或 `{...}` 表达式 |
| B06 | error | 正文含框线字符流程图（`┌ ─ │ └`、箭头） |
| B07 | error | 列表项之间有空行（会渲染成多个列表） |
| B08 | error | 一行写了多个列表项 |
| B09 | error | 结尾 CTA 缺失 / 路径不是 `/<本语言>/packages/` / 文字未翻译（仍是英文 Contact us） |
| B10 | error | 同一文件混用 em dash 与 en dash（须统一） |
| B11 | error | emoji 列表混排 |

**W 系列规则（篇幅与配图密度，warning 级）**

| 规则 | 级别 | 判定 |
|---|---|---|
| W01 | warning | 英文正文偏短（建议 ≥400 词） |
| W02 | warning | 存在超长段落；阈值按文字系统分档，见第 9 节 |
| W03 | warning | 图片数量偏多（建议 ≤6 张） |

---

## 6. 图片规范（I 系列，投稿者直接产出最终文件）

- 只收 **webp**，不接受 jpg/png（脚本直接判错）。
- `cover.webp` 必需，**精确 1200×630**。
- 其他配图宽 ≥1200，比例不限（建议 16:9），**单张 ≤400KB**；全篇建议 ≤6 张。
- 每张图 ≤400KB；必须已在 `images/<slug>/` 下，且**正文全部引用、不得有未引用图片**（I06）；同一图片不得被正文引用两次（P01）。
- `alt` 必填、必须描述画面（I08，不得写 `image`、`图`、`img`）；非英文版本的 alt 必须真翻译，跨语言完全相同会提示（P11）。
- 图片内不得含价格、不得含第三方 logo/水印/图库水印；`submission.json` 的 `imageRights` 需确认可商用。
- 图片路径固定 `/images/blog/<slug>/<filename>.webp`（I05），不要写域名、不要写相对路径。

**I 系列规则（图片）**

| 规则 | 级别 | 判定 |
|---|---|---|
| I01 | error | 非 webp 格式 |
| I02 | error | 缺少 `cover.webp` |
| I03 | error | 图片宽度 < 1200 |
| I04 | error | 单张 > 400 KB |
| I05 | error | 路径不是 `/images/blog/<slug>/<name>.webp`（写了域名或相对路径） |
| I06 | error | 图片未被正文引用 |
| I07 | error | 图片使用了外链 |
| I08 | error | 缺少 alt 文字 |

`cover.webp` 另有精确尺寸要求 1200×630，由同一批图片检查在包模式下判错。

---

## 7. ST 系列：写作声音纪律（v1.1 起 error 级拦截）

| 规则 | 级别 | 内容 |
|---|---|---|
| ST01 | error | 正文出现 em dash（——或—），改冒号、拆句或括号 |
| ST02 | error | en dash 未用于数字/编号区间（只允许 2–4、S0–S13 这类用法） |
| ST03 | error | EN AI 高频词（delve / leverage / seamless / robust / game-changer / unlock / landscape / not just / in conclusion 等 18 个），同查 title 与 excerpt |
| ST04 | error | zh AI 高频词（赋能 / 抓手 / 闭环 / 底层逻辑 / 值得注意的是 / 综上所述 / 对了一半 / 答案是等 15 个），同查 title 与 excerpt |
| ST05 | error | 反转钩子句式（看似…实则 / 不是…而是 / not just … but），正则级命中后人工复核是否实义对比 |
| ST06 | warning | 段首 AI 连接词（Moreover / Furthermore / 此外 / 而且） |
| ST07 | warning | 同一段落内序号连排 ≥3（第一，…第二，… / ①②③ / First,…Second,…），提示拆为列表 |
| ST08 | warning | 其余 46 语言的 AI 套话词表（v1.17）：如 es «cabe destacar»、fr «il convient de noter»、de «es ist wichtig zu beachten»、ru «стоит отметить»、ar «من الجدير بالذكر»、ja «重要なのは» 等各 5–10 条，同查 title 与 excerpt。选词标准：母语编辑一眼认出「机器写的」的填充式套语；warning 级，命中后人工判断删除或改具体陈述。**不收「最后/在结尾」类时间副词**——它们是中文母版「最后」的自然译法（F1 实证 fa «در پایان»、hu «végül»、sl «na koncu» 等 4 处误伤后清掉）。v1.34 补强：①匹配**大小写不敏感**（词首大写如 «Kesimpulannya»、«Ամփոփումը» 此前会漏）；②正文**逐处报告**（不再只报首现）；③总结套话族新增词形——hy «ամփոփելով»、id/ms «sebagai kesimpulan»/«singkatnya»、sw «kwa ufupi»、th «สรุปได้ว่า»。**不收裸词**（id «kesimpulan»、th «สรุป»、vi «kết luận»）：P0 的「五条结论」小节把它们当实义名词用，收裸词会大量误报。**v1.58 两处射程修正**（五篇实测 12 处全在这儿，改的是判据不是稿）：① 总结套话族的缺陷形状是**句首填充语**，同一串词落在句中是本语言正常实义形——id/ms «apa kesimpulannya»＝「它的结论是什么」、cs «závěr za závěrem»＝「结论跟着结论」、ne «पाँच निष्कर्षमा»＝「归入五条结论」、hy «Գործադիր ամփոփումը»＝「执行摘要」。按 `AI_PHRASES_OPENERS` **逐词形**登记句首限制（id/ms `kesimpulannya`、cs `závěrem`、ne `निष्कर्षमा`），其余词条照旧全文命中——hedge 类（fr «sans aucun doute»、de «zweifellos」）本来就常居句中，整类要求句首会把它们判哑。② 整串被引号包住＝文中在**讨论这个词本身**：F4 vi「bảng tiến độ không viết "thường lệ" thành "chắc chắn"」（进度表别把「通常」写成「确定」）正是本篇要说的对照，不是套话使用。同批撤两条会咬正文的词条：hy 裸词 «ամփոփում»（＝「摘要」这个名词本身，v1.34 的「不收裸词」漏到的一处）、ne «निश्चित हुन्छ»（＝「被敲定」，是本篇问题清单的谓语，不符合表内「不含任何实义术语」的选词标准）；套话形 «ամփոփելով»／«निष्कर्षमा» 保留。**级别仍为 warning**：这条判定本质需要人工裁量，升 error 等于把「交人工」这一层判成缺陷（与 P10 的升档相反） |

ST 词表：ST03/ST04 覆盖 EN/zh，ST08 覆盖其余 46 语言（v1.17 起不再依赖人工清查）。

---

## 8. P 系列：跨语言一致性与文本健壮性（v1.2 起）

由 48 语言翻译 QA 实测回填（曾抓出的真实问题：2022 年第 7 号公告归属在 38 个语言中错误、1476 税号缺失于 5 个语言、ru 十位数错译、tr 图片重复插入、ko 汉字残留等），通用化为两组：

**跨语言一致性**（包模式自动启用，`--no-parity` 跳过）

| 规则 | 级别 | 内容 |
|---|---|---|
| P01 | error | 同一图片在同一语言正文内被引用多次 |
| P02 | error | 各语言 `##` 小节数不一致（基准 en） |
| P03 | error | 各语言引用的图片集合不一致 |
| P04 | error | 关键数字跨语言缺失：从 en 正文提取独立数字（≥1000 整数与小数，排除紧邻字母的编码类），其余语言经数字归一化（本族数字→ASCII、千分位/小数逗号/阿拉伯数字分隔符变体）后必须命中 |
| P11 | warning | alt 文本跨语言完全相同（疑似未翻译） |
| P18 | warning | 配图引用顺序与基准语言不一致 |
| P19 | warning | 基准语言的关键事实编号（≥10 的非年份整数）在本语言缺失；数字书写变体（本族数字/千分位/空格分组）归一后比对。v1.48 起**基准侧也先折千分位**（`_fold_thousands`）：此前只折了目标侧，母版 `129,600` 被切成 129 与 600，每个译语都判缺两段（F4 实测 47 语假红）。整组匹配首段 1–3 位＋一组以上**同种**分隔符，`1,234,567` 一次折完；`1,234.567` 只折千位段、小数语义保留 |
| P20 | warning | 基准语言出现的裁定号（X####-##）与 HS 编码（####.####）在本语言缺失 |
| P21 | error | 分节列表项数跨语言不一致：同一 `##` 小节内，各语言的列表条目总数必须对齐（抓到过「九个板块」「四项检查」等被压成散文段落） |
| P22 | error | 正文块顺序跨语言不一致：段落 / 列表 / 图片 / 表格的排布序列必须与基准语言一致；**图片比对的是文件名而非仅类型**（fig-01 与 fig-02 互换位置同样判错） |
| P23 | error | 逐块一一对应：以基准语言为准，逐块比对位置、类型与**多维规模**——标题层级、段落、列表（条目数）、图片（文件名）、表格（行数 + 列数 + 各行列数）、行内强调（加粗/斜体/行内代码）、链接目标全部对齐。报错精确到「第 N 块」并指出具体维度 |
| P24 | error | 表格几何一致：表格的**列数**与**每一行的单元格数**必须与基准相同（抓到过某语言少一列、某行漏一个单元格） |
| P25 | error | 列表标记一致：**列表符号**（`-` / `*` / `+` / 有序 `1.` / `1)`）与**缩进层级**必须与基准相同（抓到过同一份内容在不同语言用不同符号，渲染出不同层级感） |
| P26 | error | 行内强调一致：每个块的**加粗 / 斜体 / 行内代码**数量必须与基准相同；列表还比对**逐条目的加粗分布**（加粗从第 2 项挪到第 5 项，总数不变但视觉重点错了，同样判错） |
| P27 | error | 行内链接目标一致：去掉语言前缀后的链接路径必须与基准相同 |
| P28 | error | frontmatter 结构一致：`references` 条目数、`references` 的 URL 集合、`date`、`category` 必须与基准相同（抓到过某语言漏了一条参考法规或把日期写成另一天） |
| P30 | warning | 非拉丁语言正文夹用英文原词（≥2 次）：适用西里尔/希腊/阿拉伯/希伯来/天城文/泰文/中日韩等文字系统的语言，这类语言的本族词不会写成拉丁字母，正文里出现拉丁词基本就是英文残留。检查前剥离图片引用、URL、行内代码；「蓝帽子」blue hat、SKU、编号、专有拼音在白名单内 |
| P32 | error | 金额货币合规（**货币词**）：正文金额只允许「元（人民币）」与「美元」两种货币，不得混入其他国家的货币（欧元/日元/英镑/卢布/韩元/卢比/法郎…）。外币词需**紧邻数字**（前/后 3 字符内）才算命中——窗口放宽会产生同形词误报：白俄罗斯语 «перавады вон» 是「汇出」，韩语 «국무원령 443호» 是「国务院令」，二者都不是货币 |
| P33 | error | 金额货币合规（**货币符号 / ISO 代码**）：金额必须用本土文字拼写（中文写「5000 元」「50 美元」），不得用货币符号或三字母代码。覆盖 `$ € £ ¥ ₽ ₩ ₹ ฿ ₺ zł Kč kr Fr. CHF R$ Rp` 与 `USD EUR GBP CNY RMB JPY…`，符号在数字**前**或**后**都判命中。¥/$ 属允许货币，但仍是符号写法，同样要求改成文字 |
| — | — | P33 防误报判据：① 符号必须紧贴数字（波兰语 `złoży`「提交」含 zł 但不接数字 → 不报）；② 字母型符号加词边界，且后界允许 CJK 接续（日语「5000円控除」要能命中，捷克语 `krát`「倍」不能误报） |
| P31 | warning | 术语本地化：中文母版用本土概念（保税 / 元 / 美元 / 监管方式 1210），各语言必须用自己的术语，不得照抄英文。P30 靠字符集只能查非拉丁语言，这条用术语映射表补上拉丁字母语言（荷/丹/瑞典/捷克…）。当前登记 bonded / yuan / dollars / **Mode 1210** 四组对应关系——监管方式代码 1210 的说法必须本地化（中文「监管方式 1210」、德语 Modus 1210、俄语 режим 1210…）；法语除外，mode 本身就是法语词「方式」，le mode 1210 是正确法语。v1.36 扩容：新增 F2 十四个工作包名 14 组（词形 = F2 r2 48 语表格单元格逐字，46 语全登记）+ 进场关键词 12 组（诊断/主体/店铺/备案/头程/清关/结算/推广/售后/数据/审计/会员；供应链可视、内容合规两键与包名键同串并入包名条目；关键词只登记拉丁字母语言，非拉丁语言由 P30 字符集覆盖）。**同形豁免**：casefold 与英文键同形或单词键无法消歧的语言不登记——fr/it audit、de promotion、sv/fi data、ca/it/pt/ro/pl/sq data（=「日期」）、da/no store（=「大的」）、ro diagnostic、nl data（已验收本族用法）、de after-sales（德语标准拼写 After-Sales）。命中即 warning 人工判定：真错改稿，合理异形回表豁免 |
| P29 | error | 链接语言前缀校验：正文里的站内链接必须指向**本文自己的语言**，不得指向另一种语言（抓到过西班牙语版本的 CTA 链接写成 `/zh/packages/`） |
| L06 | error | title/excerpt 在任意两语言间完全相同（L01/L02 只比英文，此条覆盖其余语言互抄） |
| L07 | warning | 小节标题与 en 完全相同（疑似未翻译；纯术语标题可人工确认） |
| L08 | error | references 标题与 en 对应条目完全相同（非英文须翻译） |

**文本健壮性**（包模式与 `--body` 模式均生效）

| 规则 | 级别 | 内容 |
|---|---|---|
| P05 | warning | 正文出现省略号（…或...），疑似残句 |
| P06 | warning | 重复标点（.. ,, ?? !! 、、 。， ،، ؛؛） |
| P07 | warning | 行内连续多空格 |
| P08 | warning | 单一 token 内混文字系统（拉丁与阿拉伯/希伯来/西里尔/希腊/天城文/孟加拉/泰米尔/僧伽罗/格鲁吉亚/亚美尼亚/泰文混写）。检测前已剥离 markdown 图片/链接结构。v1.16 起全量枚举全部命中。**v1.58 补 v1.14 的另一侧**：v1.14 只放行「编号／代码＋连字符＋本地后缀」（`S1-ից`、`ל-US`），不带连字符的黏着形**仍是假阳性——五篇实抓的三类形状：波斯语 `SKUها`（复数词尾 ـها）、亚美尼亚语裸形 `Cով`（工具格，v1.14 的 `S1-ից` 只管带连字符那一侧）、阿拉伯语 `وS3؛`（前附连接词 و 直接贴在代号前，切词把它当同一个 token）（F2 的 `C-ով` 本来就被 v1.14 放行，报的是同篇另一处裸形）。放行条件 `P08_ACRONYM_RE`（`^[A-Z][A-Z0-9]{0,5}$`，全大写才算代号）＋ `P08_LOCAL_SUFFIX`／`P08_LOCAL_PREFIX`（按语向登记该语合法的词尾／前附），小写英文词根一律照旧报：`marketها`／`compliance-ով`／`bondedها` 是漏译不是构字——**代号是借形不译，词根必须翻** |
| P09 | warning | 韩语正文出现汉字（应为谚文） |
| P10 | error | 相邻重复单词。v1.16 起全量枚举全部命中；v1.55 起词典化重叠副词按 `REDUPLICATION_OK` 逐词组放行（tr `ayrı ayrı`／`tek tek`、ur `باری باری`、id/ms `satu satu`、v1.58 加 vi `song song`——都是词典里作为一个词存在的重叠形，不做整类豁免）。**v1.58 升 error**：六包＋sample 读数归零——新切词器下 v1.57 发货面共 **126 处**（P0 29／F1 9／F2 10／F3 39／F4 33／M1 6），现行面 0。同一个面交给 v1.57 判据报 67 处，三方对账闭合：交集 57（两判都看见＝真缺陷，逐条改写）、仅新 69（旧判据盲区：P0 29／F1 9／F2 3／F3 15／F4 7／M1 6）、仅旧 10（旧判据假阳性，本版修判据不改稿）；67＝57＋10、126＝57＋69。改写手法：he 加 maqaf、fa 加半角 ZWNJ、bn 加连字符、sw 换 `kila`／`ileile`／`peke yake`、tr 用已登记的 `tek tek`／`ayrı ayrı`、de/af 补名词破同形、fr 换非自反动词、si 换 `සෑම`、ur 换 `ایک کے بعد ایک`／`الگ`。判据两头也先修好：① 结合字母（天城文元音符、僧伽罗独立元音符）不是 `\w`，`\b` 会在词内切开——hi「समेकित कर करीब 1638」（合并税**约** 1638）与 si「හතරෙන් එක එකේ අර්ථය」曾被读成重复词，现按 Unicode 类别 Mn/Mc/Me 判词内（v1.37 的 `_bn_word_at` 早就为此弃用 `\w`）；② 第二个同形词其实是**多词 lexeme 的首词**——sq「rrezikut të të dhënave」（数据）、vi「nguyên văn văn bản」（文本原文）、ur「سے پہلے پہلے دو」（之前＋前两个），按 `REPEAT_LEXEME_NEXT` 逐语言登记续词前缀才放行。③ 续词必须按**原文**取下一个空白分隔词，不能取词表里的下一条——天城文里 'दो' 这类「单元音＋母音记号」的数词非结合字母只有 1 个，进不了 `repeat_words` 的词表，用词表取词会让 hi「पहले＋数词」这条放行永远不生效（v1.58b F4 重打包时才炸出来）。放行表本身不动，只修取词口径。**为什么这三类必须改判据而不是改稿**：句面本身是正确写法，为假阳性改正确稿件是反向修（P51/P0 az 那轮的教训） |
| P12 | warning | CTA 用冒号引出链接（应为自然融入句式，链接内嵌句中） |
| P13 | warning | 三连及以上空行 |
| P14 | warning | 隐形/零宽字符：软连字符、零宽空格、BOM、双向控制符、替换字符一律报；ZWNJ 在波斯/乌尔都/阿拉伯语放行，ZWJ 在僧伽罗/天城文/孟加拉/泰米尔/格鲁吉亚/泰语放行 |
| P15 | warning | 标点前多余空格（` ,` / ` .`；不含法语分号、问号等合法前置空格标点） |
| P16 | warning | `**` 强调符数量为奇数，或 ASCII 圆括号不配对（多为漏改/截断） |
| P17 | warning | 相邻两句完全相同（拼接事故） |
| P34 | warning | 非 CJK 语言正文出现全角标点（，。；：？！、（）「」『』【】《》〈〉；ja/ko/zh 全角标点是正字法，豁免）——翻译或编辑器残留，v1.17 |
| P35 | error | 整块照抄（v1.20）：正文某一块与基准（或英文）**同序号**块逐字相同即报错（归一化仅折叠空白、去行首列表符、统一大小写；≥40 字符、非图片/表格/代码块才判；与英文比对时跳过引用块——合规文章引用英文原文属合法）。P22/P23 只比块类型与规模、P25–P27 只比标记、L05 只算全篇相似度、L07 只比小节标题，「一篇里只有一段没译」此前无规则覆盖 |
| P36 | error | 标识型数字一致（v1.23）：母版块内含小数点或 ≥3 位的数字（监管代码 1210/9610、税号 0404.9000、文号 486、限值 1200）必须原样出现在各语同一块；缺 → error，多 → warning。1–2 位纯数字不判（可写成数词）；比对前把各文字系统数字折叠为 ASCII（fa ۱۲۱۰、ar ١٢١٠ 属正字法）。P 族只管结构、L 族只管相似度，「结构全对、代码被改」此前无规则。**v1.48 两处口径修正**：①空格分组先折叠（`100 000` ≡ `100.000` ≡ `100,000`，af/es 等）；②母版写「N 万」时授权两种数字面——整值 N×10^4 与千位读法 N×10^3（az 100 min / tr 100 bin / ka 100 ათას 的数字面是 100；ko 10만 명 的 만 与汉字万同义）。缺号按组放行，多出仍出声；母版块无标识数字时整块跳过。**v1.52 多出侧分级**：extra 数字若是块内任一母版数字的**近形**（等长恰差一位如 1476↔1477，或长度差一且互为前/后缀如 100000↔10000、0404.9000↔0404.9900）→ 升 **error**；其余 extra 仍 warning。实证：把同块两处同数改一漏一时，漏改的那处不缺号、extra 只给 warning，旧口径全篇唯一出声渠道被压成提示。**v1.53 收数修正**：「N 万」的 N 必须是**独立整数**（左界排除小数点/千分位）——`0.43 万亿` 不读成「43 万」、`3,600 万元` 不读成「600 万」；否则母版凭空多出 430000/430、60000/60 等数字面，译文写「0.43 trillion」恒判缺（47 语假阳性，口径不对称而非译文缺陷）。独立整数的「10 万」仍按 v1.48 授权 {100000, 100} |
| P37 | — | **空置**（v1.23 试加「括注组数」后同版撤回：P0 实测 158 处命中全是标点改写，内容未丢——括注是标点不是内容）。编号不复用，撤回理由全文见本文「版本记录」v1.23 行 |
| P38 | error | 孟加拉文裸辅音 + CANDRABINDU（v1.37）：U+0981ঁ 紧跟裸辅音字母（U+0995–U+09B9，category Lo）即报错——ঁ 标的是**前一个元音**的鼻化，孟加拉正字法里只能跟在元音字母/元音符号（কার）之后，辅音后面要写的是 U+0982 ং（anusvara），所以这个形状不是「不好看」而是**不成立**。抓的是批量替换打错码位这一类事故：F2 r3 工单把 অনু（0985 09A8 **09C1**）写成 অনঁ（0985 09A8 **0981**）共 12 行，词形看着像孟加拉文，P31 只判「英文原词有没有残留」（登记词形本身对不对无人管）、P14 只判隐形字符，全链绿灯。分母自证：本仓 3 份 bn 稿 37 处 ঁ 的前一位 100% 是元音（09BE/09BF/09C1/09C7/09CB/09CC/0986）。**只读 Bengali 区段**：同一 predicate 打到 Devanagari 实测误伤 29 处（尼泊尔语后置词 सँग、印地语 महँगा / बँटवारा 都是合法形），不许顺手扩到 hi/ne。豁免表 `BN_CB_ALLOW` 当前为空，加条目须先在语料里证明该词形真出现且合法。射程声明：只判「ঁ 紧跟裸辅音字母」，ঁ 用错但前一位恰为元音的形状不在射程内。正文与 title/excerpt 两臂都挂 |
| P39 | error | 电商复合词的 `e-` 前缀被空格拆开（v1.39 新增，v1.40 升 error）：正字法为 `e-commerce` / `e-handel` / `e-ticaret`（连字符，不是空格）。正则 `(?i)(?<![\w-])e[  \u00a0\u202f]+(commerce\|handel\|ticaret)\w*`——`\w*` 是必需的：土耳其语格后缀（`e ticarette`）与北欧复合词（`e handelskanal`）都靠它接住，按词边界写会整族漏判。v1.40 起挂 12 语：en/de/nl/da/sv/no/tr + af/cs/sk/id/pl（后五语借用同一前缀，实测 `e handel` / `e commerce` 是误拆）；it/pt/ro/es 的 `e` 是连词（`e commercio` 合法），不收。判 title / excerpt / `references[].title` / 正文四处。**v1.40 不再按 P0/F1 的历史写法放宽**（用户指令：按最正确的来）：P0 9 语 mdx 共 43 处、F1 12 语标题已逐处改成连字符形或本地语词，两包 0 条。**v1.41 起 F03 只禁分隔符形状，标题直接用连字符形**：P0 en `Bonded E-commerce`、tr `bonded e-ticaretle`，F1 en/id/pl/pt 同步恢复。射程：只判「e + 空格 + 词干」；`electronic commerce` 不在此列 |
| P40 | error | 摘要终止标点（v1.39 新增，v1.40 收掉 hy 豁免）：`frontmatter.excerpt` 剥尾部空白与收尾引号/括号（`"'”’»›)]）】」』》>`）后，末字符必须是 `.。！？!?।۔։…؟` 之一。摘要是列表页唯一的一段完整文案，缺句末标点会让相邻两篇的摘要粘成一句；F2 r4 实测 en 摘要在 `the brand's` 后直接结束（S09 的「14」契约照样全绿）、pl 同理。**th 整语豁免**：泰文不以句末标点断句（三包 th 摘要末字符全是泰文字母/符号）。**hy 不再允许 ASCII `:`**（v1.40，用户指令）：P0 摘要末 `:` 与正文 113 处 ASCII 冒号同批改成亚美尼亚句号 `։`，与 F1/F2 一致；原来那条豁免是历史遗留盲区。空摘要由 F02/F07/S09 管，本条不重复出声 |
| P41 | error | 工作包表格 vs 表前包名列表（v1.42）：正文若含 S0–S13 表，取 S0 起连续的表格行（必须恰为 S0…S13），第二列包名与**表格之前最近 13 条带标签的列表项**（`- 名称：说明`，分隔符 `:` / `：` / `՝`）按 S1…S13 逐字比对（只折叠空白）；列表不足 13 条同样报。F2 的 48 语各维护两份包名，r5 实测 30 语出声——29 语共 44 格表格与列表不同字（每语 1–2 格），hy 则是表前只剩 5 条带标签列表项、无法对应 13 条；两边各自读起来都通顺，P22/P23 只比块类型与规模，拦不住。无 S0–S13 表的文章不适用 |
| P42 | error | 亚美尼亚文 ASCII 句点（v1.42）：hy 的句末标点是 `։`（U+0589）、列举/转折用 `՝`（U+055D），ASCII `.` 不是亚美尼亚正字法。扫描正文、alt、title、excerpt、`references[].title`；只豁免真正需要 ASCII 点的形状：小数（`9.1`）、 թվական 缩写（`թ.`）、链接目的地、裸 URL、行内代码。r5 实测 F2 hy 正文 78 处、P0 hy 88 处、F1 hy 55 处 ASCII 句点，同批按语法改为 `։`/`՝`；F2 hy 参考标题只含 թվական `թ.` 与 URL，规则落地后三包 0 条 |
| P43 | error | 文章级禁用译法（v1.42，glossary 的 `"banned"` 段）：每条 `{id, lang, terms}`，对 `lang` 指定语言把 term 当作**整篇子串**扫描正文、title、excerpt、`references[].title`，命中即 error；不挂其他语言。只从文章级表加载——同一词形在另一篇可能是合法字面义（vi `vào sân` 在 P0 有 7 处「进场院」）。r5 实证：vi 把 market entry 写成 `vào sân` 9 处、ta 把 S0「诊断」写成 நோயறி（疾病诊断）词族 16 处、si 写成 රෝග විනිශ්චය 15 处，全部按母版改为「进入市场／分析评估」；r5 复核又实证 hr/sl/sr/uk 把 S1「主体设立」写成自然人（osoba/oseba/лице/особа）、ru 写成 структура、sw 写成 chombo（工具），已改各自实体术语并把旧形登记为禁用，S08 另正向钉住六语 S1 的本地实体词。r6 终审（以 zh 为基准的 47 语逐段语义审计）再实证：uk L128「股权」写成 Часткова（部分的，正确词与 be/ru/bg 同源：份额），bg/be 开篇清单比 zh/en 多「准入」一项（与 uk r5 修掉的 та входу 同族），ka L139 误插 ნაწილობრივ（部分地），hr/sl/sr 摘要丢「每一步都能停」情态、hr/sr L85「追责」弱化成 pratiti/пратити（跟踪）、hr/sl 表格 S5 交付件漏枚举三单——banned 增至 12 条/19 词，excerpt 增「每一步都能停」钉词条款，terms 增 uk 股权正向条款 |
| P44 | error | 韩语阿拉伯数字与量词 `개` 之间的空格（v1.42）：`14개` 是正字法，`14 개` 是排版空格。只判 `\d+` + 空格/不换行空格 + `개`；固有数词 `열네 개` 里数词与量词本来分开，不在射程。判 title、excerpt 与正文（r5 实证 ko 摘要 `14 개 성과물`；`14개월` 一类汉字词量词同形状，同样不得断开） |
| P47 | error | 描述位数字（v1.52）：母版块内「N 位」的 N 只有 1–2 位（「1476 个 8 位税号」「至少对应 5 位买家」），P36 只收 ≥3 位、P36 的 extra 侧对「整段丢掉修饰」无能为力——整段描写被译漏时母版数字也随之消失，缺号判不出（母版自己也没落到译文）。判法：母版块含 `N 位`（N 为 1–2 位数字）时，各语同一块必须以**数字或数词**写出 N——ASCII/本地数字（数字折叠后）、P36 词表数词、或各语 stem 表（47 语：de achtstellige、ru восьмизначных、ja 八桁、ta எட்டு இலக்க 等复合/带格形式按词干收，ro 的 opt 是双边界单词表——右开词干会误吃 optimizarea；th/ja 无空格连写、左边界不设）。块级粗粒度契约：同块另含同值词（「八部门」的 acht/eight）时单点换词抓不到，本条定位是**整段描写丢失**的保护 |
| P48 | error | 长级差单位（v1.54）：长级差语言里「万亿」= 10^12（af/it/nl/pt/ro/sq 的 biljoen·bilioni·biliões·bilioane·bilionë、de/fr/es/nl 的 Billion·billion·billones、da/no/sv 的 billioner·biljoner、pl/cs/sk/hu/hr/sl/ca/fi 的 bilion·bilión·billió·bilijun·bilijon·bilió·biljoona），而本语的 tri- 词形是 **10^18**。M1 四十七语人工审校实测：af/it/pt/ro/sq 五语把 0.36 / 0.43 / 0.6 万亿元写成 triljoen / trilioni / trilhão / trilioane / trilionë——数字原样、单位放大一百万倍；P36 只比数字面，P31/P30 只盯术语残留，这类错误此前**无任何规则可见**。判法：母版块（或母版摘要）含「万亿」时，各语同一块/摘要命中 `P48_BAD_UNITS`（21 个长级差语向的正则，短级差语向 en/ru/uk/bg/be/tr/el/he/ar/fa/hi/ne/bn/ta/ur/id/ms/sw/ka/hy/az/ja/ko/th/vi/zh 不入表，它们的 trillion 族本就等于 10^12）即 error，红面直接给出应用的 10^12 词形。边界：本条只在母版块写明 万亿 时点火，母版若真谈 10^18 不适用（该语向块内不会出现「万亿」） |
| P49 | error | 清单缩减矛盾（v1.54）：母版「2022 清单收紧：乳品税号加「仅限网购保税」备注，清单扩至 1476 个税号」讲的是**同一份清单的准入条件变严、清单本身扩容**。四十七语审校实测 be/bg/ca/cs/de/fa/hr/ko/ro/sr/uk/ur **十二语**把它写成「清单缩小／清单变窄」，与「扩至 1476」**自相矛盾**——读者会得出「可卖品类变少」的反向结论，而 2022 恰恰是扩容年。判法：母版**全篇**含 1476 时，各语任一块命中 `P49_SHRINK` 登记的该语缩减短语即 error，红面写「收紧≠缩减」。**按全篇而非同块判**：同一个 2022 事实在时间轴摘要（母版第 23 块，无 1476）与条目（第 24 块，含 1476）各写一遍，de/be/ko/uk… 的错形两处同形，只判同块会漏掉摘要那一处（电池 C7 专测）。边界：只登记缩减/变窄类词形，「清单收紧」的直译（sl zaostritev seznama、tr liste sıkılaştı、sk sprísnenie zoznamu、az siyahı sərtləşir、ms senarai→syarat 之外的收紧形、ru список ужесточается、el σφίγγει ο κατάλογος、ja リストの絞り込み、fr la liste se resserre）不判——它们与母版同形，不构成矛盾 |
| P50 | error | CTA 末行终止标点（v1.55）：末块是读者落地的一步，缺终止标点在页面上表现为「句子没写完」。M1 四十七语审校实测 he/fa/af/ca/sw/bn/ta/vi/nl/tr/it/ur 十二语 CTA 以链接收尾后直接断行（`…[Kontak ons](/af/packages/)`），只有 zh/en 等少数语写了句号。**各文字系统用各自的终止符**：拉丁/西里尔 `.`、zh/ja `。`、ar/fa/ur `۔`/`؟`、hi/ne `।`、bn `।`、hy `։`、he `.`——判据取末行末字符是否落在 `P50_TERMINAL`。th 整语向豁免（`P50_NO_TERM_LANGS`）：泰文没有句点惯例，六篇一致缺，属正字法而非漏写 |
| P51 | error | 同篇百分号体例混用（v1.55 新增为 warning，**v1.56 升 error**）：M1 实测 sv/cs/el/ro 把列表项写成「21.4%」而正文写「20 %」——同一种语言两套排版，读者会以为是两个来源；ka 反向（正文一律「20 %」，列表混进「17.6%」，装配阶段自查抓回）。判据按**侧别内部**比对：后缀型 `N%` 与 `N %` 并存、前缀型 `%N` 与 `% N` 并存、或前后缀并存（同一篇文章里两种方位并写就是排版事故）。数字面一律 ASCII（`[0-9]+(?:[.,]\d+)?`），小数逗号/点号两种写法不判；射程＝正文（摘要/标题不参与，体例由 F07/P40 那一套管）。**v1.56 判据对称化**：一个 `%` 归后缀还是前缀，只看它左面贴不贴数字——旧写法给后缀形加了右侧 `(?!\s*[\d])`、前缀形却不加左界，az「13% vurulmuş 70% 9,1%-ə」里的「70%」被右界挡掉不算后缀、同一个 `%` 又因后接「 9,1」被算成前缀，于是**全篇零前缀形**的阿塞拜疆语被判「前后缀并存」（与 v1.53「N 万」同型：口径不对称的假阳性，不是稿件缺陷）。升 error 的前置条件已满足：F3 cs 五处紧形改捷克疏形「9,1 %」（与本系列 M1 cs 的 16 处一致），P0 az 那处经修判据证实为误报、无需改稿；六包读数 0。 |
| P52 | error / warning | 拉丁语向英文残词（v1.55）：P30 只看**非拉丁文字**里的拉丁残留（ru/ar/th 里冒出英文词），拉丁语向之间互看全是「像英语的词」，整片盲区。M1 实抓 de「die zuerst **compliant** sind」、da「**compliant** sælgere」——英语形容词原样留在译文里，本语应有词形（konform / overholder reglerne）。两级：`P52_RESIDUE_HARD`（compliant·complying·stakeholder·shopper·funnel·touchpoint·onboarding，语法词形必翻）error；`P52_RESIDUE_SOFT`（sourcing·benchmark·leverage·pipeline·insight·campaign·loyalty·checkout·cleansing·purging·screening，行业借词按语向可能合法）warning 交人工裁定。边界：compliance/timing/traffic/launch/sku/quota/online/offline 等**已在该语自然化**的借词不入表——六篇存量命中（da compliancevurdering、sv/da/no timingen、de Traffic、F1–F4 全篇 SKU）证明它们是既定用法，不是漏译；en 语向与母版语向不判 |
| P53 | error | 葡语变体同篇混用（v1.55）：欧葡与巴葡各自成篇都合法，**同篇混写**才是事故。v1.45 曾用全局 banned「connosco」一刀切，把整篇一致的欧葡文 M1 判成 error——禁掉正确词形不是规则。改法＝成对判据 `P53_VARIANT_PAIRS`（connosco×conosco、registo×registro、utilizador×usuário、contacto×contato、actividade×atividade、óptimo×ótimo、acção×ação）：同一篇（正文＋摘要＋标题＋题录）里两个变体同时出现才出声，单边命中一律放过。跨篇不统一（M1 欧葡、P0/F1–F4 巴葡），由内容判据而非文章域承担——与 v1.45「域摘除」同一口径 |
| P54 | error | 丹/挪文号引用的年份介词（v1.57）：丹麦语法源引用写 **af**（`bekendtgørelse nr. 486 af 2018`）、挪威书写 **av**（`kunngjøring nr. 486 av 2018`），`fra` 留给**颁发机关**（`… af 2018 fra seks ministerier`）。旧稿把年份与机关都写成 fra，一句两个 fra，读成「来自 2018 来自六个部门」。两臂：`P54_CIT_RES`（文号词＋`nr.`＋编号＋`fra 20YY`）与 `P54_DOUBLE_RE`（`nr.`＋编号起、同行 40 字内的 `fra 20YY fra` 双写）。文号词表 `P54_DOC` 的变体口径与 fra 无关：ø 可写 o、æ 可写 ae（无本地键盘的转写），判据是介词写错，文号词怎么拼不该决定它能否被看见。**双写臂为什么锚在 `nr.` 而不是文号词形**：散文里 `rapporten fra 2018 fra seks ministerier`（2018 年出自六个部门的报告）两个 fra 都合法，无界判据会把正确句子判红；锚在 `nr.` 上既缩掉射程，又兜住词表外的文号名（`lov`／`forordning`／未收的复合形）。射程＝正文＋摘要＋标题＋**题录标题**（旧形正是在 `references` 里成片的）。**先改稿、后立规**：六包 65 处（da 37／no 28）统一成 af/av 之后本条才点火——改稿之前 fra 形在别篇是自洽写法，先立规会把正确稿件判红（同 P53 撤掉全局 banned `pt-connosco` 的教训） |

---

## 9. 已知合法模式与人工终审边界

**站方回执口径（v1.14，receipt-bonded-ecommerce-export-china-guide.md）**：

- **P10 相邻重复词：一律改写**。站方明确「逐一个」式分配重复即使语法成立也要改，
  并逐条给出改法（ar مفصّلة بنداً بنداً / he תא אחר תא / hi एक-एक करके / ur باری باری /
  tr her paketi ayrı ayrı / vi xác nhận đã nhận hàng / sq 删多余 të / si 删多余 ඔබ /
  de 重构 die die 句）。本稿已按回执改掉站方点名的 9 条，并顺着同一口径把
  search 只报首条而压在下面的 17 处一并改写（tr 的 X X → **X bazında**「按 X 计」、
  he 的 X X → **X אחר X**、ar 的 طبقة فوق طبقة）。
- **P10 仅存白名单**：词典化重叠副词（tr "ayrı ayrı" / "tek tek"、ur "باری باری"——
  站方自己的改法用语）逐词组放行，不做整类豁免。
- **P08 编号/俗称 + 连字符 + 本地格后缀**：站方 v1.14 在脚本侧放行（S1-ից、S1-მდე、
  ל-US），本工具同步实现并扩展到 en dash 区间（S0–S13-ը）与白名单俗称
  （blue hat-ის）；「一个词中间夹另一文字系统的字母」（如 الجمarكي）仍会命中。

**W02 超长段落按文字系统分档**（v1.6）：字符数不是语言中立的读长指标——拉丁文里一个字符约半个词，中日韩文里一个字符约一个词。因此阈值分三档：

| 文字系统 | 语言 | 阈值 |
|---|---|---|
| 拉丁 / 西里尔 / 希腊 / 阿拉伯 / 天城文 / 孟加拉等 | 除下列两类外全部 | 400 字符 |
| 中日韩 | zh / ja / ko | 340 字符 |
| 泰文、缅甸文、高棉文、老挝文等单字成词语言 | th / my / km / lo | 300 字符 |

同一段落在不同语言上判定一致。W02 仍为 **warning**：长段落属于文风取舍（中文基准用「标签：内容」分段，英文用句子承接，两者都成立），不影响 0 error 的验收结论；但若一段里塞进了多个带序号的步骤，应当拆开写。

**W02 与 P23 的联动（v1.18 实证）**：不要用「拆段」来消除 W02。P23 要求各语言与基准逐块一一对应——把某语言的一个长段落拆成两段，该语言的块数就比基准多一块，P23 立刻报 error。翻译稿的段落天然比中文长（拉丁文一个字符约半个词，同样内容字符数更多），W02 在译版上是结构性 warning，正确做法是保持段落边界与母版一致、接受 warning；要消除只能连母版一起调整，且需 48 语同步。

**术语方向护栏（v1.19：S08 机制）**：跨语言的语义级错误（如把母版的「监管」按记忆反向改成「准入」）无法从语言本身判定，必须把母版语义固化成数据。工具包提供 **S08** 机制（块级术语契约），数据放在工具包通用术语表 `glossary.json`——v1.44 起**单轨**（文章级 `pipeline/glossary.json` 废止，发现即由 P46 提示合并删除），锚点在某篇母版找不到的条款自动跳过。格式：

```json
{"terms": [
  {"id": "supervision-not-access",
   "zh": "定的是监管",
   "require": {"ko": ["감독"], "ne": ["अनुगमन"], "*": ["..."]},
   "forbid":  {"ko": ["진입 요건을 정한다"]}}
]}
```

`zh` 是母版锚点短语，用来定位**块序号**（不依赖行号，也不受译版句子切分差异影响——P23 已保证逐块同构）；`require` 声明该块必须出现的本地术语，`forbid` 声明不得出现的反义表述，`*` 对所有语言生效。缺 require 或命中 forbid 都报 error。写术语表时**用本地实际用词**，不要按中文直译猜（F1 初版按直觉填 ne/si/az/ur 五个词，全部与实际不符，逐块读原文才对准）；新术语入表前先跑一遍，报「缺失」的先核对是词表错还是译文错。

术语表另有三个段：`title`（S11 标题契约）、`excerpt`（S09 摘要契约）与 `banned`（P43 禁用译法，格式 `[{"id","lang","terms"}]`）。三者的内容都绑定「这一篇怎么译」——标题承载哪几层、摘要必须覆盖哪几层、某个词在本篇是错译而在别篇可能是字面义。v1.44 起三者并入共享表加载，v1.45 起不再有 `articles` 域，分篇改由**内容锚**承担：S09/S11 条款带自己的 `zh` 锚，该篇 zh 摘要/标题不含锚即静默跳过（S08 本就是块级 zh 锚）。

**人工终审边界**：词表与模式仅覆盖 EN/zh 可穷举项与其余语言的**结构性**问题；语义级错误（如公告发布主体写错机构名）机器无法穷举，仍需人工或母语终审。脚本负责把事实数字、结构、图片与文字系统的对齐拦在机器层。

---

## 10. 自检与打包（验收流程）

```bash
python3 submitter_check.py your-package            # 全量自检
python3 submitter_check.py your-package --glossary=pipeline/glossary.json   # 连带块级术语契约（S08）
python3 submitter_check.py your-package --pack=your-package.zip   # 全绿才出包
```

实际输出示例：

```
  [WARN ] W02 fr/green-coffee-beans-china 存在超长段落（612 字符）
------------------------------------------------------------
结果：PASS（0 error, 1 warning）→ 可提交
打包完成: your-package.zip（55 文件, 842.3 KB）
```

- `error` 必须清零；`warning` 只是提醒（正文过短、段落过长等），可以不改。
- 退出码：0 = 通过；1 = 存在 error；2 = 用法错误。
- **打包（v1.3）**：`--pack` 由脚本完成 zip 打包，**0 error 才出包**；垃圾文件双层过滤（第 1 节 S05 + 打包层兜底）；仅接受目录输入，路径排序写入、字节稳定；`--json` 结果带 `packed` 字段。
- 全部命令与模式（`--json` / `--quiet` / `--no-parity` / `--body` / `--until`）的用法见 README 第 4 节。

---

## 11. 常见退回原因（Top 8）

1. 少语言（比如只交了 30 个）——必须 48 个。
2. 非英文文件里 title/excerpt 还是英文（回退，L01/L02），或两语言之间完全相同（L06）。
3. 图片是 jpg/png，或 cover 尺寸不是 1200×630。
4. 结尾 CTA 写成 `/quote/` 或没带语言前缀（B09）。
5. 引用了 248/249 号令，或写了 MOA/CFDA（R01/R02）。
6. 列表项之间留了空行（B07，渲染会碎成多个列表）。
7. 标题里用冒号或破折号作分隔（F03；词内连字符 `e-commerce`、数字区间 `2–4` / `S0–S13` 合法，分句用逗号/句号）。
8. 图片没被正文引用（I06，cover 除外），或同一图片被引用多次（P01）。

---

---

## 12. 法规文章（kind = "regulation"）

法规库（`/{locale}/regulations/`）与博客共用本工具包、同一个 `submitter_check.py`、同一套 S/F/M/L/B/R/W/I/P/ST 规则。区别只在**元数据字段**和**正文结构**两处，其余（48 语言、禁英文 fallback、标题形状、金额写法、写作纪律、术语一致性）完全一样。

### 12.1 submission.json 差异

```json
{
  "kind": "regulation",
  "slug": "gacc-decree-297-food-import-records",
  "title": "Administrative Provisions on Imported Food Record Keeping",
  "date": "2026-11-20",
  "category": "food-registration",
  "author": "David Zhang",
  "excerpt": "……",
  "locales": ["…48 个…"],
  "images": [],
  "imageRights": "No images submitted.",
  "docNumber": "GACC Decree No. 297",
  "issuer": "GACC",
  "publishedAt": "2026-11-10",
  "effectiveAt": "2027-01-01",
  "status": "upcoming",
  "sourceUrl": "https://www.gov.cn/…",
  "relatedService": "/services/gacc/"
}
```

| 字段 | 必填 | 说明 |
|---|---|---|
| `kind` | 是 | 固定 `"regulation"` |
| `category` | 是 | 产品/业务类别，用于列表筛选：`food-registration` / `food` / `cosmetics` / `labelling` / `ecommerce` / `certification` / `general` 等，全小写连字符 |
| `images` | 是 | 法规**不使用配图**，固定写空数组 `[]` |
| `docNumber` | 是 | 发文字号，如 `GACC Decree No. 297`（页面第一列单独展示，**标题里不要重复写**） |
| `issuer` | 是 | 发布机关代码：`GACC` / `SAMR` / `NMPA` / `MOFCOM` / `STATE_COUNCIL` |
| `publishedAt` | 是 | 官方发布日期 `YYYY-MM-DD`（≠ 站点上架日期 `date`） |
| `effectiveAt` | 是 | 施行日期 `YYYY-MM-DD`；尚未施行写未来日期并把 `status` 设为 `upcoming` |
| `status` | 是 | `in_force` / `upcoming` / `amended` / `repealed` / `draft` 之一 |
| `sourceUrl` | 是 | 官方原文链接（gov.cn 等），页面上只出现这一个外链 |
| `relatedService` | 否 | 底部「相关服务」卡指向的服务页，取值 `/services/gacc/` `/services/ccc/` `/services/cosmetics/` `/services/ecommerce/` `/services/brand/` `/services/label/`；不写或写错则落到 `/{locale}/services/` 总览 |

### 12.2 frontmatter 差异

每个语言的 mdx 开头是这 10 个字段（博客是 6 个）：

```yaml
---
title: "Imported Food Record Keeping Provisions"
slug: "gacc-decree-297-food-import-records"
date: "2026-11-20"
category: "food-registration"
excerpt: "……"
doc_number: "GACC Decree No. 297"
issuer: "GACC"
published_at: "2026-11-10"
effective_at: "2027-01-01"
status: "upcoming"
source_url: "https://www.gov.cn/…"
related_service: "/services/gacc/"
---
```

`title` 里**不得**再写文号（文号有独立字段，重复会让列表第一列与标题各出现一次）；同一篇的 48 个语言标题都按这条走。

### 12.3 正文结构（与博客最大差异）

法规正文分**两段**，用一行分隔标记 `<!-- original -->` 隔开：

```markdown
（第一段 = 「解读」：我们自己的分析，页面上渲染成暖色卡片）

## 谁需要关注
……

<!-- original -->

（第二段 = **该语言的官方文本全文译本**，渲染成冷白文书卡）

## 第X章 章名

**第X条**　条文正文……
```

规则：

- `<!-- original -->` 必须**恰好出现一次**；缺失则该篇只有分析、页面不出现译本区（R10 判 warning，建议补齐）。
- 两段都**不能为空**（R11 error）。
- 第二段必须是**全文**，不是节选；章节标题用 `## 第X章 …`，条文号用 `**第X条**　` 起段（全角空格两个）。
- **中文原文不上页面**：中文只作为翻译底稿随包提交（`content/zh/…mdx` 是纯中文译本，与其它语言同构），页面上读者看到的永远是本地语言。
- 图片：法规不使用配图，正文里不要出现 `![...](…)`（I 系列规则照常生效，出现即报）。
- 其余正文规则（段落切分、列表、表格、链接、金额、术语、写作声音）与博客逐条相同。

### 12.4 法规专属检查项（R 系列，与博客规则并行）

| 规则 | 级别 | 判定 |
|---|---|---|
| R10 | warning | 正文缺少 `<!-- original -->`（只有分析段，页面不会出现译本） |
| R11 | error | `<!-- original -->` 前或后的段为空 |
| R12 | error | `kind=regulation` 但 `images` 非空或包内带图片（法规不用配图） |
| R13 | error | 法规 submission.json 缺 `docNumber` / `issuer` / `publishedAt` / `effectiveAt` / `status` / `sourceUrl` 之一 |
| R14 | error | `status` 不在 5 个枚举值内 |
| R15 | error | `title` 里出现 `docNumber` 的字号字样（文号应只出现在 `doc_number` 字段） |

---

## 13. 定时发布（v1.59）

- `date` 可以写未来日期（一年以内）。站方按该日期**定时上架**：未到日期的稿子在列表、首页、分类、分页、相关文章、站内搜索、sitemap、llms.txt 里都不出现，也不生成详情页。
- 到日期后由每日定时构建自动上线，投稿者无需再操作。
- 因此 `date` 就是承诺的上架日，请按内容重要性自行排期（系列文章建议间隔 2–4 天）。

---

---

## 14. 版本记录

| 版本 | 日期 | 内容 |
|---|---|---|
| v1.59 | 2026-10-29 | **法规与博客合并为同一投稿包**：`submission.json` 新增 `kind`（`blog` 缺省 / `regulation`），两类共用同一个检查脚本与同一套 S/F/M/L/B/R/W/I/P/ST 规则；新增 §12 法规字段与正文结构（含 R10–R15）、§13 定时发布。**M04 放开未来日期**（站方按 `date` 定时上架，未到日期不显示、不生成页面；只挡一年以后）。`title` 不得重复写文号（R15）。 |
| v1.33 | 2026-10-24 | 文章专属词全部融合进通用底表：P0 文章 glossary 的 25 语 OR 词形（ledger/positive 两条款本语同族正常词）union 并入通用表，P0 文章 glossary 文件删除、检查改走通用表 auto 加载；F1 文章 glossary terms 段（通用表滞后子集）整体同步为通用表最新快照（build_package 与 3 个负向测试显式传参用），excerpt 段（S09 摘要契约）按设计保留文章级。**词形一律进通用表，文章级文件只承载绑定单篇结构的内容（如 S09）**，杜绝双源漂移。条款总数 59 不变 |
| v1.34 | 2026-10-24 | 两条检查补强（用户指令）：①新增 **M09** submission.json title/excerpt 与 en frontmatter 对齐（error，F1 实测漂移后修复，submission.json 已对齐 en frontmatter）；②**ST08 补全**：大小写不敏感 + 正文逐处报告 + 总结套话族新增 hy/id/ms/sw/th 变体（P0 的 3 处总结套话保持 warning 可见、内容按「我端不润色」不改）。**不收裸词** kesimpulan/สรุป/kết luận（P0 实义名词误报）。规则总数 107 → 108 |
| v1.42 | 2026-10-25 | **F2 终审回填：以 zh 为基准的 48 语语义审计**，无新规则（仍 118 条）。方法＝结构对齐脚本（frontmatter、四条参考 URL、H2 数、列表项数、表格 S0–S13 行序、图片 alt、CTA 链接、关键数字 1800/240/22%/9610；47 语 0 真实缺陷，仅 en 千位分隔 1,800 与 ja/ko 文字密度两处假阳性）＋ 8 组分语系人工逐段审计（每组出声回报 PASS/FAIL）。发现 7 语 6 类缺陷并全部修复：uk「股权」误写 Часткова→Пайова（Пайова 以 Пайова 码点构造并断言）；bg/be 开篇清单多「准入」→删（全量 L19 扫描确认无第三处同族）；ka 误插 ნაწილობრივ→删；hr/sl/sr 摘要丢「每一步都能停」→按各语 L17 正文自己的措辞改回并钉词；hr/sr「追责」弱化→odgovarati/одговарати；hr/sl S5 交付件漏枚举→按各语 L56 正文枚举补齐（en/pl/cs/de/fr/ja 六语参照均枚举）。glossary 升 1.42（banned 9→12 条/10→19 词、excerpt 钉词条款、uk 股权正向条款）；电池 U5 自动扩到真实 19 条全命中、U6 提示×banned 0 冲突；F2 回归 0 error/58 warning；结构复检同前。投稿包重打 F2 r6 |
| v1.42 | 2026-10-25 | **F2 48 语全量审读回填**（用户指令：F2 的 48 语再审计一遍，发现的问题及时优化到脚本并修复）。新增四条，规则总数 114 → 118（P37 仍空置、编号不复用）：**P41** 工作包表格 vs 表前包名列表（error；F2 r5 实测 30 语出声：29 语共 44 格不同字，hy 列表标签不足）、**P42** 亚美尼亚文 ASCII 句点（error；豁免小数 / թվական `թ.` / URL / 链接目的地 / 行内代码）、**P43** 文章级禁用译法（error；glossary 新增 `banned` 段，只从文章级加载）、**P44** 韩语阿拉伯数字与量词 `개` 的空格（error）。F2 r5 同批改稿 38 语 178 行：30 语表格与列表逐字对齐；66 个表格包名与对应列表项按母版校正（S7 24 / S8 28 / 其余 14，多数语言只译出 Promotion / After Sales 前半）；it/pt 会员术语随通用表改为 membri/adesione 与 adesão；sw 标题 `wagawanywa`→`ugawanywa`（mradi 为 u 类）且摘要补 pale、去 Kuna；vi 摘要与正文 9 处 `vào sân`→`vào thị trường`；ko 摘要 `14 개`→`14개`；ja S1 `主体設立`→`現地法人設立`；S1 主体词六语校正（hr/sl/sr/uk 的 osoba/oseba/лице/особа→subjekt/суб'єкт、ru структура→субъект、sw chombo→taasisi，uk 连带开篇清单与「境内主体」行）；hy 正文 78 处 ASCII 句点改 `։`/`՝`，S7 `հրապարակում`→`առաջխաղացում`；ta 16 处、si 15 处「疾病诊断」改「分析评估」；P31 提示表同批校正 10 值（六语 S1、vi/ta/si S0、hy S7——旧值从稿面收割了错形或 P43 禁用词，等于提示在教人写会被判错的词）。文章级 glossary 升 1.41（hy 推广词、sw 标题名词类、banned 九条＝三语禁用译法＋六语 S1 旧形、S1 主体词六语正向条款），通用表升 1.34（it/pt 会员）。P0 hy 88 处、F1 hy 55 处 ASCII 句点与 F1 it/pt 会员术语同批修正。验证：`pipeline/negative_test_p41_p44.py` 7 个单元臂（P41 8 形 / P42 8 形 / P44 6 形 / P43 3 形＋真实 banned 十词逐条命中 / P31 提示×banned 交叉 0 冲突 / S08 六语正反）+ 10 个包级臂全 PASS；六个 S1 禁用字面量另用 git HEAD 旧稿面反查（电池只证自洽，证不了字面量本身）；三包回归 P0 0/49、F1 0/45、F2 0/58；全量门禁 29 格（新增 `f2_p41_p44`）。规则号两把尺 `tmp/f2_r5_rulecount.py` 同为 118。投稿包重打：F2 r5（51 文件，521.4 KB）、P0 r4（55 文件，1386.4 KB）、F1 r4（51 文件，667.0 KB）；kit v1.42 |
| v1.43 | 2026-10-25 | **F3 r1 语义审计回填：以 zh 为基准的 48 语语义审计**（8 组分语系人工逐块审计＋验收脚本适配 9/9 PASS），33 语真错修复：乳清蛋白九语误作牛奶蛋白（hu/cs/sk/hr/az/fi/da/sv/no，nl 补连字符 wei-eiwit）；「三条有一条不成立」方向反转三语五处（hu×2、sw×2、az）；容器量词三语（th ขวด→กระป๋อง、sl kozarec→pločevinka、id botol→toples）；sw 词汇语法七处（kamari→kamisheni 等）；ms GST→Cukai Nilai Tambah；sq references 四处批发进口→零售进口＋papërbashkueshëm→i pandashëm；hi 保税三处 सीमाशुल्क→बॉन्डेड；be/bg「准入→适用性」漂移改 допуск/достъп；ka 计费方式误译「制造方式」＋「不改变」→「不替代」；hy 周期「可控」误作「可获得」；el 一般贸易渠道名统一；uk/be/bg 电商残缺词形补全（含 references）；ru 块21 blue hat 西里尔形统一到 S08 契约拉丁形（契约优先，反向改锚点被否）；ur 转写统一拉丁 blue hat；de Yuan 六处大写；北欧四语算例句断裂重排＋finans-konto 族生造复合词＋da/no hvert fradrag；nl nooit tot stand；tr 元音和谐 karıştırmaya；bn 门槛误作「指责界限」；ta 卫生→健康声称；si 破碎句修复（ZWJ 计数对账 -1 恰为被删合字）。存疑项逐条裁决留档（北欧 CTA 末块复数=F2 既定约定不改、vi phóng đại、ro/id/ms e-commerce 词形、de refs 题录等） |

| v1.43 | 2026-10-25 | **审计缺陷固化进检查脚本**（用户指令：检查到的问题固化成代码）。新增 **P45** 称呼语域混用（warning；REGISTER_MARKERS 九语 hu/ro/ca/fr/es/de/it/el/pt，只收单侧无歧义的代词/物主限定词，动词形态不在射程，北欧语不收——CTA 末块 du→复数是既定约定），规则总数 118 → 119；**P10** 补德语关系从句豁免（仅逗号紧跟的 das das/die die/der der 放行，无逗号仍报）；**P30** 补单次出现疑残留登记词表 LATIN_SINGLE_SUSPECT（brands/brand/health/wellness/supplement/supplements；门槛 ≥2 曾放过 el 单次 brands，第二轮引入第二处才暴露）。验证：电池 9 单元臂全 PASS（U1–U8＋旧版对 comma-relative 仍报的反对照，证明豁免系本轮新增）；四包 v1.42/v1.43 新旧读数对比 error 0→0、S08 持平、P10 F3 6→5（豁免生效）、P45 四包零命中（F2 r6 修过的 hu/ro/ca 已无混用）；对比时发现同进程多包连查会把上一包的 _GLOSSARY 带进 glossary=None 的下一包（CLI 语义本就复用 --glossary，流水线单包单进程不受影响，电池改用独立读数规避）；规则号两把尺 `tmp/f3_r2_rulecount.py` 同为 119；全量门禁 38 格（新增 F3 十格）。投稿包重打 F3 r1 同日重打（52 文件，619.6 KB，md5 6471ab372fd7e700e099a683c956b325，zip 三重校验 A 字节级一致/B 解包 0 error/C md5）；kit v1.43 |
| v1.44 | 2026-10-25 | **术语表单轨制：文章级术语表全部废止，并入工具包表**（用户指令：文章级术语表都并入工具包表，以后不要有文章级表；checker 发现文章级表须提示合并）。新增 **P46**（warning）：检查时发现 <包上级>/pipeline/glossary.json 即提示「合并进 kit/blog-submission-kit/glossary.json 后删除该文件」——只认文件存在不挑内容（空骨架/坏 JSON 同样提示）；**共享表加载全部四段**（terms/banned/excerpt/title，此前 banned/excerpt/title 只认文章自带表）：跨篇词形冲突改用条款级 `"articles": ["<slug>"…]` 域限定解决（缺省=全文章生效），S08/S09/S11/P43 四个消费点统一走 `_term_in_scope`。**F1/F2/F3 三张文章表全部删除**：F1 的 20 条 terms 与底表逐字相同（历史重复，不重复收录）；F2 terms 5 条（签字人=责任方、bn 合规词形、hy 推广词、六语 S1 实体词、uk 股权税制）+ banned 12 条 + excerpt 3 条 + title 3 条并入（全部带 articles 域钉在 F2）；F3 terms 5 条（whey 十语、容器量词、hi 保税、ms 增值税、hu/sw 条件方向）+ banned 20 条并入（钉在 F3）。共享表终值 **terms 69 / banned 32 / excerpt 4 / title 3**。连带修复：**P31 提示表 hi bonded 两处 सीमाशुल्क→बॉन्डेड**（U6 交叉臂抓出的自相矛盾——提示表教人写自己刚禁的词形，与 F2 r5 同类；hi 的两种 bonded 词形在 F1/P0/F2 与 F3 并存是合法现状，禁令只域定在 F3，改的是提示不是文章）；F1 build_package 从「文件加载否则 None」改 `_auto_glossaries`（库模式 glossary=None 不自动加载，删表即断供）；九份负向测试去 `--glossary=` 直连已删文件、注入臂改最小注入（整份复制共享表进文章级槽会让 F2 条目因 zh 锚点缺失记 53 条配置错——注入文件只放被测条款，其余全靠共享表）。验证：F1 三份＋F2 六份＋F3 五份负向测试全 PASS（F3 p41_p44 的 U5/U6/U7 SKIP 前提被合并消费，换值域真跑）；规则号两把尺 119→120（P46 在册、P37 仍空置）；四包官方检查 0 error，警告 P0 49/F1 45/F2 58/F3 63（F1/F2 各减一条=撤掉的 P46）；P46 对 P0/F3 正确沉默（无文件）。kit zip 重打 58 文件 md5 9a42dfe24f1eacea823a9213c6339503；kit v1.44 |
| v1.45 | 2026-10-26 | **域摘除：全部术语对全部文章统一检查**（用户指令：不要分文章，所有收集到的专业术语对所有的文章都要检查，不需要盯住各自的专业文章；跨篇真冲突按裁定修文章，不许重新加域）。v1.44 的条款级 `"articles"` 域整层删除：`_term_in_scope` 与 S08/S09/S11/P43 四消费点的域判断全部移除，共享表 49 个 `"articles": […]` 字段剥离，每条 terms/banned/excerpt/title 条款对四篇文章一律生效。分篇改由内容锚承担：S08 仍按 zh 母版块内锚激活（`_shared` 例外静默）；S09/S11 补条款级 `"zh"` 锚——该篇自己的 zh 摘要/标题不含锚则静默跳过（P0 zh 摘要无「保税项目」字面量 ⇒ 摘要/标题契约对 P0 静默），防 F2/F3 审计契约错配到 P0/F1。同批裁定修复 60 份 mdx 143 处替换（修复脚本两段式：先全量模拟、逐条 expected 计数断言，零错才落盘；forbid 只圈裁定面）：hi bonded 音译整篇兜底（F1 九处例外形、F2 复合形先拆）、whey 十语词形（hr 补属格 prašak proteina sirutke）、bn 合规词形、hy S7 推广＋保税项目层（F1）、主体术语（ta/si 疾病诊断→分析、sw/uk/hr/sl/sr 实体族、vi 7 处＋大写 1 处）、容器量词（th/sl/id/sq）、ms GST、sq me shumicë 八处、be/bg/uk 电商、ka、ur/ru blue hat、pt connosco→conosco；F1 摘要 21 语补 bonded 层词形（15 语连带裁剪 ≤185）。glossary 升 1.45：signer-is-responsible-party require 扩 any-of 11 语实测词形（bn/cs/en/fi/hi/ms/pl/ro/si/sw/uk，F1 块31 逐语验证）、hy 推广条款 zh 锚收紧为「S7 推广」（F2 母版无此字面量 ⇒ 条款对 F2 静默）、excerpt/title bonded 条款 hi/es/th require 词形校正。负向电池：F2/F3 p41_p44 的 U5 改全量共享表判定（无域短路，32 条 banned 对每篇生效）、F2 P8 臂转显式归因 SKIP（zh 锚收紧后条款不激活；S08 变异由 s08_count/s08_scope_all 承担）。验证：四包官方检查 0 error，警告 P0 49/F1 45/F2 58/F3 63 持平；规则号两把尺 120=120（P37 仍空置）；全量门禁 40 格全绿；kit zip 重打 58 文件 md5 e5a3647a56e94acc43705498fce68626；kit v1.45 |
| v1.46 | 2026-10-26 | **F3 r6/r6b 审计缺陷固化：词表增量，规则号不变**（用户指令：发现的问题也优化到检查脚本和对应的术语表）。二轮语义审计（47 语专业/语法/主宾位）的缺陷类逐条落成 S08/P43 条款，不新增规则号：新增术语 8 条——wholly-foreign-ownership（es/ru/ar 独资悬空形，F3 与 P0 同锚）、decree-443-instrument（sw/ms/af/fr/it/pt/es 号令写成体系/条款）、order-280-instrument（sw/ms 280 号令写成条款）、bluehat-function-claim（id/ms/vi 功能声称并入健康声称）、filing-not-registration-f3（id/ms/ko/si 备案≠注册/申报，仅激活于 F3 母版）、quota-drawdown-f3（sw/el 额度逐单核扣）、tariff-code-sw-f3（sw 税号，仅激活于 F3 母版）、tax-rate-applies-fi（fi 税率只对清单内，P0 同形）；扩写 precondition-direction：zh 锚缩短为「三条有一条不成立」、scope=all 让 F3 两块同判并激活 F2 第137块同句，th/ta/hu/sw 收任一正确词形。新增禁用译法 24 条（sw/ms 号令当条款、sw 额度当账册、nl douanemode、ko 「건단위로」、ka 增值税、af/be/sk/ar/bg/hy/hr 词形坏形、el 额度扣留、fi 海外货运、id/ms 备案与税额、ru 监管 calque、sq 关税费、si 疾病诊断、hu 条件反转、es 独资省略）。全域生效逼出 P0 同族缺陷 52 处/17 语＋F3 sw 1 处同批修复（两段式：先全量模拟、逐组 expected 计数，零错才落盘）。条款设计实证：P43 裸串「Aste pätee」会子串命中正确形「Veroaste pätee」（casefold 后无词界），故 fi 改走术语 require/forbid 而非禁用译法；U6 一致性检查当场抓出 P31 提示表仍推荐 nl「douanemode 1210」，同批改为「douanemodus 1210」——新增禁用词必须回扫推荐面。验证：四包官方检查 0 error（警告 49/45/58/63 持平）；v1.46 负向电池 28 术语臂（含 precondition 第二块）＋24 条禁用译法按语种注入全 PASS（每条须以自身 id 出现在 error 行）；规则 120=120（P37 空置）；全量门禁全绿；kit zip 重打 58 文件（md5 记于仓库交付记录）；重打 P0 r5-20261026（0 error/49，md5 f7319bdc91ef0b4b1156a97f920620a9）与 F3 r2-20261026（0 error/63，md5 61e09baa914f50c3a7bf65444b9eae56），A/B/C 三重校验 PASS。 |
| v1.47 | 2026-10-26 | **R07 页码形状收窄 ＋ F4 语义审计缺陷固化：词表增量 77→99 terms / 56→58 banned，规则号不变（仍 120）**。①R07 收窄（不是放宽）：F4 中文母版「4 个 P0 前提」沿用 deck 原文 "P0 prerequisites"，R07 的 `p\d{1,3}` 把整词 P0 读成页码引用、48 语全 error——P0 是优先级档位名（本系列首篇代号即 P0），页码从 1 起第 0 页本不成立。修法＝只放行命中串整词等于 p0 一种形状，search→finditer 跳过放行命中继续找下一处（同句 "P0 … p15" 仍出声），四个面共用 `_origin_page_hit` 一处改全体生效；P01/p007/p15/page 12/Slide 7/第 3 页/スライド/슬라이드 照旧判红。电池 negative_test_r07_p0.py：U1 九个页码形状逐个命中、U2 六个档位形状逐个放行、U3 P01 自证豁免没写宽＋包级三臂（P0 基线 0 红、P1 en 追加 p15 只多 en、P2 zh 追加 P01 只多 zh，48 语装配后全过）。②F4 全量语义审计（8 批 46 语，主宾位/义务方/条件方向/专业准确性）缺陷类固化：F4 自审 r1 13 条 terms（returns-clock/returns-window ja返品·ko수리일、vat-on-amount ar、prereq-es、p0-list-acquisition ko、online-bonded-goods pl/nl/ms/sw、sw-data-threshold-direction、s5-clearance he/fa/hy/sw/si/ta、dutiable-value he/hi、bonded-logistics-center hy、fx-conversion ms、return-45-arrival ur、shelf-life fa）＋2 条 banned（ja/ko calque 非词）；批次 G 7 条（ne 先发优势颠倒 P0、ta 保税落地写成向中国出口 P0、th 否定词错位、si 时钟≠频道、si 会员运营≠导航、si 审计≠study、ta 三单第三单）＋2 更新；批次 B/D/E 3 条（sv 退出点≠出发点 P1、general-trade pt/sv/hu 一般贸易制度语、tr-fund-settlement S6 资金结算≠对账 P1）＋4 更新（p0-list-acquisition +pt、bonded-logistics-center +el/az、returns 两行 +hu 放行≠签发）。③同锚点改判：初拟 writeoff 新行与 b24 credit-note-flow 同锚（开票流记发票和冲红）口径冲突——撤新行，credit-note-flow 的 ru/be require 由贷记凭证族改判 сторно/старно-карэктывы 并禁旧形（кредитные авизо＝银行贷记通知单≠红字冲销），uk 本就是 сторно 族内对齐；全域生效当场逼出 F1 ru/be 账务流块同族错形，同批直修。④同批修文：F4 17 语重装配（pt/ru/uk/be/bg/sr/sv/da/no/fi/hu/el/ca/sq/tr/az/ka，19 文件替换全部过 expected 计数门）、P0 pt/tr/si/ta/fa/he/hy/sw、F1 be/fa/ru、F2 si/ta（22 文件）。验证：官方链 P0/F1/F2/F3 PASS 0 error（警告 49/45/58/63 持平）；F4 未打包 M01 属 #73/#74、th ประกาศ ×2 为 ticket_list 挂起项（v1.48-C 解决）；负向电池 35 条回注臂全 PASS（每臂只打目标语向）；v1.47 全量门禁 43 格全绿；规则 120=120（P37 空置）；kit zip 重打 58 文件 md5 3f4bbe75928dff44afc40a3c2369b0b2，A/B/C 三重校验 PASS。 |
| v1.48 | 2026-10-27 | **F4 装配前口径修正：三处判据基准侧与目标侧对称化，规则号不变（仍 120）**。①P19 基准侧先折千分位（`_fold_thousands`）：母版 18,000/129,600/1,638 被切成 129 与 600/638，47 语各判缺两段（目标侧变体早折、基准侧没折）。整组匹配首段 1–3 位＋一组以上**同种**分隔符：`1,234,567` 一次折完，`1,234.567` 只折千位段、小数语义保留。②P36 认空格分组（`100 000` ≡ `100.000` ≡ `100,000`）与母版「N 万」的两种数字面（整值 N×10^4 / 千位读法 N×10^3；ko 10만 的 만 与汉字万同义）：`_wan_face_groups` 让缺号按组放行、多出仍出声；母版块无标识数字时整块跳过不变。③S08 新增可选 `forbid_licensed_by`（见规则表 S08 行）：th 的 ประกาศ 在母版同块有「公告」时按来源词出现数封顶放行，n=0 与旧行为逐字一致。术语表新增两条 F4 备案条款（filing-not-registration-f4-s3 21 语 / -flow 19 语，40 行逐语核过；-flow 锚点取 F4 独有句「七条流是同一套账的七个面」——同一句「合规流记申报、备案与检查点」也出现在 F1 第25块，F1 全篇仍按旧口径用注册族词形，跨篇备案统一属待裁定项，届时另立 F1 条款）。验证：negative_test_v148_caliber.py 11 臂（A2/B2/C1 现状绿、A3/B3 反证复红、B4 正对照、C2 越界/C3 无授权）＋negative_test_f4_filing_terms.py 22 语逐语回退臂全 PASS；五包回归 P0/F1/F2/F3 0 error（警告 49/45/58/63 持平）、F4 1 error（M01 缺 submission.json，属 #73/#74）/62 warning——比修正前少 92 条，逐条对账均为旧口径假红（P19 全为 ['129','600','638'] 三段、P36 全为「多出 000/100」）；v1.48 全量门禁全绿（reg_F4 带期望：只许 M01）；规则号两把尺 120=120（P37 空置）；④样例包自检对齐：`sample/` 三处与术语表冲突就地修正（hy 摘要 ASCII 句点→`։`、he/sw 第1块「清关」补 `שחרור ממכס` 与 `uondoshaji wa forodha`），README §2 承诺的 PASS（0 error, 1 warning）实测复现（v1.47 包同一样例为 5 error，样例滞后于术语表的存量缺陷）；kit zip 重打 58 文件（顶层无前缀，布局回到 v1.43–v1.46 约定；v1.47 误带 blog-submission-kit/ 前缀；md5 记于 系列文章方案.md 的 v1.48 进度块）。 |
| v1.49 | 2026-10-27 | **R06 补 48 语承诺句形，规则号不变（仍 120）**。R06 原只认英文承诺词（guarantee / we arrange shipping / within 24 hours），非英文语向一条都不判；裸词干普查在已入库语料取到 14 处合法用法（F1 五处「平台保证金」deposit 义、F4 九处母版引用「保证/garantido」词本身）⇒ 口径收为**第一人称/本方案 + 保证·承诺动词**的句形：`PROMISE_BY_LANG` 逐语一条、键集合 == `LOCALES`（48 语）。旧英文 `PROMISE_RES` 原样保留、先判，窄臂只在旧表未命中时补判（英文行为逐字不变）；红面带命中原文（`%r`，fa 的 ZWNJ 显示成 `\u200c`）。规则表 R06 行同批更新（见 §5）。验证：`negative_test_r06_promise.py` A 表↔语向 48 且 48 臂夹具全命中、B F4/F1 基线 0 条、C 48 语逐语注入各恰 1 条且只挂本语、D 12 条真实合法裸词干全部放行、E 语向数棘轮；五包回归 0 error（警告 49/45/58/61/62 持平）、五篇 zh 母版 0 命中；v1.49 全量门禁 48 格全绿；kit zip 重打 58 文件（md5 6ee9ed5c2fe1ed7e1cf42c9e370428e1）。 |
| v1.50 | 2026-10-27 | **F4 备案/申报分家：23 语 88 处落盘，两条 S08 备案条款扩语 21→44 / 19→42，规则号不变（仍 120）**。业主裁定「备案留 F3 底形、申报换词」：同一块里「备案」与「申报」撞成同一个词时，备案保持 F3 已裁定的底形（记录/告知的轻程序，不是注册），申报改用第二词。落盘 88 处按块：b17「S3 商品备案」21（de/vi 原就正确，未改）、b18 合规流「申报、备案与检查点」38、b16 四个 P0 前提的「年度规模不足 10 万人不触发申报」21、b11/b23「申报清单」4（de Deklarationsliste / nl verklaringslijst / pl listy deklaracji / az təqdim siyahısı；cs/sk/hu/ko/vi 的既有固定复合形保留）。两条条款各 +23 语：filing-not-registration-f4-s3 21→44、-flow 19→42；require=F3 底形、forbid=被替换掉的注册族旧形（de/vi 的 b17 原就正确，forbid 收注册族回归形作棘轮）。**射程写明**：-flow 判的是备案侧，申报侧第二词逐语记在 note 词对里、未单列 require——某语把申报又写回备案底形时本条款不判，需人工复核。bn 的申报词 ঘোষণা 与本块「486 নং ঘোষণা」（公告）同形：F3 全篇公告亦作 ঘোষণা，跨篇改词无本语复核，保留并在工单标撞形豁免。验证：negative_test_f4_filing_terms.py PASS（44+42 语逐语回注旧形，每条恰「缺失+反向」2 条且只挂本语；A 表↔盘逐语逐形、B 基线 0 条、D 语种数棘轮 44/42）；F4 回归 0 error / 62 warning；F4 r1 包与 kit zip 重打（md5 记于 系列文章方案.md 的 v1.50 进度块）。 |
| v1.51 | 2026-10-27 | **g82 五语 bonded 收口 + nl douanemagazijn 全篇禁旧词：跨文章 22+18 处落盘，术语表六处增量，规则号不变（仍 120）**。业主裁定「fi/nl/no/sv/da 正文里的英文 bonded 换成各自保税仓/海关仓词（含 1210 渠道名）；综合保税区逐语定名后写入术语表」。落盘：P0 title/excerpt 十处改 1210 渠道名（da toldlagerkanalen 1210 / fi 1210-tullivarastokanavan / nl douanemodus 1210 + douane-e-handel / no tollagerkanalen 1210 / sv tullagerkanalen 1210；fi 因 F03/F07 长度上限统一为复合形）；F3 b87 no/sv/da 三处 bonded→tollager/tullager/toldlager；nl douanemagazijn 18 处改 douanelager（P0 6 / F2 5 / F4 7；F1/F3 本就用 douanelager）。术语表六处：blue-hat-registration 补五语 forbid（nl 另禁 douanemagazijn 作回归棘轮）；新条款 comprehensive-bonded-zone（F2+F3 综保区五语定名，与各语海关特殊监管区域译形刻意区分；其余 43 语未定名、不在射程，note 写明）；online-bonded-goods-only 的 nl 词对收口 douanelager；新增 banned nl-douanemagazijn-banned（全篇禁旧词，slug 与图片路径不在射程）；S11/S09 各增五语 1210 渠道名条目。terms 101→102、banned 58→59、title 3→4、excerpt 4→5。电池 `posts/F3-*/pipeline/negative_test_g82_bonded_zone.py` 21 臂：五语综保区回注（nl forbid 是 require 超集、缺失半发不出，期望 1）、blue-hat 五语回注、P0 title/excerpt 回注、P0 nl 正文 douanemagazijn 回注（S08+P43 双红）。回归：P0 r6 / F2 r7 / F3 r4 / F4 r2 重打包 0 error（警告 49/58/58/62；F3 61→58 是 no/sv/da 的 P31 bonded 残留提示随修复消失，逐条归因非连带）；F4 备案电池复跑 PASS（nl 改动无回归）。 |
| v1.52 | 2026-10-27 | **r79 第三轮数字/文号对账回填：新增 P47 + P36 多出侧分级，规则 120 → 121（P37 仍空置）**。F3/F4 全 48 语逐块数字对账（双向：译文多出 + 近形错写；口径＝千分位/小数逗号统一、URL 剥离、空格分组、「N 万」同义面、母版汉字数词授权面），结论 E=0/N=0，唯一真缺陷＝**F4 ta「8 位」描述位整段丢失**（எண்படி 无义音译；8 是一位数字，P36 只收 ≥3 位、P19 只收 ≥10，两族都看不见）→ 已修 எட்டு இலக்க。文号对账另行全绿：W2020-29 连字符、六/八部门数词、486/194/443/280/7 号、2016-18 与 2018-49 财关税对、2020-45、280 号令↔2026-06-01 均逐语在位。①**P47 描述位数字**（error，见规则表）：母版块内「N 位」的 N 须在各语同一块以数字/词干/数词在场；词干表 47 语按 144 个锚块（P0 b18 / F3 b9 / F4 b6+b22 × 48 语）实测收集，ro 走双边界词表（右开词干会误吃 optimizarea）、th/ja 无空格文字免左边界；验收 188 锚块 bad=0，ta 整段丢失与 de achtstellige→siebenstellige 变异均点火；粗粒度契约——块内已有别的同数值词（「八部门」的 acht/eight）时不追单点错写。②**P36 extra 近形分级**（warning→error）：extra 与块内任一母版数字等长恰差一位（1476↔1477）或长度差一且互为前/后缀（100000↔10000、0404.9000↔0404.9900）→ 升 error；抓「同块两处同数改一漏一」——漏改处不缺号时近形 extra 是唯一信号。五篇干净态 extras=0、近形=0，升级不碰现状（警告基线 49/45/58/58/62 持平）。附带：NUMBER_WORDS ur 8「آٹ」补足为「آٹھ」（截形从未命中过，纯词表勘误）。电池 `posts/F4-*/pipeline/negative_test_v152_num_blindspot.py` 五臂：ta 实缺陷回归、de 复合词错数、en 量词位 5→6、ta 混合漏改（P36 近形单独点火）、ta 全量替换（P04 一条 + P36 六条）；五包基线 0 error。 |
| v1.53 | 2026-10-28 | **P36「N 万」收数假阳性修复（规则数不变，仍 121）**。M1 写作首跑实测：`0.43 万亿` 的 43 被读成「43 万」，母版凭空多出 430000/430；`0.6 万亿` 多出 60000/60；`3,600 万元` 多出 600/6000000。译文写「0.43 trillion」永远判缺 ⇒ 47 语全红，是口径不对称而非译文缺陷。修法：`_WAN_RE` 左界由 `(?<!\d)` 收紧为 `(?<![\d.,])`，N 必须是独立整数；独立整数的「10 万」仍授权 {100000, 100}（ko 10만 명 一致）。电池 `posts/M1-*/pipeline/negative_test_v153_decimal_wan.py`：单元臂（小数万亿无万组、0.6 万亿、3,600 万元、整数 10 万、韩文 만）＋端到端臂（F4 副本 48 语注入「0.43 万亿元」→ 0 error；整数万只把 en「100,000」改写「100 thousand」→ 0 error）。五包回归 0 error，警告基线 49/45/58/58/62 持平。 |
| v1.56 | 2026-10-28 | **P51 判据对称化 ＋ 存量清零 ＋ warning → error，规则数不变（仍 127，P37 仍空置）**。①**判据修正（不是放宽）**：后缀形带右侧 `(?!\s*[\d])` 而前缀形没有左界，两侧口径不对称——az「13% vurulmuş 70% 9,1%-ə」里的「70%」被右界挡掉不算后缀，同一个 `%` 又因后接「 9,1」被算成「% 9,1」前缀，**全篇零前缀形**的阿塞拜疆语因此被判「前缀型与后缀型并存」。这与 v1.53 的「N 万」是同一类病：口径不对称产生的假阳性，不是稿件缺陷。现按位置判定——`%` 贴数字＝后缀，`%` 前不贴数字＝前缀。②**存量收口**：F3 cs 五处紧形「9,1%／13% × 70% = 9,1%」改捷克正字法的疏形「9,1 %」，与本系列 M1 cs 的 16 处疏形统一；F3 重打包 r5（52 文件 620.8 KB）。P0 az 那处经①证实是误报，**不改稿**——为假阳性改正确稿件是反向修。③**P51 升 error**：v1.55 写明的前置条件（清存量＋重打两包）达成，六包读数 0 后升档。④**电池 37 → 39 臂全 PASS**（`posts/M1-*/pipeline/negative_test_v155_semantic_audit.py`）：新增 C3 沉默臂（注入「50% 50%」同型形状要求 P51 零条，并用被修掉的两条旧前缀正则自证确实命中过 1 处——否则臂可能因别的原因空过）＋ C4 反证臂（az 造一处真疏紧混用必须恰出 1 条 error，证明对称化没把检测关掉）；D 层把 P51 从「提示存量」改成硬判据（任何一篇出现即 FAIL）；顺手修掉 C2 臂读 `f["slug"]` 的隐性 KeyError——包模式 JSON 的键是 `article`，此前 P50 干净态下该表达式从不求值，所以一直没炸。⑤**验证**：六包官方全检 0 error、警告 P0 49 / F1 45 / F2 58 / F3 58 / F4 62 / M1 30（P0 与 F3 各 −1＝P51 存量出清），`sample` 0 error / 1 warning 持平；规则两把尺 127=127；kit zip 重打 58 文件（md5 记于 `系列文章方案.md` 的 v1.56 进度块）。 |
| v1.57 | 2026-10-28 | **跨篇统一改稿 ＋ 新增 P54 丹/挪文号引用介词，规则 127 → 128（P37 仍空置）**。回答的是「为什么跨篇差异无法全局禁」：`fra` 形在改稿前的别篇是自洽写法，先立规就是把正确稿件判红（P53 撤掉全局 banned `pt-connosco` 的同一教训）。本轮按**先改稿、后立规**收口。①**改稿 86 处**（`tmp/v157_unify_da_no_it_ta.py`，两阶段：逐包逐语 expected 计数 → 全部替换后自查「残留带 fra 的文号引用 0／`fra 20YY fra` 0／em dash 0」，零错才 `--apply`）：da/no 的文号年份介词六包统一 `af`（丹）／`av`（挪）、`fra` 只留给颁发机关（da 37／no 28，顺带消掉 43 处一句两个 fra）；it 引用海关总署的机构名 9 处统一 `Amministrazione Generale delle Dogane`；ta 12 处统一 `சுங்க நிர்வாக(த்தின்)`，M1 的逐字硬译形 `சுங்கியாய்வுத் தலைமை இயக்ககம்` 退役。**定稿形全部取语料里的既证正确写法**（no 的 F1/F2 与 M1 题录本来就是 av/af 形、F1 ta 正文已是 `சுங்க நிர்வாகம்`、M1 it 已是全称形），不是本轮新发明。M1 走 `tmp/m1_tr/<lg>.txt` bundle→装配（bundle 是稿件来源，直接改 mdx 会被下次装配静默回退），另五篇的 bundle 早已不是来源（见 v1.56 漂移台账），直接改成稿 mdx。六包 ROUND 推进：P0 r7／F1 r5／F2 r8／F3 r6／F4 r4／M1 r2。②**新增 P54**（error）两臂：`P54_CIT_RES`（文号词＋`nr.`＋编号＋`fra 20YY`）与 `P54_DOUBLE_RE`（`nr.`＋编号起、同行 40 字内的 `fra 20YY fra`），射程＝正文＋摘要＋标题＋**题录标题**（旧形正是在 `references` 里成片的）。**双写臂为什么锚在 `nr.` 而不是文号词形**：散文 `rapporten fra 2018 fra seks ministerier`（2018 年出自六个部门的报告）两个 fra 都合法，无界判据会误红；锚在 `nr.` 既缩掉射程，又兜住词表外的文号名（`lov`／`forordning`／未收复合形）。`P54_DOC` 变体口径与 fra 无关：ø 可写 o、æ 可写 ae——电池首跑实测漏收 `cirkulaere`/`sirkulaere`（A 层当场 rc=1 出声），补齐后 10 形全在射程内；判据是介词写错，文号词怎么拼不该决定它能否被看见。③**banned 282 → 284**：`v157-it-gacc-name`（`la Dogana di Cina`／`Amministrazione generale della dogana`）＋`v157-ta-gacc-name`（硬译机构名＋`சுங்கத்தின் 2018`／`சுங்கத்தின் 2020`）。**ta 只禁「属格＋年份」的引用形，通用属格 `சுங்கத்தின்` 整词不禁**——禁词根会把别篇正确属格判红，同 P53 那一类错。登记前逐条回扫六包 60 个 it/ta 成稿文件：旧形命中必须为 0、定稿形必须在位，缺一不入表（`tmp/v157_banned_glossary.py` 写成断言，不靠人工核对）。④**棘轮被推一格**：`posts/F4-*/pipeline/negative_test_audit_terms_r1.py` G1 钉的表规模 123/282 → **123/284**，并写明增量归属（两条 banned 由 M1 v157 电池自证，F4 只守规模不认领所有权）。⑤**电池** `posts/M1-*/pipeline/negative_test_v157_unify.py` **17 臂全 PASS**：A 判据 5 臂（文号词表 10 形、每语正确介词表未被改动、两臂各自点火、双写臂越界反证、两条 banned 在册且词形数对）＋ B 干净态（M1 全包 0 error／P54 0 条／新 banned 0 条——题录里 `af 2018 fra seks ministerier` 这种一墙之隔的合法 fra 未被越界判红）＋ C 注入 6 臂（C1 da 正文文号臂且**不含**双写读数、C2 no 正文臂并核对提示语是本语 `av`、C3 只改题录标题证明射程到位且文号＋双写同时读数、C4 it 旧机构名、C5 ta 硬译机构名、C6 ta 属格不带年份必须沉默）＋ D 五篇跨篇（0 条 P54／0 条新 banned／0 error）。⑥**验证**：六包官方全检 0 error、警告 P0 49 / F1 45 / F2 58 / F3 58 / F4 62 / M1 30 **全部持平**（改的是介词与机构名，不动长度、体例与结构读数——持平本身就是「改稿没碰坏别的东西」的证据），`sample` 0 error / 1 warning；规则两把尺 `tmp/v157_rulecount.py` 128=128；M1 final acceptance PASS，47 份译文重导与包内正文逐字节一致；bundle↔成稿漂移台账 M1 仍 LIVE／0 漂移。 |
| v1.58 | 2026-10-29 | **五篇 warning 全量收口 ＋ P10 升 error ＋ 四处判据射程修正，规则数不变（仍 128，P37 仍空置）**。①**P10 存量 126 处归零**（新切词器在 v1.57 发货面的读数：P0 29／F1 9／F2 10／F3 39／F4 33／M1 6）；同一面交给 v1.57 判据报 67 处，三方对账闭合＝交集 57（真缺陷，逐条改写）＋仅新 69（旧判据盲区，第二批落盘）＋仅旧 10（旧判据假阳性，修判据不改稿）；改稿手法是换成该语本有的「逐一／各自」形，不删字。②**「词」的定义改按 Unicode 类别切词**——`` 在母音记号处断开的假阳性与 `\w{2,}` 进不去的盲区同源于口径不一致，一次改平；`REPEAT_LEXEME_NEXT` 的续词改按原文取下一个空白词（`दो` 这类 core=1 的数词在词表里取不到，放行此前永不生效）。③**ST08 射程收窄**：句首限制表 `AI_PHRASES_OPENERS`（id/ms/cs/ne 四词形逐条登记）＋整串被引号包住算提及不算使用＋撤 hy `ամփոփում`／ne `निश्चित हुन्छ`；**级别仍 warning**（是否套话要人工裁量，升 error 等于把「交人工」这一层判成缺陷）。④**P08** 放行「全大写代号＋本地词尾／前附」（`SKUها`／`Cով`／`وS3؛`），小写词根 `marketها`／`compliance-ով` 照旧报。⑤**P10 warning → error**，走 P51（v1.56）同一条路径：存量清零→判据两头修平→读数 0 才升档。M1 的 ar 4／bn 2 走 bundle 重装配＋47 语重导；六包 ROUND P0 r8／F1 r6／F2 r10／F3 r8／F4 r6／M1 r3。⑥**发货模板自证**：升 error 当天 `sample/` 的僧伽罗语 CTA「එක් එක් අයිතමයට」被判红，按同一条手法改「සෑම අයිතමයටම」后回到 0 error／1 warning——sample 是别人照着抄的对象，模板过不了自己的检查，交付出去的就是缺陷 |
| v1.55 | 2026-10-28 | **M1 四十七语人工审校收官：余 14 语通读完毕、三档缺陷全修、新增 P50–P53 四条同篇一致性规则，规则 123 → 127（P37 仍空置）**。①**四条新规则**都是「一种语言自己前后矛盾」型，不与母版比对：**P50** CTA 末行终止标点（error，实抓 he/fa/af/ca/sw/bn/ta/vi/nl/tr/it/ur 十二语，th 整语向豁免——泰文无句点惯例）、**P51** 百分号体例同篇混用（warning，sv/cs/el/ro 列表 `21.4%`×正文 `20 %`、ka 反向；存量 P0 az 与 F3 cs 各一处，故不升 error）、**P52** 拉丁语向英文残词（error/warning 两级，de/da 的 `compliant` 实抓；`compliance/timing/traffic/launch/sku/quota` 等已在该语自然化的借词不入表——六篇存量命中即证明是既定用法）、**P53** 葡语变体同篇混用（error，成对判据取代 v1.45 的全局 banned `pt-connosco`：M1 pt 整篇欧葡一致却被判 error，**禁掉正确词形不是规则**）。②**术语表 terms 102 → 123、banned 59 → 282**：十七类语义契约按母版块展开成 21 条（图指代/清退份额归属/窗口时限/三单处理/口服美容正名/备注词形/流量词形/节奏转化/来源非供应商/自建需求/试点铺满/综保区/效果投放/内容口径/直连消费者/插图计数/驱动面指向）＋ 224 条本轮实测错形——错形表由 `fix_audit_20261028〔f/g/h〕.py` 的 (旧→新) 对**自动导出**，逐条回扫 M1 全文与另四篇，19 条因跨篇合法同形或「新串含旧串」弃用（如 ro `Sunt atât cumpărătorii principali` 被扩写成 `Aceștia sunt atât…`，直接禁会判红自己的定稿）。③**两条教训**：(a) 锚点必须扩到本篇独有——共享表全域生效，`先看图`/`备注` 同样落在 F3/F4 母版里，用 M1 收的词形（`die Abbildungen`/`anteckning`）判别篇的同义异形（af `prent`、de `Abbildung`、bg `бележки`）当场误红 26 条；生成器改为把锚点向后扩到「只在 M1 出现」的最短形状，正契约保住、别篇沉默。(b) **扩锚点必须逐块做**——整篇只扩首次出现处会让同一概念的其余块静默失守（「流量」四块、「备注」两块第一版只钉住一块）；生成器改为**按母版块逐个展开成独立条款**（十七类 → 21 条），require 词形逐块回验，块与块之间互不遮盖。④**译文修复**：批 F 29 语 217 处、批 G hy 2 处、批 H 14 语 80 处，加收官自查抓回的五处（af `begin begin` 触发 P10 回归 → `neem by hulle 'n aanvang`、ca 第 14 块 W02 压缩时把 `per si mateix` 回退成 `un mateix`（重新落地并把 `no pas`→`no` 换回块长预算）、ka 列表 `17.6%` 与本语 `20 %` 体例冲突、ur 末行缺 `۔`、be/fi 的「备注」第二处仍用旧词形）——**逐条对账「每一处修复是否真的落盘」的脚本化审计**（`old` 串在现行 bundle 里计数应为 0）是本轮唯一抓到回归的手段。⑤电池 `posts/M1-*/pipeline/negative_test_v155_semantic_audit.py` **32 臂全 PASS**：A 词表覆盖七臂（豁免集 {th}、P52 不含 en/zh、与既定借词零交集、P53 七对形状、17 类→21 条契约在册、224 条错形入库、`pt-connosco` 已撤）＋ B 干净态五臂（M1 四条新规则 0 条、全包 0 error）＋ C 注入十四臂（P50 去句号、P51 去空格、P52 hard/soft、P53 混变体、S08 七类回退旧形各 1–2 条＝require 缺失＋forbid 反向，含 `remark-annotation-b24/-b29` 与 `traffic-visits-b26` 三条**逐块臂**、P43 af 荷兰语形与 hr `onlina`）＋ C2 th 豁免反证 ＋ D 五篇跨篇（0 条新规则误红、各包 0 error）。⑥**新规则先打在自家模板上**：P50 落地面第一响是工具包 `sample/`——47 语向 CTA 末行全部缺终止标点（th 除外），逐向按本语终止符补齐（`.`／zh・ja `。`／hi・ne・bn `।`／ur `۔`／hy `։`），补齐后 README §2 承诺的 `PASS（0 error, 1 warning）` 实测复现；规则若连发货模板都判红，说明模板在教人写错。⑦**棘轮被推一格**：`posts/F4-*/pipeline/negative_test_audit_terms_r1.py` 的 G1 臂钉的是「表规模 102/59」（v1.51 终值），本轮 123/282 让它当场 rc=1——这正是设计用途（无声增量必须出声）；棘轮推进到 123/282 并写明增量归属（17 类→21 条契约 notes 前缀＋224 条 `audit-*` 错形由 M1 v155 电池自证，F4 只守规模不认领所有权）。⑧**验证**：M1 重打包 **0 error / 37 warning**，六包回归 0 error、警告 P0 50 / F1 45 / F2 58 / F3 59 / F4 62 / M1 37（P0 与 F3 各 +1＝P51 存量首次可见），规则两把尺 `tmp/v155_rulecount.py` 127=127，M1 final acceptance PASS，47 份译文重导与包内正文逐字节一致。 |
| v1.55 | 2026-10-28 | **M1 warning 收口批（规则表与术语表一字未动，127 条 / terms 123 / banned 282 不变；kit zip 只因本行文档同步重打，checker 与 glossary 字节不动，终值 md5 记在 `系列文章方案.md`）**。上一条 v1.55 行的「M1 0 error / 37 warning」是那一版发货时的读数，本批把其中**可动的 22 条清到零**，剩下的 30 条全是 W02。①**判据不变，改的是稿件**：站方 v1.14 回执口径「相邻重复词一律改写」＋白名单只收词典化重叠副词（逐词组放行、不做整类豁免）——本批**不扩 `REDUPLICATION_OK`**，扩了就等于把「真的写重了」一并放行；改法是把重叠形换成本语同样自然但不相邻重写的形状。②**P10 八语 21 处**（`posts/M1-*/pipeline/fix_audit_20261028i.py`，两阶段：逐条 expected 计数 → 改后按 P10 同口径复查重叠（白名单词组与 de 逗号紧跟的关系代词＋冠词同形一律放行，与检查器同构，否则脚本会自己咬自己）→ 摘要 ≤185 → em dash 自查，零错才 `--apply`）：de `nehmen Sie sie`→`nehmen Sie die Zahlen`（尊格 Sie 与宾格 sie 同形，语法成立也改写）、hi/bn 连字符分写 `एक-एक`／`এক-এক`（站方给 hi 的改法本就是连字符形）、ne `फरक फरक`→`आपसमा फरक`、tr `satır satır`／`kalem kalem`→已放行的 `tek tek`、`kod kod`→`her kodu ayrı ayrı`、sw 逐项改介词型 `kipengele kwa kipengele`、同一／同样改合写 `ileile`／`kileile`（`hizo hizo` 不成形同批并掉）、ur 五处换 `ہر ایک … الگ`／`تفصیل سے`／`آپس میں بہت قریب`／`ایک کے بعد ایک`。③**ST08 id 一处**：套话开头 `Kesimpulannya`→`Saya beri jawabannya`（同块前文已用 jawabannya）。④**为什么不动 banned/S08**：这批旧串是可读的合法重叠形，不是错译，登记成禁用会误伤别篇的分写作——P10 本身已让这类形状出声，重复覆盖只会把正确稿件判红。⑤**棘轮**：`negative_test_v155_semantic_audit.py` 32 → **37 臂全 PASS**（B 层新增 P10 归零、ST08 归零、W02 存量 30 持平三臂；C 层新增 de／id 两条回注臂，各恰 1 条——证明检测器仍然点火，只是干净态没东西可点）。⑥**验证**：八语重装配 33/33 块齐；M1 重打包 52 文件 653.8 KB、官方全检 **0 error / 30 warning**；落盘对账 21 条旧串在现行 bundle 计数全为 0、新串全部在场；final acceptance PASS；47 份译文重导与包内正文逐字节一致。 |
| v1.54 | 2026-10-28 | **M1 四十七语人工审校的语义缺陷固化：新增 P48 + P49，规则 121 → 123（P37 仍空置）**。①**P48 长级差单位**（error）：长级差语言里 万亿=10^12，本语 tri- 词形是 10^18；M1 实测 af/it/pt/ro/sq 把 0.36／0.43／0.6 万亿元写成 triljoen／trilioni／trilhão／trilioane／trilionë——数字原样、单位放大一百万倍，P36 只比数字面全程绿灯。词表 21 个长级差语向（短级差的 en/ru/uk/bg/be/tr/el/he/ar/fa/hi/ne/bn/ta/ur/id/ms/sw/ka/hy/az/ja/ko/th/vi 不入表），母版块或摘要含「万亿」才点火。②**P49 清单缩减矛盾**（error）：母版全篇含 1476 时任一译文块命中该语缩减短语即 error；be/bg/ca/cs/de/fa/hr/ko/ro/sr/uk/ur 十二语实抓，「清单收紧」直译形不判。③**破折号纪律复核**（不加规则号）：ru/uk/be 首稿 32 处「X 这/це/гэта Y」漏写正字法要求的系词破折号，而 ST01 禁正文 em dash、B10 禁 —/– 混用（数字区间必须留 –）——补破折号被装配脚本＋ST01＋B10 三重挡回，遂按 ST01  prescribed 手法改写（означает/служит/является/становить/утворюють/з'яўляецца 等动词化，或改冒号），32 处零 em dash。电池 C5 反证「注入 em dash 必被 ST01＋B10 双判」，C6 自证干净态。同批译文修复四批共 **45/47 语向 195 条 / 252 处**（`posts/M1-*/pipeline/fix_audit_20261028.py` 45 语 146 条 201 处、`…20261028b.py` 12 语 13 处、`…20261028c.py` 3 语 4 条 6 处、`…20261028e.py` 3 语 32 处；全部两阶段：先逐条精确计数＋摘要 ≤185 复检＋em dash 自查，零错才写盘）：文号 4「32 项」误作「另 32 项」（12 语）、万亿长级差（5 语）、清单缩减矛盾（12 语）、2018 监管完善误作收紧（no/da）、以《调整表》为准弱化（7 语）、免疫误作疫苗/安全（he/fa/de）、ta 出清＋文号 3 错字、电商口径漏「电商」限定（es/fr/pt/ru/ar）、内容口径误作 register（10 语）、CTA 语序倒装（13 语，bg/hr/sr/uk 改链接前置使 P12 回落）、de 五处语法、sl/hr/sr/hu/az/ka/sk/tr/cs/ro 用词与网购保税口径、摘要只写「关」漏「开」（cs/ro/bg）、hi/ur 摘要语法压回 ≤185（hi 恰 185）、ru 系词组改「и есть та часть, которая…」（不能补破折号）、cs 关系从句逗号、ms 备注改「bahwa … dibenarkan」子句、no/da「gælder/gjelder」后改分号、en「market part」→「market section」。电池 `posts/M1-*/pipeline/negative_test_v154_longscale_shrink.py` **39 臂全 PASS**：30 单元臂（af/it/pt/ro/sq/de 正反例、en 短级差不判、uk/ko/bg/ca/fa/ur/de/be 缩减正反例）＋词表覆盖自证（P48=21 语向、P49=12 语向）＋M1 基线 0 error＋端到端七臂（af 块内 triljoen、pt 摘要 trilhões 各恰 1 条 P48；ko/uk 含 1476 块、de 时间轴块（无 1476）各恰 1 条 P49；ru 注入 em dash → ST01＋B10 双判；ru/uk/be 干净态 0 条）＋F4 跨篇 0 条。验证：M1 重打包 **0 error / 37 warning**（回到首包基线），五包回归 0 error、警告 49/45/58/58/62 持平，规则两把尺 123=123，M1 final acceptance PASS。 |

| v1.41 | 2026-10-25 | **F03 标题分隔符改精确口径**（用户指令：标题被 F03 禁连字符；正确规则应精确排除，不影响其他正确规则）。旧口径一律禁 `: ： - — –`，把词内连字符与标题分隔符当成同一件事——`e-commerce` / `cross-border` 被判红，v1.40 只能把标题写成 `ecommerce` / 本地语词。新口径：冒号只放行数字间（9:1、10:30）；em dash/横线（`—` `―` `－`）任何位置都禁；en/figure dash 与减号只放行数字或编号区间（2–4、2020–2025、S0–S13）；连字符只放行词内形（两侧非空白、不在首尾、不连写），`e-commerce` / `cross-border` / `U.S.-China` 合法；亚美尼亚 `֊`、希伯来 `־` 等文字系统自带连字符不碰。无空格 `Title-Subtitle` 与词内同形，按词内放行（分句用逗号/句号）。同批恢复被旧口径逼改的标题：P0 en/tr、F1 en/id/pl/pt（F1 en 同时恢复 v1.40 丢掉的 Cross Border 层，85 字符上限内）；三包 `build_package.py` 与 F2 `assemble_translations.py` 的私有 F03 正则改为调用 `sc.title_shape_errors`，避免两套口径漂移。验证：`posts/P0-.../pipeline/negative_test_f03.py` helper 36 格 + e2e 17 格全 PASS（分隔符 20 形必红；词内/数字区间/文字系统连字符 14 形必绿；F03×P39 交叉 4 格分别验证各出/只剩一条）；三包回归 P0 0/49、F1 0/45、F2 0/58；P0/F1 r3 包重打。规则总数 114 不变 |
| v1.40 | 2026-10-25 | **按最正确写法收口 P39/P40，不再为历史写法留豁免**（用户指令：「不要管历史怎么写，你就按照最正确的来就行」）。① **P39 warning → error**：语言门从 7 语扩到 12 语（加 af/cs/sk/id/pl，五语实测同样误拆）；同批修 P0 9 语 mdx 共 43 处（标题另同步 submission.json 与两处 pipeline 常量）与 F1 12 语标题——标题受 F03 约束不许连字符，统一写 `ecommerce` 或本地语词（P0 en `Bonded Ecommerce`、tr `bonded elektronik ticaretle`），正文/参考/摘要仍用连字符形。② **P40 去掉 hy 的 ASCII `:` 历史豁免**：P0 hy 正文 113 处 ASCII 冒号与摘要末 `:` 同批改为 `։`，与 F1/F2 对齐；th 整语豁免保留（泰文不以句末标点断句）。③ 新仪器暴露的 F1 存量缺陷同批修掉：英文稿 `owner of that package` → `accountable for that package`（R08，en 是唯一真偏移，fr/es 等本就写责任），da `S7 promotion` → `S7 Promovering`（P31）。④ P0 fig-02 眉题 `BONDED E COMMERCE` 改连字符形并重渲染 webp（只动 fig-02，其余图未碰）。验证：`pipeline/negative_test_p39_p40.py` 4 个单元臂（P39 11 形 + P40 11 形）+ 10 个包级臂全 PASS（含 af 新语门 +1、it/pt 连词 0 新增、hy `։→:` 与去 `։` 各只多 hy 一条），读数 `tmp/f2_r4_negtest_p39p40.txt`；三包回归 **P0 0 error / 49 warning**、**F1 0 / 45**、**F2 0 / 58**。投稿包同批重打：P0 `…-r2-20261025.zip`（55 文件，1,419,633 字节）、F1 `…-r2-20261025.zip`（51 文件，667.0 KB）；规则总数 114 不变 |
| v1.39 | 2026-10-25 | **F2 全字段复审回填**（用户指令：逐条人工审查所有字段，能代码化的一律进检查脚本）。新增 **P39**（warning）电商 `e-` 前缀被空格拆开与 **P40**（error）摘要终止标点，规则总数 112 → 114。口径详见第 8 节。F2 r4 同批改稿：47 语标题重写 40 语（统一「14 + 3 步 + 保税项目 + 可验收交付物」四层、≤85 字符、去冒号/连字符）、摘要重写 14 语（补齐保税层与终止标点）、参考文献正字法 16 条规则／37 处（en `cross border`→`cross-border` 4；nl/da/sv 各 4、no 1 的 `e handel`→`e-handel`；tr `e ticarette`→`e-ticarette` 1；de `Einzelimport`→`Einzelhandelsimport` 4；hr/sr 各 4、sl 5 的格位；ro 2 的比较级）、hy 正文 82 处 ASCII `:`→`։`（摘要同步）。术语契约升 1.39：标题交付物词形重收割（仅 cs `přejmutí`→`převzetí` 变），新增标题/摘要两条「保税项目」层（47 语，词形=P31 bonded 形）。验证：`pipeline/negative_test_p39_p40.py` 4 个单元臂（P39 9 形 + P40 11 形）+ 8 个包级臂全 PASS（基线 0 条；en 参考/正文两路各只多 en 一条；it 的连词 `e` 不红；en 摘要去句号只多 en 一条；th 去末字符 0 红；hy `։→:` 0 红、hy 去 `։` 只多 hy 一条），读数 `tmp/f2_r4_negtest_p39p40.txt`。三包回归：F2 **0 error / 58 warning**（P08 3、P10 5、R07 3、W02 47；r3 的 P12 1 条随 hy CTA 冒号改 `։` 消失）、P0 0/59（P39 新增 10 条 warning：da/no/sv/tr 各 2＝元数据+正文，en/nl 各 1）、F1 **1 error / 53 warning**（error 仍是 R08 的英文稿存量缺陷；P39 新增 7 条，每语 1） |
| v1.38 | 2026-10-25 | **R07 补 submission.json 面**（无新规则号，总数仍 112；先例＝v1.36 口径扩容）。给 F2 打 r3 包时才撞见：`build_package.py` 写出的 `submission.json` 里 `imageRights` 逐字相同地写着 "All figures are exports from the author's own SinoTrade proposal deck"——「deck」正是 R07 词表里的制作来源词，P0/F1/F2 三包一起漏且没有任何一条规则出声。根因不是词表缺词，是**射程写在正文/alt/title/excerpt 就把原则的适用范围当成了原则本身**：元数据层同样是发给平台的对外文案。现在逐字段扫 submission.json 的字符串值（title/excerpt/imageRights/author/category/slug/date 一视同仁），命中工具词或页码形状 ⇒ error 并指名「哪个字段·命中什么」。列表值（`locales` 语言码、`images` 文件名）故意不进射程——结构枚举不对外成句，文件名里的 `p15`/`deck` 只会造出假泄漏。同批改稿：三包 `build_package.py` + `submission.json` 六处 `"exports from … proposal deck"` → `"made for this article by the author's team"`，权利三事实（自有图 / 品牌资产归 SinoTrade Compliance / 无第三方素材）一条不减。验证：端到端＝改词前 `tmp/f2_r3_r07meta-*.log` 三包各 1 红（F1 共 2 error＝R07+R08）→ 改词后 `tmp/f2_r3_reg3-*.log` P0 0 error/49 warning、F1 1 error/46 warning（只剩 R08 存量缺陷）、F2 0/59 持平；形状＝`tmp/f2_r3_r07meta_control.py` 5 条对照全 OK（A 现文案 0 红／B「page 15」红／C「第 15 页」红／D 泄漏在 title 而非 imageRights → 红且字段名对／E 只在列表值 0 红且 M08 证明值被读到），每条都带 `reached` 自检——「0 R07」只有在校验器真走到元数据段时才算读数 |
| v1.37 | 2026-10-25 | 新增三条判据（用户指令：修改标准＝以中文母版为准，能模板化／能代码化的一律进检查脚本；来源＝F2《十四个工作包与三步进场》47 语人工逐篇审校）。① **S11** 标题术语契约：glossary 可选 `"title"` 段，对 `frontmatter.title` 判 require/forbid 词形（`*` 兜底），只从文章级表加载——标题此前只受 F03 长度约束，母版第二分句「把保税项目拆成可验收的交付物」在 45 语整层丢失一路绿灯。② **R08** 签字人归属反模式：同句内「签字人主语＋所有权谓语＋包/交付物宾语」⇒ error，只挂 en/zh 两个源头语向（en 是这批偏移的出发语言、zh 是唯一基准），其余语向由文章级 S08 条款（require 责任词形 / forbid 所有权词形）逐语兜住。③ **P38** 孟加拉文裸辅音 + CANDRABINDU(U+0981)：r3 改稿工单把元音符号 U+09C1 批量打成 U+0981 共 12 行，P31 只判英文原词残留、P14 只判隐形字符，只有码位形状能抓；分母自证＝全仓 3 份 bn 稿 37 处 ঁ 前一位 100% 是元音，同 predicate 打到 Devanagari 实测误伤 29 处（ne सँग / hi महँगा 合法）⇒ 只读 Bengali 区段。规则总数 109 → 112（S11、R08、P38；P37 编号保留给 v1.23 已撤回的括注组数，不复用）。同版落盘 F2 r3 改稿八组（A/B/C1/C2/D/E/FIX/BN＝121+19+12 行）并同批更正 P31 的 bn 两键词形（সম্মতi → অনুপালন 词族）。验证：P38 电池 12 格全 OK——正对照（重注入错拼必红）、负对照（修好的词形 0 红）、4 种合法 ঁ 形不误伤、Devanagari 不越界、豁免表真执行（打上豁免→0 红，撤掉→回红）、整包变异 error 0→2 且 warning 59 持平（改的只有 P38 一行）、正文臂与 title/excerpt 臂各 1 条；回归 F2 0 error/59 warning、P0 0/49、F1 **1 error**（R08 抓到英文稿真缺陷 "The person who signs is the owner of that package."——新仪器暴露的存量缺陷，非本版引入；F1 其余 46 语同一句为同源偏移，本轮记账未改稿，成本见 F2 人工审校记录 §七） |
| v1.36 | 2026-10-24 | **P31 术语本地化映射表扩容**（用户指令）：登记 F2 十四个工作包名 14 组（词形 = F2 r2 48 语表格单元格逐字，全量术语审校后的地面真值）+ 进场关键词 12 组（诊断/主体/店铺/备案/头程/清关/结算/推广/售后/数据/审计/会员；供应链可视、内容合规并入同串包名键）。词形来源：包名结构化收割 + 关键词全单元格逐语人工校订 + 逐语断言（词形必须在正文，词干前缀放行）。回归实测两轮收窄同形假阳性：ca/it/pt/ro/pl/sq data=「日期」、da/no store=「大的」、ro diagnostic、de After-Sales 外来词拼写、nl data 已验收本族用法——均不登记。负向验证：注入英文 audit 进 F2 sv → 命中 rc=1，还原干净。回归 F2 59 / P0 49 持平基线；F1 46 = 基线 45 + 1 条真发现（da "S7 promotion" 待人工判定）。规则总数不变（先例 v1.24） |
| v1.35 | 2026-10-24 | 新增 **R07** 制作工具痕迹（用户指令）：对外文案不得暴露配图的制作来源——「PPT / 幻灯片 / p15 / 第 15 页」一类话术进正文、alt、title/excerpt 都拦。分层口径：页码引用与 alt/元数据工具词 = error，散文工具词 = warning（合法修辞人工判定，F2 的 "four slide decks" / スライド資料 / 슬라이드 实证）。定案前实测 P0/F1/F2 全量候选词命中分布；词边界由 de "stoppt" 假阳性逼出来（先上线形状→实测修边界的完整一轮）。基线 0 error + 4 种泄漏形状变异全抓（rc=1）。规则总数 108 → 109 |
| v1.32 | 2026-10-24 | P0 全量复核：共享契约 99 处机检命中 → 34 处真错改稿（he/sw 清关、ja/ko/th/vi 税号，与 F1 同源错误同步修复）+ 65 处合理异形由 P0 文章自带 glossary OR 覆盖（文章自带优先机制首次实战），P0 机检 99 → 0。人工复读（标题层/尾段/改稿上下文）另修 7 处机检盲区错误。固化两条流程教训：①通用表改词形后必须回头跑全部历史文章；②标题层与尾段是人工复读重点（查与正文术语一致性、拼写完整性、人称变位） |
| v1.31 | 2026-10-24 | 通用术语表 56 → **59 条**（「主体」责任链三条：b4 品牌方与一家主体签协议 / b7 海关约谈的是境内主体 / b17 然后是主体）。scope=all 评估收官：zh「主体」9 块 11 处，45/47 语三核心块内同词无漂移，唯 en/nl 设计性分工（party↔entity）、ru b7 用 юрлицо（OR 收录）——按块锁词形而非 scope=all，强行同词会误伤合理分工。纯积累轮无改稿项。规则总数不变（107） |
| v1.30 | 2026-10-24 | 通用术语表 47 → **56 条**（四家供应商各管一段/报关行角色/梁上三份文件/梁的高度/最先断的流=信息流/十四个交付物/两个预留/四件事不回答/三问筛方案）。纯积累轮：批 A/B/C 全量窗口逐语复核，47 语方向与词形一致，无改稿项。工具教训固化：导出候选块窗口必须与 S08 同构（剥 YAML 后 body 的 `_blocks`），直接对 raw split 会因 zh/各语 YAML 空行差异产生系统性 +1 偏移。规则总数不变（107） |
| v1.29 | 2026-10-24 | 通用术语表 35 → **47 条**（拣货/错发漏发/营业执照/海关注册登记/保税仓账开放/保证金/类目/服务费/汇出/核销凭证/屋顶接住/门槛在结构）。修掉一类系统性错误：zh b20 第二句「哪笔是服务费」在 bg/hr/ru/sl/sr/uk/hy/ka 八语被写成「哪笔是佣金」（与首句撞词），各改回本语服务费表述；sq 上轮统一方向反了（honorar 是服务费的合理意译，恢复）。P0 对 12 条新条款 0 命中。规则总数不变（107） |
| v1.28 | 2026-10-24 | 通用术语表 27 → **35 条**（主体/兜底链/代运营/限值/预售/佣金/体温计/会员，各 47 语逐语断言后写入）。断言与人工判定抓到两类真错并修正：hy「佣金」写成 հանձնաժողով（委员会→中介费 2 处）；sq b20 同块内佣金先写 provizion 后写 honorar（同概念换词，已统一）。P0 对 8 条新条款 0 命中（该篇在这 8 个概念上与 F1 标准词形一致）。规则总数不变（107） |
| v1.27 | 2026-10-23 | 通用术语表 20 → **27 条**：新增批次、效期、冲红（贷记凭证）、台账（scope=all）、工作包、签字权、蓝帽子（42 语保留 blue hat、de Blue-Hat、nl blauwe hoed、ja ブルーハット、ko 블루햇）。全部 47 语逐语断言后写入；台账在 b28/b33 的四语变体（hy գիրք/գրք、sq libër/libri、th สมุด、ur کھات）以 OR 词形收录。通用表上线后 P0 累计 99 条历史问题留档。规则总数不变（107） |
| v1.26 | 2026-10-23 | **通用术语表内建进工具包**：`<kit>/glossary.json` 跨文章积累，检查时自动加载（--glossary 仍可显式覆盖）；锚点不匹配的条款自动跳过。上线即验证：对已发布的 P0 跑出 75 条 S08 历史问题（he/sw 清关错词形、ja/ko/th/vi 税号旧译、正面清单待判定异形），与 F1 审读发现的错误同源——积累的词形表第一次跨文章使用就逮住同一批翻译的历史缺陷；同概念的合理异形以 OR 词形收录（ar/ja 正面清单各两译法）；S09 摘要契约绑定单篇结构、不进通用表（实测：F1 的「政策依据层」摘要契约套到 P0 会错配 47 条）。规则总数不变（107） |
| v1.25 | 2026-10-23 | **S08 增加 `"count": true` 出现次数下限**。来源：F1 第六轮按用户要求做「关键词→48 语对应列表 + 出现次数匹配」——探针发现 ko/th/vi 的「税号」在 b17 三处中前两处正确、第三处分别退成「번호/รหัสขยับ/มã dời」，require 判断全绿、只有次数口径能抓。多词形按命中区间并集计数（sw 验收 upokeaji+kupokelewa 各一次 = 2，单 pattern 取 max 会漏算）。规则总数不变（107），扩的是 S08 的口径 |
| v1.24 | 2026-10-23 | **R03 增加约数豁免**：带约数标记的金额（about/environ/rund/circa/unos/около 等 + 数字）先剔除再匹配，无标记的报价仍拦。起因：P0 的法语补回母版「（约 700 美元）」后，P36 要求保留数字、P33 禁符号、R03 禁「数字+dollars」三条规则互相打架——母版写「约 700 美元」本身就合法，说明 R03 的判据把「换算」误当「报价」。规则总数 107（口径收紧，不新增编号） |
| v1.23 | 2026-10-23 | 新增 **P36** 标识型数字一致：母版块内含小数点或 ≥3 位的数字（监管代码 1210/9610、税号 0404.9000、文号 486、限值 1200）必须原样出现在各语同一块；缺 → error，多 → warning；各文字系统数字先折叠为 ASCII，千分位/小数点按符号位置判定。来源：F1 第六轮人工复读发现的多起「术语被换成邻近概念」（ko 세관 번호→HS 코드、ja 税番号→HSコード、el 对账→συμφωνία、it 备案→deposito、vi mã thuế→mã HS）。同版曾加 **P37** 括注组数并在同版撤回：P0 包实测 158 处命中，抽查均为「（无蓝帽子…）→ , without the blue hat…」这类标点改写，内容未丢——括注是标点不是内容。规则总数 106 → 107 |
| v1.22 | 2026-10-23 | 新增 **S10** 路径白名单。起因是 F1 第五轮审读期间，一个临时脚本把 926KB 的 `_blocks.json` 写进 `content/`：它不是 mdx，S04 不管；后缀 `.json` 在 S05 白名单内，S05 也不管；官方检查 0 error，打包后文件数从 51 变 52 才发现。规则总数 105 → 106 |
| v1.21 | 2026-10-23 | S08 增加 `"scope": "all"`（逐块覆盖同一概念的全部出现处）。起因是 F1 第五轮主客体与名词审读：af/sw/th 各有一批「申报→公告/广告」的错误，b17（首次出现）译对、b6/b22/b24/b41 全错，默认的「只查一块」正好漏过；另 sw「合规流」b24 对、b27 换成 ufuatilio，sr/sw「验收」被译成交付方的「移交」。规则总数不变（105），扩的是 S08 的覆盖面 |
| v1.20 | 2026-10-23 | 新增 **P35** 整块照抄（同序号块逐字相同即 error）与 **S09** 摘要术语契约（glossary 增加 `"excerpt"` 段，校验摘要必须出现/不得出现的短语）。来源：F1 第四轮全量审校——7 个 H2 × 48 语逐条读出的语义错（ja「梁は三本」把三条文件读成三根梁、ko 同样丢文件、th 把承力方向说反、sw 标题留旧词）证明「结构全对」不等于「意思对」；同时 15 语摘要漏掉「政策依据」层、瑞典语漏到只剩三项，说明元数据层需要独立的契约位；规则总数 103 → 105 |
| v1.19 | 2026-10-23 | 新增 S08：块级术语契约（`--glossary=<file>` 可选）——以 zh 锚点定位母版块序号，校验各语言同一块内必须出现/不得出现的短语。专治「译反方向」：F1 一次基准记反让 15 语约 60 处正确译文被改错，语法结构与字数全对，P 族与 ST 族零命中。第 9 节改写术语护栏说明（机制在工具包，数据在文章侧）；规则总数 102 → 103 |
| v1.18 | 2026-10-23 | 新增 S07：文本文件行尾/编码卫生（mdx 与 submission.json 必须 LF、无 BOM，error）——F1 实证一次行尾污染（Windows 文本模式写文件把 LF 写成 CRLF）让 `_blocks()` 的 `\n\n` 分块失效，产出 168 个与内容无关的假 P21/P22/P23/P27 error，根因排查耗时；F09 增强：PyYAML 报错时附内置子集校验定位的具体病因（裸 `': '` / 未闭合引号 / tab），最高频根因是 excerpt 裸值含 `': '`（42 语一次击中）；第 9 节补记 W02 与 P23 的联动（拆段消 W02 会破坏逐块同构）与母版锚点术语的文章级回归护栏模式；规则总数 101 → 102 |
| v1.0 | — | 官方基线：目录结构 / submission.json / frontmatter / 48 语言 / 正文 / 图片 / 红线 |
| v1.1 | 2026-10-21 | 脚本新增 ST01–ST07 写作声音纪律（em dash 清零、AI 高频词、反转钩子）；`--body` 单稿模式 |
| v1.2 | 2026-10-21 | 脚本新增 P01–P13 / L06：跨语言一致性（小节/图片/关键数字对齐、互抄检测）与文本健壮性；`--no-parity` 开关 |
| v1.3 | 2026-10-21 | 脚本新增 `--pack` 一键打包：0 error 才出 zip，垃圾文件双层过滤；**文档分工重构：ST/P 规则明细由 README 并入本规范第 7–9 节，README 收敛为使用说明** |
| v1.4 | 2026-10-21 | 第二轮全量复检回填：新增 L07（标题未翻译）、L08（参考标题未翻译）与 P14–P17（隐形字符、标点前空格、标记配对、重复句）；48 语言修复 48 处同词残留 |
| v1.5 | 2026-10-21 | 第三轮复检回填：新增 P18（配图顺序）、P19（事实编号）、P20（关键代码）跨语言一致性；修复 es/fr/de/it 缺 443 号令引用 |
| v1.6 | 2026-10-21 | 第四轮复检回填：新增 P21（分节列表项数）、P22（正文块顺序）跨语言一致性；W02 段落阈值按文字系统分档；修复 12 个语言把基准列表压成散文、5 个语言 S3/S4/S7 块序错位 |
| v1.17 | 2026-10-23 | 新增 ST08：46 语言 AI 套话词表（es/fr/de/ru/ar/ja… 各 5–10 条，逐词报首现，同查 title/excerpt，warning）——ST03/ST04 只管 EN/zh，其余语言的 LLM 腔此前只能人工清查；新增 P34：非 CJK 语言全角标点残留（ja/ko/zh 豁免，warning）；规则总数 99 → 101。两项均源自 F1 48 语审校实证 |
| v1.16 | 2026-10-23 | P05/P06/P07/P08/P09/P10/P12/P14/P15 单文件命中从「只报首个」改为全量枚举：每规则每文件仍聚合为一条 warning（列前 4 处 + 等共 N 处），消除「修一处、重跑又冒下一处」的逐轮死循环；规则编号、触发条件与严重级别不变，F1 实证 P10/P08 曾各藏 19 处 |
| v1.15 | 2026-10-22 | 新增 F09：frontmatter 必须能被 YAML 解析（此前 F01 只查 `---` 结构、不做真正的 YAML 语法校验，宽松行级解析会放过未闭合引号 / tab 缩进 / 裸 `: ` 等站方 gray-matter 直接抛异常的输入）；规则总数 98 → 99 |
| v1.14 | 2026-10-22 | 按站方回执改稿 9 条（P10）+ 顺口径清零压在下面的 17 处；P08 放行「编号/俗称 + 连字符 + 本地格后缀」（同步站方 v1.14 修法）；P10 白名单收窄为词典化重叠副词 |
| v1.13 | 2026-10-22 | 48 处英文「Mode 1210」本地化（含 zh 基准标题与 H2；替换词全部取自各语言正文已有搭配，fr 除外——mode 是法语词）；修 ru 标题错词 модели（模型）→ режим（制度）；P31 登记 Mode 1210 术语；`number_words.py` 并入主脚本，投稿工具从此单文件分发 |
| v1.12 | 2026-10-22 | 新增 P33 金额不得用货币符号 / ISO 代码（只能写「元」「美元」文字）；补齐 S/F/M/L/B/R/W/I 七组规则编号表——此前 F01/I01/M01/S01 等在 SPEC 里查不到，现已 98 条全部可按编号对照；内容红线改为 R 系列表格并澄清 R03 只判符号/代码形态的金额；P32 的邻近数字窗口收紧为紧邻（±3 字符）以修掉韩语 «국무원령» 误报；修 P32 单词边界漏检中日韩「数字紧贴货币词」写法（5000円）P32 的邻近数字窗口收紧为紧邻（±3 字符）以修掉韩语 «국무원령» 误报；修 P32 单词边界漏检中日韩「数字紧贴货币词」写法（5000円） |
| v1.11 | 2026-10-21 | 新增 P32 金额货币合规检查（只允许「元」与「美元」，外币需邻近数字才判命中） |
| v1.10 | 2026-10-21 | 新增 P31 术语本地化映射表检查（补上 P30 覆盖不到的拉丁字母语言）；P30 白名单增补 blue hat / SKU |
| v1.9 | 2026-10-21 | 新增 P30 非拉丁语言正文夹用英文原词检查；本地化 47 个语言的 bonded（502 处）与货币单位 |
| v1.8 | 2026-10-21 | 结构一致性升级为多维逐块比对：P23 的 detail 由标量升级为元组；新增 P24（表格列数与各行列数）、P25（列表符号与缩进层级）、P26（行内强调计数 + 逐条目加粗分布）、P27（链接目标）、P28（frontmatter 结构：references / date / category）、P29（链接语言前缀）。修正 `_block_kind` / `_list_items` 只认 `- ` 前缀的缺陷。13 个反例全部命中 |
| v1.7 | 2026-10-21 | 基准语言改为中文优先（`--master=<lang>` 可指定）；新增 P23 逐块一一对应（段落/标题/列表/图片/表格的位置与规模全部对齐，报错精确到块号）；P22 图片比对改用文件名；新增 `number_words.py` 数字词表，中文「十四」与各语言 “fourteen” 归一可比对 |
