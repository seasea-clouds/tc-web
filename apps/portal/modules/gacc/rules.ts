import { buildT } from '../shared/i18n';
import type { StandardResult } from '../shared/types';
/** GACC 食品注册 — 专业判断规则引擎（价值 $10,000 报告支撑） */

export type GaccCategory =
  | "alcohol" | "beverage" | "confectionery" | "coffee_tea"
  | "canned" | "sugar" | "grain" | "meat" | "dairy" | "seafood"
  | "honey" | "oil" | "seasoning" | "nuts" | "health_food"
  | "other";

export interface GaccInput {
  category: GaccCategory;
  originCountry: string;
  productName: string;
  hsCode?: string;
  manufacturerName?: string;
  exportVolume?: string;
  packagingMaterial?: string;
  hasLabelArtwork?: string;
  productDescription?: string;
}

// ─── 品类配置 ───────────────────────────────────────────────────────────

interface CategoryProfile {
  label: string;
  hsRange: string;
  isHighRisk: boolean;
  riskReason: string;
  ciqCode: string;
  chinaTariffRate: string;  // 最惠国税率范围
  vatRate: string;
  consumptionTax: string;
  gaccTimelineLow: string;
  gaccTimelineHigh: string;
  labTests: string[];
  testCostRange: string;
  commonRejections: { problem: string; cause: string; solution: string }[];
  marketTrend: 'growing' | 'stable' | 'declining';
  competitorOrigin: string[];
  importVolumeRank: number; // 在中国进口量排名
}

function getCATEGORY_PROFILES(t: (key: string) => string): Record<GaccCategory, CategoryProfile> {
  return {
  alcohol: {
    label: t("alcoholic_beverages_hs_22_03_22_08"),
    hsRange: "2203-2208",
    isHighRisk: false,
    riskReason: "18 categories outside — standard risk. Alcohol content and additives monitored.",
    ciqCode: "102",
    chinaTariffRate: "5-10% (MFN)", 
    vatRate: "13%",
    consumptionTax: "10-20% (varies by alcohol type)",
    gaccTimelineLow: "4-6 weeks",
    gaccTimelineHigh: "8-12 weeks",
    labTests: [t("alcohol_content"), t("methanol_aldehydes"), "Heavy metals", "Food additives", "Sulfur dioxide"],
    testCostRange: "$800-2,500",
    commonRejections: [
      { problem: t("label_alcohol_mismatch_lab_result"), cause: t("inconsistent_labeling_vs_actual_content"), solution: t("pre_submission_lab_verification_label_accuracy_che") },
      { problem: t("missing_additive_declaration"), cause: t("additives_not_declared_per_gb_2760"), solution: t("full_ingredient_audit_against_gb_2760_additive_lis") },
      { problem: t("incorrect_hs_code_classification"), cause: "HS 2204 vs 2205 misclassification", solution: t("tariff_classification_ruling_before_submission") },
    ],
    marketTrend: 'growing',
    competitorOrigin: ["France", "Australia", "Chile", "Italy"],
    importVolumeRank: 3,
  },
  beverage: {
    label: t("non_alcoholic_beverages_hs_22_01_22_02"),
    hsRange: "2201-2202",
    isHighRisk: false,
    riskReason: "18 categories outside — low risk. Standard documentation applies.",
    ciqCode: "103",
    chinaTariffRate: "5-20% (MFN)",
    vatRate: "13%",
    consumptionTax: "N/A",
    gaccTimelineLow: "3-5 weeks",
    gaccTimelineHigh: "6-10 weeks",
    labTests: [t("microbiological_coliforms_pathogens"), "Heavy metals", "Food additives", "Preservatives"],
    testCostRange: "$500-1,800",
    commonRejections: [
      { problem: t("preservatives_exceed_gb_2760_limits"), cause: t("different_preservative_standards_vs_exporting_coun"), solution: "Formulation review against China's positive list" },
    ],
    marketTrend: 'growing',
    competitorOrigin: ["USA", "Japan", "Thailand", "South Korea"],
    importVolumeRank: 5,
  },
  confectionery: {
    label: "Confectionery / Chocolate (HS 17.04, 18.06)",
    hsRange: "1704, 1806",
    isHighRisk: false,
    riskReason: "18 categories outside — low risk. Standard GACC registration.",
    ciqCode: "105",
    chinaTariffRate: "8-15% (MFN)",
    vatRate: "13%",
    consumptionTax: "N/A",
    gaccTimelineLow: "3-5 weeks",
    gaccTimelineHigh: "6-10 weeks",
    labTests: ["Microbiological", "Heavy metals", "Food additives", t("melamine_for_chocolate_dairy"), "Pesticide residues"],
    testCostRange: "$600-2,000",
    commonRejections: [
      { problem: "Dairy content triggers high-risk reclassification", cause: "Products with >5% dairy content may be reclassified", solution: "Pre-classification review: dairy threshold analysis" },
      { problem: "Additives not in GB 2760", cause: "Using additives approved in origin but banned in China", solution: "Full additive formula audit before application" },
    ],
    marketTrend: 'growing',
    competitorOrigin: ["Belgium", "Switzerland", "USA", "Italy"],
    importVolumeRank: 7,
  },
  coffee_tea: {
    label: t("coffee_tea_hs_09_01_09_02"),
    hsRange: "0901-0902",
    isHighRisk: false,
    riskReason: "18 categories outside — standard risk. Roasted coffee and processed tea.",
    ciqCode: "106",
    chinaTariffRate: "8-15% (MFN)",
    vatRate: "9%",
    consumptionTax: "N/A",
    gaccTimelineLow: "3-5 weeks",
    gaccTimelineHigh: "6-10 weeks",
    labTests: [t("caffeine_content"), "Pesticide residues", "Microbiological", "Heavy metals", t("mycotoxins_ochratoxin_a")],
    testCostRange: "$700-2,200",
    commonRejections: [
      { problem: t("pesticide_residues_exceed_mrl"), cause: t("different_mrl_standards_between_china_and_exportin"), solution: t("pre_export_testing_at_cnas_lab_for_compliance") },
      { problem: t("aflatoxin_ochratoxin_exceeded"), cause: t("storage_conditions_causing_mycotoxin_development"), solution: t("certificate_of_analysis_from_accredited_shipping_c") },
    ],
    marketTrend: 'growing',
    competitorOrigin: ["Ethiopia", "Vietnam", "Colombia", "Brazil"],
    importVolumeRank: 6,
  },
  canned: {
    label: t("canned_processed_foods_hs_20"),
    hsRange: "2001-2009",
    isHighRisk: false,
    riskReason: "18 categories outside — standard risk. Shelf-stable processed products.",
    ciqCode: "109",
    chinaTariffRate: "5-25% (MFN)",
    vatRate: "13%",
    consumptionTax: "N/A",
    gaccTimelineLow: "3-5 weeks",
    gaccTimelineHigh: "6-10 weeks",
    labTests: [t("commercial_sterility"), "Heavy metals", "Additives", t("container_integrity"), "Nutritional analysis"],
    testCostRange: "$800-2,500",
    commonRejections: [
      { problem: t("can_damage_or_bulging_at_inspection"), cause: t("shipping_transport_damage"), solution: t("container_condition_report_pre_shipment_inspection") },
    ],
    marketTrend: 'stable',
    competitorOrigin: ["Thailand", "Italy", "Spain", "USA"],
    importVolumeRank: 9,
  },
  sugar: {
    label: t("sugar_syrups_hs_17"),
    hsRange: "1701-1704",
    isHighRisk: false,
    riskReason: "18 categories outside — low risk.",
    ciqCode: "108",
    chinaTariffRate: "8-30% (MFN, quota-sensitive)",
    vatRate: "9%",
    consumptionTax: "N/A",
    gaccTimelineLow: "3-5 weeks",
    gaccTimelineHigh: "6-10 weeks",
    labTests: [t("polarization_sucrose_content"), t("color_value"), "Sulfur dioxide", "Heavy metals"],
    testCostRange: "$400-1,200",
    commonRejections: [
      { problem: t("import_quota_exceeded"), cause: t("china_has_sugar_import_tariff_rate_quota"), solution: t("check_quota_availability_before_shipment") },
    ],
    marketTrend: 'stable',
    competitorOrigin: ["Brazil", "Thailand", "Australia"],
    importVolumeRank: 11,
  },
  grain: {
    label: t("grains_flour_hs_10_11"),
    hsRange: "1001-1109",
    isHighRisk: true,
    riskReason: t("category_18_high_risk_quarantine_concerns_for_pest"),
    ciqCode: "111",
    chinaTariffRate: "1-65% (MFN, quota-sensitive)",
    vatRate: "9%",
    consumptionTax: "N/A",
    gaccTimelineLow: "3-5 months",
    gaccTimelineHigh: "6-9 months",
    labTests: [t("pesticide_residues_multi_residue"), t("mycotoxins_aflatoxin_don_zearalenone"), "Heavy metals", t("gmo_testing"), t("pest_quarantine")],
    testCostRange: "$1,500-4,000",
    commonRejections: [
      { problem: t("quarantine_pest_detected"), cause: t("live_pest_larvae_found_in_shipment"), solution: t("fumigation_certificate_pre_export_phytosanitary_in") },
      { problem: t("mycotoxin_exceedance"), cause: t("improper_storage_causing_don_fumonisin_development"), solution: t("drying_protocol_compliance_container_moisture_moni") },
    ],
    marketTrend: 'stable',
    competitorOrigin: ["USA", "Australia", "Canada", "France"],
    importVolumeRank: 2,
  },
  meat: {
    label: t("meat_products_hs_02"),
    hsRange: "0201-0210",
    isHighRisk: true,
    riskReason: t("category_18_high_risk_requires_overseas_enterprise"),
    ciqCode: "111",
    chinaTariffRate: "12-25% (MFN)",
    vatRate: "9%",
    consumptionTax: "N/A",
    gaccTimelineLow: "4-8 months",
    gaccTimelineHigh: "9-14 months",
    labTests: [t("clenbuterol_β_agonists"), "Heavy metals", "Pesticide residues", t("hormone_residues"), "Microbiological", t("species_identification_pcr")],
    testCostRange: "$2,000-5,000",
    commonRejections: [
      { problem: t("country_not_approved_for_meat_exports"), cause: t("bilateral_meat_access_agreement_required"), solution: t("verify_country_is_on_gacc_approved_meat_suppliers_") },
      { problem: t("facility_not_registered"), cause: "Processing plant not in GACC's overseas facility list", solution: t("pre_registration_of_facility_with_gacc_can_take_6_") },
      { problem: t("leptospira_or_fmd_concerns"), cause: t("disease_status_of_exporting_country"), solution: t("official_veterinary_certificate_country_disease_fr") },
    ],
    marketTrend: 'growing',
    competitorOrigin: ["Brazil", "Australia", "Argentina", "USA"],
    importVolumeRank: 1,
  },
  dairy: {
    label: t("dairy_products_hs_04"),
    hsRange: "0401-0406",
    isHighRisk: true,
    riskReason: t("category_18_high_risk_strict_quarantine_formula_re"),
    ciqCode: "112",
    chinaTariffRate: "5-20% (MFN)",
    vatRate: "9%",
    consumptionTax: "N/A",
    gaccTimelineLow: "3-6 months",
    gaccTimelineHigh: "7-12 months",
    labTests: ["Melamine", t("microbiological_listeria_salmonella"), "Heavy metals", t("aflatoxin_m1"), t("antibiotic_residues"), t("nutritional_composition")],
    testCostRange: "$1,800-4,500",
    commonRejections: [
      { problem: t("aflatoxin_m1_exceedance"), cause: t("feed_contamination_affecting_milk"), solution: t("quarterly_aflatoxin_testing_feed_source_audit_docu") },
      { problem: t("infant_formula_formula_registration_not_separate"), cause: t("infant_formula_has_separate_cfda_registration"), solution: t("separate_registration_pathway_for_formula_products") },
    ],
    marketTrend: 'growing',
    competitorOrigin: ["New Zealand", "Netherlands", "France", "Australia"],
    importVolumeRank: 4,
  },
  seafood: {
    label: t("seafood_aquatic_hs_03"),
    hsRange: "0301-0308",
    isHighRisk: true,
    riskReason: t("category_18_high_risk_quarantine_sensitive_bilater"),
    ciqCode: "114",
    chinaTariffRate: "5-15% (MFN)",
    vatRate: "9%",
    consumptionTax: "N/A",
    gaccTimelineLow: "4-7 months",
    gaccTimelineHigh: "8-14 months",
    labTests: [t("heavy_metals_hg_pb_cd_as"), "Histamine", t("microbiological_vibrio_salmonella"), t("parasite_inspection"), t("antibiotic_nitrofuran_residues")],
    testCostRange: "$1,500-3,500",
    commonRejections: [
      { problem: t("heavy_metals_exceed_chinese_limits"), cause: t("cn_gb_2762_limits_are_stricter_than_eu_us"), solution: t("pre_shipment_heavy_metals_screening_at_cnas_lab") },
      { problem: t("country_region_not_on_approved_list"), cause: t("bilateral_fish_import_protocol_not_signed"), solution: t("check_gacc_aquatic_products_approved_country_list") },
      { problem: t("nitrofuran_metabolite_detected"), cause: t("prohibited_antibiotic_use_in_aquaculture"), solution: t("aquaculture_traceability_antibiotic_free_certifica") },
    ],
    marketTrend: 'growing',
    competitorOrigin: ["Ecuador", "Norway", "Russia", "Vietnam"],
    importVolumeRank: 1,
  },
  honey: {
    label: t("honey_bee_products_hs_04_09"),
    hsRange: "0409",
    isHighRisk: true,
    riskReason: t("category_18_high_risk_antibiotic_residues_and_heav"),
    ciqCode: "115",
    chinaTariffRate: "15% (MFN)",
    vatRate: "9%",
    consumptionTax: "N/A",
    gaccTimelineLow: "2-4 months",
    gaccTimelineHigh: "5-8 months",
    labTests: [t("chloramphenicol_prohibited"), t("nitrofuran_metabolites"), t("tetracycline_antibiotics"), "Heavy metals", "Pesticide residues", t("c13_sugar_profile_adulteration")],
    testCostRange: "$1,200-3,000",
    commonRejections: [
      { problem: t("chloramphenicol_detected"), cause: t("prohibited_antibiotic_use_in_beekeeping"), solution: t("transition_to_antibiotic_free_beekeeping_certifica") },
      { problem: t("sugar_adulteration_c4_sugar"), cause: t("rice_corn_syrup_added_to_honey"), solution: t("carbon_isotope_ratio_testing_traceability_document") },
    ],
    marketTrend: 'stable',
    competitorOrigin: ["New Zealand", "Australia", "Thailand", "Argentina"],
    importVolumeRank: 10,
  },
  oil: {
    label: t("edible_oils_hs_15"),
    hsRange: "1501-1518",
    isHighRisk: true,
    riskReason: t("category_18_high_risk_contamination_benzopyrene_an"),
    ciqCode: "116",
    chinaTariffRate: "5-20% (MFN)",
    vatRate: "9%",
    consumptionTax: "N/A",
    gaccTimelineLow: "2-4 months",
    gaccTimelineHigh: "5-8 months",
    labTests: [t("benzo_a_pyrene"), "Heavy metals", t("acid_value"), t("peroxide_value"), "Pesticide residues", t("gmo_testing_for_soybean_corn_oil")],
    testCostRange: "$1,000-2,800",
    commonRejections: [
      { problem: t("benzo_a_pyrene_exceeded"), cause: t("high_temperature_processing_creates_pahs"), solution: t("processing_parameter_review_activated_carbon_filtr") },
      { problem: t("gmo_content_not_declared"), cause: t("china_requires_gmo_labeling_for_certain_oils"), solution: t("gmo_testing_labeling_compliance_per_china_regulati") },
    ],
    marketTrend: 'stable',
    competitorOrigin: ["Malaysia", "Indonesia", "Spain", "Ukraine"],
    importVolumeRank: 3,
  },
  seasoning: {
    label: t("seasonings_condiments_hs_21_03"),
    hsRange: "2103",
    isHighRisk: true,
    riskReason: t("category_18_high_risk_complex_ingredient_blends_ra"),
    ciqCode: "117",
    chinaTariffRate: "12-25% (MFN)",
    vatRate: "13%",
    consumptionTax: "N/A",
    gaccTimelineLow: "2-4 months",
    gaccTimelineHigh: "5-8 months",
    labTests: [t("food_additives_complete_screening"), "Microbiological", "Heavy metals", t("pesticide_residues_multi_herb"), "Mycotoxins"],
    testCostRange: "$1,200-3,200",
    commonRejections: [
      { problem: t("proprietary_blend_additives_not_all_approved"), cause: t("mixed_seasoning_contains_additives_not_per_gb_2760"), solution: t("full_ingredient_breakdown_additive_compliance_per_") },
    ],
    marketTrend: 'growing',
    competitorOrigin: ["Japan", "South Korea", "USA", "Thailand"],
    importVolumeRank: 8,
  },
  nuts: {
    label: t("nuts_dried_fruits_hs_08"),
    hsRange: "0801-0814",
    isHighRisk: true,
    riskReason: t("category_18_high_risk_aflatoxin_and_quarantine_con"),
    ciqCode: "118",
    chinaTariffRate: "5-25% (MFN)",
    vatRate: "9%",
    consumptionTax: "N/A",
    gaccTimelineLow: "2-4 months",
    gaccTimelineHigh: "5-8 months",
    labTests: [t("aflatoxin_b1_total"), "Heavy metals", "Pesticide residues", "Microbiological", t("foreign_matter"), t("moisture_content")],
    testCostRange: "$800-2,200",
    commonRejections: [
      { problem: t("aflatoxin_b1_exceeded"), cause: t("storage_humidity_causing_mold_growth"), solution: t("coa_from_cnas_lab_container_humidity_control_log") },
      { problem: t("insect_infestation_quarantine_pest"), cause: t("live_pests_in_shipment"), solution: t("fumigation_certificate_ippc_compliant_packaging") },
    ],
    marketTrend: 'growing',
    competitorOrigin: ["USA", "Vietnam", "Iran", "Turkey"],
    importVolumeRank: 6,
  },
  health_food: {
    label: t("health_dietary_supplements_hs_21_06"),
    hsRange: "2106",
    isHighRisk: true,
    riskReason: t("category_18_high_risk_potential_health_food_regist"),
    ciqCode: "119",
    chinaTariffRate: "10-20% (MFN)",
    vatRate: "13%",
    consumptionTax: "N/A",
    gaccTimelineLow: "3-6 months",
    gaccTimelineHigh: "8-18 months",
    labTests: [t("active_ingredient_assay"), "Heavy metals", "Microbiological", "Pesticide residues", "Stability testing", t("disintegration_dissolution")],
    testCostRange: "$2,000-6,000",
    commonRejections: [
      { problem: t("unapproved_health_function_claims"), cause: t("product_claims_health_benefits_not_per_cfda_approv"), solution: "Function claim review per CFDA's 27 allowed health functions" },
      { problem: t("novel_ingredient_not_in_china_food_catalogue"), cause: t("ingredient_not_approved_for_use_in_china"), solution: t("novel_food_ingredient_application_can_take_1_2_yea") },
    ],
    marketTrend: 'growing',
    competitorOrigin: ["USA", "Australia", "Japan", "South Korea"],
    importVolumeRank: 11,
  },
  other: {
    label: "Other Food Products",
    hsRange: "Varies",
    isHighRisk: false,
    riskReason: t("unclassified_case_by_case_review_required"),
    ciqCode: "199",
    chinaTariffRate: "5-30% (MFN, varies)",
    vatRate: "9-13% (varies)",
    consumptionTax: "N/A",
    gaccTimelineLow: "4-8 weeks",
    gaccTimelineHigh: "10-16 weeks",
    labTests: [t("depends_on_product_category_comprehensive_screenin")],
    testCostRange: "$800-3,000",
    commonRejections: [
      { problem: t("product_classification_ambiguous"), cause: t("cannot_determine_primary_category"), solution: t("advance_classification_ruling_from_ciq_before_subm") },
    ],
    marketTrend: 'stable',
    competitorOrigin: ["Various"],
    importVolumeRank: 15,
  },
};
}

// ─── 国家/地区数据库 ────────────────────────────────────────────────────

interface CountryProfile {
  importVolumeRank?: number;
  region: string;
  ftaWithChina: boolean;
  ftaDetails: string;
  specialRestrictions: string[];
  bilateralMeatAccess: boolean;
  bilateralAquaticAccess: boolean;
  dairyApproved: boolean;
  gaccDifficulty: 'easy' | 'moderate' | 'difficult';
  languageNote: string;
  commonIssues: string[];
  importVolumeNote: string;
}

function getCOUNTRY_DB(t: (key: string) => string): Record<string, CountryProfile> {
  return {
  USA: {
    region: "North America",
    ftaWithChina: false,
    ftaDetails: "No FTA with China. Subject to MFN rates. Additional tariffs from Section 301 may apply.",
    specialRestrictions: ["Section 301 retaliatory tariffs (additional 5-25%)", "Country of origin labeling strict"],
    bilateralMeatAccess: true,
    bilateralAquaticAccess: true,
    dairyApproved: true,
    gaccDifficulty: 'moderate',
    languageNote: "All documents in English accepted. Chinese translation required for labels.",
    commonIssues: ["Additional 301 tariffs", "Differences in food additive standards between FDA and CFDA"],
    importVolumeNote: "Largest agricultural exporter to China. Strong presence in grains, meat, and nuts.",
  },
  Canada: {
    region: "North America",
    ftaWithChina: false,
    ftaDetails: t("no_fta_mfn_rates_apply"),
    specialRestrictions: [t("canola_rapeseed_historically_had_trade_disputes")],
    bilateralMeatAccess: true,
    bilateralAquaticAccess: true,
    dairyApproved: true,
    gaccDifficulty: 'moderate',
    languageNote: t("english_french_accepted_chinese_translation_for_la"),
    commonIssues: [t("canola_trade_tensions"), t("rapeseed_inspection_protocols")],
    importVolumeNote: t("major_exporter_of_canola_pork_and_seafood_to_china"),
  },
  Australia: {
    region: "Oceania",
    ftaWithChina: true,
    ftaDetails: t("china_australia_fta_chafta_reduced_tariffs_on_many_1"),
    specialRestrictions: [t("wine_anti_dumping_duties_2021_currently_under_revi"), t("barley_tariffs_eased_2023")],
    bilateralMeatAccess: true,
    bilateralAquaticAccess: true,
    dairyApproved: true,
    gaccDifficulty: 'moderate',
    languageNote: "English accepted. Chinese translation for labels required.",
    commonIssues: [t("political_tensions_affecting_trade"), t("anti_dumping_investigations_on_certain_products")],
    importVolumeNote: t("strong_in_beef_wine_dairy_and_grains_chafta_provid"),
  },
  NewZealand: {
    region: "Oceania",
    ftaWithChina: true,
    ftaDetails: t("china_new_zealand_fta_upgraded_2022_near_zero_tari"),
    specialRestrictions: [],
    bilateralMeatAccess: true,
    bilateralAquaticAccess: true,
    dairyApproved: true,
    gaccDifficulty: 'easy',
    languageNote: "English accepted. Chinese translation for labels.",
    commonIssues: [t("dairy_quota_system_monitored")],
    importVolumeNote: t("premium_dairy_exporter_strong_reputation_for_food_"),
  },
  France: {
    region: "Europe",
    ftaWithChina: false,
    ftaDetails: t("eu_china_framework_mfn_rates_apply_individual_eu_m"),
    specialRestrictions: [t("eu_specific_certificate_requirements")],
    bilateralMeatAccess: true,
    bilateralAquaticAccess: true,
    dairyApproved: true,
    gaccDifficulty: 'moderate',
    languageNote: t("french_documents_need_chinese_translation_english_"),
    commonIssues: [t("eu_certificate_format_accepted"), t("wine_spirits_gi_protection_in_china")],
    importVolumeNote: t("major_wine_and_dairy_exporter_to_china_strong_bran"),
  },
  Germany: {
    region: "Europe",
    ftaWithChina: false,
    ftaDetails: t("eu_china_framework_mfn_rates"),
    specialRestrictions: [t("eu_certificate_requirements"), t("bse_history_enhanced_beef_inspections")],
    bilateralMeatAccess: true,
    bilateralAquaticAccess: true,
    dairyApproved: true,
    gaccDifficulty: 'moderate',
    languageNote: t("german_documents_need_chinese_translation_english_"),
    commonIssues: [t("bse_related_enhanced_checks_on_beef"), t("eu_food_safety_certificates")],
    importVolumeNote: t("strong_in_dairy_pork_and_confectionery_exports"),
  },
  Netherlands: {
    region: "Europe",
    ftaWithChina: false,
    ftaDetails: "EU framework. MFN rates.",
    specialRestrictions: [],
    bilateralMeatAccess: true,
    bilateralAquaticAccess: true,
    dairyApproved: true,
    gaccDifficulty: 'easy',
    languageNote: t("dutch_english_accepted_chinese_translation_for_lab"),
    commonIssues: [],
    importVolumeNote: t("key_eu_exporter_of_dairy_pork_and_processed_foods_"),
  },
  Italy: {
    region: "Europe",
    ftaWithChina: false,
    ftaDetails: "EU framework. MFN rates.",
    specialRestrictions: [t("gi_protection_for_certain_italian_products_parmigi")],
    bilateralMeatAccess: true,
    bilateralAquaticAccess: true,
    dairyApproved: true,
    gaccDifficulty: 'moderate',
    languageNote: t("italian_documents_need_chinese_translation_english"),
    commonIssues: [t("gi_product_registration_beneficial_for_premium_ite")],
    importVolumeNote: t("premium_wine_pasta_and_olive_oil_exporter_strong_b"),
  },
  Spain: {
    region: "Europe",
    ftaWithChina: false,
    ftaDetails: "EU framework. MFN rates.",
    specialRestrictions: [],
    bilateralMeatAccess: true,
    bilateralAquaticAccess: true,
    dairyApproved: true,
    gaccDifficulty: 'moderate',
    languageNote: t("spanish_documents_need_chinese_translation_english"),
    commonIssues: [],
    importVolumeNote: t("major_pork_exporter_to_china_olive_oil_and_wine_si"),
  },
  UK: {
    region: "Europe",
    ftaWithChina: false,
    ftaDetails: t("no_fta_post_brexit_mfn_rates_negotiations_ongoing"),
    specialRestrictions: [t("post_brexit_trade_framework_still_developing")],
    bilateralMeatAccess: true,
    bilateralAquaticAccess: true,
    dairyApproved: true,
    gaccDifficulty: 'moderate',
    languageNote: "English accepted. Chinese translation for labels.",
    commonIssues: [t("post_brexit_certification_adjustments")],
    importVolumeNote: t("premium_whisky_confectionery_and_dairy_exporter"),
  },
  Japan: {
    region: "Asia",
    ftaWithChina: true,
    ftaDetails: t("rcep_member_gradual_tariff_reductions_on_agricultu"),
    specialRestrictions: [t("nuclear_related_import_restrictions_on_fukushima_r")],
    bilateralMeatAccess: true,
    bilateralAquaticAccess: true,
    dairyApproved: false,
    gaccDifficulty: 'moderate',
    languageNote: t("japanese_documents_need_chinese_translation_englis"),
    commonIssues: [t("food_import_restrictions_from_10_prefectures_post_"), t("radiation_testing_certificates_required")],
    importVolumeNote: t("premium_confectionery_seasonings_and_alcoholic_bev"),
  },
  SouthKorea: {
    region: "Asia",
    ftaWithChina: true,
    ftaDetails: t("china_korea_fta_tariff_reductions_on_many_food_ite"),
    specialRestrictions: [t("kimchi_specific_ciq_requirements")],
    bilateralMeatAccess: true,
    bilateralAquaticAccess: true,
    dairyApproved: true,
    gaccDifficulty: 'easy',
    languageNote: t("korean_documents_need_chinese_translation_english_"),
    commonIssues: [t("kimchi_has_specific_ciq_inspection_procedures")],
    importVolumeNote: t("growing_exporter_of_confectionery_instant_noodles_"),
  },
  Thailand: {
    region: "ASEAN",
    ftaWithChina: true,
    ftaDetails: t("asean_china_fta_near_zero_tariffs_on_many_agricult"),
    specialRestrictions: [],
    bilateralMeatAccess: false,
    bilateralAquaticAccess: true,
    dairyApproved: false,
    gaccDifficulty: 'easy',
    languageNote: t("thai_documents_need_chinese_translation"),
    commonIssues: [t("fruit_export_protocols_specific_per_type"), t("aquatic_products_well_established")],
    importVolumeNote: t("top_asean_exporter_of_food_to_china_rice_tropical_"),
  },
  Vietnam: {
    region: "ASEAN",
    ftaWithChina: true,
    ftaDetails: t("asean_china_fta_also_rcep_member"),
    specialRestrictions: [],
    bilateralMeatAccess: false,
    bilateralAquaticAccess: true,
    dairyApproved: false,
    gaccDifficulty: 'easy',
    languageNote: t("vietnamese_documents_need_chinese_translation"),
    commonIssues: [t("aquatic_exports_well_established"), t("fruit_export_protocols_under_negotiation")],
    importVolumeNote: t("large_exporter_of_aquatic_products_tropical_fruits"),
  },
  Brazil: {
    region: "South America",
    ftaWithChina: false,
    ftaDetails: t("brics_framework_no_fta_mfn_rates_mercosur_china_ta"),
    specialRestrictions: [t("foot_and_mouth_disease_zoning_enhanced_checks")],
    bilateralMeatAccess: true,
    bilateralAquaticAccess: true,
    dairyApproved: false,
    gaccDifficulty: 'moderate',
    languageNote: t("portuguese_documents_need_chinese_translation"),
    commonIssues: [t("fmd_zoning_affects_some_meat_shipments"), t("soybean_quality_disputes_historically")],
    importVolumeNote: t("largest_meat_exporter_to_china_beef_poultry_pork_s"),
    importVolumeRank: 1,
  },
  Argentina: {
    region: "South America",
    ftaWithChina: false,
    ftaDetails: t("no_fta_mfn_rates"),
    specialRestrictions: [t("fmd_restrictions_regional_zoning")],
    bilateralMeatAccess: true,
    bilateralAquaticAccess: false,
    dairyApproved: false,
    gaccDifficulty: 'moderate',
    languageNote: "Spanish documents need Chinese translation.",
    commonIssues: [t("beef_export_restrictions_fluctuate_with_domestic_p"), t("fmd_zoning")],
    importVolumeNote: t("major_beef_and_soybean_exporter_meat_access_protoc"),
  },
  Chile: {
    region: "South America",
    ftaWithChina: true,
    ftaDetails: t("china_chile_fta_nearly_all_agricultural_tariffs_ze"),
    specialRestrictions: [],
    bilateralMeatAccess: true,
    bilateralAquaticAccess: true,
    dairyApproved: true,
    gaccDifficulty: 'easy',
    languageNote: "Spanish documents need Chinese translation.",
    commonIssues: [t("fta_provides_significant_tariff_advantage")],
    importVolumeNote: t("leading_fruit_exporter_to_china_cherries_grapes_pl"),
  },
  Peru: {
    region: "South America",
    ftaWithChina: true,
    ftaDetails: t("china_peru_fta_comprehensive_tariff_reduction"),
    specialRestrictions: [],
    bilateralMeatAccess: false,
    bilateralAquaticAccess: true,
    dairyApproved: false,
    gaccDifficulty: 'easy',
    languageNote: "Spanish documents need Chinese translation.",
    commonIssues: [],
    importVolumeNote: t("key_exporter_of_aquatic_products_and_fruits_grapes"),
  },
  SouthAfrica: {
    region: "Africa",
    ftaWithChina: false,
    ftaDetails: t("no_fta_brics_framework_mfn_rates"),
    specialRestrictions: [],
    bilateralMeatAccess: true,
    bilateralAquaticAccess: true,
    dairyApproved: false,
    gaccDifficulty: 'moderate',
    languageNote: "English accepted. Chinese translation for labels.",
    commonIssues: [],
    importVolumeNote: t("significant_citrus_exporter_to_china_wine_growing_"),
  },
  Ethiopia: {
    region: "Africa",
    ftaWithChina: false,
    ftaDetails: "No FTA. May qualify for preferential duties under China's LDC scheme.",
    specialRestrictions: [],
    bilateralMeatAccess: false,
    bilateralAquaticAccess: false,
    dairyApproved: false,
    gaccDifficulty: 'moderate',
    languageNote: t("amharic_english_documents_chinese_translation_need"),
    commonIssues: [t("developing_food_safety_regulatory_framework_may_ne")],
    importVolumeNote: "China's largest coffee supplier (green beans). Sesame seeds also significant.",
  },
  India: {
    region: "South Asia",
    ftaWithChina: false,
    ftaDetails: t("no_fta_mfn_rates_geopolitical_tensions_may_affect_"),
    specialRestrictions: [t("rice_and_sugar_trade_subject_to_bilateral_agreemen"), t("geopolitical_tensions_affecting_trade_flows")],
    bilateralMeatAccess: false,
    bilateralAquaticAccess: true,
    dairyApproved: false,
    gaccDifficulty: 'difficult',
    languageNote: "English accepted. Chinese translation for labels required.",
    commonIssues: [t("rice_import_protocols"), t("spice_quality_consistency"), t("geopolitical_trade_uncertainties")],
    importVolumeNote: t("major_exporter_of_rice_spices_and_seafood_to_china"),
  },
  SriLanka: {
    region: "South Asia",
    ftaWithChina: false,
    ftaDetails: t("no_fta_china_sri_lanka_fta_under_negotiation"),
    specialRestrictions: [],
    bilateralMeatAccess: false,
    bilateralAquaticAccess: true,
    dairyApproved: false,
    gaccDifficulty: 'easy',
    languageNote: t("sinhala_tamil_english_documents_chinese_translatio"),
    commonIssues: [t("tea_quality_standards_compliance"), t("cinnamon_certification")],
    importVolumeNote: t("ceylon_tea_and_cinnamon_are_signature_exports_with"),
  },
  Russia: {
    region: "Eurasia",
    ftaWithChina: false,
    ftaDetails: t("no_fta_growing_bilateral_trade_mfn_rates_with_some"),
    specialRestrictions: [t("geopolitical_sanctions_may_affect_payment_channels")],
    bilateralMeatAccess: true,
    bilateralAquaticAccess: true,
    dairyApproved: true,
    gaccDifficulty: 'moderate',
    languageNote: t("russian_documents_need_chinese_translation"),
    commonIssues: [t("sanctions_affecting_international_payments"), t("quality_consistency_concerns")],
    importVolumeNote: "Growing supplier of meat (poultry, beef), seafood, and dairy. Strong bilateral trade growth.",
  },
  // Default for unknown countries
  DEFAULT: {
    region: "Other",
    ftaWithChina: false,
    ftaDetails: t("no_fta_identified_mfn_rates_apply_verify_applicabl"),
    specialRestrictions: [t("check_specific_bilateral_agreements")],
    bilateralMeatAccess: false,
    bilateralAquaticAccess: false,
    dairyApproved: false,
    gaccDifficulty: 'moderate',
    languageNote: t("all_non_chinese_documents_must_be_translated_to_ch"),
    commonIssues: [t("verify_country_is_on_gacc_approved_lists_for_meat_")],
    importVolumeNote: t("trade_volume_data_limited_market_entry_may_require"),
  },
};
}

// ─── 法规数据库 ─────────────────────────────────────────────────────────

export interface Regulation {
  name: string;
  number: string;
  effectiveDate: string;
  issuingAuthority: string;
  relevance: 'primary' | 'secondary' | 'related';
  description: string;
  url?: string;
}

function getREGULATIONS(t: (key: string) => string): Regulation[] {
  return [
  {
    name: "GACC Decree 248",
    number: "Decree 248 (2021)",
    effectiveDate: "January 1, 2022",
    issuingAuthority: "General Administration of Customs (GACC)",
    relevance: 'primary',
    description: t("regulations_on_the_registration_of_overseas_manufa_1"),
  },
  {
    name: "GACC Decree 249",
    number: "Decree 249 (2021)",
    effectiveDate: "January 1, 2022",
    issuingAuthority: "General Administration of Customs (GACC)",
    relevance: 'primary',
    description: "Administrative Measures on Import and Export Food Safety. Sets the framework for customs inspection, documentation, and clearance procedures for imported food.",
  },
  {
    name: "Food Safety Law of China",
    number: t("prc_food_safety_law_2015_amended_2018_2021"),
    effectiveDate: "October 1, 2015",
    issuingAuthority: "National People's Congress (NPC)",
    relevance: 'primary',
    description: t("primary_legislation_governing_food_safety_in_china_1"),
  },
  {
    name: "GB 7718",
    number: t("gb_7718_2011_under_revision"),
    effectiveDate: "April 20, 2012",
    issuingAuthority: "National Health Commission (NHC)",
    relevance: 'primary',
    description: t("national_food_safety_standard_general_rules_for_nu_1"),
  },
  {
    name: "GB 28050",
    number: "GB 28050-2011",
    effectiveDate: "January 1, 2013",
    issuingAuthority: "National Health Commission (NHC)",
    relevance: 'primary',
    description: t("national_food_safety_standard_general_rules_for_nu_2"),
  },
  {
    name: "GB 2760",
    number: "GB 2760-2024",
    effectiveDate: "February 8, 2025",
    issuingAuthority: "National Health Commission (NHC)",
    relevance: 'primary',
    description: t("national_food_safety_standard_uses_of_food_additiv_1"),
  },
  {
    name: "GB 2762",
    number: "GB 2762-2022",
    effectiveDate: "June 30, 2023",
    issuingAuthority: "National Health Commission (NHC)",
    relevance: 'secondary',
    description: "Maximum levels of contaminants in food. Sets limits for heavy metals, mycotoxins, and other contaminants.",
  },
  {
    name: "GB 2763",
    number: "GB 2763-2021",
    effectiveDate: "September 3, 2021",
    issuingAuthority: "National Health Commission (NHC)",
    relevance: 'secondary',
    description: t("maximum_residue_limits_for_pesticides_in_food_10_0_1"),
  },
  {
    name: "GB 29921",
    number: "GB 29921-2021",
    effectiveDate: "November 22, 2021",
    issuingAuthority: "National Health Commission (NHC)",
    relevance: 'secondary',
    description: t("maximum_levels_of_pathogenic_bacteria_in_prepackag"),
  },
  {
    name: "CIFER System",
    number: "China Import Food Enterprise Registration System",
    effectiveDate: "January 1, 2022",
    issuingAuthority: "GACC",
    relevance: 'primary',
    description: t("online_portal_for_overseas_food_manufacturers_to_s_1"),
  },
  {
    name: t("ciq_inspection"),
    number: t("customs_inspection_procedures"),
    effectiveDate: "Ongoing",
    issuingAuthority: t("customs_formerly_ciq"),
    relevance: 'secondary',
    description: t("upon_arrival_at_chinese_ports_shipments_must_under_1"),
  },
];
}

// ─── 渠道策略 ──────────────────────────────────────────────────────────

interface ChannelStrategy {
  channel: string;
  suitability: 'high' | 'medium' | 'low';
  gaccRequired?: boolean;
  description: string;
  advantages: string[];
  disadvantages: string[];
  timeline: string;
  costRange: string;
}

function getChannels(input: GaccInput, catProfiles: Record<GaccCategory, CategoryProfile>, t: (k: string) => string): ChannelStrategy[] {
  const cat = catProfiles[input.category] || catProfiles['other'];
  return [
    {
      channel: t("gaccChannel_generalTrade_name"),
      suitability: "high",
      description: t("gaccChannel_generalTrade_desc") + (cat.isHighRisk ? t("gaccChannel_generalTrade_desc_highRisk") : ""),
      advantages: [t("gaccChannel_generalTrade_adv1"), t("gaccChannel_generalTrade_adv2"), t("gaccChannel_generalTrade_adv3")],
      disadvantages: [t("gaccChannel_generalTrade_dis1"), t("gaccChannel_generalTrade_dis2"), t("gaccChannel_generalTrade_dis3")],
      timeline: cat.isHighRisk ? "4-14 months" : "2-4 months",
      costRange: cat.isHighRisk ? "$8,000-25,000" : "$3,000-8,000",
    },
    {
      channel: t("gaccChannel_cbec_name"),
      suitability: "high",
      description: t("gaccChannel_cbec_desc"),
      advantages: [t("gaccChannel_cbec_adv1"), t("gaccChannel_cbec_adv2"), t("gaccChannel_cbec_adv3"), t("gaccChannel_cbec_adv4")],
      disadvantages: [t("gaccChannel_cbec_dis1"), t("gaccChannel_cbec_dis2"), t("gaccChannel_cbec_dis3"), t("gaccChannel_cbec_dis4")],
      timeline: "4-10 weeks",
      costRange: "$10,000-40,000",
    },
    {
      channel: t("gaccChannel_parcel_name"),
      suitability: "low",
      description: t("gaccChannel_parcel_desc"),
      advantages: [t("gaccChannel_parcel_adv1"), t("gaccChannel_parcel_adv2")],
      disadvantages: [t("gaccChannel_parcel_dis1"), t("gaccChannel_parcel_dis2"), t("gaccChannel_parcel_dis3"), t("gaccChannel_parcel_dis4")],
      timeline: "1-3 weeks",
      costRange: "$500-2,000",
    },
  ];
}

// ─── 市场情报数据 ──────────────────────────────────────────────────────

interface MarketIntel {
  chinaImportTrend: string;
  topOrigins: { country: string; share: string }[];
  consumerPerception: string;
  keyDrivers: string[];
  barriers: string[];
  recommendation: string;
}

function getMarketIntel(input: GaccInput, catProfiles: Record<GaccCategory, CategoryProfile>, t: (k: string) => string): MarketIntel {
  const cat = catProfiles[input.category] || catProfiles['other'];
  return {
    chinaImportTrend: cat.marketTrend === 'growing' ? t("gaccMarket_trendGrowing") : cat.marketTrend === 'stable' ? t("gaccMarket_trendStable") : t("gaccMarket_trendDeclining"),
    consumerPerception: t("gaccMarket_consumerPerception"),
    topOrigins: cat.competitorOrigin.map(o => ({ country: o, share: "" })),
    keyDrivers: [t("gaccMarket_driver1"), t("gaccMarket_driver2"), t("gaccMarket_driver3"), t("gaccMarket_driver4")],
    barriers: [t("gaccMarket_barrier1"), t("gaccMarket_barrier2"), t("gaccMarket_barrier3")],
    recommendation: cat.isHighRisk ? t("gaccMarket_recoHigh") : t("gaccMarket_recoStandard"),
  };
}

// ─── 成本估算 ──────────────────────────────────────────────────────────

export interface CostBreakdown {
  item: string;
  estimatedRange: string;
  notes: string;
}

function getCostBreakdown(input: GaccInput, catProfiles: Record<GaccCategory, CategoryProfile>, t: (k: string) => string): CostBreakdown[] {
  const cat = catProfiles[input.category] || catProfiles['other'];
  return [
    { item: t("gaccCost_registration_item"), estimatedRange: "$1,500-3,000", notes: t("gaccCost_registration_notes") },
    { item: t("gaccCost_testing_item"), estimatedRange: cat.testCostRange, notes: t("gaccCost_testing_notes") },
    { item: t("gaccCost_translation_item"), estimatedRange: "$500-2,000", notes: t("gaccCost_translation_notes") },
    { item: t("gaccCost_labelDesign_item"), estimatedRange: "$500-2,000", notes: t("gaccCost_labelDesign_notes") },
    { item: t("gaccCost_consultation_item"), estimatedRange: cat.isHighRisk ? "$5,000-15,000" : "$2,000-5,000", notes: t("gaccCost_consultation_notes") },
    { item: t("gaccCost_brokerage_item"), estimatedRange: "$500-1,500 per shipment", notes: t("gaccCost_brokerage_notes") },
  ];
}

function getTotalCostRange(input: GaccInput, catProfiles: Record<GaccCategory, CategoryProfile>): string {
  const cat = catProfiles[input.category] || catProfiles['other'];
  if (cat.isHighRisk) return "$8,500-24,500";
  return "$3,500-9,500";
}

// ─── 时间线 ────────────────────────────────────────────────────────────

export interface TimelinePhase {
  phase: string;
  duration: string;
  description: string;
  responsible: 'Client' | 'SinoTrade' | 'Both';
  dependencies: string[];
}

function getTimeline(input: GaccInput, catProfiles: Record<GaccCategory, CategoryProfile>, t: (k: string) => string): TimelinePhase[] {
  const cat = catProfiles[input.category] || catProfiles['other'];
  const timeline1 = cat.isHighRisk ? cat.gaccTimelineHigh : cat.gaccTimelineLow;
  
  return [
    {
      phase: t("gaccTimeline_initAssess_name"),
      duration: "1-2 weeks",
      description: t("gaccTimeline_initAssess_desc"),
      responsible: 'SinoTrade',
      dependencies: [],
    },
    {
      phase: t("gaccTimeline_docPrep_name"),
      duration: cat.isHighRisk ? "3-6 weeks" : "2-4 weeks",
      description: t("gaccTimeline_docPrep_desc"),
      responsible: 'Both',
      dependencies: ["Initial assessment complete"],
    },
    {
      phase: t("gaccTimeline_labTest_name"),
      duration: cat.isHighRisk ? "3-5 weeks" : "2-3 weeks",
      description: t("gaccTimeline_labTest_desc"),
      responsible: 'SinoTrade',
      dependencies: ["Sample shipment arranged"],
    },
    {
      phase: t("gaccTimeline_submit_name"),
      duration: "1-2 weeks",
      description: t("gaccTimeline_submit_desc") + (cat.isHighRisk ? t("gaccTimeline_submit_highRiskNote") : ""),
      responsible: 'SinoTrade',
      dependencies: ["All documents ready", "Lab reports received"],
    },
    {
      phase: t("gaccTimeline_review_name"),
      duration: cat.isHighRisk ? "2-6 months" : "2-6 weeks",
      description: t("gaccTimeline_review_desc"),
      responsible: 'SinoTrade',
      dependencies: ["Application submitted"],
    },
    {
      phase: t("gaccTimeline_label_name"),
      duration: "2-3 weeks",
      description: t("gaccTimeline_label_desc"),
      responsible: 'SinoTrade',
      dependencies: ["Product details finalized"],
    },
    {
      phase: t("gaccTimeline_shipment_name"),
      duration: "1-3 weeks",
      description: t("gaccTimeline_shipment_desc"),
      responsible: 'Both',
      dependencies: [t("gacc_registration_approved"), t("label_artwork_finalized")],
    },
  ];
}

// ─── 标签合规详细指南 ─────────────────────────────────────────────────

interface LabelGuide {
  requiredItems: { field: string; requirement: string; commonMistake: string }[];
  gb7718Highlights: string[];
  gb28050Highlights: string[];
}

function getLabelGuide(t: (k: string) => string): LabelGuide {
  return {
    requiredItems: [
      { field: t("gaccLabel_productName_field"), requirement: t("gaccLabel_productName_req"), commonMistake: t("gaccLabel_productName_mistake") },
      { field: t("gaccLabel_ingredients_field"), requirement: t("gaccLabel_ingredients_req"), commonMistake: t("gaccLabel_ingredients_mistake") },
      { field: t("gaccLabel_netContent_field"), requirement: t("gaccLabel_netContent_req"), commonMistake: t("gaccLabel_netContent_mistake") },
      { field: t("gaccLabel_manufacturer_field"), requirement: t("gaccLabel_manufacturer_req"), commonMistake: t("gaccLabel_manufacturer_mistake") },
      { field: t("gaccLabel_origin_field"), requirement: t("gaccLabel_origin_req"), commonMistake: t("gaccLabel_origin_mistake") },
      { field: t("gaccLabel_date_field"), requirement: t("gaccLabel_date_req"), commonMistake: t("gaccLabel_date_mistake") },
      { field: t("gaccLabel_storage_field"), requirement: t("gaccLabel_storage_req"), commonMistake: t("gaccLabel_storage_mistake") },
      { field: t("gaccLabel_nutrition_field"), requirement: t("gaccLabel_nutrition_req"), commonMistake: t("gaccLabel_nutrition_mistake") },
      { field: t("gaccLabel_additives_field"), requirement: t("gaccLabel_additives_req"), commonMistake: t("gaccLabel_additives_mistake") },
      { field: t("gaccLabel_allergen_field"), requirement: t("gaccLabel_allergen_req"), commonMistake: t("gaccLabel_allergen_mistake") },
      { field: t("gaccLabel_qs_field"), requirement: t("gaccLabel_qs_req"), commonMistake: t("gaccLabel_qs_mistake") },
      { field: t("gaccLabel_importRecord_field"), requirement: t("gaccLabel_importRecord_req"), commonMistake: t("gaccLabel_importRecord_mistake") },
    ],
    gb7718Highlights: [
      t("gaccGb7718_1"), t("gaccGb7718_2"), t("gaccGb7718_3"),
      t("gaccGb7718_4"), t("gaccGb7718_5"), t("gaccGb7718_6"),
    ],
    gb28050Highlights: [
      t("gaccGb28050_1"), t("gaccGb28050_2"), t("gaccGb28050_3"),
      t("gaccGb28050_4"), t("gaccGb28050_5"), t("gaccGb28050_6"),
    ],
  };;
}

// ─── Horizon Scan ──────────────────────────────────────────────────────

export interface HorizonItem {
  topic: string;
  impact: 'high' | 'medium' | 'low';
  timeframe: string;
  description: string;
  actionRequired: boolean;
}

function getHorizonScan(t: (k: string) => string): HorizonItem[] {
  return [
    { topic: t("gaccHorizon_gb7718_topic"), impact: "high", timeframe: "2025-2026", description: t("gaccHorizon_gb7718_desc"), actionRequired: true },
    { topic: t("gaccHorizon_cbec_topic"), impact: "medium", timeframe: "2025-2026", description: t("gaccHorizon_cbec_desc"), actionRequired: false },
    { topic: t("gaccHorizon_traceability_topic"), impact: "high", timeframe: "2025+", description: t("gaccHorizon_traceability_desc"), actionRequired: true },
    { topic: t("gaccHorizon_aiLabel_topic"), impact: "medium", timeframe: "2025-2027", description: t("gaccHorizon_aiLabel_desc"), actionRequired: false },
    { topic: t("gaccHorizon_healthFood_topic"), impact: "medium", timeframe: "2025+", description: t("gaccHorizon_healthFood_desc"), actionRequired: false },
    { topic: t("gaccHorizon_carbon_topic"), impact: "low", timeframe: "2026+", description: t("gaccHorizon_carbon_desc"), actionRequired: false },
  ];;
}

// ═══════════════════════════════════════════════════════════════════════
// 主力输出接口
// ═══════════════════════════════════════════════════════════════════════

export interface GaccResult extends StandardResult {
  requiresRegistration: boolean;
  isHighRisk: boolean;
  riskCategory: "high" | "low";

  // 1. Executive Risk Scorecard
  riskScore: number; // 1-10
  riskDimensions: { dimension: string; score: number; color: string; note: string }[];
  verdictLabel: string;
  riskPathway: string;
  executiveSummary: string;
  oneLineDecision: string;

  // 2. Market Entry Viability
  viability: string;
  marketIntel: MarketIntel;

  // 3. Channel Strategy
  channels: ChannelStrategy[];

  // 4. Tariff & Tax
  tariffInfo: {
    hsCode: string;
    mfnRate: string;
    ftaRate: string | null;
    vatRate: string;
    consumptionTax: string;
    totalTaxBurden: string;
    estimatedLandedCostExample: string;
  };

  // 5. Regulatory Framework
  regulations: Regulation[];

  // 6. Classification Analysis
  classification: {
    assignedHsChapter: string;
    ciqCode: string;
    isHighRisk: boolean;
    riskReason: string;
    alternativeClassificationNote: string;
  };

  // 7. Risk Assessment Matrix
  riskMatrix: { dimension: string; rating: '🟢' | '🟡' | '🔴'; explanation: string }[];

  // 8. Document Requirements
  requiredDocuments: string[];
  documentGuide: { name: string; format: string; notarization: string; validity: string; commonError: string }[];

  // 9. Lab Testing
  labTests: string[];
  testCostRange: string;
  labGuide: string;

  // 10. Label Compliance
  labelGuide: LabelGuide;

  // 11. Implementation Roadmap
  timelinePhases: TimelinePhase[];

  // 12. Cost Estimation
  costBreakdown: CostBreakdown[];
  totalCostRange: string;

  // 13. Timeline Summary
  estimatedTimeline: string;
  detailedTimeline: string;

  // 14. Country-Specific Analysis
  countryProfile: CountryProfile;

  // 15. Market Intelligence
  competitiveAnalysis: string;

  // 16. Common Pitfalls
  commonRejections: { problem: string; cause: string; solution: string }[];

  // 17. Post-Approval Compliance
  postApprovalObligations: { item: string; frequency: string; description: string }[];

  // 18. Horizon Scan
  horizonScan: HorizonItem[];

  // Legacy fields
  summary: string;
}

export function checkGacc(input: GaccInput, locale?: string): GaccResult {
  const t = buildT(locale || 'en');
  const CATEGORY_PROFILES = getCATEGORY_PROFILES(t);
  const COUNTRY_DB = getCOUNTRY_DB(t);
  const REGULATIONS = getREGULATIONS(t);

  // Translated category label
  const catLabel = t(`gaccCat_${input.category}_label`) || CATEGORY_LABELS[input.category];

  // Category-level translations
  const cat = CATEGORY_PROFILES[input.category] || CATEGORY_PROFILES['other'];
  const tLabTests = cat.labTests.map((_, i) => t(`gaccCat_${input.category}_labTest_${i}`));
  const tRejections = cat.commonRejections.map((r, i) => ({
    problem: t(`gaccCat_${input.category}_reject_${i}_problem`),
    cause: t(`gaccCat_${input.category}_reject_${i}_cause`),
    solution: t(`gaccCat_${input.category}_reject_${i}_solution`),
  }));
  const tRiskReason = t(`gaccCat_${input.category}_riskReason`);

  const country = COUNTRY_DB[input.originCountry] || COUNTRY_DB.DEFAULT;
  const diffLabelMap: Record<string, string> = {
    'easy': t('gaccDifficultyEasy'),
    'moderate': t('gaccDifficultyModerate'),
    'difficult': t('gaccDifficultyDifficult'),
  };
  const diffLabel = diffLabelMap[country.gaccDifficulty] || country.gaccDifficulty;
  const isHighRisk = cat.isHighRisk;
  
  // Risk scoring
  const riskDimensions = [
    { 
      dimension: t("gaccRiskDim_productCategory"), 
      score: isHighRisk ? 8 : 3, 
      color: isHighRisk ? "🔴" : "🟢",
      note: t(isHighRisk ? "gaccRiskNote_highRiskCat" : "gaccRiskNote_standardRiskCat")
    },
    {
      dimension: t("gaccRiskDim_originCountryComplexity"),
      score: country.gaccDifficulty === 'difficult' ? 7 : country.gaccDifficulty === 'moderate' ? 5 : 3,
      color: country.gaccDifficulty === 'difficult' ? "🔴" : country.gaccDifficulty === 'moderate' ? "🟡" : "🟢",
      note: t('gaccRiskNote_pathwayCountry').replace('{originCountry}', input.originCountry || '').replace('{difficulty}', diffLabel) + (country.ftaWithChina ? t('gaccRiskNote_ftaBenefits') : '')
    },
    {
      dimension: t("gaccRiskDim_documentationComplexity"),
      score: isHighRisk ? 7 : 4,
      color: isHighRisk ? "🔴" : "🟢",
      note: t(isHighRisk ? "gaccRiskNote_enhancedDoc" : "gaccRiskNote_standardDoc")
    },
    {
      dimension: t("gaccRiskDim_testingRequirements"),
      score: isHighRisk ? 6 : 4,
      color: isHighRisk ? "🟡" : "🟢",
      note: t('gaccRiskNote_testsCost').replace('{count}', cat.labTests.length.toString()).replace('{costRange}', cat.testCostRange)
    },
    {
      dimension: t("gaccRiskDim_timelineToMarket"),
      score: isHighRisk ? 8 : 4,
      color: isHighRisk ? "🔴" : "🟢",
      note: t('gaccRiskNote_estimatedTimeline').replace('{timeline}', isHighRisk ? cat.gaccTimelineHigh : cat.gaccTimelineLow)
    },
  ];
  const riskScore = Math.round(riskDimensions.reduce((s, d) => s + d.score, 0) / riskDimensions.length * 10) / 10;

  // Classification analysis
  const classification = {
    assignedHsChapter: cat.hsRange,
    ciqCode: cat.ciqCode,
    isHighRisk,
    riskReason: tRiskReason,
    alternativeClassificationNote: input.hsCode && !input.hsCode.startsWith(cat.hsRange.split(",")[0].split("-")[0])
      ? `⚠️ Your HS code ${input.hsCode} may not align with the standard range for ${catLabel}. Verify classification to avoid customs delays.`
      : t("gaccClassify_hsMatch"),
  };

  // Tariff info
  const tariffInfo = {
    hsCode: input.hsCode || cat.hsRange,
    mfnRate: cat.chinaTariffRate,
    ftaRate: country.ftaWithChina ? t("gaccTariff_ftaEligible") : t("gaccTariff_noFta"),
    vatRate: cat.vatRate,
    consumptionTax: cat.consumptionTax,
    totalTaxBurden: `${cat.chinaTariffRate} + ${cat.vatRate} ${cat.consumptionTax !== "N/A" ? `+ ${cat.consumptionTax}` : ""}`,
    estimatedLandedCostExample: t("gaccTariff_landedCostExample"),
  };

  // Risk matrix
  const riskMatrix = [
    { dimension: t("gaccRiskDim_productCategoryRisk"), rating: isHighRisk ? "🔴" as const : "🟢" as const, explanation: cat.riskReason },
    { dimension: t("gaccRiskDim_originCountry"), rating: country.gaccDifficulty === 'difficult' ? "🔴" as const : country.gaccDifficulty === 'moderate' ? "🟡" as const : "🟢" as const, explanation: t('gaccRiskNote_pathwayShort').replace('{originCountry}', input.originCountry || '').replace('{difficulty}', diffLabel) },
    { dimension: t("gaccRiskDim_ingredients"), rating: isHighRisk ? "🟡" as const : "🟢" as const, explanation: isHighRisk ? t("gaccRiskMatrix_complexIngredient") : t("gaccRiskMatrix_standardIngredient") },
    { dimension: t("gaccRiskDim_processing"), rating: (cat.isHighRisk && (input.category === 'meat' || input.category === 'dairy' || input.category === 'seafood')) ? "🔴" as const : "🟢" as const, explanation: (cat.isHighRisk && (input.category === 'meat' || input.category === 'dairy' || input.category === 'seafood')) ? t("gaccRiskMatrix_rawProcessing") : t("gaccRiskMatrix_processed") },
    { dimension: t("gaccRiskDim_complianceHistory"), rating: "🟢" as const, explanation: t("gaccRiskMatrix_firstTime") },
  ];

  // Document guide
  const documentGuide = (() => {
  const items = [
    { name: t("gaccDoc_appForm_name"), format: t("gaccDoc_appForm_format"), notarization: t("gaccDoc_appForm_notarization"), validity: t("gaccDoc_appForm_validity"), commonError: t("gaccDoc_appForm_error") },
    { name: t("gaccDoc_productDesc_name"), format: t("gaccDoc_productDesc_format"), notarization: t("gaccDoc_productDesc_notarization"), validity: t("gaccDoc_productDesc_validity"), commonError: t("gaccDoc_productDesc_error") },
    { name: t("gaccDoc_flowChart_name"), format: t("gaccDoc_flowChart_format"), notarization: t("gaccDoc_flowChart_notarization"), validity: t("gaccDoc_flowChart_validity"), commonError: t("gaccDoc_flowChart_error") },
    { name: t("gaccDoc_haccp_name"), format: t("gaccDoc_haccp_format"), notarization: t("gaccDoc_haccp_notarization"), validity: t("gaccDoc_haccp_validity"), commonError: t("gaccDoc_haccp_error") },
    { name: t("gaccDoc_labReport_name"), format: t("gaccDoc_labReport_format"), notarization: t("gaccDoc_labReport_notarization"), validity: t("gaccDoc_labReport_validity"), commonError: t("gaccDoc_labReport_error") },
    { name: t("gaccDoc_freeSale_name"), format: t("gaccDoc_freeSale_format"), notarization: t("gaccDoc_freeSale_notarization"), validity: t("gaccDoc_freeSale_validity"), commonError: t("gaccDoc_freeSale_error") },
    { name: t("gaccDoc_photos_name"), format: t("gaccDoc_photos_format"), notarization: t("gaccDoc_photos_notarization"), validity: t("gaccDoc_photos_validity"), commonError: t("gaccDoc_photos_error") },
    { name: t("gaccDoc_auditReport_name"), format: t("gaccDoc_auditReport_format"), notarization: t("gaccDoc_auditReport_notarization"), validity: t("gaccDoc_auditReport_validity"), commonError: t("gaccDoc_auditReport_error") },
  ];
  if (isHighRisk) {
    items.push(
      { name: t("gaccDoc_riskAssessment_name"), format: t("gaccDoc_riskAssessment_format"), notarization: t("gaccDoc_riskAssessment_notarization"), validity: t("gaccDoc_riskAssessment_validity"), commonError: t("gaccDoc_riskAssessment_error") },
      { name: t("gaccDoc_authorityLetter_name"), format: t("gaccDoc_authorityLetter_format"), notarization: t("gaccDoc_authorityLetter_notarization"), validity: t("gaccDoc_authorityLetter_validity"), commonError: t("gaccDoc_authorityLetter_error") },
    );
  }
  return items;
})();;

  // Post-approval obligations
  const postApprovalObligations = [
    { item: t("gaccPost_annualReport_item"), frequency: t("gaccPost_annualReport_frequency"), description: t("gaccPost_annualReport_desc") },
    { item: t("gaccPost_labelUpdate_item"), frequency: t("gaccPost_labelUpdate_frequency"), description: t("gaccPost_labelUpdate_desc") },
    { item: t("gaccPost_renewal_item"), frequency: t("gaccPost_renewal_frequency"), description: t("gaccPost_renewal_desc") },
    { item: t("gaccPost_clearance_item"), frequency: t("gaccPost_clearance_frequency"), description: t("gaccPost_clearance_desc") },
    { item: t("gaccPost_surveillance_item"), frequency: t("gaccPost_surveillance_frequency"), description: t("gaccPost_surveillance_desc") },
    { item: t("gaccPost_formulaChange_item"), frequency: t("gaccPost_formulaChange_frequency"), description: t("gaccPost_formulaChange_desc") },
  ];

  // Country-specific warnings
  const countrySpecificWarnings = country.specialRestrictions.length > 0 
    ? country.specialRestrictions 
    : [t("gaccCountry_noRestrictions")];

  return {
    requiresRegistration: true,
    isHighRisk,
    riskCategory: isHighRisk ? "high" : "low",

    // 1
    riskScore,
    riskDimensions,
    verdictLabel: t(isHighRisk ? 'gaccVerdictHigh' : 'gaccVerdictStandard'),
    riskPathway: t(isHighRisk ? 'gaccRiskPathwayHigh' : 'gaccRiskPathwayStandard'),
    executiveSummary: t('gaccExecutiveSummary').replace('{productName}', input.productName || '').replace('{category}', catLabel),
    oneLineDecision: isHighRisk ? t("gaccOneLineHigh") : t("gaccOneLineStandard"),

    // 2
    viability: t("gaccViability"),
    marketIntel: getMarketIntel(input, CATEGORY_PROFILES, t),

    // 3
    channels: getChannels(input, CATEGORY_PROFILES, t),

    // 4
    tariffInfo,

    // 5
    regulations: REGULATIONS,

    // 6
    classification,

    // 7
    riskMatrix,

    // 8
    requiredDocuments: documentGuide.map(d => d.name),
    documentGuide,

    // 9
    labTests: tLabTests,
    testCostRange: cat.testCostRange,
    labGuide: t("gaccLabGuide").replace("{tests}", tLabTests.join(", ")).replace("{cost}", cat.testCostRange),

    // 10
    labelGuide: getLabelGuide(t),

    // 11
    timelinePhases: getTimeline(input, CATEGORY_PROFILES, t),

    // 12
    costBreakdown: getCostBreakdown(input, CATEGORY_PROFILES, t),
    totalCostRange: getTotalCostRange(input, CATEGORY_PROFILES),

    // 13
    estimatedTimeline: isHighRisk ? cat.gaccTimelineHigh : cat.gaccTimelineLow,
    detailedTimeline: isHighRisk
      ? t("gaccDetailedTimelineHigh").replace("{category}", catLabel).replace("{timeline}", cat.gaccTimelineHigh || "")
      : t("gaccDetailedTimelineStandard").replace("{category}", catLabel).replace("{timeline}", cat.gaccTimelineLow || ""),

    // 14
    countryProfile: country,

    // 15
    competitiveAnalysis: (() => {
      const origins = cat.competitorOrigin.join(", ");
      const base = cat.marketTrend === 'growing' ? t("gaccCompetitiveAnalysis") : t("gaccCompetitiveAnalysisStable");
      return base.replace("{category}", catLabel).replace("{origins}", origins);
    })(),

    // 16
    commonRejections: tRejections,

    // 17
    postApprovalObligations,

    // 18
    horizonScan: getHorizonScan(t),

    // Legacy
    summary: isHighRisk ? t("gaccSummaryHigh") : t("gaccSummaryStandard"),
  };
}

/** Backwards-compatible label map */
export const CATEGORY_LABELS: Record<GaccCategory, string> = {
  alcohol: "Alcoholic Beverages (HS 22.03-22.08)",
  beverage: "Non-alcoholic Beverages (HS 22.01-22.02)",
  confectionery: "Confectionery / Chocolate (HS 17.04, 18.06)",
  coffee_tea: "Coffee / Tea (HS 09.01-09.02)",
  canned: "Canned / Processed Foods (HS 20)",
  sugar: "Sugar / Syrups (HS 17)",
  grain: "Grains / Flour (HS 10-11)",
  meat: "Meat Products (HS 02)",
  dairy: "Dairy Products (HS 04)",
  seafood: "Seafood / Aquatic (HS 03)",
  honey: "Honey / Bee Products (HS 04.09)",
  oil: "Edible Oils (HS 15)",
  seasoning: "Seasonings / Condiments (HS 21.03)",
  nuts: "Nuts / Dried Fruits (HS 08)",
  health_food: "Health / Dietary Supplements (HS 21.06)",
  other: "Other Food Products",
};

/** Backwards-compatible high-risk map */
export function getHIGH_RISK_18(catProfiles: Record<GaccCategory, CategoryProfile>): Record<GaccCategory, boolean> {
  return Object.fromEntries(
    (Object.entries(catProfiles) as [GaccCategory, CategoryProfile][]).map(([k, v]) => [k, v.isHighRisk])
  ) as Record<GaccCategory, boolean>;
}