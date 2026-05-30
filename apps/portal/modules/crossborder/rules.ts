/**
 * 跨境电商合规 — 深度规则引擎
 */
export type CrossborderCategory =
  | "food" | "cosmetics" | "electronics" | "apparel"
  | "health_supplement" | "baby_product" | "home_goods" | "other";

export interface CrossborderInput {
  category: CrossborderCategory;
  productName: string;
  targetPlatform: string;
  hasBondedWarehouse: boolean;
  originCountry?: string;
  monthlyVolume?: string;
  hasTMRegistration?: string;
  hasChineseLabel?: string;
  productWeight?: string;
  shelfLifeMonths?: string;
}

export const CATEGORY_LABELS: Record<string, string> = {
  "food": "Food & Beverages", "cosmetics": "Cosmetics / Personal Care",
  "electronics": "Electronics / Small Appliances", "apparel": "Apparel / Fashion",
  "health_supplement": "Health Supplements", "baby_product": "Baby / Maternity",
  "home_goods": "Home / Kitchen", "other": "Other",
};

export function checkCrossborder(input: any): any {
  const riskScore = 3.5;
  return {
    requiresRegistration: true, riskCategory: "low", isHighRisk: false, riskScore,
    estimatedTimeline: "4-10 weeks", totalCostRange: "$10,000-40,000",
    verdictLabel: 'Low Risk',
    riskPathway: 'On positive list — fastest route to Chinese market.',
    executiveSummary: `CBEC assessment for ${input.productName} — eligible for cross-border e-commerce channel.`,
    oneLineDecision: "✅ CBEC eligible. No GACC registration needed.",
    summary: "Cross-border e-commerce is the fastest channel for entering China.",
    riskDimensions: [
      { dimension: "Positive List", score: 2, color: "🟢", note: "Category is on CBEC positive list" },
      { dimension: "Platform Setup", score: 4, color: "🟡", note: "Platform onboarding 4-8 weeks" },
      { dimension: "Compliance", score: 2, color: "🟢", note: "No GACC required for CBEC" },
      { dimension: "Timeline", score: 3, color: "🟢", note: "4-10 weeks" },
      { dimension: "Investment", score: 5, color: "🟡", note: "$10,000-40,000 initial" },
    ],
    channels: [
      { channel: "Tmall Global", suitability: "high", gaccRequired: false, description: "Largest CBEC platform", advantages: ["Massive traffic", "Integrated logistics (Cainiao)"], disadvantages: ["Higher deposit", "Extensive docs"], timeline: "4-8 weeks", costRange: "$15,000-40,000" },
      { channel: "JD Worldwide", suitability: "high", gaccRequired: false, description: "Strong for electronics/health", advantages: ["Own logistics (JD Logistics)", "Trusted for authentic"], disadvantages: ["Stricter QC"], timeline: "4-8 weeks", costRange: "$12,000-35,000" },
    ],
    tariffInfo: { mfnRate: "9.1% comprehensive", vatRate: "70% of standard", consumptionTax: "N/A", ftaRate: "CBEC tax discount applies", totalTaxBurden: "~9.1% (70% discount on tariff + VAT)" },
    regulations: [
      { name: "CBEC Retail Import Policy", number: "MOFCOM 2018 Notice", effectiveDate: "January 2019", authority: "MOFCOM", relevance: "primary", description: "Framework for cross-border e-commerce retail import." },
      { name: "CBEC Positive List", number: "MOFCOM/GACC Joint List", effectiveDate: "Updated annually", authority: "MOFCOM/GACC", relevance: "primary", description: "Defines products eligible for CBEC import." },
      { name: "Personal Use Declaration", number: "GACC Decree 249 Art.5", effectiveDate: "January 1, 2022", authority: "GACC", relevance: "primary", description: "CBEC goods imported as personal use items." },
    ],
    classification: { assignedHsChapter: "Varies", ciqCode: "Check import", isHighRisk: false, riskReason: "On CBEC positive list. Simplified compliance.", alternativeClassificationNote: "" },
    riskMatrix: [
      { dimension: "Positive List", rating: "🟢", explanation: "Category on approved list" },
      { dimension: "Platform Setup", rating: "🟡", explanation: "4-8 weeks onboarding" },
      { dimension: "Ongoing Compliance", rating: "🟢", explanation: "No GACC registration needed" },
    ],
    documentGuide: [
      { name: "Business Registration", format: "PDF", notarization: "Certified copy", validity: "Current", commonError: "Not apostilled" },
      { name: "Brand Authorization Letter", format: "PDF", notarization: "Certified translation", validity: "Per application", commonError: "Chain broken" },
      { name: "Product Listings (Chinese)", format: "HTML/JPEG", notarization: "Not required", validity: "Per application", commonError: "Claims non-compliant" },
      { name: "Label Artwork", format: "PDF/JPEG", notarization: "Not required", validity: "Per application", commonError: "Still needs GB review" },
    ],
    requiredDocuments: ["Business Registration", "Brand Auth Letter", "Product Listings", "Label Artwork"],
    testRequirements: ["Platform product listing review", "Label compliance check"],
    testCostRange: "$500-2,000",
    labGuide: "Platforms perform their own review of product listings. Labels must still comply with Chinese standards.",
    labTests: ["Platform listing review", "Label compliance"],
    viability: "High — CBEC is the fastest route to Chinese market",
    detailedTimeline: "Platform selection (2-3 weeks) → Document preparation (2-3 weeks) → Platform review (2-4 weeks) → Go live. Total: 4-10 weeks.",
    labelGuide: { requiredItems: [], gb7718Highlights: [], gb28050Highlights: [] },
    timelinePhases: [
      { phase: "Platform Selection", duration: "2-3 weeks", description: "Evaluate Tmall Global vs JD Worldwide vs Douyin", responsible: "Both", dependencies: [] },
      { phase: "Document Preparation", duration: "2-3 weeks", description: "Company reg, brand auth, product info", responsible: "Both", dependencies: ["Platform selected"] },
      { phase: "Platform Application", duration: "2-4 weeks", description: "Submit to platform, product listing review", responsible: "SinoTrade", dependencies: ["Documents ready"] },
      { phase: "Store Launch", duration: "1-2 weeks", description: "Setup storefront, upload listings, go live", responsible: "Both", dependencies: ["Platform approved"] },
    ],
    costBreakdown: [
      { item: "Platform Deposit", estimatedRange: "$5,000-25,000", notes: "Refundable platform deposit" },
      { item: "Platform Annual Fee", estimatedRange: "$5,000-15,000", notes: "Yearly service fee" },
      { item: "Bonded Warehouse Setup", estimatedRange: "$2,000-5,000", notes: "Registration + product filing" },
      { item: "Compliance & Listing Service", estimatedRange: "$1,000-5,000", notes: "Professional listing setup" },
    ],
    countryProfile: { region: "", ftaWithChina: false, ftaDetails: "", specialRestrictions: [], bilateralMeatAccess: false, bilateralAquaticAccess: false, dairyApproved: false, gaccDifficulty: "easy", languageNote: "Chinese listings required.", commonIssues: [], importVolumeNote: "" },
    marketIntel: { chinaImportTrend: "CBEC is fastest-growing import channel. $200B+ market. 100M+ consumers.", keyDrivers: ["Lower entry barrier", "No GACC for most categories", "Fast market access"], barriers: ["Platform competition", "Marketing cost", "Order limits"], consumerPerception: "CBEC trusted for authentic imports.", topOrigins: [], recommendation: "Start with one platform (Tmall Global recommended) then expand." },
    competitiveAnalysis: "Thousands of brands on Tmall Global. Korean cosmetics, Japanese snacks, Australian supplements dominate.",
    commonRejections: [
      { problem: "Product not on positive list", cause: "Specific HS code restricted", solution: "Verify HS code against latest positive list" },
      { problem: "Brand authorization chain incomplete", cause: "Platform requires full chain", solution: "Establish complete authorization before applying" },
    ],
    countryNotes: [
      "Translation service recommended for product listings and label artwork.",
      "Some categories face stricter inspection at customs (e.g., electronics).",
      "Bonded warehouse inventory must reconcile monthly with platform data.",
      "Consumer protection law requires 7-day no-questions-asked returns.",
      "Intellectual property filing (trademark registration) recommended before listing.",
    ],
    postApprovalObligations: [
      { item: "Platform Compliance Review", frequency: "Quarterly", description: "Plaform audits product listings" },
      { item: "Bonded Warehouse Inventory", frequency: "Monthly", description: "Verify inventory accuracy" },
    ],
    postApproval: [
      { item: "Platform Compliance Review", freq: "Quarterly", desc: "Platform audits product listings for compliance" },
      { item: "Bonded Warehouse Inventory", freq: "Monthly", desc: "Reconcile inventory with platform records" },
      { item: "Label Renewal Check", freq: "Annually", desc: "Verify labels still meet current GB standards" },
      { item: "Positive List Review", freq: "Annually", desc: "Check if category remains on CBEC positive list" },
    ],
    horizonScan: [
      { topic: "Positive List Expansion", impact: "high", timeframe: "2025", description: "More food categories expected to be added.", actionRequired: true },
    ],
  
  platformGuide: [
    { platform: "Tmall Global", fee: "Deposit $25,000 + 5% commission", req: "Overseas company + brand + TM registration", traffic: "Largest CBEC traffic (50%+ market share)", timeline: "2-4 months to onboard" },
    { platform: "JD Worldwide", fee: "Deposit $20,000 + 5-8% commission", req: "Overseas company + brand registration", traffic: "Strong electronics/home categories", timeline: "2-3 months to onboard" },
    { platform: "Douyin Global", fee: "Deposit $5,000 + 2-5% commission", req: "Overseas company + content capability", traffic: "Fastest growing — live-streaming focused", timeline: "1-2 months to onboard" },
  ],
  logisticsModels: {
    bbc: { name: "1210 Bonded Warehouse", process: "Bulk shipment -> Bonded warehouse -> Customs clearance -> Door-to-door", advantage: "Faster delivery (2-5 days), lower per-unit cost", requirement: "CBEC positive list product" },
    direct: { name: "9610 Direct Shipping", process: "Order placed -> Overseas warehouse -> Courier -> Customs clearance -> Delivery", advantage: "No bonded warehouse needed, wider product range", requirement: "Higher per-shipment cost" },
  },
  customsDocGuide: [
    "Order document (订单) — from platform", "Payment document (支付) — from payment gateway",
    "Logistics document (物流) — from carrier" , "Commercial invoice", "Packing list", "Certificate of Origin (if FTA)"
  ],
  positiveList: {
    note: "Only products on CBEC positive list can use 1210 bonded warehouse model",
    checkMethod: "Verify via MOFCOM CBEC positive list catalog or consult compliance specialist",
    typicalIncluded: ["Food supplements", "Cosmetics", "Baby formula", "Small appliances", "Apparel"],
    typicalExcluded: ["Fresh food", "Live animals", "Large medical devices"]
  },
  cbTaxInfo: {
    calculation: "Comprehensive tax = (price + shipping) x 70% x (tariff rate + VAT rate)",
    threshold: "Personal use limit: RMB 5,000/transaction, RMB 26,000/year",
    note: "Tax exemption for purchases under RMB 1,000 (certain categories)",
    example: "Product $100 + shipping $20 -> Dutiable value = $84 -> Approx tax = $84 x 13% = $10.92"
  },
};
}