# 付费合规报告 — 编写规范与操作指南

> 文件位置：`/root/projects/trade/compli-service/`
> 最后更新：2026-05-26

---

## 一、核心原则

### 1.1 价值定位

这是一份 **$10,000 级别的中国市场准入可行性报告**，不是简单的合规判断工具。买家（海外企业决策者）花 $1-50 做自查，期望看到的是完整的市场准入分析，回答的核心问题是：

> "我能进中国市场吗？要花多少钱？多长时间？怎么走？有什么风险？"

### 1.2 内容铁律

| 规则 | 说明 |
|------|------|
| **❌ 禁止推荐免费/DIY 方案** | 我们是赚服务费的，不能让客户觉得自己也能做。删掉所有 "free"、"self-registration"、"you can do it yourself" 等字样 |
| **❌ 禁止 $0 价格** | 成本范围不能出现 $0，最低也要 $200+。价格区间要宽，说明"需按具体产品评估" |
| **❌ 禁止破坏付费意愿** | 不能说 "CBEC 不需要 GACC"、"省钱走 CBEC" 等让客户放弃付费服务的建议 |
| **✅ 强调专业价值** | "我们的团队处理"、"专业代理"、"端到端管理" 等措辞 |
| **✅ 法规引用深度** | 每条法规要带具体条款原文或编号（Art. 7, Ch. 2 等） |
| **✅ 每个模块都要有"专家解读"** | 纯色块 callout：🔍 Expert Interpretation — 给出文字分析和建议 |

### 1.3 数据来源

报告中的数据基于以下来源（无需在报告中标注，但开发时参考）：
- 中国海关进出口数据库 — 品类进口量/额趋势
- GACC 官网 + CIFER 系统 — 注册要求
- 中国关税查询系统 — HS Code 税率
- CNCA 认证目录 — CCC 范围
- GB 标准数据库（GB 7718/28050/2760 等）
- NMPA 化妆品备案系统
- 各国 FTA 协定文本
- 历史项目经验数据

---

## 二、报告模块结构（共 23 模块）

### 模块概览

| # | 模块名 | 内容定位 | 数据来源 |
|---|--------|---------|---------|
| 1 | Executive Risk Scorecard | 5 维度风险评分卡 + 综合评分 | `result.riskDimensions` |
| 2 | Market Entry Viability | 市场趋势 + 驱动力 + 障碍 + 建议 | `result.marketIntel` |
| 3 | Channel Strategy Comparison | 一般贸易 / CBEC / 个人包裹对比 | `result.channels` |
| 4 | Tariff & Tax Impact Analysis | MFN 税率 / VAT / 消费税 / FTA | `result.tariffInfo` |
| 5 | Regulatory Framework Deep Dive | 法规列表 + 条款原文引用 + 解读 | `result.regulations` |
| 6 | Product Classification & HS Code | HS Code 范围 / CIQ 码 / 风险分类 | `result.classification` |
| 7 | Risk Assessment Heat Map | 5×5 风险矩阵 + 可视化色块 | `result.riskMatrix` |
| 8 | Document Requirements Guide | 文档表格（格式/公证/常见错误） | `result.documentGuide` |
| 9 | Testing & Lab Requirements | 检测项目 + 费用 + 实验室指南 | `result.labTests` |
| 10 | Label & Packaging Compliance | GB 7718/28050 字段对照表 | `result.labelGuide` |
| 11 | Implementation Roadmap | 分阶段路线图（甘特图风格） | `result.timelinePhases` |
| 12 | Timeline Analysis | 专业甘特图表（条形 + 里程碑菱形） | `result.timelinePhases` |
| 13 | Total Cost of Compliance | 成本拆解表 + DIY vs 专业对比 | `result.costBreakdown` |
| 14 | Country-Specific Analysis | 原产国双边协议 / 特殊限制 | `result.countryProfile` |
| 15 | Competitive & Market Intel | 竞品来源国 / 消费者认知 | `result.marketIntel` |
| 16 | Common Pitfalls Analysis | 品类特指拒签原因 + 解决方案 | `result.commonRejections` |
| 17 | Post-Approval Compliance | 年检 / 续期 / 变更通知 | `result.postApprovalObligations` |
| 18 | Regulatory Horizon Scan | 未来 12-24 月法规变化预警 | `result.horizonScan` |
| 19 | Customs Clearance & Port Entry | 清关文件清单 / CIQ 流程 / 常见问题 | 硬编码 |
| 20 | IP & Brand Risk Assessment | 先申请制风险 / 海关备案 / 维权 | 硬编码 |
| 21 | Emergency Response Plan | 扣押 / 拒签 / 召回 3 场景应对 | 硬编码 |
| 22 | Compliance Checklist | 可打印勾选清单（3 阶段 15 项） | `result.requiredDocuments` |
| 23 | China Compliance Glossary | 15 个关键术语解释 | 硬编码 |

### 2.1 每个模块的内容量要求

| 模块 | 最少字数 | 关键要素 |
|------|---------|---------|
| Executive Summary | 100+ | 风险评分 + 一句话决策 + 5 维卡片 |
| Market Viability | 150+ | 趋势数字 + 驱动力列表 + 建议 |
| Channel Strategy | 200+ | 3 渠道完整对比 + 性价比标签 |
| Tariff & Tax | 150+ | 税率卡片 + FTA 优惠说明 |
| Regulatory Framework | 300+ | 法规列表 + 条款原文(至少3条) |
| Risk Heat Map | 100+ | 5 色块矩阵 + mitigation 建议 |
| Document Guide | 200+ | 7+ 文档完整表格 |
| Label Compliance | 300+ | 12 字段对照表 + GB 标准要点 |
| Cost Estimation | 250+ | 6+ 费用项 + DIY 对比表 |
| Expert Interpretation | 100+/块 | 每个模块至少一个解读块 |

---

## 三、技术架构

### 3.1 文件结构

```
modules/
├── shared/
│   └── types.ts              ← 公共类型定义
├── gacc/
│   ├── rules.ts              ← GACC 规则引擎 + 品类/国家/法规数据库
│   └── report.ts             ← GACC 报告生成器
├── ccc/
│   ├── rules.ts              ← CCC 规则引擎
│   └── report.ts
├── nmpa/
│   ├── rules.ts              ← NMPA 化妆品规则
│   └── report.ts
├── label/
│   ├── rules.ts              ← 标签合规规则
│   └── report.ts
├── crossborder/
│   ├── rules.ts              ← 跨境电商规则
│   └── report.ts
└── trademark/
    ├── rules.ts              ← 商标保护规则
    └── report.ts

src/
├── core/report/
│   └── template.tsx          ← 报告模板（23 模块渲染）
├── components/
│   └── ReportViewer.tsx      ← 报告查看器容器
└── app/
    └── report/
        ├── page.tsx          ← 正式报告页（需 payment flow）
        └── preview/
            └── page.tsx      ← 预览页（硬编码示例数据）
```

### 3.2 模板渲染规则

- 所有模块在 `template.tsx` 中按顺序渲染
- 数据通过 `result: GaccResult` prop 传入
- 模块之间用 `border-b border-gray-100` 分隔
- 每个模块用 `SectionTitle` 组件做标题栏（图标 + 文字）
- 关键内容用 `Expert Interpretation` callout 框（`bg-primary-navy/5 border-l-4 border-gold`）

### 3.3 样式规范

| 元素 | 样式 |
|------|------|
| 主色 | `#1B365D` (primary-navy) |
| 金色 | `#D4AF37` (gold) |
| 底色 | `#F4F6F9` (bg-ice) |
| 风险红 | `bg-red-50 text-red-700 border-red-200` |
| 风险黄 | `bg-amber-50 text-amber-800 border-amber-200` |
| 风险绿 | `bg-green-50 text-green-700 border-green-200` |
| 解读框 | `bg-primary-navy/5 border-l-4 border-gold p-3 rounded-lg` |

---

## 四、规则引擎开发规范

### 4.1 每个 modules/*/rules.ts 必须包含

```
1. 品类类型定义 (export type)
2. 输入接口 (export interface ${Module}Input)
3. 结果接口 (export interface ${Module}Result) — 必须包含所有 23 模块字段
4. 品类配置数据库 — 每个品类一个 profile 对象
5. 国家/地区数据库（可选，GACC 有完整版）
6. 法规数据库
7. check${Module}() 主函数
8. CATEGORY_LABELS 向后兼容映射
```

### 4.2 结果接口必须包含的字段

```typescript
export interface Result {
  // 基础
  requiresRegistration: boolean;
  riskCategory: "high" | "medium" | "low";
  
  // 评分卡
  riskScore: number;
  riskDimensions: { dimension: string; score: number; color: string; note: string }[];
  executiveSummary: string;
  oneLineDecision: string;
  
  // 市场
  viability: string;
  marketIntel: { ... };
  channels: ChannelStrategy[];
  tariffInfo: { ... };
  
  // 合规
  regulations: Regulation[];
  classification: { code: string; riskLevel: string; description: string };
  riskMatrix: { dimension: string; rating: string; explanation: string }[];
  documentGuide: { name: string; format: string; notarization: string; commonError: string }[];
  
  // 检测
  labTests: string[];
  testCostRange: string;
  labelGuide: LabelGuide;
  
  // 执行
  timelinePhases: TimelinePhase[];
  estimatedTimeline: string;
  costBreakdown: { item: string; range: string; note: string }[];
  totalCostRange: string;
  
  // 分析
  countryProfile: CountryProfile;
  competitiveAnalysis: string;
  commonRejections: { problem: string; cause: string; solution: string }[];
  postApprovalObligations: { item: string; freq: string; desc: string }[];
  horizonScan: HorizonItem[];
}
```

### 4.3 重要：预览页数据是硬编码的

`src/app/report/preview/page.tsx` 中有一个 `SAMPLE_RESULT` 对象，**所有改动 rules.ts 后必须同步更新此文件**，否则预览页看不到变化。

---

## 五、部署流程

```bash
# 1. 本地构建验证
cd /root/projects/trade/compli-service
npx next build

# 2. 提交并推送（Cloudflare Pages 自动构建部署）
git add -A
git commit -m "feat/文案/修复: 描述改动"
git push

# 3. 等待 1-3 分钟后验证线上
curl -s https://sinotradecompliance.com/compli-service/report/preview | grep "关键词"
```

### 5.1 构建检查清单

- [ ] `npx next build` 无 TypeScript 错误
- [ ] 所有 pages 生成成功（Route 列表中有 `○ /report/preview`）
- [ ] 预览页 200 OK
- [ ] 内容变更已体现在预览页

---

## 六、常见问题

### 为什么改了 rules.ts 但预览页没变？
预览页使用**硬编码示例数据**（`SAMPLE_RESULT`），不是调用 `checkGacc()`。必须同步修改 `src/app/report/preview/page.tsx`。

### 价格范围如何设置？
- 不出现 $0
- 范围要宽（体现"按具体产品评估"）
- 大项用区间（如 $3,000-8,000）
- 末尾加说明："Exact pricing depends on product complexity"

### 可以提 CBEC 吗？
可以，但不能说"CBEC 不需要 GACC"或"省钱走 CBEC"。应该说"Simplified compliance pathway"或"Alternative market entry route"。

### 报告有多少个模块？
当前 23 个模块。新增模块时：
1. 在 `template.tsx` 中按顺序添加渲染代码
2. 如果模块需要新数据，在 `GaccResult` 接口中添加字段
3. 更新 `SAMPLE_RESULT` 示例数据
4. 更新本文档的模块列表
