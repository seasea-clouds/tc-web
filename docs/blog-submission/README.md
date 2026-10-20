# 博客投稿工具包（Blog Submission Kit v1.0）

下载地址：https://github.com/seasea-clouds/tc-web/blob/main/docs/blog-submission/dist/blog-submission-kit.zip
（仓库路径 `docs/blog-submission/dist/blog-submission-kit.zip`，更新规范后用 `npm run blog:kit` 重新打包并推送）

这是 sinotradecompliance.com 博客的投稿工具包。你写 **48 个语言**的同一篇文章 + 配图，
用本包里的脚本自检通过后，把 zip 交回即可直接上线——我们不做二次润色，**脚本通过即定稿**。

---

## 1. 三分钟上手

```bash
# 1) 复制模板
cp -r template my-article
# 2) 改 submission.json 与 content/en/<slug>.mdx，再把 48 个语言都写齐
# 3) 制图（webp），放到 my-article/images/<slug>/
# 4) 按 articles/ 结构打包
mkdir -p pkg/articles && mv my-article pkg/articles/<slug> && cp -r my-article ... 
#    或者直接把 sample/ 复制一份改，最省事
# 5) 自检
python3 submitter_check.py pkg
```

自检输出 `结果：PASS（0 error）` 就可以提交；有 error 就按提示改，一条都不要留。

---

## 2. 包里有什么

```
README.md              本文件
SPEC.md                全部硬性要求（编号规则，出问题先查这里）
locales.json           48 语言代码 / 目录名 / 语言名
submitter_check.py     自检脚本（纯 Python 标准库，无需安装依赖）
template/              空白模板：submission.json + 一个 en 骨架
sample/                一篇**完整合格**的 48 语言样例（含 2 张标准图）
```

`sample/` 就是最终该长什么样的唯一标准：目录结构、frontmatter、列表写法、图片路径、CTA 全在里面。
**建议先跑一遍样例，确认你的环境正常：**

```bash
python3 submitter_check.py sample
# → 结果：PASS（0 error, 1 warning）
```

---

## 3. 交付目录（必须长这样）

```
<你的包>.zip
└── articles/
    └── <slug>/
        ├── submission.json
        ├── content/
        │   ├── en/<slug>.mdx
        │   ├── zh/<slug>.mdx
        │   └── …共 48 个语言目录（缺一即拒）
        └── images/
            └── <slug>/
                ├── cover.webp      ← 必需，精确 1200×630
                └── fig-01.webp …   ← 正文配图，宽 ≥1200，单张 ≤400KB
```

一个 zip 可以放**多篇**：`articles/` 下并列多个 `<slug>/` 即可。

---

## 4. 最容易踩的 8 个坑

1. **只交了 30 个语言** → 必须 48 个，清单见 `locales.json`。
2. **非英文文件里 title/excerpt 还是英文** → 每篇都要真翻译。
3. **图片是 jpg/png** → 只收 webp；cover 必须 1200×630。
4. **CTA 写成 `/quote/` 或没带语言前缀** → 必须是 `[本语言的联系我们](/<lang>/packages/)`。
5. **正文提到 248/249 号令，或写了 MOA/CFDA** → 现行写 280 号令、MARA、SAMR。
6. **列表项之间留空行** → 渲染会碎成多个列表。
7. **标题里带冒号或连字符** → 站点导航与 `<title>` 会异常。
8. **图片没被正文引用**（cover 除外）→ 一律判错。

---

## 5. 本地化要求（不是机翻）

每篇非英文版本要按**目标市场**写：当地读者熟悉的品类、当地产业例子、当地出口路径。
但不得虚构「该国已获对华准入」，也不得写「该国无法向中国出口」这类绝对断言；
价格、交付周期、寄样安排、成功率承诺一律不写（脚本会拦）。

---

## 6. 自检通过之后

把 zip 交给对接人。站点侧会：重跑同一套脚本 → 落盘入库 → 跑站点 CI 与构建 → 部署 → 逐语言验证线上页面。
**任何一条 error 都会原样退回**，所以请务必先自己跑绿。
