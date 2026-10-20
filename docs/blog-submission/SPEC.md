# 博客投稿规范（Blog Submission Spec）

版本：v1.0 ｜ 适用站点：sinotradecompliance.com 博客（48 语言）
本规范是**硬性验收标准**：投稿包必须能被 `submitter_check.py` 全部判绿（0 error），否则退回重写。
站点侧不做二次润色、不做内容改写——**脚本通过即视为定稿，直接上线**。

---

## 0. 一句话流程

```
写 48 语言 → 制图 → 打包 zip → 本地跑 python submitter_check.py <zip> → 全绿 → 提交
```

---

## 1. 目录结构（必须逐字节照此布局）

单个 zip 可含**多篇文章**，每篇一个 `<slug>` 目录：

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

**禁止**：包内出现 `.DS_Store`、`__MACOSX`、`.md`/`.txt`/`.docx` 说明文件、原始 `jpg/png/psd/ai` 素材、任何未在 `content/` 与 `images/` 下的文件。

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
  "locales": ["en", "zh", "es"],
  "images": ["cover.webp", "fig-01.webp"],
  "imageRights": "All images are original or licensed for commercial use; no third-party copyrighted material."
}
```

- `slug` 由投稿者自拟，但必须：全小写、只用 `a-z0-9-`、3–60 字符、不与站内已有文章重复（脚本会查重）。
- `date` 为 `YYYY-MM-DD`，不得晚于投稿当天（UTC+8）。
- `author` 固定写 `David Zhang`。
- `locales` 必须列出实际提交的语言，且必须正好是第 4 节的 48 个。
- `images` 与实际文件一一对应。

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

硬性要求：

- `title`：≤85 字符，**不得含冒号、连字符 `-`、破折号 `—` `–`**（会影响 `<title>` 与导航渲染）。
- `slug`：48 个文件完全一致，等于目录名、等于 `submission.json` 的 slug。
- `date`：48 个文件完全一致。
- `category`：只能是以下 7 个值之一（大小写、空格、`&` 都要一致）：
  `Brand Protection` / `Compliance Guide` / `Cosmetics` / `E-commerce` / `Food & Beverage` / `Label Compliance` / `Product Certification`
- `excerpt`：≤185 字符，不得与 `title` 相同；48 语言各自撰写，**不得英文回退**。
- `references`：0–6 条；每条必须有 `title` 与 `https://` 开头的 `url`；**非英文语言的参考标题必须翻译**，不得与 en 完全相同。
- frontmatter 之外的内容一律视为正文；正文里**再出现** `---` 分隔线或 `## References` 章节都会判错。

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

---

## 5. 正文规则

**结构**

- 不使用一级标题（`#`），文章标题来自 frontmatter；小节用 `##`，最多到 `###`。
- `##` / `###` 后必须有且只有一个空格。
- 正文不得出现 `---` 分隔线（渲染成 `<hr>`，视觉断裂）。
- 不得出现 `## References` 章节（参考文献只能放 frontmatter）。
- 不得使用 JSX / HTML 标签（`<div>`、`<img>`、`<br>` 等），不得使用 `{...}` 表达式。
- 不得用框线字符（`┌ ─ │ └`）或箭头画流程图，流程图请写成列表或普通段落。
- 列表项必须以 `- ` 开头、**每项独占一行**，项与项之间**不留空行**（会导致渲染成多个列表）。
- 正文里的图片单独成行：`![说明文字](/images/blog/<slug>/fig-01.webp)`。
- 全文破折号风格统一：同一文件里不要混用 `—`（em dash）与 `–`（en dash）。

**结尾 CTA（必需，脚本卡死）**

文章最后 10 行内必须有且只有这一条链接：

```
[Contact us](/en/packages/)
```

- 路径必须是 `/<本文件语言>/packages/`（zh 用 `/zh/packages/`，ar 用 `/ar/packages/`……）。
- 链接文字：`en` 用 `Contact us`；`zh` 用 `联系我们`；其他语言用**本语言的「联系我们」**，不得保留英文 `Contact us`。

**内容红线（机器判定，命中即拒）**

1. 出现 `248` 或 `249`（任何数字形式）——现行法条一律写 **280 号令**；历史沿革不作为正文内容。
2. 出现 `MOA` 或 `CFDA`——现行机构名：**MARA**（原 MOA）、**SAMR**（原 CFDA）。
3. 出现价格/金额：`$` `€` `£` `¥` 加数字，或 `USD/EUR/CNY/RMB` 加数字；不写报价、不写预算。
4. 出现交付周期承诺：`delivery` / `lead time` / `turnaround` 附近出现 `N days/weeks`。
5. 绝对否定：`cannot be exported`、`cannot export to China`、`not possible to export`、`impossible to export`、`无法出口`、`不能出口` 等。
6. 过度承诺：`we arrange shipping`、`we organize the shipment`、`guarantee`、`100% success`、`near-100%`、`within 24 hours`。
7. Emoji 列表混排（多个 emoji 项目写在同一行）。

---

## 6. 图片规范（投稿者直接产出最终文件）

- 只收 **webp**，不接受 jpg/png（脚本直接判错）。
- `cover.webp` 必需，**精确 1200×630**。
- 其他配图宽 ≥1200，比例不限（建议 16:9），**单张 ≤400KB**；全篇建议 ≤6 张。
- 每张图 ≤400KB；必须已在 `images/<slug>/` 下，且**正文全部引用、不得有未引用图片**。
- `alt` 必填、必须描述画面（不得写 `image`、`图`、`img`）。
- 图片内不得含价格、不得含第三方 logo/水印/图库水印；`submission.json` 的 `imageRights` 需确认可商用。
- 图片路径固定 `/images/blog/<slug>/<filename>.webp`，不要写域名、不要写相对路径。

---

## 7. 自检（提交前必须跑）

```bash
python3 submitter_check.py your-package.zip
```

输出示例：

```
[结构] 48/48 语言齐全
[字段] 6/6 文章通过
[图片] cover 1200×630 ✓, fig-01 1600×900 ✓
[红线] 0 命中
结果：PASS（0 error, 2 warning）
```

- `error` 必须清零；`warning` 只是提醒（正文过短、段落过长、图片偏多等），可以不改。
- 加 `--json` 输出机器可读结果；加 `--quiet` 只看结论。

---

## 8. 常见退回原因（Top 6）

1. 少语言（比如只交了 30 个）——必须 48 个。
2. 非英文文件里 title/excerpt 还是英文（回退）。
3. 图片是 jpg/png，或 cover 尺寸不是 1200×630。
4. 结尾 CTA 写成 `/quote/` 或没带语言前缀。
5. 引用了 248/249 号令，或写了 MOA/CFDA。
6. 列表项之间留了空行（渲染会碎成多个列表）。
