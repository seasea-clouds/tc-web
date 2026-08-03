# 全量内容差异化改造方案（2026-08-03）

## 一、目标

趁 Token 优惠窗口期，将全站 48 语言内容从「翻译模板」改造为「本地用户视角的个性化内容」，解决 Google 收录率下滑（模板化判定）问题。

## 二、现状盘点（已完成调查）

### 内容规模
- **16 个可差异化 namespace**：6 服务页（Ccc/Gacc/Brand/Cosmetics/Label/Ecommerce，各 37-47 keys）+ 10 行业页（Dairy/Meat/Wine/Skincare/PetFood/Supplements/Baby/Electronics/Medical/Ecommerce，各 18-31 keys）
- **每语言约 43K 字符**可差异化内容（heroTitle/heroSubtitle/FAQ×6/coverItems/howSteps/metaTitle 等）
- **总量**：48 语言 × 16 namespace = **768 个页面组合**

### 现状问题
- ✅ de/ja（试点）、es 部分页面已差异化
- ✅ P2-P4 已优化部分关键词（en/de/ru/es/fr/it/nl 的 heroTitle/metaTitle）
- ❌ **绝大多数语言仍是纯翻译模板**（es/it/fa/fr/ru/nl/pl/pt/ko/tr/ar/th/vi 等 heroSubtitle 都是逐字翻译）

### GSC 语言需求（决定投入优先级）
| 语言 | 展示 | 点击 | 投入级别 |
|------|------|------|---------|
| 🇩🇪 de | 854 (45%) | 0 | **T1 重点** |
| 🇬🇧 en | 347 | 0 | **T1 重点** |
| 🇪🇸 es | 121 | 0 | T2 |
| 🇮🇹 it | 86 | 0 | T2 |
| 🇯🇵 ja | 73 | 0 | T2 |
| 🇮🇷 fa | 28 | **6** | T2（有转化） |
| fr/ru/nl/pl/pt | 少量 | 0 | T3 |
| 其余 37 语言 | ~0 | 0 | T4 轻量 |

## 三、差异化方法论（已验证，试点成功）

### 每语言定义「本地视角」（核心）
| 语言 | 本地视角 | 差异化方向 |
|------|---------|-----------|
| 🇩🇪 de | 德国出口商 | CE vs CCC 对比、德国产品出口中国流程、Zoll 查验 |
| 🇯🇵 ja | 日本制造商 | 日本から申請、PSE 制度对比、工場審査対応 |
| 🇪🇸 es | 拉美出口商 | Decreto 248 对拉美影响、CIFER 注册、农产品出口 |
| 🇮🇹 it | 意大利制造商 | 电子元件出口、欧盟 CE 对比、Made in Italy |
| 🇫🇷 fr | 法语区出口商 | 欧盟标准对比、法国食品/化妆品出口 |
| 🇮🇷 fa | 伊朗/波斯湾 | 清真食品、波斯湾贸易通道、制裁合规 |
| 🇷🇺 ru | 俄罗斯/中亚 | 欧亚经济联盟 EAC 对比、中俄贸易通道 |
| 🇳🇱 nl | 荷兰出口商 | 欧盟门户、食品/花卉出口、鹿特丹通道 |
| 🇵🇱 pl | 波兰/东欧 | 东欧出口、欧盟 CE 对比 |
| 🇵🇹 pt | 巴西/葡语区 | 巴西农产品出口、南美贸易 |

### 差异化 3 层（每页）
1. **heroTitle/heroSubtitle**：本地视角 + 本地搜索词（不是翻译）
2. **FAQ×6**：本地用户真实问题（CE vs CCC、海外申请、本地市场案例）
3. **coverItems/howSteps/metaTitle**：本地化服务流程 + 本地化 SEO

### 关键约束
- **只改值、不增删 key**（check-i18n-coverage 只查 key 覆盖率）
- 新术语进 SHARED_WORDS_BY_LANG（精确豁免，如 ja 的 PSE）
- 保持翻译铁律（无英文 fallback、术语准确）

## 四、执行计划（分批，窗口期内完成）

### 批次划分（按语言需求 × 页面价值）
| 批次 | 范围 | 页面组合 | 预计 Token | 周期 |
|------|------|---------|-----------|------|
| **批 1** | T1 语言（de/en）× 16 namespace | 32 | ~40K | 立即开始 |
| **批 2** | T2 语言（es/it/ja/fa）× 16 namespace | 64 | ~80K | 批 1 后 |
| **批 3** | T3 语言（fr/ru/nl/pl/pt）× 16 namespace | 80 | ~100K | 批 2 后 |
| **批 4** | T4 语言（其余 37 语言）轻量差异化 | 592 | ~300K | 最后 |
| **合计** | 48 语言 × 16 namespace | 768 | ~520K | 窗口期内 |

### T4 轻量方案（37 低流量语言）
不做全字段深度差异化，只做：
- heroTitle/heroSubtitle 本地视角改写（本地出口商视角 + 本地关键词）
- metaTitle/metaDescription 本地化
- 保持 FAQ/coverItems 翻译（低流量语言不值得深度投入）

## 五、质量保障

1. 每批完成后：check-translations（0 问题）+ check-i18n-coverage（100%）+ SEO 6529 检查
2. 每语言抽查 1 页线上验证
3. 新术语精确豁免（SHARED_WORDS_BY_LANG），不大范围跳过
4. 差异化内容基于 GSC 真实关键词 + 本地市场真实问题

## 六、预期效果

- 收录率：试点页面（de/ja/es）差异化后更易被 Google 判定为"独立内容"而非模板
- 排名：ccc zertifizierung 71 → 前 50（de 差异化 + 关键词优化）
- CTR：本地化标题更吸引本地用户点击
- 长期：全站 48 语言从"翻译站"变为"本地化站点"，提升 E-E-A-T 信号

## 七、风险与对策

| 风险 | 对策 |
|------|------|
| Token 成本超预算 | 分批复核，T4 用轻量方案控制成本 |
| AI 生成内容质量问题 | 每批检查 + 术语豁免 + 本地视角严格定义 |
| 差异化过度（失去品牌一致性） | 保留品牌 VI（SinoTrade Compliance）+ 核心服务描述一致 |
| 部署风险 | 每批独立 commit + 独立部署验证 |
