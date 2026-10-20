
## 法规事实基线（2026-10 更新，勿再写旧法）
- **280 号令**：2025-10-14 公布、**2026-06-01 施行**，取代 248 号令（+249）；17 大类需主管机构推荐，17 类之外走 CIFER 自申请；六类初级农产品（油籽、杂粮、鲜菜、干豆、调味料、生咖啡可可豆）移出食品注册体系，改按**219 号公告**（2025）走农产品通道
- **续期**：有效期 5 年，届满前 **3–12 个月**提交；三种例外不自动延续（不予自动延续清单／整改期／该国被暂停）——站点原写「3-6 个月」是 248 口径
- 全站文案已统一到 280（2026-10-17，commit f09f709）；`DefinitionSchema.decree248*` 键已改名 `decree280*`，代码引用两处同步
- 机构名：**MARA**（农业农村部，原 MOA 已废）、**SAMR**（原 CFDA 2018 年撤销）、GACC/NMPA/CCC 不变
- GB 7718-2025 / GB 28050-2025（2025-03-16 发布，2027-03-16 实施），文案一律带年份

## 批量替换法令编号的坑（2026-10-17）
- 机械把 `248→280` 会连带制造**日期归属错误**：如「自 2022 年 1 月 1 日起（280）」——改用全量扫描 `2022 + 280` 同现的键，逐语言改「1 <月> 2022」→「1 <月6> 2026」
- 多法令联合引用有多种写法：`248/249`、`248 and 249`、`248 og 249`、`248 号令/249号令`、`280 і 249`——必须先跑 `R1/R1b/R2` 三段正则，再查残留
- `check-translations.mjs` 的 `ENGLISH_RESIDUAL_ALLOW` 里 `MOA` 需换成 `MARA`，否则非拉丁语言全报「英文残留」
- 缩写替换后仍有机翻不通顺处：portal `Category 18 high-risk` → `Category 17 high-risk` 语义仍成立但不理想，标记待优化

## t-translate 渠道故障（2026-10-17）
- Google 三渠道（google_ajax / deep_translator / mobile_regex）全部 **429 / sorry 页**（IP 级封锁，代理池 84 个存活 IP 也全被拦）
- `translators`（Yandex）可用但只覆盖 ~27 个欧洲语种，ja/ko/ar/zh/th/vi/hi/fa/si/ka/hy/ne/bn/ta/ur/sw/af/az 全部报「不支持语言」
- 结论：**非欧洲语种当前无可用翻译渠道**；应急做法是人工写 47 语言（本轮 H1+副标题+3 条法规答案已人工落盘）
- 恢复后仍需补：Home/Services/Faq/About/Blog 的 metaTitle/metaDescription、Services/Faq 页头、Services.gaccSubtitle 等 ~27 键 × 47 语言

## 博客投稿流水线（2026-10-17 定稿）
- 工具包：`docs/blog-submission/`（README/SPEC/locales.json/submitter_check.py/template/sample）→ `npm run blog:kit` 出 `dist/blog-submission-kit.zip`
- 投稿包结构：`articles/<slug>/{submission.json, content/<48 lang>/<slug>.mdx, images/<slug>/*.webp}`；作者自译 48 语言，作者固定署名 David Zhang，图片只收 webp（cover 1200×630，其余宽 ≥1200、≤400KB）
- 入库：`npm run blog:intake -- <zip>`（默认只检查）→ `--write` 落盘到 `apps/blog/content/*` 与 `apps/blog/public/images/blog/<slug>/`；之后 `check-md-article --ci` + `turbo build --force` + push + 线上逐语言验证
- 规则红线已机器化：248/249、MOA/CFDA、价格、交付周期、绝对否定、寄样/时限承诺、title 含冒号连字符、CTA 必须是 `/<lang>/packages/`
- 站点侧不改稿：脚本通过即定稿，error 一律退回作者
