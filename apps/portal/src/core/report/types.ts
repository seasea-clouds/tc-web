/**
 * 统一报告类型定义 — 所有模块共用
 * 
 * BaseReportData: 共享区块（法规/费用/时间线/前瞻等）
 * ModuleReportMap: 模块专有扩展字段
 */

// ─── 共享基础类型 ──────────────────────────────────────────────────────

export interface TimelinePhase {
  phase: string;
  duration: string;
  activities: string[];
}

export interface CostBreakdown {
  item: string;
  estimatedCost: string;
  notes: string;
}

export interface HorizonItem {
  topic: string;
  impact: 'high' | 'medium' | 'low';
  timeframe: string;
  description: string;
  actionRequired: boolean;
}

export interface Regulation {
  name: string;
  number: string;
  effectiveDate: string;
  issuingAuthority: string;
  relevance: 'primary' | 'secondary';
  description: string;
  url?: string;
}

export interface GlossaryItem {
  term: string;
  def: string;
}

export interface RiskDimension {
  dimension: string;
  score: number;
  color: string;
  note: string;
}

export interface MarketIntel {
  chinaImportTrend: string;
  topOrigins: { country: string; share: string }[];
  consumerPerception: string;
  keyDrivers: string[];
  barriers: string[];
  recommendation: string;
}

export interface ReportLabels {
  title: string;
  sectionProduct: string;
  sectionResult: string;
  sectionDocuments: string;
  sectionNextSteps: string;
  ctaTitle: string;
  ctaDesc: string;
  ctaBtn: string;
  footerName: string;
  footerAddress: string;
  footerEmail: string;
  labelProduct: string;
  labelCategory: string;
  labelHsCode?: string;
  labelOrigin: string;
  gaccRequired: string;
  gaccNotRequired: string;
}

// ─── 基础报告数据（所有模块必须返回） ────────────────────────────────

export interface BaseReportData {
  requiresRegistration: boolean;
  isHighRisk: boolean;
  riskCategory: 'high' | 'low';
  riskScore: number; // 1-10
  riskDimensions: RiskDimension[];
  executiveSummary: string;
  oneLineDecision: string;
  viability: string;
  regulations: Regulation[];
  requiredDocuments: string[];
  commonRejections: { problem: string; cause: string; solution: string }[];
  timelinePhases: TimelinePhase[];
  costBreakdown: CostBreakdown[];
  totalCostRange: string;
  estimatedTimeline: string;
  detailedTimeline: string;
  postApprovalObligations: { item: string; frequency: string; description: string }[];
  horizonScan: HorizonItem[];
  marketIntel: MarketIntel;
  competitiveAnalysis: string;
  glossary: GlossaryItem[];
  nextSteps?: string[];
}

// ─── 模块专有扩展 ──────────────────────────────────────────────────────

export interface GaccExtra {
  channels: ChannelStrategy[];
  tariffInfo: TariffInfo;
  classification: GaccClassification;
  riskMatrix: RiskMatrixItem[];
  documentGuide: DocGuideItem[];
  labTests: string[];
  testCostRange: string;
  labGuide: string;
  labelGuide: LabelGuide;
  countryProfile: CountryProfile;
}

export interface ChannelStrategy {
  channel: string;
  suitability: 'high' | 'medium' | 'low';
  gaccRequired: boolean;
  description: string;
  advantages: string[];
  disadvantages: string[];
  timeline: string;
  costRange: string;
}

export interface TariffInfo {
  hsCode: string;
  mfnRate: string;
  ftaRate: string | null;
  vatRate: string;
  consumptionTax: string;
  totalTaxBurden: string;
  estimatedLandedCostExample: string;
}

export interface GaccClassification {
  assignedHsChapter: string;
  ciqCode: string;
  isHighRisk: boolean;
  riskReason: string;
  alternativeClassificationNote: string;
}

export interface RiskMatrixItem {
  dimension: string;
  rating: '🟢' | '🟡' | '🔴';
  explanation: string;
}

export interface DocGuideItem {
  name: string;
  format: string;
  notarization: string;
  validity: string;
  commonError: string;
}

export interface LabelGuide {
  requiredItems: LabelItem[];
  gb7718Highlights: string[];
  gb28050Highlights: string[];
}

export interface LabelItem {
  field: string;
  requirement: string;
  commonMistake: string;
}

export interface CountryProfile {
  region: string;
  ftaWithChina: boolean;
  ftaDetails: string;
  specialRestrictions: string[];
  gaccDifficulty: 'easy' | 'moderate' | 'difficult';
  languageNote: string;
  commonIssues: string[];
  importVolumeNote: string;
}

// ─── CCC 专有扩展 ─────────────────────────────────────────────────────

export interface CccExtra {
  certificationBody: string;
  factoryAuditRequirements: string[];
  testingStandards: string[];
  cbReportAcceptance: string;
}

// ─── NMPA 专有扩展 ─────────────────────────────────────────────────────

export interface NmpaExtra {
  filingType: 'notification' | 'registration';
  testingRequirements: string[];
  animalTestingExemption: boolean;
  chineseRPActionItems: string[];
}

// ─── Label 专有扩展 ────────────────────────────────────────────────────

export interface LabelExtra {
  mandatoryElements: string[];
  gb7718Details: string[];
  gb28050Details: string[];
}

// ─── Cross-border 专有扩展 ─────────────────────────────────────────────

export interface CrossborderExtra {
  platformRequirements: PlatformRequirement[];
  logisticsModels: string[];
  customsDocs: string[];
}

export interface PlatformRequirement {
  platform: string;
  requirements: string[];
  fees: string;
}

// ─── Trademark 专有扩展 ────────────────────────────────────────────────

export interface TrademarkExtra {
  niceClasses: { class: string; description: string }[];
  registrationPath: string;
  oppositionMonths: number;
  customsRecordalSteps: string[];
}

// ─── 联合类型 ──────────────────────────────────────────────────────────

export type ReportData = BaseReportData & Partial<GaccExtra & CccExtra & NmpaExtra & LabelExtra & CrossborderExtra & TrademarkExtra>;

export type ModuleType =
  | 'GACC Food Registration'
  | 'CCC Certification'
  | 'Chinese Label Compliance'
  | 'Cosmetics Filing (NMPA)'
  | 'Cross-Border E-commerce'
  | 'Brand Protection';
