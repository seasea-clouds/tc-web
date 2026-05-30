/**
 * NMPA — 深度规则引擎（品类级配置 / 法规 / 费用 / 时间线）
 */

export type CosmeticsCategory =
  | "skincare" | "makeup" | "haircare" | "fragrance" | "sunscreen"
  | "oral_care" | "body_care" | "baby" | "other";

export interface CosmeticsInput {
  category: CosmeticsCategory;
  productName: string;
  brandCountry: string;
  hasNewIngredient: boolean;
  originCountry?: string;
  hasAlcohol?: string;
  hasSunscreenClaim?: string;
  productFunction?: string;
  packagingVolume?: string;
  hasGMPCert?: string;
}

export const CATEGORY_LABELS: Record<string, string> = {
  "skincare": "Skincare (HS 33.04)",
  "makeup": "Color Cosmetics (HS 33.04)",
  "sunscreen": "Sunscreen (HS 33.04) — SPECIAL",
  "haircare": "Hair Care (HS 33.05)",
  "fragrance": "Fragrance / Perfume (HS 33.03)",
  "baby": "Baby Products (HS 33.04)",
};

const PROFILES: Record<string, any> = {"skincare": {"label": "Skincare (HS 33.04)", "special": false, "risk": "🟡 Medium", "riskReason": "Ordinary cosmetics. NMPA filing required.", "mfn": "1-5%", "vat": "13%", "testing": ["Microbiological GB 7918", "Heavy metals Pb/As/Hg/Cd", "Stability testing", "Skin irritation"], "testCost": "$1,000-3,000", "reject": [{"problem": "Ingredient not on ICSC catalogue", "cause": "Novel ingredient requires safety assessment", "solution": "Pre-check all INCI names against ICSC database"}], "time": "2-4 months"}, "makeup": {"label": "Color Cosmetics (HS 33.04)", "special": false, "risk": "🟡 Medium", "riskReason": "Ordinary cosmetics. Color additives on positive list.", "mfn": "1-5%", "vat": "13%", "testing": ["Microbiological", "Heavy metals", "Colorant identification", "Stability"], "testCost": "$1,500-4,000", "reject": [{"problem": "Color additive not approved in China", "cause": "China CosIng differs from EU/US approved lists", "solution": "Verify all colorants against China CosIng positive list"}], "time": "2-4 months"}, "sunscreen": {"label": "Sunscreen (HS 33.04) — SPECIAL", "special": true, "risk": "🔴 High", "riskReason": "SPECIAL cosmetics. Full NMPA registration + efficacy testing.", "mfn": "1-5%", "vat": "13%", "testing": ["Safety assessment per NMPA 2021", "SPF efficacy GB/T 35954", "Microbiological", "Heavy metals", "Stability"], "testCost": "$3,000-10,000", "reject": [{"problem": "SPF test method not per GB/T 35954", "cause": "Different protocol vs ISO or FDA methods", "solution": "Use CNAS lab qualified for GB/T 35954 SPF testing"}], "time": "6-12 months"}, "haircare": {"label": "Hair Care (HS 33.05)", "special": false, "risk": "🟢 Low", "riskReason": "Ordinary cosmetics. Standard filing.", "mfn": "1-5%", "vat": "13%", "testing": ["Microbiological", "Heavy metals"], "testCost": "$800-2,500", "reject": [], "time": "2-4 months"}, "fragrance": {"label": "Fragrance / Perfume (HS 33.03)", "special": false, "risk": "🟡 Medium", "riskReason": "Ordinary cosmetics. Alcohol regulations + allergen labeling.", "mfn": "3-6.5%", "vat": "13%", "testing": ["Microbiological", "Heavy metals", "Alcohol content", "Allergen screening"], "testCost": "$1,000-3,000", "reject": [{"problem": "Allergen list differs from EU", "cause": "China allergen list not identical to EU CosIng", "solution": "Cross-check fragrance allergens against China's list"}], "time": "2-4 months"}, "baby": {"label": "Baby Products (HS 33.04)", "special": false, "risk": "🟡 Medium", "riskReason": "Stricter safety requirements for children's products.", "mfn": "1-5%", "vat": "13%", "testing": ["Microbiological", "Heavy metals", "Skin irritation", "pH balance", "Preservative efficacy"], "testCost": "$1,200-3,500", "reject": [{"problem": "Preservative not permitted for baby cosmetics", "cause": "Restricted preservatives list for baby products", "solution": "Check NMPA banned preservatives for children"}], "time": "3-5 months"}};

const COUNTRIES: Record<string, any> = {"France": {"diff": "easy", "notes": "Strong reputation in China. French brands well-received."}, "Japan": {"diff": "easy", "notes": "Japanese cosmetics highly trusted by Chinese consumers."}, "South Korea": {"diff": "easy", "notes": "K-beauty popular. Fastest NMPA processing history."}, "USA": {"diff": "moderate", "notes": "US brand premium positioning. Standard processing."}};

export function checkCosmetics(input: any): any {
  const cat = PROFILES[input.category] || PROFILES['skincare'];
  if (!cat) return {};
  const requiresReg = cat.special === true;
  const isHighRisk = requiresReg;
  const riskScore = requiresReg ? 7.0 : 3.5;
  return {
    requiresRegistration: requiresReg,
    riskCategory: requiresReg ? "high" : "low", isHighRisk, riskScore,
    estimatedTimeline: cat.time || "Contact us",
    totalCostRange: requiresReg ? "$5,000-25,000" : "$800-5,000",
    verdictLabel: requiresReg ? 'High Risk' : 'Low Risk',
    riskPathway: requiresReg ? 'NMPA filing required — plan 4-6 months.' : 'Standard pathway — proceed with documentation.',
    executiveSummary: `NMPA cosmetics filing assessment for ${input.productName}.`,
    oneLineDecision: requiresReg ? "🔴 Compliance action required" : "🟢 Proceed with standard process",
    riskDimensions: [
      { dimension: "Product Category", score: requiresReg ? 8 : 3, color: requiresReg ? "🔴" : "🟢", note: cat.label },
      { dimension: "Regulatory Complexity", score: requiresReg ? 7 : 3, color: requiresReg ? "🟡" : "🟢", note: cat.riskReason },
      { dimension: "Testing", score: requiresReg ? 6 : 3, color: requiresReg ? "🟡" : "🟢", note: `${(cat.testing||[]).length} tests required` },
      { dimension: "Timeline", score: requiresReg ? 7 : 3, color: requiresReg ? "🔴" : "🟢", note: cat.time },
      { dimension: "Origin Country", score: 4, color: "🟡", note: input.originCountry || "Standard" },
    ],
    channels: [
      { channel: "Standard Import", suitability: "high", description: requiresReg ? "Full compliance required" : "Standard process", advantages: ["Full market access"], disadvantages: [cat.time || "TBD"], timeline: cat.time, costRange: requiresReg ? "$5,000-25,000" : "$800-5,000" },
      { channel: "CBEC", suitability: "medium", description: "Cross-border e-commerce alternative", advantages: ["Faster entry"], disadvantages: ["Online only", "Order limits"], timeline: "1-2 months", costRange: "$500-2,000" },
    ],
    tariffInfo: { mfnRate: cat.mfn || "Varies", vatRate: cat.vat || "13%", consumptionTax: "N/A", ftaRate: null, totalTaxBurden: (cat.mfn || "Varies") + " + " + (cat.vat || "13%") },
    regulations: [{"name": "Cosmetics Supervision & Administration Regulation", "number": "State Council Decree 727 (2021)", "issuingAuthority": "NMPA", "relevance": "primary", "effectiveDate": "See document", "description": "Primary cosmetics regulation. Reformed the entire cosmetics regulatory system."}, {"name": "Cosmetics Registration & Filing Measures", "number": "NMPA 2021 No.1-3", "issuingAuthority": "NMPA", "relevance": "primary", "effectiveDate": "See document", "description": "Detailed procedures for registration (special) vs filing (ordinary)."}, {"name": "Cosmetics Safety Assessment Guidelines", "number": "NMPA 2021 Tech Specs", "issuingAuthority": "NMPA", "relevance": "primary", "effectiveDate": "See document", "description": "Required safety assessment report format and content."}, {"name": "Cosmetics Ingredients INCI Name Translation", "number": "NMPA ICSC Database", "issuingAuthority": "NMPA", "relevance": "primary", "effectiveDate": "See document", "description": "Official Chinese translation of INCI names. Must be used in filing."}, {"name": "GB/T 35914-2018", "number": "GB/T 35914-2018", "issuingAuthority": "NHC", "relevance": "secondary", "effectiveDate": "See document", "description": "Hygienic standard for cosmetics. Microbiological limits."}],
    classification: { assignedHsChapter: "Varies", ciqCode: "Check import", isHighRisk, riskReason: cat.riskReason, alternativeClassificationNote: "" },
    riskMatrix: [
      { dimension: "Category Risk", rating: requiresReg ? "🔴" : "🟢", explanation: cat.riskReason },
      { dimension: "Testing", rating: requiresReg ? "🟡" : "🟢", explanation: `${(cat.testing||[]).length} tests` },
      { dimension: "Timeline", rating: requiresReg ? "🔴" : "🟢", explanation: cat.time },
      { dimension: "Cost", rating: requiresReg ? "🟡" : "🟢", explanation: requiresReg ? "$5,000+" : "$800-5,000" },
      { dimension: "History", rating: "🟢", explanation: "First time" },
    ],
    documentGuide: [{"name": "Product Formula (Full INCI)", "format": "Excel/PDF", "notarization": "No", "commonError": "INCI names not matching ICSC"}, {"name": "Safety Assessment Report", "format": "PDF, NMPA 2021 format", "notarization": "Yes", "commonError": "Assessor not NMPA-recognized"}, {"name": "Microbiological Test Report", "format": "CNAS lab report", "notarization": "Yes", "commonError": "Items not per GB 7918"}, {"name": "Heavy Metals Test Report", "format": "CNAS lab report", "notarization": "Yes", "commonError": "Incomplete analyte scope"}, {"name": "Label & Package Artwork", "format": "JPEG/PDF all sides", "notarization": "No", "commonError": "Missing Chinese INCI names"}, {"name": "GMP / ISO 22716 Certificate", "format": "PDF valid copy", "notarization": "Certified copy", "commonError": "Certificate expired"}, {"name": "Efficacy Report (special only)", "format": "PDF NMPA format", "notarization": "Yes", "commonError": "Method not per NMPA guidelines"}],
    requiredDocuments: ["Product Formula (Full INCI)", "Safety Assessment Report", "Microbiological Test Report", "Heavy Metals Test Report", "Label & Package Artwork", "GMP / ISO 22716 Certificate", "Efficacy Report (special only)"],
    testRequirements: cat.testing || [],
    testCostRange: cat.testCost || "Contact us",
    labTests: [], viability: "Viable with compliance", detailedTimeline: "Varies by product — contact us for assessment", labGuide: "Testing must be at CNAS-accredited lab. " + ((cat.testing||[]).join(", ") || ""),
    labelGuide: { requiredItems: [], gb7718Highlights: [], gb28050Highlights: [] },
    timelinePhases: [{"phase": "Formula Review & Assessment", "duration": "1-3 weeks", "description": "Check ingredients against ICSC, determine special vs ordinary.", "responsible": "Both", dependencies: []}, {"phase": "Safety Assessment", "duration": "2-4 weeks", "description": "Engage NMPA-qualified safety assessor.", "responsible": "SinoTrade", dependencies: []}, {"phase": "Lab Testing", "duration": "3-8 weeks", "description": "Microbiological + heavy metals + efficacy if special.", "responsible": "SinoTrade", dependencies: []}, {"phase": "Dossier Compilation", "duration": "2-3 weeks", "description": "Compile all documents per NMPA format.", "responsible": "SinoTrade", dependencies: []}, {"phase": "NMPA Submission", "duration": "4-16 weeks", "description": "Filing (fast) or Registration (full review).", "responsible": "SinoTrade", dependencies: []}, {"phase": "Post-Approval Monitoring", "duration": "Ongoing", "description": "Annual reporting + change notifications.", "responsible": "Both", dependencies: []}],
    costBreakdown: [{"item": "Safety Assessment Report", "estimatedRange": "$2,000-5,000", "notes": "NMPA-qualified safety assessor."}, {"item": "Product Testing", "estimatedRange": "$800-10,000", "notes": "Micro + heavy metals + efficacy (special)."}, {"item": "Document Translation & Notarization", "estimatedRange": "$300-1,500", "notes": "Chinese translation of all dossier documents."}, {"item": "Formula Review (ICSC Check)", "estimatedRange": "$500-1,500", "notes": "Full INCI audit against China's ingredient list."}, {"item": "Label Artwork Design", "estimatedRange": "$300-1,000", "notes": "GB 5296.3 compliant Chinese label."}, {"item": "Professional Filing/Registration Service", "estimatedRange": "$2,000-12,000", "notes": "End-to-end: formula review → testing → filing."}],
    countryProfile: { region: "—", ftaWithChina: false, ftaDetails: "", specialRestrictions: [], bilateralMeatAccess: false, bilateralAquaticAccess: false, dairyApproved: false, gaccDifficulty: "moderate", languageNote: "", commonIssues: [], importVolumeNote: "" },
    marketIntel: { chinaImportTrend: "Growing Chinese market demand.", keyDrivers: ["Consumer demand", "Quality perception"], barriers: ["Compliance cost", "Competition"], consumerPerception: "International brands trusted.", topOrigins: [], recommendation: requiresReg ? "Begin process now." : "Proceed." },
    competitiveAnalysis: "Premium segment competitive.",
    commonRejections: [{"problem": "Ingredient not on ICSC catalogue", "cause": "Novel ingredient requires safety assessment", "solution": "Pre-check all INCI names against ICSC database"}],
    postApprovalObligations: [{"item": "Annual Production Report", "frequency": "Yearly", "description": "Submit production data to NMPA."}, {"item": "Formula Change Notification", "frequency": "When applicable", "description": "Any formula change requires re-filing or notification."}, {"item": "Label Update Compliance", "frequency": "Per regulation change", "description": "Monitor NMPA labeling guideline updates."}, {"item": "Registration Renewal", "frequency": "Every 5 years", "description": "Re-submit safety assessment for renewal."}],
    horizonScan: [{"topic": "GB 7718 Cosmetics Label Revision", "impact": "high", "timeframe": "2025-2026", "description": "Expected to align with international labeling standards.", "actionRequired": true}, {"topic": "Special Cosmetics List Expansion", "impact": "medium", "timeframe": "2025", "description": "More product categories may be reclassified as special.", "actionRequired": false}, {"topic": "Animal Testing Alternatives", "impact": "medium", "timeframe": "2025-2027", "description": "China expanding accepted non-animal test methods.", "actionRequired": false}],
    summary: requiresReg ? "Compliance action required." : "Standard process applies.",
  
  filingType: {
    ordinary: "General cosmetics requiring notification filing (备案). Lower requirements, faster timeline.",
    special: "Products needing full registration (注册) — sunscreen, whitening, hair dye, perm. Higher requirements.",
    classificationBasis: "CSAR 2021 Article 3-5 — category determined by product function and ingredients",
    timeline: { ordinary: "2-4 months", special: "6-12 months" }
  },
  nmpaTestingReqs: {
    categories: ["Microbiological testing", "Heavy metals", "Stability testing", "Hygiene chemical analysis", "Safety assessment report"],
    labRequirement: "Must use NMPA-designated testing laboratory",
    exemption: "Products with valid EU/US GMP certificate may qualify for reduced testing"
  },
  gmpGuide: {
    standard: "ISO 22716 (Cosmetics GMP) or equivalent",
    accepted: ["EU Cosmetics GMP (ISO 22716)", "US FDA cGMP", "ASEAN Cosmetics GMP"],
    notAccepted: "Generic ISO 9001 without cosmetics scope",
    note: "GMP certificate from recognized body can reduce factory inspection requirements"
  },
  chineseRPActions: [
    "Register as Chinese Responsible Person with NMPA",
    "Maintain product safety information files",
    "File adverse event reports within 15 days",
    "Coordinate testing with NMPA-designated labs",
    "Manage product recall if required by SAMR"
  ],
  animalTestingExempt: {
    eligible: "Ordinary cosmetics with valid GMP certificate and established safety history",
    ineligible: "Special cosmetics (sunscreen, whitening) always require animal testing",
    alternative: "Accept in vitro / alternative methods for certain endpoints",
    timeline: "Exemption review: 30-60 working days"
  },
};
}