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

export function checkTrademark(input: any): any {
  const needsReg = !input.registeredInChina;
  const isHighRisk = needsReg;
  const riskScore = needsReg ? 7.5 : 2.0;
  return {
    needsRegistration: needsReg, requiresRegistration: needsReg, riskCategory: isHighRisk ? "high" : "low", isHighRisk, riskScore,
    estimatedTimeline: "8-14 months", totalCostRange: "$600-2,000/class",
    verdictLabel: needsReg ? 'High Risk' : 'Low Risk',
    riskPathway: needsReg ? 'Not registered — urgent filing needed before market entry.' : 'Registered — maintain and monitor for renewal.',
    executiveSummary: `Trademark assessment for "${input.brandName}".`,
    oneLineDecision: needsReg ? "🔴 Urgent: file trademark before market entry" : "🟢 Registered. Monitor renewal.",
    summary: needsReg ? "Brand NOT registered in China. High risk of bad-faith squatting." : "Brand registered. Ongoing monitoring recommended.",
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
      { name: "Trademark Law of China", number: "4th Revision 2019", effectiveDate: "November 1, 2019", authority: "CNIPA/NPC", relevance: "primary", description: "First-to-file system. Art.32 prevents bad-faith filings. Art.57 defines infringement." },
      { name: "Trademark Examination Guidelines", number: "CNIPA 2021 Edition", effectiveDate: "2021", authority: "CNIPA", relevance: "primary", description: "Examination standards for distinctiveness and similarity." },
      { name: "Customs IP Protection Regulations", number: "State Council Decree 395", effectiveDate: "March 1, 2004", authority: "GACC", relevance: "secondary", description: "Border enforcement — customs can detain suspected counterfeits." },
    ],
    classification: { assignedHsChapter: "N/A", ciqCode: "N/A", isHighRisk: needsReg, riskReason: needsReg ? "Brand not registered. First-to-file risk." : "Registered.", alternativeClassificationNote: "" },
    riskMatrix: [
      { dimension: "Registration Status", rating: needsReg ? "🔴" : "🟢", explanation: needsReg ? "Not registered" : "Registered" },
      { dimension: "Squatter Risk", rating: "🔴", explanation: "China first-to-file — anyone can register your brand" },
      { dimension: "Timeline", rating: needsReg ? "🟡" : "🟢", explanation: "8-14 months" },
    ],
    documentGuide: [
      { name: "Trademark Application Form", format: "CNIPA format", notarization: "Not required", validity: "Per application", commonError: "Goods description too vague" },
      { name: "Brand Specimen / Logo", format: "JPEG, 5-10cm", notarization: "Not required", validity: "Per application", commonError: "Low resolution" },
      { name: "Goods/Services List", format: "Excel per Nice Class", notarization: "Not required", validity: "Per application", commonError: "Not specific enough" },
      { name: "Power of Attorney", format: "PDF notarized", notarization: "Certified copy", validity: "Per application", commonError: "Missing signature/seal" },
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
      { phase: "Trademark Search", duration: "1-2 weeks", description: "CNIPA + WIPO + common law search", responsible: "Both", dependencies: [] },
      { phase: "Application Filing", duration: "1-3 days", description: "Submit to CNIPA with classification", responsible: "SinoTrade", dependencies: ["Search complete"] },
      { phase: "Formal Examination", duration: "1-2 months", description: "CNIPA reviews formalities", responsible: "CNIPA", dependencies: ["Application filed"] },
      { phase: "Substantive Examination", duration: "6-9 months", description: "CNIPA examines distinctiveness/conflicts", responsible: "CNIPA", dependencies: ["Formal exam passed"] },
      { phase: "Publication (Opposition)", duration: "3 months", description: "Third party opposition window", responsible: "CNIPA", dependencies: ["Substantive exam passed"] },
      { phase: "Registration Certificate", duration: "1-2 months", description: "Certificate issued. Valid 10 years.", responsible: "Both", dependencies: ["Publication period passed"] },
    ],
    costBreakdown: [
      { item: "Trademark Search", estimatedRange: "$200-500", notes: "CNIPA + WIPO comprehensive search" },
      { item: "Filing Fee (per class)", estimatedRange: "$300-600", notes: "CNIPA official fee" },
      { item: "Registration Certificate", estimatedRange: "$100-200", notes: "CNIPA issuance" },
      { item: "Professional Service", estimatedRange: "$800-2,000", notes: "Search + filing + monitoring" },
    ],
    countryProfile: { region: "", ftaWithChina: false, ftaDetails: "", specialRestrictions: [], bilateralMeatAccess: false, bilateralAquaticAccess: false, dairyApproved: false, gaccDifficulty: "moderate", languageNote: "CNIPA filings in Chinese required.", commonIssues: [], importVolumeNote: "" },
    marketIntel: { chinaImportTrend: "Trademark filings growing 15%+ annually. Class 25, 3, 9 most contested.", keyDrivers: ["Brand protection", "E-commerce enforcement", "Market entry"], barriers: ["First-to-file system", "Squatter risk", "Examination backlog"], consumerPerception: "Registered brands trusted on platforms.", topOrigins: [], recommendation: needsReg ? "File registration immediately. Consider defensive filings for Chinese transliteration." : "Maintain registration. Monitor for conflicting marks." },
    competitiveAnalysis: "Chinese brands dominate registration numbers. Foreign brands face squatter risk. 15-25% of foreign brands experience squatting.",
    commonRejections: [
      { problem: "Similar prior mark exists", cause: "Third party filed similar mark first", solution: "Comprehensive pre-filing search + class selection strategy" },
      { problem: "Brand squatted by local agent", cause: "First-to-file system — agent registered brand", solution: "File opposition within 3 months or negotiate purchase" },
    ],
    postApprovalObligations: [
      { item: "Trademark Renewal", frequency: "Every 10 years", description: "File renewal 6 months before expiry" },
      { item: "Use Evidence Collection", frequency: "Ongoing", description: "Evidence for 3-year non-use challenges" },
      { item: "Watch Service", frequency: "Monthly", description: "Monitor CNIPA for conflicting marks" },
    ],
    horizonScan: [
      { topic: "Trademark Law 5th Revision", impact: "high", timeframe: "2025-2026", description: "Stronger bad-faith filing penalties expected.", actionRequired: true },
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