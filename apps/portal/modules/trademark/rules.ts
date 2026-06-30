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
  "beverage": t("tm_cat_beverage"), "health_supplement": "Health Supplements",
  "luxury": "Luxury Goods", "other": "Other",
};

export function checkTrademark(input: any, locale?: string): any {
  const t = buildT(locale || 'en');

  const needsReg = !input.registeredInChina;
  const isHighRisk = needsReg;
  const riskScore = needsReg ? 7.5 : 2.0;
  return {
    needsRegistration: needsReg, requiresRegistration: needsReg, riskCategory: isHighRisk ? "high" : "low", isHighRisk, riskScore,
    estimatedTimeline: t("tmEstimTimeline"), totalCostRange: t("tmTotalCostRange"),
    verdictLabel: t(needsReg ? 'tmVerdictHigh' : 'tmVerdictLow'),
    riskPathway: t(needsReg ? 'tmRiskPathwayHigh' : 'tmRiskPathwayLow'),
    executiveSummary: t('tmExecutiveSummary').replace('{brandName}', input.brandName || ''),
    oneLineDecision: t(needsReg ? 'tmOneLineHigh' : 'tmOneLineLow'),
    summary: t(needsReg ? 'tmSummaryHigh' : 'tmSummaryLow'),
    riskDimensions: [
      { dimension: t("tmDimension_registrationStatus"), score: needsReg ? 9 : 1, color: needsReg ? "🔴" : "🟢", note: needsReg ? t("not_registered_high_risk") : t("tmRiskNote_registered") },
      { dimension: t("tmDimension_squatterRisk"), score: needsReg ? 8 : 3, color: needsReg ? "🔴" : "🟢", note: t("china_first_to_file_squatters_may_grab_your_brand") },
      { dimension: t("tmDimension_timeline"), score: needsReg ? 6 : 1, color: needsReg ? "🟡" : "🟢", note: t("tmRiskNote_timeline") },
      { dimension: t("tmDimension_cost"), score: 3, color: "🟢", note: t("tmCost_note") },
      { dimension: t("tmDimension_enforcement"), score: needsReg ? 8 : 3, color: needsReg ? "🔴" : "🟢", note: needsReg ? t("cannot_enforce_without_registration") : t("full_enforcement_rights") },
    ],
    channels: [
      { channel: t("trademark_registration"), suitability: "high", gaccRequired: false, description: t("file_with_cnipa_for_full_legal_protection"), advantages: [t("legal_protection"), t("platform_enforcement")], disadvantages: [t("tmChannel_disadv")], timeline: t("tmEstimTimeline"), costRange: t("tmTotalCostRange") },
    ],
    tariffInfo: { mfnRate: t("na_label"), vatRate: t("na_label"), consumptionTax: t("na_label"), ftaRate: null, totalTaxBurden: t("n_a_legal_service_not_import") },
    regulations: [
      { name: t("trademark_law_of_china"), number: "4th Revision 2019", effectiveDate: "November 1, 2019", issuingAuthority: t("cnipa_npc"), relevance: "primary", description: t("first_to_file_system_art_32_prevents_bad_faith_fil") },
      { name: t("trademark_examination_guidelines"), number: "CNIPA 2021 Edition", effectiveDate: "2021", issuingAuthority: "CNIPA", relevance: "primary", description: t("examination_standards_for_distinctiveness_and_simi") },
      { name: t("customs_ip_protection_regulations"), number: t("state_council_decree_395"), effectiveDate: "March 1, 2004", issuingAuthority: "GACC", relevance: "secondary", description: t("border_enforcement_customs_can_detain_suspected_co") },
    ],
    classification: { assignedHsChapter: t("na_label"), ciqCode: t("na_label"), isHighRisk: needsReg, riskReason: needsReg ? t("brand_not_registered_first_to_file_risk") : t("tmRiskReason_registered"), alternativeClassificationNote: "" },
    riskMatrix: [
      { dimension: t("tmDimension_registrationStatus"), rating: needsReg ? "🔴" : "🟢", explanation: needsReg ? t("not_registered") : t("tmMatrixNote_registered") },
      { dimension: t("tmDimension_squatterRisk"), rating: "🔴", explanation: t("china_first_to_file_anyone_can_register_your_brand") },
      { dimension: t("tmDimension_timeline"), rating: needsReg ? "🟡" : "🟢", explanation: t("tmMatrixNote_timeline") },
    ],
    documentGuide: [
      { name: t("tmDoc_appForm_name"), format: t("tmDoc_appForm_format"), notarization: t("tmDoc_appForm_notarization"), validity: t("tmDoc_appForm_validity"), commonError: t("tmDoc_appForm_error") },
      { name: t("tmDoc_logo_name"), format: t("tmDoc_logo_format"), notarization: t("tmDoc_logo_notarization"), validity: t("tmDoc_logo_validity"), commonError: t("tmDoc_logo_error") },
      { name: t("tmDoc_goodsList_name"), format: t("tmDoc_goodsList_format"), notarization: t("tmDoc_goodsList_notarization"), validity: t("tmDoc_goodsList_validity"), commonError: t("tmDoc_goodsList_error") },
      { name: t("tmDoc_poa_name"), format: t("tmDoc_poa_format"), notarization: t("tmDoc_poa_notarization"), validity: t("tmDoc_poa_validity"), commonError: t("tmDoc_poa_error") },
    ],
    requiredDocuments: [t("tm_application_form"), t("brand_specimen"), t("goods_services_list"), t("power_of_attorney")],
    testRequirements: [t("cnipa_database_search"), t("common_law_prior_art_search")],
    testCostRange: "$200-500",
    labGuide: t("trademark_search_should_cover_cnipa_database_wipo_"),
    labTests: [t("tmLab_cnipa"), t("wipo_search"), t("marketplace_search")],
    viability: t("critical_trademark_registration_is_essential_for_c"),
    detailedTimeline: t("search_1_2_weeks_application_1_3_days_formal_exam_"),
    labelGuide: { requiredItems: [], gb7718Highlights: [], gb28050Highlights: [] },
    timelinePhases: [
      { phase: t("tmTimeline_search_name"), duration: "1-2 weeks", description: t("tmTimeline_search_desc"), responsible: "Both", dependencies: [] },
      { phase: t("tmTimeline_filing_name"), duration: "1-3 days", description: t("tmTimeline_filing_desc"), responsible: "SinoTrade", dependencies: [t("tmDep_search_complete")] },
      { phase: t("tmTimeline_formalExam_name"), duration: "1-2 months", description: t("tmTimeline_formalExam_desc"), responsible: "CNIPA", dependencies: [t("tmDep_app_filed")] },
      { phase: t("tmTimeline_substantiveExam_name"), duration: "6-9 months", description: t("tmTimeline_substantiveExam_desc"), responsible: "CNIPA", dependencies: [t("tmDep_formal_exam_passed")] },
      { phase: t("tmTimeline_publication_name"), duration: "3 months", description: t("tmTimeline_publication_desc"), responsible: "CNIPA", dependencies: [t("tmDep_subs_exam_passed")] },
      { phase: t("tmTimeline_cert_name"), duration: "1-2 months", description: t("tmTimeline_cert_desc"), responsible: "Both", dependencies: [t("tmDep_pub_period_passed")] },
    ],
    costBreakdown: [
      { item: t("tmCost_search_item"), estimatedRange: "$200-500", notes: t("tmCost_search_notes") },
      { item: t("tmCost_filing_item"), estimatedRange: "$300-600", notes: t("tmCost_filing_notes") },
      { item: t("tmCost_cert_item"), estimatedRange: "$100-200", notes: t("tmCost_cert_notes") },
      { item: t("tmCost_service_item"), estimatedRange: "$800-2,000", notes: t("tmCost_service_notes") },
    ],
    countryProfile: { region: "", ftaWithChina: false, ftaDetails: "", specialRestrictions: [], bilateralMeatAccess: false, bilateralAquaticAccess: false, dairyApproved: false, gaccDifficulty: "moderate", languageNote: t("cnipa_filings_in_chinese_required"), commonIssues: [], importVolumeNote: "" },
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
    food: t("class_29_meat_fish_30_coffee_cereal_31_fresh_32_be"),
    cosmetics: t("class_3_cosmetics_soap"),
    electronics: t("class_9_electronics_software_11_appliances"),
    apparel: t("class_25_clothing_shoes"),
    beverage: t("class_32_non_alcoholic_33_alcoholic"),
    health_supplement: t("class_5_pharmaceuticals_supplements_30_health_food"),
    luxury: t("class_14_jewelry_18_leather_25_clothing"),
    other: t("contact_us_for_class_recommendation")
  },
  registrationProcess: [
    { step: t("trademark_search"), duration: "1-2 weeks", detail: t("cnipa_database_wipo_common_law_search") },
    { step: t("application_filing"), duration: "1-3 days", detail: t("submit_to_cnipa_with_classification") },
    { step: t("formal_examination"), duration: "1-2 months", detail: t("cnipa_reviews_formalities") },
    { step: t("substantive_examination"), duration: "6-9 months", detail: t("distinctiveness_similarity_check") },
    { step: t("publication_opposition"), duration: "3 months", detail: t("third_party_opposition_window") },
    { step: t("registration_certificate"), duration: "1-2 months", detail: t("certificate_issued_valid_10_years") },
  ],
  squattingGuide: {
    risk: t("china_is_first_to_file_anyone_can_register_your_br"),
    stats: t("tmSquatting_stats"),
    prevention: [t("file_trademark_in_china_before_market_entry"), t("file_defensive_classes"), t("monitor_cnipa_weekly"), t("file_transliteration_marks")],
    remedy: [t("file_opposition_within_3_months_of_publication"), t("invalidation_action_prove_bad_faith"), t("negotiate_purchase_from_squatter")]
  },
  customsRecordalSteps: [
    t("register_trademark_with_cnipa_8_14_months"),
    t("file_customs_ip_recordal_application_online_gacc_e"),
    t("submit_tm_certificate_power_of_attorney_product_ph"),
    t("customs_reviews_1_2_months_approval_valid_10_years"),
    t("upon_approval_customs_can_detain_suspected_counter")
  ],
  watchServiceGuide: {
    description: t("monthly_monitoring_of_cnipa_trademark_applications"),
    includes: [t("monthly_cnipa_database_scan"), t("conflict_alert_within_48_hours"), t("opposition_feasibility_analysis"), t("enforcement_recommendation")],
    frequency: t("monthly_reports_real_time_alerts_for_urgent_confli"),
    cost: t("tmWatchService_cost")
  },
};
}