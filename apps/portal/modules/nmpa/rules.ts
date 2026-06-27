import { buildT } from '../shared/i18n';
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

function getPROFILES(t: (key: string) => string): Record<string, any> {
  return {"skincare": {"label": "Skincare (HS 33.04)", "special": false, "risk": "🟡 Medium", "riskReason": "Ordinary cosmetics. NMPA filing required.", "mfn": "1-5%", "vat": "13%", "testing": ["Microbiological GB 7918", "Heavy metals Pb/As/Hg/Cd", "Stability testing", "Skin irritation"], "testCost": "$1,000-3,000", "reject": [{"problem": t("ingredient_not_on_icsc_catalogue"), "cause": t("novel_ingredient_requires_safety_assessment"), "solution": t("pre_check_all_inci_names_against_icsc_database")}], "time": "2-4 months"}, "makeup": {"label": "Color Cosmetics (HS 33.04)", "special": false, "risk": "🟡 Medium", "riskReason": "Ordinary cosmetics. Color additives on positive list.", "mfn": "1-5%", "vat": "13%", "testing": ["Microbiological", "Heavy metals", "Colorant identification", "Stability"], "testCost": "$1,500-4,000", "reject": [{"problem": "Color additive not approved in China", "cause": "China CosIng differs from EU/US approved lists", "solution": "Verify all colorants against China CosIng positive list"}], "time": "2-4 months"}, "sunscreen": {"label": "Sunscreen (HS 33.04) — SPECIAL", "special": true, "risk": "🔴 High", "riskReason": "SPECIAL cosmetics. Full NMPA registration + efficacy testing.", "mfn": "1-5%", "vat": "13%", "testing": ["Safety assessment per NMPA 2021", "SPF efficacy GB/T 35954", "Microbiological", "Heavy metals", "Stability"], "testCost": "$3,000-10,000", "reject": [{"problem": "SPF test method not per GB/T 35954", "cause": "Different protocol vs ISO or FDA methods", "solution": "Use CNAS lab qualified for GB/T 35954 SPF testing"}], "time": "6-12 months"}, "haircare": {"label": "Hair Care (HS 33.05)", "special": false, "risk": "🟢 Low", "riskReason": "Ordinary cosmetics. Standard filing.", "mfn": "1-5%", "vat": "13%", "testing": ["Microbiological", "Heavy metals"], "testCost": "$800-2,500", "reject": [], "time": "2-4 months"}, "fragrance": {"label": "Fragrance / Perfume (HS 33.03)", "special": false, "risk": "🟡 Medium", "riskReason": "Ordinary cosmetics. Alcohol regulations + allergen labeling.", "mfn": "3-6.5%", "vat": "13%", "testing": ["Microbiological", "Heavy metals", t("alcohol_content"), "Allergen screening"], "testCost": "$1,000-3,000", "reject": [{"problem": "Allergen list differs from EU", "cause": "China allergen list not identical to EU CosIng", "solution": "Cross-check fragrance allergens against China's list"}], "time": "2-4 months"}, "baby": {"label": "Baby Products (HS 33.04)", "special": false, "risk": "🟡 Medium", "riskReason": "Stricter safety requirements for children's products.", "mfn": "1-5%", "vat": "13%", "testing": ["Microbiological", "Heavy metals", "Skin irritation", "pH balance", "Preservative efficacy"], "testCost": "$1,200-3,500", "reject": [{"problem": "Preservative not permitted for baby cosmetics", "cause": "Restricted preservatives list for baby products", "solution": "Check NMPA banned preservatives for children"}], "time": "3-5 months"}};
}

const COUNTRIES: Record<string, any> = {"France": {"diff": "easy", "notes": "Strong reputation in China. French brands well-received."}, "Japan": {"diff": "easy", "notes": "Japanese cosmetics highly trusted by Chinese consumers."}, "South Korea": {"diff": "easy", "notes": "K-beauty popular. Fastest NMPA processing history."}, "USA": {"diff": "moderate", "notes": "US brand premium positioning. Standard processing."}};

export function checkCosmetics(input: any, locale?: string): any {
  const t = buildT(locale || 'en');
  const PROFILES = getPROFILES(t);

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
    verdictLabel: t(requiresReg ? 'nmpaVerdictHigh' : 'nmpaVerdictLow'),
    riskPathway: t(requiresReg ? 'nmpaRiskPathwayHigh' : 'nmpaRiskPathwayLow'),
    executiveSummary: t('nmpaExecutiveSummary').replace('{productName}', input.productName || ''),
    oneLineDecision: t(requiresReg ? 'nmpaOneLineHigh' : 'nmpaOneLineLow'),
    riskDimensions: [
      { dimension: t("nmpaRiskDim_productCategory"), score: requiresReg ? 8 : 3, color: requiresReg ? "🔴" : "🟢", note: cat.label },
      { dimension: t("nmpaRiskDim_regulatoryComplexity"), score: requiresReg ? 7 : 3, color: requiresReg ? "🟡" : "🟢", note: cat.riskReason },
      { dimension: t("nmpaRiskDim_testing"), score: requiresReg ? 6 : 3, color: requiresReg ? "🟡" : "🟢", note: t('nmpaRiskNote_tests').replace('{count}', ((cat.testing||[]).length).toString()) },
      { dimension: t("nmpaRiskDim_timeline"), score: requiresReg ? 7 : 3, color: requiresReg ? "🔴" : "🟢", note: cat.time },
      { dimension: t("nmpaRiskDim_originCountry"), score: 4, color: "🟡", note: input.originCountry || "Standard" },
    ],
    channels: [
      { channel: t("nmpaChannel_standard_name"), suitability: "high", description: t(requiresReg ? "nmpaChannel_standard_desc_full" : "nmpaChannel_standard_desc_standard"), advantages: [t("nmpaChannel_standard_adv1")], disadvantages: [cat.time || "TBD"], timeline: cat.time, costRange: requiresReg ? "$5,000-25,000" : "$800-5,000" },
      { channel: t("nmpaChannel_cbec_name"), suitability: "medium", description: t("nmpaChannel_cbec_desc"), advantages: [t("nmpaChannel_cbec_adv1")], disadvantages: [t("nmpaChannel_cbec_dis1"), t("nmpaChannel_cbec_dis2")], timeline: "1-2 months", costRange: "$500-2,000" },
    ],
    tariffInfo: { mfnRate: cat.mfn || "Varies", vatRate: cat.vat || "13%", consumptionTax: "N/A", ftaRate: null, totalTaxBurden: (cat.mfn || "Varies") + " + " + (cat.vat || "13%") },
    regulations: [{"name": t("cosmetics_supervision_administration_regulation"), "number": t("state_council_decree_727_2021"), "issuingAuthority": "NMPA", "relevance": "primary", "effectiveDate": "See document", "description": t("primary_cosmetics_regulation_reformed_the_entire_c")}, {"name": t("cosmetics_registration_filing_measures"), "number": "NMPA 2021 No.1-3", "issuingAuthority": "NMPA", "relevance": "primary", "effectiveDate": "See document", "description": t("detailed_procedures_for_registration_special_vs_fi")}, {"name": t("cosmetics_safety_assessment_guidelines"), "number": t("nmpa_2021_tech_specs"), "issuingAuthority": "NMPA", "relevance": "primary", "effectiveDate": "See document", "description": t("required_safety_assessment_report_format_and_conte")}, {"name": t("cosmetics_ingredients_inci_name_translation"), "number": t("nmpa_icsc_database"), "issuingAuthority": "NMPA", "relevance": "primary", "effectiveDate": "See document", "description": t("official_chinese_translation_of_inci_names_must_be")}, {"name": "GB/T 35914-2018", "number": "GB/T 35914-2018", "issuingAuthority": "NHC", "relevance": "secondary", "effectiveDate": "See document", "description": t("hygienic_standard_for_cosmetics_microbiological_li")}],
    classification: { assignedHsChapter: "Varies", ciqCode: "Check import", isHighRisk, riskReason: cat.riskReason, alternativeClassificationNote: "" },
    riskMatrix: [
      { dimension: t("nmpaDimension_categoryRisk"), rating: requiresReg ? "🔴" : "🟢", explanation: cat.riskReason },
      { dimension: t("nmpaRiskDim_testing"), rating: requiresReg ? "🟡" : "🟢", explanation: t('nmpaRiskNote_tests').replace('{count}', ((cat.testing||[]).length).toString()) },
      { dimension: t("nmpaRiskDim_timeline"), rating: requiresReg ? "🔴" : "🟢", explanation: cat.time },
      { dimension: t("nmpaDimension_cost"), rating: requiresReg ? "🟡" : "🟢", explanation: requiresReg ? "$5,000+" : "$800-5,000" },
      { dimension: t("nmpaDimension_history"), rating: "🟢", explanation: t("nmpaRiskMatrix_firstTime") },
    ],
    documentGuide: [{ name: t("nmpaDoc_formula_name"), format: t("nmpaDoc_formula_format"), notarization: t("nmpaDoc_formula_notarization"), commonError: t("nmpaDoc_formula_error") }, { name: t("nmpaDoc_safety_name"), format: t("nmpaDoc_safety_format"), notarization: t("nmpaDoc_safety_notarization"), commonError: t("nmpaDoc_safety_error") }, { name: t("nmpaDoc_microbio_name"), format: t("nmpaDoc_microbio_format"), notarization: t("nmpaDoc_microbio_notarization"), commonError: t("nmpaDoc_microbio_error") }, { name: t("nmpaDoc_heavyMetals_name"), format: t("nmpaDoc_heavyMetals_format"), notarization: t("nmpaDoc_heavyMetals_notarization"), commonError: t("nmpaDoc_heavyMetals_error") }, { name: t("nmpaDoc_label_name"), format: t("nmpaDoc_label_format"), notarization: t("nmpaDoc_label_notarization"), commonError: t("nmpaDoc_label_error") }, { name: t("nmpaDoc_gmp_name"), format: t("nmpaDoc_gmp_format"), notarization: t("nmpaDoc_gmp_notarization"), commonError: t("nmpaDoc_gmp_error") }, { name: t("nmpaDoc_efficacy_name"), format: t("nmpaDoc_efficacy_format"), notarization: t("nmpaDoc_efficacy_notarization"), commonError: t("nmpaDoc_efficacy_error") }],
    requiredDocuments: ["Product Formula (Full INCI)", "Safety Assessment Report", "Microbiological Test Report", "Heavy Metals Test Report", "Label & Package Artwork", "GMP / ISO 22716 Certificate", "Efficacy Report (special only)"],
    testRequirements: cat.testing || [],
    testCostRange: cat.testCost || "Contact us",
    labTests: [], viability: t('nmpaViability'), detailedTimeline: t("nmpaDetailedTimeline"), labGuide: t("nmpaLabGuide") + " " + ((cat.testing||[]).join(", ") || ""),
    labelGuide: { requiredItems: [], gb7718Highlights: [], gb28050Highlights: [] },
    timelinePhases: [{ phase: t("nmpaTimeline_formulaReview_name"), duration: "1-3 weeks", description: t("nmpaTimeline_formulaReview_desc"), responsible: "Both", dependencies: [] }, { phase: t("nmpaTimeline_safetyAssess_name"), duration: "2-4 weeks", description: t("nmpaTimeline_safetyAssess_desc"), responsible: "SinoTrade", dependencies: [] }, { phase: t("nmpaTimeline_labTest_name"), duration: "3-8 weeks", description: t("nmpaTimeline_labTest_desc"), responsible: "SinoTrade", dependencies: [] }, { phase: t("nmpaTimeline_dossier_name"), duration: "2-3 weeks", description: t("nmpaTimeline_dossier_desc"), responsible: "SinoTrade", dependencies: [] }, { phase: t("nmpaTimeline_submit_name"), duration: "4-16 weeks", description: t("nmpaTimeline_submit_desc"), responsible: "SinoTrade", dependencies: [] }, { phase: t("nmpaTimeline_post_name"), duration: "Ongoing", description: t("nmpaTimeline_post_desc"), responsible: "Both", dependencies: [] }],
    costBreakdown: [{ item: t("nmpaCost_safety_item"), estimatedRange: "$2,000-5,000", notes: t("nmpaCost_safety_notes") }, { item: t("nmpaCost_testing_item"), estimatedRange: "$800-10,000", notes: t("nmpaCost_testing_notes") }, { item: t("nmpaCost_translation_item"), estimatedRange: "$300-1,500", notes: t("nmpaCost_translation_notes") }, { item: t("nmpaCost_formula_item"), estimatedRange: "$500-1,500", notes: t("nmpaCost_formula_notes") }, { item: t("nmpaCost_label_item"), estimatedRange: "$300-1,000", notes: t("nmpaCost_label_notes") }, { item: t("nmpaCost_service_item"), estimatedRange: "$2,000-12,000", notes: t("nmpaCost_service_notes") }],
    countryProfile: { region: "—", ftaWithChina: false, ftaDetails: "", specialRestrictions: [], bilateralMeatAccess: false, bilateralAquaticAccess: false, dairyApproved: false, gaccDifficulty: "moderate", languageNote: "", commonIssues: [], importVolumeNote: "" },
    marketIntel: { chinaImportTrend: t("nmpaMarket_trend"), keyDrivers: [t("nmpaMarket_driver1"), t("nmpaMarket_driver2")], barriers: [t("nmpaMarket_barrier1"), t("nmpaMarket_barrier2")], consumerPerception: t("nmpaMarket_perception"), topOrigins: [], recommendation: t(requiresReg ? "nmpaMarket_recoHigh" : "nmpaMarket_recoLow") },
    competitiveAnalysis: t("nmpaCompetitiveAnalysis"),
    commonRejections: [{"problem": t("ingredient_not_on_icsc_catalogue"), "cause": t("novel_ingredient_requires_safety_assessment"), "solution": t("pre_check_all_inci_names_against_icsc_database")}],
    postApprovalObligations: [{ item: t("nmpaPost_production_item"), frequency: t("nmpaPost_production_frequency"), description: t("nmpaPost_production_desc") }, { item: t("nmpaPost_formulaChange_item"), frequency: t("nmpaPost_formulaChange_frequency"), description: t("nmpaPost_formulaChange_desc") }, { item: t("nmpaPost_labelUpdate_item"), frequency: t("nmpaPost_labelUpdate_frequency"), description: t("nmpaPost_labelUpdate_desc") }, { item: t("nmpaPost_renewal_item"), frequency: t("nmpaPost_renewal_frequency"), description: t("nmpaPost_renewal_desc") }],
    horizonScan: [{ topic: t("nmpaHorizon_labelRev_topic"), impact: t("nmpaHorizon_labelRev_impact"), timeframe: t("nmpaHorizon_labelRev_timeframe"), description: t("nmpaHorizon_labelRev_desc"), actionRequired: true }, { topic: t("nmpaHorizon_specialList_topic"), impact: t("nmpaHorizon_specialList_impact"), timeframe: t("nmpaHorizon_specialList_timeframe"), description: t("nmpaHorizon_specialList_desc"), actionRequired: false }, { topic: t("nmpaHorizon_animalTest_topic"), impact: t("nmpaHorizon_animalTest_impact"), timeframe: t("nmpaHorizon_animalTest_timeframe"), description: t("nmpaHorizon_animalTest_desc"), actionRequired: false }],
    summary: t(requiresReg ? 'nmpaSummaryHigh' : 'nmpaSummaryLow'),
  
  filingType: {
    ordinary: t("general_cosmetics_requiring_notification_filing_备案"),
    special: t("products_needing_full_registration_注册_sunscreen_wh"),
    classificationBasis: t("csar_2021_article_3_5_category_determined_by_produ"),
    timeline: { ordinary: "2-4 months", special: "6-12 months" }
  },
  nmpaTestingReqs: {
    categories: [t("microbiological_testing"), "Heavy metals", "Stability testing", t("hygiene_chemical_analysis"), t("safety_assessment_report")],
    labRequirement: t("must_use_nmpa_designated_testing_laboratory"),
    exemption: t("products_with_valid_eu_us_gmp_certificate_may_qual")
  },
  gmpGuide: {
    standard: t("iso_22716_cosmetics_gmp_or_equivalent"),
    accepted: [t("eu_cosmetics_gmp_iso_22716"), t("us_fda_cgmp"), t("asean_cosmetics_gmp")],
    notAccepted: t("generic_iso_9001_without_cosmetics_scope"),
    note: t("gmp_certificate_from_recognized_body_can_reduce_fa")
  },
  chineseRPActions: [
    t("register_as_chinese_responsible_person_with_nmpa"),
    t("maintain_product_safety_information_files"),
    t("file_adverse_event_reports_within_15_days"),
    t("coordinate_testing_with_nmpa_designated_labs"),
    t("manage_product_recall_if_required_by_samr")
  ],
  animalTestingExempt: {
    eligible: t("ordinary_cosmetics_with_valid_gmp_certificate_and_"),
    ineligible: t("special_cosmetics_sunscreen_whitening_always_requi"),
    alternative: t("accept_in_vitro_alternative_methods_for_certain_en"),
    timeline: t("exemption_review_30_60_working_days")
  },
};
}