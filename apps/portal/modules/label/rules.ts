import { buildT } from '../shared/i18n';
/**
 * 中文标签合规 — 深度规则引擎
 */
export type LabelCategory =
  | "prepackaged" | "dairy" | "beverage" | "confectionery" | "alcohol"
  | "health_food" | "infant" | "oil" | "seasoning" | "other";

export interface LabelInput {
  category: LabelCategory;
  productName: string;
  packagingType: string;
  originCountry?: string;
  hasNutritionData?: string;
  allergenInfo?: string;
  hasLabelArtwork?: string;
  ingredientsDeclaration?: string;
}

export const CATEGORY_LABELS: Record<string, string> = {
  "prepackaged": "Prepackaged Foods (GB 7718)", "dairy": "Dairy Products",
  "beverage": "Beverages / Juices", "confectionery": "Confectionery / Snacks",
  "alcohol": "Alcoholic Beverages", "health_food": "Health / Dietary Supplements",
  "infant": "Infant / Baby Foods", "oil": "Edible Oils / Fats",
  "seasoning": "Seasonings / Condiments", "other": "Other Food Products",
};

/* ------------------------------------------------------------------ */
/*  LabelResult sub-types                                              */
/* ------------------------------------------------------------------ */

/** Risk dimension entry */
export interface RiskDimension {
  dimension: string;
  score: number;
  color: string;
  note: string;
}

/** Channel / sales suitability entry */
export interface LabelChannel {
  name: string;
  suitability: string;
  description: string;
  timeline: string;
  costRange: string;
  [key: string]: unknown;
}

/** Tariff rate summary */
export interface TariffInfo {
  mfnRate: string | null;
  vatRate: string | null;
  ftaRate: string | null;
  [key: string]: unknown;
}

/** Regulation reference */
export interface Regulation {
  name: string;
  number: string;
  issuingAuthority: string;
  relevance: string;
  description: string;
  [key: string]: unknown;
}

/** Risk matrix cell */
export interface RiskMatrixEntry {
  dimension: string;
  rating: string;
  explanation: string;
}

/** Timeline phase */
export interface TimelinePhase {
  phase: string;
  duration: string;
  description: string;
  responsible: string;
  [key: string]: unknown;
}

/** Cost breakdown line */
export interface CostItem {
  item: string;
  estimatedRange?: string;
  notes?: string;
}

/** Common label-rejection pattern */
export interface Rejection {
  problem: string;
  cause: string;
  solution: string;
}

/** Post-approval recurring obligation */
export interface PostApprovalItem {
  item: string;
  freq: string;
  desc: string;
}

/** Horizon-scan / regulatory-watch entry */
export interface HorizonScanItem {
  topic: string;
  impact: string;
  timeframe: string;
  description: string;
  actionRequired: boolean;
}

/* ------------------------------------------------------------------ */
/*  LabelResult — full result shape                                    */
/* ------------------------------------------------------------------ */

export interface LabelResult {
  // --- existing core fields ---
  requiresRegistration: boolean;
  riskCategory: string;
  isHighRisk: boolean;
  estimatedTimeline: string;
  executiveSummary: string;
  summary: string;
  classification: Record<string, unknown>;
  documentGuide: Record<string, unknown>[];
  requiredDocuments: string[];
  testRequirements: string[];
  testCostRange: string;
  labGuide: string;
  labTests: string[];
  viability: string;
  detailedTimeline: string;
  labelGuide: Record<string, unknown>;
  countryProfile: Record<string, unknown>;
  marketIntel: Record<string, unknown>;
  competitiveAnalysis: string;
  postApprovalObligations: Record<string, unknown>[];

  // --- requested / enriched fields ---
  riskScore: number;
  riskDimensions: RiskDimension[];
  verdictLabel: string;
  riskPathway: string;
  oneLineDecision: string;
  channels: LabelChannel[];
  tariffInfo: TariffInfo;
  regulations: Regulation[];
  riskMatrix: RiskMatrixEntry[];
  timelinePhases: TimelinePhase[];
  costBreakdown: CostItem[];
  totalCostRange: string;
  countryNotes: string[];
  commonRejections: Rejection[];
  postApproval: PostApprovalItem[];
  horizonScan: HorizonScanItem[];

  // Loose safety valve for any legacy / extra keys
  [key: string]: unknown;
}

/* ------------------------------------------------------------------ */
/*  checkLabel — main entry point                                      */
/* ------------------------------------------------------------------ */

export function checkLabel(input: LabelInput, locale?: string): LabelResult {
  const t = buildT(locale || 'en');
  const isHighRisk = false;
  const riskScore = 4.5;
  return {
    requiresRegistration: true, riskCategory: "medium", isHighRisk, riskScore,
    estimatedTimeline: t("labelEstimTimeline"), totalCostRange: t("labelTotalCostRange"),
    verdictLabel: t('labelVerdict'),
    riskPathway: t('labelRiskPathway'),
    executiveSummary: t('labelExecutiveSummary').replace('{productName}', input.productName || ''),
    oneLineDecision: t('labelOneLine'),
    summary: t('labelSummary'),
    riskDimensions: [
      { dimension: t("labelDimension_labelFields"), score: 5, color: "🟡", note: t("labelRiskNote_labelFields") },
      { dimension: t("labelDimension_nutritionPanel"), score: 5, color: "🟡", note: t("gb_28050_kj_nrv_required") },
      { dimension: t("additive_review"), score: 6, color: "🟡", note: t("gb_2760_positive_list_compliance") },
      { dimension: t("labelDimension_timeline"), score: 3, color: "🟢", note: t("labelTimeline") },
      { dimension: t("labelDimension_cost"), score: 2, color: "🟢", note: t("labelCost") },
    ],
    channels: [
      { name: t("labelChannel_name"), channel: t("labelChannel_name"), suitability: "high", gaccRequired: false, description: t("labelChannel_desc"), advantages: [t("labelChannel_adv1")], disadvantages: [t("labelChannel_dis1")], timeline: t("labelTimeline"), costRange: t("labelCost") },
    ],
    tariffInfo: { mfnRate: "5-20%", vatRate: "9-13%", consumptionTax: t("na_label"), ftaRate: null, totalTaxBurden: t("varies_by_product") },
    regulations: [
      { name: "GB 7718-2011", number: t("gb_7718_2011_rev_2025"), effectiveDate: "April 20, 2012", issuingAuthority: "NHC", relevance: "primary", description: t("labeling_of_prepackaged_foods_mandatory_for_all_fo") },
      { name: "GB 28050-2011", number: "GB 28050-2011", effectiveDate: "January 1, 2013", issuingAuthority: "NHC", relevance: "primary", description: t("nutrition_labeling_kj_format_nrv_mandatory") },
      { name: "GB 2760-2024", number: "GB 2760-2024", effectiveDate: "February 8, 2025", issuingAuthority: "NHC", relevance: "primary", description: t("food_additives_positive_list_only_listed_additives") },
      { name: t("food_safety_law_label_articles"), number: "Ch.3 Arts.42-47, Ch.9 Arts.148-149", effectiveDate: "October 1, 2015", issuingAuthority: "NPC", relevance: "primary", description: t("legal_basis_for_all_food_label_requirements_fines_") },
    ],
    classification: { assignedHsChapter: t("varies_label"), ciqCode: t("varies_label"), isHighRisk: false, riskReason: t("standard_gb_7718_28050_compliance_12_mandatory_fie"), alternativeClassificationNote: "" },
    riskMatrix: [
      { dimension: t("labelDimension_labelFields"), rating: "🟡", explanation: t("labelMatrixNote_labelFields") },
      { dimension: t("labelDimension_nutritionPanel"), rating: "🟡", explanation: t("labelMatrixNote_nutrition") },
      { dimension: t("additive_check"), rating: "🟡", explanation: t("all_additives_must_be_on_gb_2760_positive_list") },
    ],
    documentGuide: [
      { name: t("labelDoc_artwork_name"), format: t("labelDoc_artwork_format"), notarization: t("labelDoc_artwork_notarization"), validity: t("labelDoc_artwork_validity"), commonError: t("labelDoc_artwork_error") },
      { name: t("labelDoc_chineseLabel_name"), format: t("labelDoc_chineseLabel_format"), notarization: t("labelDoc_chineseLabel_notarization"), validity: t("labelDoc_chineseLabel_validity"), commonError: t("labelDoc_chineseLabel_error") },
      { name: t("labelDoc_nutrition_name"), format: t("labelDoc_nutrition_format"), notarization: t("labelDoc_nutrition_notarization"), validity: t("labelDoc_nutrition_validity"), commonError: t("labelDoc_nutrition_error") },
      { name: t("labelDoc_cfs_name"), format: t("labelDoc_cfs_format"), notarization: t("labelDoc_cfs_notarization"), validity: t("labelDoc_cfs_validity"), commonError: t("labelDoc_cfs_error") },
      { name: t("labelDoc_ingredients_name"), format: t("labelDoc_ingredients_format"), notarization: t("labelDoc_ingredients_notarization"), validity: t("labelDoc_ingredients_validity"), commonError: t("labelDoc_ingredients_error") },
    ],
    requiredDocuments: [t("original_label_artwork"), t("labelReqDoc_chineseDesign"), t("nutrition_test_report"), t("labelReqDoc_cfs"), t("ingredients_declaration")],
    testRequirements: [t("nutritional_analysis_energy_kj_kcal"), t("additive_verification_gb_2760"), t("microbiological_where_required")],
    testCostRange: t("labelTestCostRange"),
    labGuide: t("nutritional_analysis_must_be_at_cnas_accredited_la_1"),
    labTests: [t("labelLab_nutritional"), t("additive_verification"), t("labelLab_microbiological")],
    viability: t('labelViability'),
    detailedTimeline: t("label_review_3_5_working_days_design_5_7_working_d"),
    labelGuide: {
      requiredItems: [
        { field: t("labelField_productName"), requirement: t("accurate_reflection_of_product_nature_standardized"), commonMistake: t("fanciful_names_without_standard_name") },
        { field: t("labelField_ingredientsList"), requirement: t("descending_order_by_weight_additives_with_gb_2760_"), commonMistake: t("missing_additive_codes_or_wrong_order") },
        { field: t("labelField_netContent"), requirement: t("metric_units_g_ml_draining_weight_if_needed"), commonMistake: t("imperial_units") },
        { field: t("manufacturer_info"), requirement: t("overseas_manufacturer_chinese_responsible_party"), commonMistake: t("missing_chinese_agent_info") },
        { field: t("labelField_countryOfOrigin"), requirement: t("labelField_origin_req"), commonMistake: t("vague_description") },
        { field: t("date_best_before"), requirement: t("dd_mm_yyyy_or_yyyy_mm_dd"), commonMistake: t("mm_dd_yyyy_format") },
        { field: t("labelField_storageConditions"), requirement: t("clear_storage_instructions"), commonMistake: t("generic_statements") },
        { field: t("labelField_nutritionPanel"), requirement: t("energy_kj_protein_fat_carbs_sodium_nrv"), commonMistake: t("using_kcal_missing_nrv") },
        { field: t("additive_codes"), requirement: t("gb_2760_codes_e330_ins_330"), commonMistake: t("trade_names") },
        { field: t("labelField_allergens"), requirement: t("milk_eggs_fish_crustacea_peanuts_soy_wheat_tree_nu"), commonMistake: t("not_declared") },
        { field: t("import_record"), requirement: t("ciq_number_after_clearance"), commonMistake: t("labelField_blank") },
      ],
      gb7718Highlights: [t("all_text_must_be_chinese_foreign_supplementary_onl"), t("labelGbb7718_font"), t("gmo_must_be_labeled"), t("irradiated_declared"), t("trans_fat_if_0_3g_100g")],
      gb28050Highlights: [t("energy_in_kj_primary"), t("protein_fat_carbs_sodium_mandatory"), t("nrv_per_appendix_a"), t("format_must_match_standard"), t("labelGb28050_tolerance")],
    },
    timelinePhases: [
      { phase: t("label_review"), duration: "3-5 working days", description: t("audit_current_label_against_gb_7718_28050_2760"), responsible: "SinoTrade", dependencies: [] },
      { phase: t("labelPhase_design"), duration: "5-7 working days", description: t("create_compliant_chinese_label_artwork"), responsible: "SinoTrade", dependencies: [t("label_review_complete")] },
      { phase: t("nutrition_calculation"), duration: "2-3 working days", description: t("nrv_calculation_per_gb_28050"), responsible: "SinoTrade", dependencies: [t("nutrition_test_results")] },
      { phase: t("final_verification"), duration: "2-3 working days", description: t("pre_printing_compliance_check"), responsible: "Both", dependencies: [t("chinese_design_complete")] },
    ],
    costBreakdown: [
      { item: t("labelCost_review_item"), estimatedRange: "$200-500", notes: t("labelCost_review_notes") },
      { item: t("labelCost_design_item"), estimatedRange: "$300-1,000", notes: t("labelCost_design_notes") },
      { item: t("labelCost_nutrition_item"), estimatedRange: "$200-600", notes: t("labelCost_nutrition_notes") },
      { item: t("labelCost_translation_item"), estimatedRange: "$100-300", notes: t("labelCost_translation_notes") },
    ],
    countryNotes: [
      t("china_requires_all_imported_food_labels_in_chinese"),
      t("chinese_responsible_party_agent_importer_must_be_l"),
      t("origin_country_marked_per_gb_7718_vague_descriptio"),
      t("bilingual_labels_strongly_recommended_for_products"),
    ],
    countryProfile: { region: "", ftaWithChina: false, ftaDetails: "", specialRestrictions: [], bilateralMeatAccess: false, bilateralAquaticAccess: false, dairyApproved: false, gaccDifficulty: "moderate", languageNote: t("all_text_must_be_in_chinese_english_may_be_supplem"), commonIssues: [], importVolumeNote: "" },
    marketIntel: { chinaImportTrend: t("labelMarket_trend"), keyDrivers: [t("labelMarket_driver1"), t("labelMarket_driver2")], barriers: [t("labelMarket_barrier1"), t("labelMarket_barrier2")], consumerPerception: t("labelMarket_perception"), topOrigins: [], recommendation: t("labelMarket_reco") },
    competitiveAnalysis: t("labelCompetitiveAnalysis"),
    commonRejections: [
      { problem: t("labelRej0_problem"), cause: t("labelRej0_cause"), solution: t("labelRej0_solution") },
      { problem: t("labelRej1_problem"), cause: t("labelRej1_cause"), solution: t("labelRej1_solution") },
    ],
    postApprovalObligations: [
      { item: t("label_update_monitoring"), frequency: t("ongoing_label"), description: t("track_gb_7718_28050_revisions") },
      { item: t("formula_change_re_label"), frequency: t("labelFreq_whenApplicable"), description: t("new_formula_new_label_compliance_check") },
    ],
    postApproval: [
      { item: t("labelPost_labelUpdate_item"), freq: t("labelPost_labelUpdate_frequency"), desc: t("labelPost_labelUpdate_desc") },
      { item: t("labelPost_formulaChange_item"), freq: t("labelPost_formulaChange_frequency"), desc: t("labelPost_formulaChange_desc") },
      { item: t("labelPost_annualAudit_item"), freq: t("labelPost_annualAudit_frequency"), desc: t("labelPost_annualAudit_desc") },
    ],
    horizonScan: [
      { topic: t("labelHorizon_gb7718_topic"), impact: "high", timeframe: t("labelHorizon_gb7718_timeframe"), description: t("labelHorizon_gb7718_desc"), actionRequired: true },
      { topic: t("labelHorizon_qr_topic"), impact: "medium", timeframe: t("labelHorizon_qr_timeframe"), description: t("labelHorizon_qr_desc"), actionRequired: false },
      { topic: t("labelHorizon_fop_topic"), impact: "medium", timeframe: t("labelHorizon_fop_timeframe"), description: t("labelHorizon_fop_desc"), actionRequired: false },
    ],
  
  labelMandatoryElements: [
    t("labelMandatory_productName"),
    t("ingredients_list_descending_by_weight_additives_wi"),
    t("net_content_metric_units_draining_weight_for_solid"),
    t("manufacturer_distributor_overseas_manufacturer_chi"),
    t("country_of_origin_clearly_marked_4_1_7"),
    t("labelMandatory_dateManufacture"),
    t("storage_conditions_clearly_stated_4_1_9"),
    t("nutrition_information_panel_kj_nrv_per_gb_28050_4_"),
    t("food_additives_listed_with_gb_2760_codes_4_1_11"),
    t("allergen_information_8_mandatory_allergens_4_1_12"),
  ],
  nutritionGuide: {
    mandatoryFields: [t("energy_kj"), t("labelNutr_protein"), t("labelNutr_fat"), t("labelNutr_carb"), t("labelNutr_sodium")],
    format: t("per_100g_ml_nrv_column"),
    keyRule: t("energy_must_always_be_in_kj_kcal_alone_is_not_suff"),
    commonMistake: t("using_kcal_instead_of_kj_or_missing_nrv_column")
  },
  translationGuide: {
    requirement: t("all_label_text_must_be_in_chinese_foreign_language"),
    notarization: t("translation_certification_from_accredited_translat"),
    fontsize: t("minimum_1_8mm_for_mandatory_elements"),
    tips: [t("use_simplified_chinese_characters"), t("keep_same_font_size_for_all_mandatory_text"), t("leave_no_blank_mandatory_fields")]
  },
  allergenGuide: {
    regulated: [t("labelAllergen_milk"), t("labelAllergen_eggs"), t("labelAllergen_fish"), t("labelAllergen_crustacea"), t("labelAllergen_peanuts"), t("labelAllergen_soybeans"), t("labelAllergen_wheat"), t("tree_nuts")],
    format: t("labelAllergen_format"),
    note: t("labelAllergenNote")
  },
  labelReviewGuide: {
    process: [t("submit_artwork_for_pre_review"), t("compliance_audit_against_gb_7718_28050_2760"), t("revise_per_feedback"), t("final_approval"), t("print_ready_file_delivery")],
    turnaround: t("labelReview_turnaround"),
    tip: t("pre_submission_review_catches_80_of_common_errors_")
  },
};
}
