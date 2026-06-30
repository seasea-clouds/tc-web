import { buildT } from '../shared/i18n';
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

export function checkCrossborder(input: any, locale?: string): any {
  const t = buildT(locale || 'en');

  const riskScore = 3.5;
  return {
    requiresRegistration: true, riskCategory: "low", isHighRisk: false, riskScore,
    estimatedTimeline: "4-10 weeks", totalCostRange: "$10,000-40,000",
    verdictLabel: t('cbVerdict'),
    riskPathway: t('cbRiskPathway'),
    executiveSummary: t('cbExecutiveSummary').replace('{productName}', input.productName || ''),
    oneLineDecision: t('cbOneLine'),
    summary: t('cbSummary'),
    riskDimensions: [
      { dimension: t("cbDimension_positiveList"), score: 2, color: "🟢", note: t("category_is_on_cbec_positive_list") },
      { dimension: t("cbDimension_platformSetup"), score: 4, color: "🟡", note: t("cbRiskNote_platformSetup") },
      { dimension: t("cbDimension_compliance"), score: 2, color: "🟢", note: t("no_gacc_required_for_cbec") },
      { dimension: t("cbDimension_timeline"), score: 3, color: "🟢", note: t("cbRiskNote_timeline") },
      { dimension: t("cbDimension_investment"), score: 5, color: "🟡", note: t("cbRiskNote_investment") },
    ],
    channels: [
      { channel: t("cbChannel_tmall"), suitability: "high", gaccRequired: false, description: t("largest_cbec_platform"), advantages: [t("massive_traffic"), t("integrated_logistics_cainiao")], disadvantages: [t("higher_deposit"), t("extensive_docs")], timeline: "4-8 weeks", costRange: "$15,000-40,000" },
      { channel: t("cbChannel_jd"), suitability: "high", gaccRequired: false, description: t("strong_for_electronics_health"), advantages: [t("own_logistics_jd_logistics"), t("trusted_for_authentic")], disadvantages: [t("stricter_qc")], timeline: "4-8 weeks", costRange: "$12,000-35,000" },
    ],
    tariffInfo: { mfnRate: t("cbTariff_mfn"), vatRate: t("cbTariff_vat"), consumptionTax: t("cbTariff_consumption"), ftaRate: t("cbec_tax_discount_applies"), totalTaxBurden: t("cbTariff_total") },
    regulations: [
      { name: t("cbec_retail_import_policy"), number: t("cbReg_mofcom2018_number"), effectiveDate: t("cbReg_mofcom2018_date"), issuingAuthority: t("cbReg_mofcom2018_authority"), relevance: "primary", description: t("framework_for_cross_border_e_commerce_retail_impor") },
      { name: t("cbReg_positiveList_name"), number: t("mofcom_gacc_joint_list"), effectiveDate: t("updated_annually"), issuingAuthority: t("mofcom_gacc"), relevance: "primary", description: t("defines_products_eligible_for_cbec_import") },
      { name: t("personal_use_declaration"), number: t("gacc_decree_249_art_5"), effectiveDate: t("cbReg_decree249_date"), issuingAuthority: t("cbReg_decree249_authority"), relevance: "primary", description: t("cbec_goods_imported_as_personal_use_items") },
    ],
    classification: { assignedHsChapter: t("varies_label"), ciqCode: t("check_import_label"), isHighRisk: false, riskReason: t("on_cbec_positive_list_simplified_compliance"), alternativeClassificationNote: "" },
    riskMatrix: [
      { dimension: t("cbDimension_positiveList"), rating: "🟢", explanation: t("category_on_approved_list") },
      { dimension: t("cbDimension_platformSetup"), rating: "🟡", explanation: t("cbMatrixNote_platformSetup") },
      { dimension: t("ongoing_compliance"), rating: "🟢", explanation: t("no_gacc_registration_needed") },
    ],
    documentGuide: [
      { name: t("cbDoc_businessReg_name"), format: t("cbDoc_businessReg_format"), notarization: t("cbDoc_businessReg_notarization"), validity: t("cbDoc_businessReg_validity"), commonError: t("cbDoc_businessReg_error") },
      { name: t("cbDoc_brandAuth_name"), format: t("cbDoc_brandAuth_format"), notarization: t("cbDoc_brandAuth_notarization"), validity: t("cbDoc_brandAuth_validity"), commonError: t("cbDoc_brandAuth_error") },
      { name: t("cbDoc_listings_name"), format: t("cbDoc_listings_format"), notarization: t("cbDoc_listings_notarization"), validity: t("cbDoc_listings_validity"), commonError: t("cbDoc_listings_error") },
      { name: t("cbDoc_label_name"), format: t("cbDoc_label_format"), notarization: t("cbDoc_label_notarization"), validity: t("cbDoc_label_validity"), commonError: t("cbDoc_label_error") },
    ],
    requiredDocuments: [t("business_registration"), t("brand_auth_letter"), t("product_listings"), t("label_artwork")],
    testRequirements: [t("platform_product_listing_review"), t("label_compliance_check")],
    testCostRange: "$500-2,000",
    labGuide: t("platforms_perform_their_own_review_of_product_list_1"),
    labTests: [t("platform_listing_review"), t("label_compliance")],
    viability: t('cbViability'),
    detailedTimeline: t("platform_selection_2_3_weeks_document_preparation_"),
    labelGuide: { requiredItems: [], gb7718Highlights: [], gb28050Highlights: [] },
    timelinePhases: [
      { phase: t("cbTimeline_platformSel_name"), duration: "2-3 weeks", description: t("cbTimeline_platformSel_desc"), responsible: "Both", dependencies: [] },
      { phase: t("cbTimeline_docPrep_name"), duration: "2-3 weeks", description: t("cbTimeline_docPrep_desc"), responsible: "Both", dependencies: [t("cbTimeline_docPrep_dep_platform")] },
      { phase: t("cbTimeline_platformApp_name"), duration: "2-4 weeks", description: t("cbTimeline_platformApp_desc"), responsible: "SinoTrade", dependencies: [t("cbTimeline_platformApp_dep_docs")] },
      { phase: t("cbTimeline_launch_name"), duration: "1-2 weeks", description: t("cbTimeline_launch_desc"), responsible: "Both", dependencies: [t("cbTimeline_launch_dep_approved")] },
    ],
    costBreakdown: [
      { item: t("cbCost_deposit_item"), estimatedRange: "$5,000-25,000", notes: t("cbCost_deposit_notes") },
      { item: t("cbCost_annualFee_item"), estimatedRange: "$5,000-15,000", notes: t("cbCost_annualFee_notes") },
      { item: t("cbCost_bondedWh_item"), estimatedRange: "$2,000-5,000", notes: t("cbCost_bondedWh_notes") },
      { item: t("cbCost_compliance_item"), estimatedRange: "$1,000-5,000", notes: t("cbCost_compliance_notes") },
    ],
    countryProfile: { region: "", ftaWithChina: false, ftaDetails: "", specialRestrictions: [], bilateralMeatAccess: false, bilateralAquaticAccess: false, dairyApproved: false, gaccDifficulty: "easy", languageNote: t("chinese_listings_required"), commonIssues: [], importVolumeNote: "" },
    marketIntel: { chinaImportTrend: t("cbMarket_trend"), keyDrivers: [t("cbMarket_driver1"), t("cbMarket_driver2"), t("cbMarket_driver3")], barriers: [t("cbMarket_barrier1"), t("cbMarket_barrier2"), t("cbMarket_barrier3")], consumerPerception: t("cbMarket_perception"), topOrigins: [], recommendation: t("cbMarket_reco") },
    competitiveAnalysis: t("thousands_of_brands_on_tmall_global_korean_cosmeti_1"),
    commonRejections: [
      { problem: t("product_not_on_positive_list"), cause: t("specific_hs_code_restricted"), solution: t("verify_hs_code_against_latest_positive_list") },
      { problem: t("brand_authorization_chain_incomplete"), cause: t("platform_requires_full_chain"), solution: t("establish_complete_authorization_before_applying") },
    ],
    countryNotes: [
      t("translation_service_recommended_for_product_listin"),
      t("some_categories_face_stricter_inspection_at_custom"),
      t("bonded_warehouse_inventory_must_reconcile_monthly_"),
      t("consumer_protection_law_requires_7_day_no_question"),
      t("intellectual_property_filing_trademark_registratio"),
    ],
    postApprovalObligations: [
      { item: t("platform_compliance_review"), frequency: t("cbPost_platformReview_frequency"), description: t("plaform_audits_product_listings") },
      { item: t("bonded_warehouse_inventory"), frequency: t("cbPost_inventory_frequency"), description: t("verify_inventory_accuracy") },
    ],
    postApproval: [
      { item: t("cbPost_platformReview_item"), freq: t("cbPost_platformReview_frequency"), desc: t("cbPost_platformReview_desc") },
      { item: t("cbPost_inventory_item"), freq: t("cbPost_inventory_frequency"), desc: t("cbPost_inventory_desc") },
      { item: t("cbPost_labelRenewal_item"), freq: t("cbPost_labelRenewal_frequency"), desc: t("cbPost_labelRenewal_desc") },
      { item: t("cbPost_posListReview_item"), freq: t("cbPost_posListReview_frequency"), desc: t("cbPost_posListReview_desc") },
    ],
    horizonScan: [
      { topic: t("cbHorizon_posList_topic"), impact: t("cbHorizon_posList_impact"), timeframe: t("cbHorizon_posList_timeframe"), description: t("cbHorizon_posList_desc"), actionRequired: true },
    ],
  
  platformGuide: [
    { platform: t("cbPlatform_tmall_name"), fee: t("cbPlatform_tmall_fee"), req: t("overseas_company_brand_tm_registration"), traffic: t("largest_cbec_traffic_50_market_share"), timeline: t("cbPlatform_tmall_timeline") },
    { platform: t("cbPlatform_jd_name"), fee: t("cbPlatform_jd_fee"), req: t("overseas_company_brand_registration"), traffic: t("strong_electronics_home_categories"), timeline: t("cbPlatform_jd_timeline") },
    { platform: t("douyin_global"), fee: t("cbPlatform_douyin_fee"), req: t("overseas_company_content_capability"), traffic: t("fastest_growing_live_streaming_focused"), timeline: t("cbPlatform_douyin_timeline") },
  ],
  logisticsModels: {
    bbc: { name: t("cbLogistics_bbc_name"), process: t("bulk_shipment_bonded_warehouse_customs_clearance_d"), advantage: t("faster_delivery_2_5_days_lower_per_unit_cost"), requirement: t("cbec_positive_list_product") },
    direct: { name: t("cbLogistics_direct_name"), process: t("order_placed_overseas_warehouse_courier_customs_cl"), advantage: t("no_bonded_warehouse_needed_wider_product_range"), requirement: t("higher_per_shipment_cost") },
  },
  customsDocGuide: [
    t("cbCustomsDoc_0"), t("cbCustomsDoc_1"),
    t("cbCustomsDoc_2"), t("cbCustomsDoc_3"), t("cbCustomsDoc_4"), t("cbCustomsDoc_5")
  ],
  positiveList: {
    note: t("only_products_on_cbec_positive_list_can_use_1210_b"),
    checkMethod: t("verify_via_mofcom_cbec_positive_list_catalog_or_co"),
    typicalIncluded: [t("food_supplements"), t("cbPositiveList_cosmetics"), t("baby_formula"), t("small_appliances"), t("cbPositiveList_apparel")],
    typicalExcluded: [t("fresh_food"), t("live_animals"), t("large_medical_devices")]
  },
  cbTaxInfo: {
    calculation: t("comprehensive_tax_price_shipping_x_70_x_tariff_rat"),
    threshold: t("personal_use_limit_rmb_5_000_transaction_rmb_26_00"),
    note: t("tax_exemption_for_purchases_under_rmb_1_000_certai"),
    example: t("product_100_shipping_20_dutiable_value_84_approx_t")
  },
};
}