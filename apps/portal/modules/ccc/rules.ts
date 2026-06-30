import { buildT } from '../shared/i18n';
/**
 * CCC — 深度规则引擎（品类级配置 / 法规 / 费用 / 时间线）
 */

export type CccCategory =
  | "electronics" | "home_appliance" | "it_equipment" | "lighting"
  | "power_tool" | "auto_parts" | "toy" | "medical" | "wire_cable" | "other";

export interface CccInput {
  category: CccCategory;
  productName: string;
  hsCode?: string;
  intendedUse: string;
  originCountry?: string;
  manufacturerCountry?: string;
  hasCBReport?: string;
  voltagePower?: string;
  hasCEorUL?: string;
  annualVolume?: string;
}

export const CATEGORY_LABELS: Record<string, string> = {
  "electronics": "Consumer Electronics (HS 85)",
  "home_appliance": "Home Appliances (HS 84)",
  "it_equipment": "IT / Communication (HS 84.71, 85.17)",
  "lighting": "Lighting Products (HS 85.39, 94.05)",
  "toy": "Toys / Children's Products (HS 95.03)",
  "medical": "Medical Devices (HS 90)",
};

function getPROFILES(t: (key: string) => string): Record<string, any> {
  const tLabel = (cat: string) => t(`cccCat_${cat}_label`);
  const tTest = (cat: string, idx: number) => t(`cccProfile_${cat}_test_${idx}`);
  const tCert = (cat: string, idx: number) => t(`cccProfile_${cat}_cert_${idx}`);
  const tRej = (cat: string, idx: number, field: string) => t(`cccProfile_${cat}_reject_${idx}_${field}`);
  return {"electronics": {"label": tLabel("electronics"), "risk": "🔴 High", "riskReason": t("cccProfile_electronics_riskReason"), "mfn": "5-15%", "vat": "13%", "testing": [tTest("electronics",0), tTest("electronics",1), tTest("electronics",2), tTest("electronics",3)], "testCost": "$3,000-8,000", "certs": [tCert("electronics",0), tCert("electronics",1)], "reject": [{"problem": tRej("electronics",0,"problem"), "cause": tRej("electronics",0,"cause"), "solution": tRej("electronics",0,"solution")}], "time": "4-6 months"}, "home_appliance": {"label": tLabel("home_appliance"), "risk": "🔴 High", "riskReason": t("cccProfile_home_appliance_riskReason"), "mfn": "8-20%", "vat": "13%", "testing": [tTest("home_appliance",0), tTest("home_appliance",1), tTest("home_appliance",2), tTest("home_appliance",3)], "testCost": "$3,500-10,000", "certs": [tCert("home_appliance",0), tCert("home_appliance",1)], "reject": [{"problem": tRej("home_appliance",0,"problem"), "cause": tRej("home_appliance",0,"cause"), "solution": tRej("home_appliance",0,"solution")}], "time": "4-7 months"}, "it_equipment": {"label": tLabel("it_equipment"), "risk": "🔴 High", "riskReason": t("cccProfile_it_equipment_riskReason"), "mfn": "0-8%", "vat": "13%", "testing": [tTest("it_equipment",0), tTest("it_equipment",1), tTest("it_equipment",2), tTest("it_equipment",3)], "testCost": "$4,000-12,000", "certs": [tCert("it_equipment",0), tCert("it_equipment",1)], "reject": [{"problem": tRej("it_equipment",0,"problem"), "cause": tRej("it_equipment",0,"cause"), "solution": tRej("it_equipment",0,"solution")}], "time": "4-8 months"}, "lighting": {"label": tLabel("lighting"), "risk": "🔴 High", "riskReason": t("cccProfile_lighting_riskReason"), "mfn": "5-15%", "vat": "13%", "testing": [tTest("lighting",0), tTest("lighting",1), tTest("lighting",2), tTest("lighting",3)], "testCost": "$3,000-8,000", "certs": [tCert("lighting",0), tCert("lighting",1)], "reject": [{"problem": tRej("lighting",0,"problem"), "cause": tRej("lighting",0,"cause"), "solution": tRej("lighting",0,"solution")}], "time": "3-6 months"}, "toy": {"label": tLabel("toy"), "risk": "🔴 High", "riskReason": t("cccProfile_toy_riskReason"), "mfn": "5-10%", "vat": "13%", "testing": [tTest("toy",0), tTest("toy",1), tTest("toy",2), tTest("toy",3), tTest("toy",4)], "testCost": "$2,000-6,000", "certs": [tCert("toy",0)], "reject": [{"problem": tRej("toy",0,"problem"), "cause": tRej("toy",0,"cause"), "solution": tRej("toy",0,"solution")}], "time": "3-6 months"}, "medical": {"label": tLabel("medical"), "risk": "🔴 High", "riskReason": t("cccProfile_medical_riskReason"), "mfn": "0-8%", "vat": "13%", "testing": [tTest("medical",0), tTest("medical",1), tTest("medical",2)], "testCost": "$8,000-25,000", "certs": [tCert("medical",0), tCert("medical",1)], "reject": [{"problem": tRej("medical",0,"problem"), "cause": tRej("medical",0,"cause"), "solution": tRej("medical",0,"solution")}], "time": "8-18 months"}};
}

export function checkCcc(input: any, locale?: string): any {
  const t = buildT(locale || 'en');

  const PROFILES = getPROFILES(t);
  const cat = PROFILES[input.category] || PROFILES['electronics'];
  if (!cat) return {};
  const requiresReg = cat.risk === "🔴 High";
  const isHighRisk = requiresReg;
  const riskScore = requiresReg ? 7.0 : 3.5;
  return {
    requiresRegistration: requiresReg,
    riskCategory: requiresReg ? "high" : "low", isHighRisk, riskScore,
    estimatedTimeline: cat.time || t("contact_us"),
    totalCostRange: requiresReg ? "$5,000-25,000" : "$800-5,000",
    verdictLabel: t(requiresReg ? 'cccVerdictHigh' : 'cccVerdictStandard'),
    riskPathway: t(requiresReg ? 'cccRiskPathwayHigh' : 'cccRiskPathwayStandard'),
    executiveSummary: t('cccExecutiveSummary').replace('{productName}', input.productName || ''),
    oneLineDecision: t(requiresReg ? 'cccOneLineHigh' : 'cccOneLineLow'),
    riskDimensions: [
      { dimension: t("cccDimension_category"), score: requiresReg ? 8 : 3, color: requiresReg ? "🔴" : "🟢", note: cat.label },
      { dimension: t("regulatory_complexity"), score: requiresReg ? 7 : 3, color: requiresReg ? "🟡" : "🟢", note: cat.riskReason },
      { dimension: t("cccDimension_testing"), score: requiresReg ? 6 : 3, color: requiresReg ? "🟡" : "🟢", note: t('cccRiskNote_tests').replace('{count}', ((cat.testing||[]).length).toString()) },
      { dimension: t("cccDimension_timeline"), score: requiresReg ? 7 : 3, color: requiresReg ? "🔴" : "🟢", note: cat.time },
      { dimension: t("origin_country"), score: 4, color: "🟡", note: input.originCountry || t("standard_label") },
    ],
    channels: [
      { channel: t("cccChannel_standard_name"), suitability: "high", description: requiresReg ? t("cccChannel_standard_desc_full") : t("cccChannel_standard_desc_normal"), advantages: [t("cccChannel_standard_adv1")], disadvantages: [cat.time || t("tbd_label")], timeline: cat.time, costRange: requiresReg ? "$5,000-25,000" : "$800-5,000" },
      { channel: t("cccChannel_cbec_name"), suitability: "medium", description: t("cccChannel_cbec_desc"), advantages: [t("cccChannel_cbec_adv1")], disadvantages: [t("cccChannel_cbec_dis1"), t("cccChannel_cbec_dis2")], timeline: "1-2 months", costRange: "$500-2,000" },
    ],
    tariffInfo: { mfnRate: cat.mfn || t("varies_label"), vatRate: cat.vat || "13%", consumptionTax: t("na_label"), ftaRate: null, totalTaxBurden: (cat.mfn || t("varies_label")) + " + " + (cat.vat || "13%") },
    regulations: [{"name": t("cnca_ccc_implementation_rules"), "number": "CNCA 00C-001:2023", "issuingAuthority": "CNCA/SAMR", "relevance": "primary", "effectiveDate": "See document", "description": t("ccc_certification_procedures_application_testing_f")}, {"name": t("ccc_product_catalogue"), "number": "CNCA 2023 Announcement", "issuingAuthority": "CNCA", "relevance": "primary", "effectiveDate": "See document", "description": t("products_subject_to_mandatory_ccc_certification_17")}, {"name": "GB 4943.1-2022", "number": "GB 4943.1-2022", "issuingAuthority": t("nhc_cnca"), "relevance": "secondary", "effectiveDate": "See document", "description": t("safety_of_it_equipment_mandatory_for_electronics_c")}, {"name": "GB 4706.1-2005", "number": "GB 4706.1-2005 + 30 sub-standards", "issuingAuthority": "CNCA", "relevance": "secondary", "effectiveDate": "See document", "description": t("safety_of_household_appliances_each_product_type_h")}, {"name": "GB 6675 Series", "number": "GB 6675.1-.4:2014", "issuingAuthority": "CNCA/SAMR", "relevance": "secondary", "effectiveDate": "See document", "description": t("toy_safety_mechanical_flammability_chemical_migrat")}, {"name": "GB 17625.1-2022", "number": "GB 17625.1-2022", "issuingAuthority": "CNCA", "relevance": "secondary", "effectiveDate": "See document", "description": t("emc_harmonic_current_emissions")}, {"name": t("china_energy_label"), "number": t("ndrc_mofcom_2020"), "issuingAuthority": "NDRC", "relevance": "secondary", "effectiveDate": "See document", "description": t("mandatory_energy_efficiency_labeling_for_specified")}, {"name": t("china_rohs_2"), "number": t("miit_order_32_2016"), "issuingAuthority": "MIIT", "relevance": "secondary", "effectiveDate": "See document", "description": t("hazardous_substances_in_electronic_products")}],
    classification: { assignedHsChapter: t("varies_label"), ciqCode: t("check_import_label"), isHighRisk, riskReason: cat.riskReason, alternativeClassificationNote: "" },
    riskMatrix: [
      { dimension: t("cccDimension_categoryRisk"), rating: requiresReg ? "🔴" : "🟢", explanation: cat.riskReason },
      { dimension: t("cccDimension_testing"), rating: requiresReg ? "🟡" : "🟢", explanation: t('cccRiskNote_tests').replace('{count}', ((cat.testing||[]).length).toString()) },
      { dimension: t("cccDimension_timeline"), rating: requiresReg ? "🔴" : "🟢", explanation: cat.time },
      { dimension: t("cccDimension_cost"), rating: requiresReg ? "🟡" : "🟢", explanation: requiresReg ? t("cccRiskMatrix_costHigh") : t("cccRiskMatrix_costLow") },
      { dimension: t("cccDimension_history"), rating: "🟢", explanation: t("cccRiskMatrix_firstTime") },
    ],
    documentGuide: [{ name: t("cccDoc_appForm_name"), format: t("cccDoc_appForm_format"), notarization: t("cccDoc_appForm_notarization"), commonError: t("cccDoc_appForm_error") }, { name: t("cccDoc_specs_name"), format: t("cccDoc_specs_format"), notarization: t("cccDoc_specs_notarization"), commonError: t("cccDoc_specs_error") }, { name: t("cccDoc_manual_name"), format: t("cccDoc_manual_format"), notarization: t("cccDoc_manual_notarization"), commonError: t("cccDoc_manual_error") }, { name: t("cccDoc_qualityManual_name"), format: t("cccDoc_qualityManual_format"), notarization: t("cccDoc_qualityManual_notarization"), commonError: t("cccDoc_qualityManual_error") }, { name: t("cccDoc_components_name"), format: t("cccDoc_components_format"), notarization: t("cccDoc_components_notarization"), commonError: t("cccDoc_components_error") }, { name: t("cccDoc_circuit_name"), format: t("cccDoc_circuit_format"), notarization: t("cccDoc_circuit_notarization"), commonError: t("cccDoc_circuit_error") }, { name: t("cccDoc_cb_name"), format: t("cccDoc_cb_format"), notarization: t("cccDoc_cb_notarization"), commonError: t("cccDoc_cb_error") }],
    requiredDocuments: [t("cccRequiredDoc_0"), t("cccRequiredDoc_1"), t("cccRequiredDoc_2"), t("cccRequiredDoc_3"), t("cccRequiredDoc_4"), t("cccRequiredDoc_5"), t("cccRequiredDoc_6")],
    testRequirements: cat.testing || [],
    testCostRange: cat.testCost || t("contact_us"),
    labTests: [], viability: t('cccViability'), detailedTimeline: t("cccDetailedTimeline"), labGuide: t("cccLabGuide") + ((cat.testing||[]).join(", ") || ""),
    labelGuide: { requiredItems: [], gb7718Highlights: [], gb28050Highlights: [] },
    timelinePhases: [{ phase: t("cccTimeline_preAssess_name"), duration: "2-4 weeks", description: t("cccTimeline_preAssess_desc"), responsible: "Both", dependencies: [] }, { phase: t("cccTimeline_typeTest_name"), duration: "6-12 weeks", description: t("cccTimeline_typeTest_desc"), responsible: "SinoTrade", dependencies: [] }, { phase: t("cccTimeline_factoryInsp_name"), duration: "2-4 weeks", description: t("cccTimeline_factoryInsp_desc"), responsible: "SinoTrade", dependencies: [] }, { phase: t("cccTimeline_certReview_name"), duration: "4-6 weeks", description: t("cccTimeline_certReview_desc"), responsible: "CNCA", dependencies: [] }, { phase: t("cccTimeline_certMark_name"), duration: "1-2 weeks", description: t("cccTimeline_certMark_desc"), responsible: "Both", dependencies: [] }, { phase: t("cccTimeline_annual_name"), duration: t("ongoing_label"), description: t("cccTimeline_annual_desc"), responsible: "Both", dependencies: [] }],
    costBreakdown: [{ item: t("cccCost_testing_item"), estimatedRange: "$3,000-12,000", notes: t("cccCost_testing_notes") }, { item: t("cccCost_factoryInsp_item"), estimatedRange: "$2,000-5,000", notes: t("cccCost_factoryInsp_notes") }, { item: t("cccCost_certFee_item"), estimatedRange: "$1,000-3,000", notes: t("cccCost_certFee_notes") }, { item: t("cccCost_cbConv_item"), estimatedRange: "$1,000-3,000", notes: t("cccCost_cbConv_notes") }, { item: t("cccCost_manualTrans_item"), estimatedRange: "$500-2,000", notes: t("cccCost_manualTrans_notes") }, { item: t("cccCost_service_item"), estimatedRange: "$4,000-12,000", notes: t("cccCost_service_notes") }, { item: t("cccCost_annualFollowup_item"), estimatedRange: "$1,500-3,000/yr", notes: t("cccCost_annualFollowup_notes") }],
    countryProfile: { region: "—", ftaWithChina: false, ftaDetails: "", specialRestrictions: [], bilateralMeatAccess: false, bilateralAquaticAccess: false, dairyApproved: false, gaccDifficulty: "moderate", languageNote: "", commonIssues: [], importVolumeNote: "" },
    marketIntel: { chinaImportTrend: t("cccMarket_trend"), keyDrivers: [t("cccMarket_driver1"), t("cccMarket_driver2")], barriers: [t("cccMarket_barrier1"), t("cccMarket_barrier2")], consumerPerception: t("cccMarket_perception"), topOrigins: [], recommendation: t(requiresReg ? "cccMarket_recoHigh" : "cccMarket_recoLow") },
    competitiveAnalysis: t("cccCompetitiveAnalysis"),
    commonRejections: [{ problem: t("cccReject_problem"), cause: t("cccReject_cause"), solution: t("cccReject_solution") }],
    postApprovalObligations: [{ item: t("cccPost_annualInsp_item"), frequency: t("cccPost_annualInsp_frequency"), description: t("cccPost_annualInsp_desc") }, { item: t("cccPost_changeNotice_item"), frequency: t("cccPost_changeNotice_frequency"), description: t("cccPost_changeNotice_desc") }, { item: t("cccPost_renewal_item"), frequency: t("cccPost_renewal_frequency"), description: t("cccPost_renewal_desc") }, { item: t("cccPost_surveillance_item"), frequency: t("cccPost_surveillance_frequency"), description: t("cccPost_surveillance_desc") }],
    horizonScan: [{ topic: t("cccHorizon_iot_topic"), impact: t("cccHorizon_iot_impact"), timeframe: t("cccHorizon_iot_timeframe"), description: t("cccHorizon_iot_desc"), actionRequired: true }, { topic: t("cccHorizon_gbRev_topic"), impact: t("cccHorizon_gbRev_impact"), timeframe: t("cccHorizon_gbRev_timeframe"), description: t("cccHorizon_gbRev_desc"), actionRequired: true }, { topic: t("cccHorizon_cbDigital_topic"), impact: t("cccHorizon_cbDigital_impact"), timeframe: t("cccHorizon_cbDigital_timeframe"), description: t("cccHorizon_cbDigital_desc"), actionRequired: false }],
    summary: t(requiresReg ? 'cccSummaryHigh' : 'cccSummaryLow'),
  
  cccStandards: {
    electronics: t("gb_4943_1_2022_safety_gb_9254_2021_emc_gb_17625_1_"),
    homeAppliance: t("gb_4706_1_2005_product_specific_sub_standards"),
    itEquipment: t("gb_4943_1_2022_gb_9254_2021_srrc_wireless"),
    lighting: t("cccStandard_lighting"),
    toy: t("cccStandard_toy"),
    default: t("contact_us_for_applicable_gb_standards")
  },
  factoryAudit: {
    requirement: t("on_site_qms_inspection_by_cnca_accredited_auditor"),
    scope: [t("production_process_review"), t("incoming_quality_control"), t("testing_equipment_calibration"), t("non_conforming_product_handling"), t("corrective_action_records")],
    frequency: t("initial_certification_annual_surveillance"),
    travelNote: t("auditor_travel_costs_extra_if_factory_outside_chin")
  },
  testingProcess: [
    { phase: t("sample_preparation"), duration: "1-2 weeks", detail: t("send_5_10_samples_per_model_to_cnca_accredited_lab") },
    { phase: t("safety_testing"), duration: "4-8 weeks", detail: t("per_applicable_gb_standard_cb_report_may_reduce_sc") },
    { phase: t("emc_testing"), duration: "2-4 weeks", detail: t("emc_emission_immunity_per_gb_standards") },
    { phase: t("additional_testing"), duration: "2-4 weeks", detail: t("energy_efficiency_srrc_wireless_rohs_as_applicable") },
    { phase: t("report_review"), duration: "2-4 weeks", detail: t("lab_issues_test_report_review_for_completeness") }
  ],
  cccCatalog: {
    productCategories: 17,
    lastUpdate: "2023",
    note: t("products_not_in_ccc_catalog_may_still_require_srrc"),
    verificationTip: t("verify_via_cnca_official_catalog_or_consult_a_cert")
  },
  cbReportGuide: {
    acceptance: t("cb_reports_from_iecee_member_bodies_are_generally_"),
    savings: t("can_reduce_testing_cost_by_30_50_and_timeline_by_4"),
    requirement: t("must_be_submitted_with_chinese_translation_cb_repo"),
    limitation: t("cb_report_does_not_cover_emc_energy_efficiency_or_"),
  },
};
}