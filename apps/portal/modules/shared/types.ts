/**
 * 统一合规报告类型 — 所有 6 个 Portal 模块共用
 */
export interface RiskDimension {
  dimension: string;
  score: number;
  color: string;
  note: string;
}

export interface DocumentGuideItem {
  name: string;
  format: string;
  notarization: string;
  validity: string;
  commonError: string;
}

export interface CommonRejection {
  problem: string;
  cause: string;
  solution: string;
}

export interface TimelinePhase {
  phase: string;
  duration: string;
  description: string;
  responsible: string;
  dependencies: string[];
}

export interface ChannelStrategy {
  channel: string;
  suitability: string;
  description: string;
  advantages: string[];
  disadvantages: string[];
  timeline: string;
  costRange: string;
  gaccRequired?: boolean;
}

export interface RiskMatrixItem {
  dimension: string;
  rating: string;
  explanation: string;
}

export interface MarketIntel {
  chinaImportTrend: string;
  topOrigins: { country: string; share: string }[];
  consumerPerception: string;
  keyDrivers: string[];
  barriers: string[];
  recommendation: string;
}

export interface CostBreakdownItem {
  item: string;
  estimatedRange: string;
  notes: string;
}

export interface PostApprovalItem {
  item: string;
  frequency: string;
  description: string;
}

export interface HorizonItem {
  topic: string;
  impact: string;
  timeframe: string;
  description: string;
  actionRequired: boolean;
}

export interface Regulation {
  name: string;
  number: string;
  issuingAuthority: string;
  relevance: string;
  effectiveDate: string;
  description: string;
}

export interface CountryProfile {
  region: string;
  ftaWithChina: boolean;
  ftaDetails: string;
  specialRestrictions: string[];
  bilateralMeatAccess: boolean;
  bilateralAquaticAccess: boolean;
  dairyApproved: boolean;
  gaccDifficulty: string;
  languageNote: string;
  commonIssues: string[];
  importVolumeNote: string;
}

export interface LabelGuideItem {
  field: string;
  requirement: string;
  commonMistake: string;
}

export interface LabelGuide {
  requiredItems: LabelGuideItem[];
  gb7718Highlights: string[];
  gb28050Highlights: string[];
}

export interface TariffInfo {
  mfnRate: string;
  ftaRate: string | null;
  vatRate: string;
  consumptionTax?: string;
  totalTaxBurden: string;
  estimatedLandedCostExample?: string;
}

export interface ClassificationInfo {
  assignedHsChapter?: string;
  ciqCode?: string;
  isHighRisk?: boolean;
  riskReason: string;
  alternativeClassificationNote?: string;
}

// ══════════════════════════════════════════════════════════════════
// StandardResult — 23 个必填字段
// ══════════════════════════════════════════════════════════════════

export interface StandardResult {
  riskScore: number;
  riskDimensions: RiskDimension[];
  isHighRisk: boolean;
  verdictLabel: string;
  riskPathway: string;
  executiveSummary: string;
  oneLineDecision: string;
  viability: string;
  channels: ChannelStrategy[];
  marketIntel: MarketIntel;
  competitiveAnalysis: string;
  regulations: Regulation[];
  classification: ClassificationInfo;
  riskMatrix: RiskMatrixItem[];
  tariffInfo: TariffInfo;
  requiredDocuments: string[];
  documentGuide: DocumentGuideItem[];
  estimatedTimeline: string;
  detailedTimeline: string;
  timelinePhases: TimelinePhase[];
  costBreakdown: CostBreakdownItem[];
  totalCostRange: string;
  postApprovalObligations: PostApprovalItem[];
  horizonScan: HorizonItem[];
  commonRejections: CommonRejection[];
  summary: string;
}

/** 宽松类型 — 包含 StandardResult + 模块专属扩展字段 */
export type ComplianceResult = StandardResult & Record<string, any>;

export interface ComplianceReport {
  id: string;
  module: string;
  locale?: string;
  productInfo: {
    name: string;
    category: string;
    hsCode?: string;
    originCountry: string;
  };
  result: ComplianceResult;
  nextSteps: string[];
  generatedAt: string;
  savedInput?: any;
}

export interface CategoryProfile {
  label: string;
  isHighRisk: boolean;
  riskReason: string;
  labTests: string[];
  testCostRange: string;
  commonRejections: CommonRejection[];
  mfnRate?: string;
  vatRate?: string;
  consumptionTax?: string;
  timeline?: string;
  competitorOrigin?: string[];
  marketTrend?: string;
  hsRange?: string;
  ciqCode?: string;
  chinaTariffRate?: string;
  gaccTimelineHigh?: string;
  gaccTimelineLow?: string;
}
