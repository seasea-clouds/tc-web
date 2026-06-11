import { buildT } from '../shared/i18n';
/**
 * 品牌保护 / 商标注册 — 深度规则引擎
 */
export type TrademarkCategory =
  | "food" | "cosmetics" | "electronics" | "apparel"
  | "beverage" | "health_supplement" | "luxury" | "other";

export interface TrademarkInput {
  category: TrademarkCategory;
  brandName: string;
  registeredInChina: boolean;
  productName: string;
  originCountry?: string;
  hasChineseName?: string;
  hasForeignRegistration?: string;
  tmClassDescription?: string;
  brandYearsInMarket?: string;
  needsCustomsRecordal?: string;
}

export const CATEGORY_LABELS: Record<string, string> = {
  "food": "Food Products", "cosmetics": "Cosmetics / Personal Care",
  "electronics": "Electronics / Technology", "apparel": "Apparel / Fashion",
  "beverage": "Beverages", "health_supplement": "Health Supplements",
  "luxury": "Luxury Goods", "other": "Other",
};

export function checkTrademark(input: any, locale?: string): any {
  const t = buildT(locale || 'en');

  const needsReg = !input.registeredInChina;
  const isHighRisk = needsReg;
  const riskScore = needsReg ? 7.5 : 2.0;
  return {
    needsRegistration: needsReg, requiresRegistration: needsReg, riskCategory: isHighRisk ? "high" : "low", isHighRisk, riskScore,
    estimatedTimeline: "8-14 months", totalCostRange: "$600-2,000/class",
    verdictLabel: t(needsReg ? 'tmVerdictHigh' : 'tmVerdictLow'),
    riskPathway: t(needsReg ? 'tmRiskPathwayHigh' : 'tmRiskPathwayLow'),
    executiveSummary: t('tmExecutiveSummary').replace('{brandName}', input.brandName || ''),
    oneLineDecision: t(needsReg ? 'tmOneLineHigh' : 'tmOneLineLow'),
    summary: t(needsReg ? 'tmSummaryHigh' : 'tmSummaryLow'),
    riskDimensions: [
      { dimension: "Registration Status", score: needsReg ? 9 : 1, color: needsReg ? "🔴" : "🟢", note: needsReg ? "Not registered — high risk" : "Registered" },
      { dimension: "Squatter Risk", score: needsReg ? 8 : 3, color: needsReg ? "🔴" : "🟢", note: "China first-to-file: squatters may grab your brand" },
      { dimension: "Timeline", score: needsReg ? 6 : 1, color: needsReg ? "🟡" : "🟢", note: "8-14 months if filing now" },
      { dimension: "Cost", score: 3, color: "🟢", note: "$600-2,000/class" },
      { dimension: "Enforcement", score: needsReg ? 8 : 3, color: needsReg ? "🔴" : "🟢", note: needsReg ? "Cannot enforce without registration" : "Full enforcement rights" },
    ],
    channels: [
      { channel: "Trademark Registration", suitability: "high", gaccRequired: false, description: "File with CNIPA for full legal protection", advantages: ["Legal protection", "Platform enforcement"], disadvantages: ["8-14 month timeline"], timeline: "8-14 months", costRange: "$600-2,000/class" },
    ],
    tariffInfo: { mfnRate: "N/A", vatRate: "N/A", consumptionTax: "N/A", ftaRate: null, totalTaxBurden: "N/A (legal service, not import)" },
    regulations: [
      { name: "Trademark Law of China", number: "4th Revision 2019", effectiveDate: "November 1, 2019", issuingAuthority: "CNIPA/NPC", relevance: "primary", description: "First-to-file system. Art.32 prevents bad-faith filings. Art.57 defines infringement." },
      { name: "Trademark Examination Guidelines", number: "CNIPA 2021 Edition", effectiveDate: "2021", issuingAuthority: "CNIPA", relevance: "primary", description: "Examination standards for distinctiveness and similarity." },
      { name: "Customs IP Protection Regulations", number: "State Council Decree 395", effectiveDate: "March 1, 2004", issuingAuthority: "GACC", relevance: "secondary", description: "Border enforcement — customs can detain suspected counterfeits." },
    ],
    classification: { assignedHsChapter: "N/A", ciqCode: "N/A", isHighRisk: needsReg, riskReason: needsReg ? "Brand not registered. First-to-file risk." : "Registered.", alternativeClassificationNote: "" },
    riskMatrix: [
      { dimension: "Registration Status", rating: needsReg ? "🔴" : "🟢", explanation: needsReg ? "Not registered" : "Registered" },
      { dimension: "Squatter Risk", rating: "🔴", explanation: "China first-to-file — anyone can register your brand" },
      { dimension: "Timeline", rating: needsReg ? "🟡" : "🟢", explanation: "8-14 months" },
    ],
    documentGuide: [
      { name: t("tmDoc_appForm_name"), format: t("tmDoc_appForm_format"), notarization: t("tmDoc_appForm_notarization"), validity: t("tmDoc_appForm_validity"), commonError: t("tmDoc_appForm_error") },
      { name: t("tmDoc_logo_name"), format: t("tmDoc_logo_format"), notarization: t("tmDoc_logo_notarization"), validity: t("tmDoc_logo_validity"), commonError: t("tmDoc_logo_error") },
      { name: t("tmDoc_goodsList_name"), format: t("tmDoc_goodsList_format"), notarization: t("tmDoc_goodsList_notarization"), validity: t("tmDoc_goodsList_validity"), commonError: t("tmDoc_goodsList_error") },
      { name: t("tmDoc_poa_name"), format: t("tmDoc_poa_format"), notarization: t("tmDoc_poa_notarization"), validity: t("tmDoc_poa_validity"), commonError: t("tmDoc_poa_error") },
    ],
    requiredDocuments: ["TM Application Form", "Brand Specimen", "Goods/Services List", "Power of Attorney"],
    testRequirements: ["CNIPA database search", "Common law prior art search"],
    testCostRange: "$200-500",
    labGuide: "Trademark search should cover CNIPA database + WIPO Global Brand DB + common law marketplace use.",
    labTests: ["CNIPA search", "WIPO search", "Marketplace search"],
    viability: "Critical — trademark registration is essential for China market entry",
    detailedTimeline: "Search (1-2 weeks) → Application (1-3 days) → Formal exam (1-2 months) → Substantive exam (6-9 months) → Publication (3 months) → Registration (1-2 months). Total: 8-14 months.",
    labelGuide: { requiredItems: [], gb7718Highlights: [], gb28050Highlights: [] },
    timelinePhases: [
      { phase: t("tmTimeline_search_name"), duration: "1-2 weeks", description: t("tmTimeline_search_desc"), responsible: "Both", dependencies: [] },
      { phase: t("tmTimeline_filing_name"), duration: "1-3 days", description: t("tmTimeline_filing_desc"), responsible: "SinoTrade", dependencies: ["Search complete"] },
      { phase: t("tmTimeline_formalExam_name"), duration: "1-2 months", description: t("tmTimeline_formalExam_desc"), responsible: "CNIPA", dependencies: ["Application filed"] },
      { phase: t("tmTimeline_substantiveExam_name"), duration: "6-9 months", description: t("tmTimeline_substantiveExam_desc"), responsible: "CNIPA", dependencies: ["Formal exam passed"] },
      { phase: t("tmTimeline_publication_name"), duration: "3 months", description: t("tmTimeline_publication_desc"), responsible: "CNIPA", dependencies: ["Substantive exam passed"] },
      { phase: t("tmTimeline_cert_name"), duration: "1-2 months", description: t("tmTimeline_cert_desc"), responsible: "Both", dependencies: ["Publication period passed"] },
    ],
    costBreakdown: [
      { item: t("tmCost_search_item"), estimatedRange: "$200-500", notes: t("tmCost_search_notes") },
      { item: t("tmCost_filing_item"), estimatedRange: "$300-600", notes: t("tmCost_filing_notes") },
      { item: t("tmCost_cert_item"), estimatedRange: "$100-200", notes: t("tmCost_cert_notes") },
      { item: t("tmCost_service_item"), estimatedRange: "$800-2,000", notes: t("tmCost_service_notes") },
    ],
    countryProfile: { region: "", ftaWithChina: false, ftaDetails: "", specialRestrictions: [], bilateralMeatAccess: false, bilateralAquaticAccess: false, dairyApproved: false, gaccDifficulty: "moderate", languageNote: "CNIPA filings in Chinese required.", commonIssues: [], importVolumeNote: "" },
    marketIntel: { chinaImportTrend: t("tmMarket_trend"), keyDrivers: [t("tmMarket_driver1"), t("tmMarket_driver2"), t("tmMarket_driver3")], barriers: [t("tmMarket_barrier1"), t("tmMarket_barrier2"), t("tmMarket_barrier3")], consumerPerception: t("tmMarket_perception"), topOrigins: [], recommendation: t(needsReg ? "tmMarket_recoHigh" : "tmMarket_recoLow") },
    competitiveAnalysis: t("tmCompetitiveAnalysis"),
    commonRejections: [
      { problem: t("tmRej0_problem"), cause: t("tmRej0_cause"), solution: t("tmRej0_solution") },
      { problem: t("tmRej1_problem"), cause: t("tmRej1_cause"), solution: t("tmRej1_solution") },
    ],
    postApprovalObligations: [
      { item: t("tmPost_renewal_item"), frequency: t("tmPost_renewal_frequency"), description: t("tmPost_renewal_desc") },
      { item: t("tmPost_useEvidence_item"), frequency: t("tmPost_useEvidence_frequency"), description: t("tmPost_useEvidence_desc") },
      { item: t("tmPost_watch_item"), frequency: t("tmPost_watch_frequency"), description: t("tmPost_watch_desc") },
    ],
    horizonScan: [
      { topic: t("tmHorizon_lawRev_topic"), impact: t("tmHorizon_lawRev_impact"), timeframe: t("tmHorizon_lawRev_timeframe"), description: t("tmHorizon_lawRev_desc"), actionRequired: true },
    ],
  
  niceClasses: {
    food: "Class 29 (Meat/Fish), 30 (Coffee/Cereal), 31 (Fresh), 32 (Beverages), 33 (Alcohol)",
    cosmetics: "Class 3 (Cosmetics/Soap)",
    electronics: "Class 9 (Electronics/Software), 11 (Appliances)",
    apparel: "Class 25 (Clothing/Shoes)",
    beverage: "Class 32 (Non-alcoholic), 33 (Alcoholic)",
    health_supplement: "Class 5 (Pharmaceuticals/Supplements), 30 (Health foods)",
    luxury: "Class 14 (Jewelry), 18 (Leather), 25 (Clothing)",
    other: "Contact us for class recommendation"
  },
  registrationProcess: [
    { step: "Trademark Search", duration: "1-2 weeks", detail: "CNIPA database + WIPO + common law search" },
    { step: "Application Filing", duration: "1-3 days", detail: "Submit to CNIPA with classification" },
    { step: "Formal Examination", duration: "1-2 months", detail: "CNIPA reviews formalities" },
    { step: "Substantive Examination", duration: "6-9 months", detail: "Distinctiveness + similarity check" },
    { step: "Publication (Opposition)", duration: "3 months", detail: "Third party opposition window" },
    { step: "Registration Certificate", duration: "1-2 months", detail: "Certificate issued. Valid 10 years." },
  ],
  squattingGuide: {
    risk: "China is first-to-file — anyone can register your brand before you do",
    stats: "15-25% of foreign brands experience squatting in China",
    prevention: ["File trademark in China BEFORE market entry", "File defensive classes", "Monitor CNIPA weekly", "File transliteration marks"],
    remedy: ["File opposition within 3 months of publication", "Invalidation action (prove bad faith)", "Negotiate purchase from squatter"]
  },
  customsRecordalSteps: [
    "Register trademark with CNIPA (8-14 months)",
    "File Customs IP Recordal application online (GACC e-portal)",
    "Submit: TM certificate + Power of Attorney + product photos",
    "Customs reviews (1-2 months) — approval valid 10 years",
    "Upon approval, customs can detain suspected counterfeits at all Chinese ports"
  ],
  watchServiceGuide: {
    description: "Monthly monitoring of CNIPA trademark applications for conflicting marks",
    includes: ["Monthly CNIPA database scan", "Conflict alert within 48 hours", "Opposition feasibility analysis", "Enforcement recommendation"],
    frequency: "Monthly reports + real-time alerts for urgent conflicts",
    cost: "$200-500/month depending on number of classes"
  },
};
}