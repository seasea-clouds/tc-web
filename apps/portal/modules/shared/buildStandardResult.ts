/**
 * 构建标准合规结果 — 填充 StandardResult 所有 23 个字段，缺失补默认值
 *
 * 用法: 每个 checkXxx() 内部调用此函数，然后添加模块专有字段
 *
 * ```ts
 * export function checkXxx(input: XxxInput, locale?: string): StandardResult {
 *   const t = buildT(locale || 'en');
 *   const base = buildStandardResult({ riskScore: 7, isHighRisk: true, ... }, t);
 *   return {
 *     ...base,
 *     // extra module-specific fields
 *   };
 * }
 * ```
 */
import type { StandardResult } from './types';

type PartialResult = Partial<StandardResult>;
type Translator = (key: string) => string;

/**
 * 填充 StandardResult 默认值
 * @param partial - 模块提供的部分字段
 * @param t - 翻译函数（可选，没有则用英文 fallback）
 */
export function buildStandardResult(partial: PartialResult, t?: Translator): StandardResult {
  const _ = t || ((k: string) => k);

  return {
    // 1. Risk
    riskScore: partial.riskScore ?? 0,
    riskDimensions: partial.riskDimensions ?? [],
    isHighRisk: partial.isHighRisk ?? false,
    verdictLabel: partial.verdictLabel ?? _('gaccVerdictStandard'),
    riskPathway: partial.riskPathway ?? '',
    executiveSummary: partial.executiveSummary ?? '',
    oneLineDecision: partial.oneLineDecision ?? '',
    viability: partial.viability ?? _('gaccViability'),

    // 2. Market
    channels: partial.channels ?? [],
    marketIntel: partial.marketIntel ?? defaultMarketIntel(_),
    competitiveAnalysis: partial.competitiveAnalysis ?? '',

    // 3. Regulatory
    regulations: partial.regulations ?? [],
    classification: partial.classification ?? { riskReason: '' },
    riskMatrix: partial.riskMatrix ?? [],
    tariffInfo: partial.tariffInfo ?? {
      mfnRate: 'Varies',
      ftaRate: null,
      vatRate: '13%',
      totalTaxBurden: 'Varies',
    },

    // 4. Documents
    requiredDocuments: partial.requiredDocuments ?? [],
    documentGuide: partial.documentGuide ?? [],

    // 5. Timeline
    estimatedTimeline: partial.estimatedTimeline ?? _('gaccTimeline_review_name'),
    detailedTimeline: partial.detailedTimeline ?? '',
    timelinePhases: partial.timelinePhases ?? [],

    // 6. Cost
    costBreakdown: partial.costBreakdown ?? [],
    totalCostRange: partial.totalCostRange ?? _('gaccCost_registration_item'),

    // 7. Post-Approval
    postApprovalObligations: partial.postApprovalObligations ?? [],

    // 8. Horizon
    horizonScan: partial.horizonScan ?? [],

    // 9. Pitfalls
    commonRejections: partial.commonRejections ?? [],

    // Summary
    summary: partial.summary ?? '',
  };
}

function defaultMarketIntel(t: Translator) {
  return {
    chinaImportTrend: '',
    topOrigins: [],
    consumerPerception: '',
    keyDrivers: [],
    barriers: [],
    recommendation: '',
  };
}
