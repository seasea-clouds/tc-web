# 内容差异化试点方案（2026-08-03）

## 背景

- 问题 2：收录率下滑（1,231 页未编入，60% 新增页未被编入），根因是 Google 判定 48 语言页面为「模板化/机器翻译副本」
- 已取消 noindex 方案，改为**内容差异化**解决
- 内容差异化 = 各语言页面从「逐字翻译模板」→「为本地用户视角定制的内容」

## CI 可行性确认（重要）

- ✅ `check-i18n-coverage.mjs`：只查 key 覆盖率（≥99%），**不查内容一致性**
- ✅ `check-translations.mjs`：只查英文 fallback / 不应翻译词 / 非拉丁英文残留，**不要求逐字翻译**
- ✅ 结论：**差异化内容完全可行**，只要：
  1. key 数量/结构 48 语言一致（不能增删 key，只能改 key 的值）
  2. 不引入新的英文残留/fallback
  3. 保持翻译铁律（禁止英文 fallback、术语准确）

## 试点对象（3 个高价值组合）

| # | 语言 | 页面 | 关键词 | 展示 | 排名 | 差异化视角 |
|---|------|------|--------|------|------|-----------|
| 1 | 🇩🇪 de | ServiceCcc | ccc zertifizierung / ccc zertifikat | 293 | 71-74 | **德国出口商视角**（CE vs CCC 对比） |
| 2 | 🇯🇵 ja | ServiceCcc | ccc 認証 取得 | 11 | 75 | **日本制造商视角**（JIS vs CCC、海外申请） |
| 3 | 🇪🇸 es | ServiceGacc | gacc que es / registro | 4.5-19 | 已首页 | **拉美食品出口商视角** |

## 差异化 3 层方法

### 第 1 层：heroTitle / heroSubtitle（本地化视角 + 搜索词习惯）
- 不是翻译 en，而是按**本地用户搜索习惯 + 本地视角**重写
- 例：de 强调「CE vs CCC 有何区别，德国产品如何进入中国市场」
- 例：ja 强调「海外から CCC 認証を取得する方法」（海外申请视角）

### 第 2 层：FAQ 本地化（加入本地用户真实问题）
- 保留 6 条结构，但替换/改写为本地用户会问的问题
- 例：de 增加「Brauche ich neben CE auch CCC?」（有 CE 还需要 CCC 吗）
- 例：ja 增加「海外から工場監査はどう対応する?」（海外工厂如何应对审查）
- 例：es 增加「¿Qué documentos necesita un exportador latinoamericano?」

### 第 3 层：coverItems / howSteps / metaTitle 本地化
- coverItems 融入本地化服务亮点（本地市场案例、本地流程）
- howSteps 保持 6 步结构但本地化表述
- metaTitle/metaDescription 按本地搜索词重写

## 执行流程（每个试点）

1. 检查目标语言当前 namespace 完整内容
2. 从本地博客/知识库提取差异化素材（如 de 博客的 CE vs CCC 内容）
3. 重写 heroTitle/heroSubtitle/FAQ/coverItems（保持 key 结构）
4. 48 语言一致性检查：确认不增删 key
5. 构建 + CI 检查（6529 SEO 检查 + 翻译质量）
6. 部署 + 线上验证
7. **观察 2-4 周**：GSC 复查收录率 + 排名变化（对比试点 vs 未试点页面）

## 验证指标

- 收录率：试点页面是否被编入（对比未编入的 850 页）
- 排名：ccc zertifizierung/zertifikat 71 → 前 50？（对比基线）
- 展示→点击：CTR 是否提升（差异化标题更吸引点击）
- 对比组：未做差异化的语言页面（如 fr/it）作为对照组

## 注意事项

- ⚠️ 只改试点语言的 namespace 值，**不影响其他语言**（文案在 messages/{lang}.json 独立）
- ⚠️ 保持 FAQ 6 条结构（ServiceFAQ 组件循环渲染，缺 key 会停）
- ⚠️ 差异化不是「随便写」，要基于**真实搜索词 + 真实用户问题**（GSC 数据支撑）
- ⚠️ 试点阶段先做 3 个，验证有效后扩展到全部高需求语言
