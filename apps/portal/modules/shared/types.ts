/**
 * 共享深度报告类型 — 所有模块公用
 * 18 模块结构：战略层 + 合规层 + 成本层 + 情报层
 */

// ─── 基础类型 ──────────────────────────────────────────────────────────

export interface DeepReportResult {
  // 模块标识
  moduleType: string;

  // 1. Executive Risk Scorecard
  riskScore: number;
  riskDimensions: { dimension: string; score: number; color: string; note: string }[];
  executiveSummary: string;
  oneLineDecision: string;

  // 2. Market Entry Viability
  viability: string;
  viabilityScore: number;
  marketTrend: string;
  keyDrivers: string[];
  barriers: string[];
  recommendation: string;

  // 3. Channel Strategy
  channels: ChannelStrategy[];

  // 4. Tariff & Tax
  tariffInfo: {
    mfnRate: string;
    ftaRate: string | null;
    vatRate: string;
    totalBurden: string;
  };

  // 5. Regulatory Framework
  regulations: Regulation[];

  // 6. Classification
  classification: {
    code: string;
    riskLevel: string;
    description: string;
  };

  // 7. Risk Matrix
  riskMatrix: { dimension: string; rating: string; explanation: string }[];

  // 8. Document Requirements
  documentGuide: { name: string; format: string; notarization: string; commonError: string }[];
  requiredDocuments: string[];

  // 9. Testing Requirements
  testRequirements: string[];
  testCostRange: string;

  // 10. Timeline
  timelinePhases: TimelinePhase[];
  estimatedTimeline: string;

  // 11. Cost Estimation
  costBreakdown: { item: string; range: string; note: string }[];
  totalCostRange: string;

  // 12. Country Analysis
  countryNotes: string[];

  // 13. Common Pitfalls
  commonIssues: { problem: string; cause: string; solution: string }[];

  // 14. Post-Approval
  postApproval: { item: string; freq: string; desc: string }[];

  // Legacy
  summary: string;
}

export interface Regulation {
  name: string;
  number: string;
  effectiveDate: string;
  authority: string;
  relevance: 'primary' | 'secondary';
  description: string;
}

export interface ChannelStrategy {
  name: string;
  suitability: 'high' | 'medium' | 'low';
  description: string;
  pros: string[];
  cons: string[];
  timeline: string;
  costRange: string;
}

export interface TimelinePhase {
  phase: string;
  duration: string;
  description: string;
  responsible: string;
  dependencies: string[];
}
