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

const PROFILES: Record<string, any> = {"electronics": {"label": "Consumer Electronics (HS 85)", "risk": "🔴 High", "riskReason": "CCC mandatory. CB report often accepted reducing testing scope.", "mfn": "5-15%", "vat": "13%", "testing": ["Safety GB 4943.1-2022", "EMC GB 9254", "Harmonics GB 17625.1", "Energy efficiency"], "testCost": "$3,000-8,000", "certs": ["CCC Certificate", "CB Test Report (optional)"], "reject": [{"problem": "EMC exceeds GB 9254 limits", "cause": "Design optimized for FCC/CE but not Chinese grid", "solution": "EMC pre-scan before formal testing at CNCA lab"}], "time": "4-6 months"}, "home_appliance": {"label": "Home Appliances (HS 84)", "risk": "🔴 High", "riskReason": "CCC mandatory. GB 4706 series applies per product type.", "mfn": "8-20%", "vat": "13%", "testing": ["Safety GB 4706.1", "Product-specific GB 4706.xx", "EMC GB 4343.1", "Energy label registration"], "testCost": "$3,500-10,000", "certs": ["CCC Certificate", "Energy Efficiency Label"], "reject": [{"problem": "Wrong GB 4706 sub-standard applied", "cause": "Different appliance types need different sub-standards", "solution": "Identify correct GB 4706.xx before testing"}], "time": "4-7 months"}, "it_equipment": {"label": "IT / Communication (HS 84.71, 85.17)", "risk": "🔴 High", "riskReason": "CCC + possible SRRC for wireless devices.", "mfn": "0-8%", "vat": "13%", "testing": ["Safety GB 4943.1", "EMC GB 9254", "Wireless SRRC", "SAR if radio"], "testCost": "$4,000-12,000", "certs": ["CCC Certificate", "SRRC Approval (wireless)"], "reject": [{"problem": "Wireless device shipped without SRRC", "cause": "SRRC and CCC are separate approvals", "solution": "File SRRC application in parallel with CCC"}], "time": "4-8 months"}, "lighting": {"label": "Lighting Products (HS 85.39, 94.05)", "risk": "🔴 High", "riskReason": "CCC mandatory. LED-specific GB standards.", "mfn": "5-15%", "vat": "13%", "testing": ["Safety GB 7000.1", "Photometric performance", "EMC GB 17743", "Harmonics GB 17625.1"], "testCost": "$3,000-8,000", "certs": ["CCC Certificate", "Energy Efficiency Label"], "reject": [{"problem": "LED flicker exceeds GB/T limits", "cause": "Driver design not per standard", "solution": "Use CNCA-certified LED drivers"}], "time": "3-6 months"}, "toy": {"label": "Toys / Children's Products (HS 95.03)", "risk": "🔴 High", "riskReason": "CCC mandatory. GB 6675 series for toy safety.", "mfn": "5-10%", "vat": "13%", "testing": ["Mechanical GB 6675.2", "Flammability GB 6675.3", "Chemical GB 6675.4", "Phthalates", "Heavy metals"], "testCost": "$2,000-6,000", "certs": ["CCC Certificate"], "reject": [{"problem": "Phthalates exceed China limit", "cause": "China limit stricter than EU/US standards", "solution": "Use phthalate-free plasticizers for all soft parts"}], "time": "3-6 months"}, "medical": {"label": "Medical Devices (HS 90)", "risk": "🔴 High", "riskReason": "CCC + NMPA medical device registration dual path.", "mfn": "0-8%", "vat": "13%", "testing": ["Safety GB 9706.1", "EMC YY 0505", "Biocompatibility ISO 10993"], "testCost": "$8,000-25,000", "certs": ["CCC Certificate", "NMPA Medical Device Registration"], "reject": [{"problem": "Clinical evaluation inadequate for NMPA", "cause": "NMPA requires China-specific data", "solution": "Engage NMPA-recognized clinical evaluation institution"}], "time": "8-18 months"}};

const COUNTRIES: Record<string, any> = {"USA": {"diff": "moderate", "fta": false, "notes": "CB reports accepted. Section 301 tariffs may apply."}, "Germany": {"diff": "easy", "fta": false, "notes": "CB reports widely accepted. Strong CE alignment."}, "Japan": {"diff": "easy", "fta": true, "notes": "PSE certification often recognized for testing."}, "South Korea": {"diff": "easy", "fta": true, "notes": "KC certification testing may be accepted."}};

export function checkCcc(input: any, locale?: string): any {
  const t = buildT(locale || 'en');

  const cat = PROFILES[input.category] || PROFILES['electronics'];
  if (!cat) return {};
  const requiresReg = cat.risk === "🔴 High";
  const isHighRisk = requiresReg;
  const riskScore = requiresReg ? 7.0 : 3.5;
  return {
    requiresRegistration: requiresReg,
    riskCategory: requiresReg ? "high" : "low", isHighRisk, riskScore,
    estimatedTimeline: cat.time || "Contact us",
    totalCostRange: requiresReg ? "$5,000-25,000" : "$800-5,000",
    verdictLabel: t(requiresReg ? 'cccVerdictHigh' : 'cccVerdictStandard'),
    riskPathway: t(requiresReg ? 'cccRiskPathwayHigh' : 'cccRiskPathwayStandard'),
    executiveSummary: t('cccExecutiveSummary').replace('{productName}', input.productName || ''),
    oneLineDecision: t(requiresReg ? 'cccOneLineHigh' : 'cccOneLineLow'),
    riskDimensions: [
      { dimension: "Product Category", score: requiresReg ? 8 : 3, color: requiresReg ? "🔴" : "🟢", note: cat.label },
      { dimension: "Regulatory Complexity", score: requiresReg ? 7 : 3, color: requiresReg ? "🟡" : "🟢", note: cat.riskReason },
      { dimension: "Testing", score: requiresReg ? 6 : 3, color: requiresReg ? "🟡" : "🟢", note: `${(cat.testing||[]).length} tests required` },
      { dimension: "Timeline", score: requiresReg ? 7 : 3, color: requiresReg ? "🔴" : "🟢", note: cat.time },
      { dimension: "Origin Country", score: 4, color: "🟡", note: input.originCountry || "Standard" },
    ],
    channels: [
      { channel: t("cccChannel_standard_name"), suitability: "high", description: requiresReg ? t("cccChannel_standard_desc_full") : t("cccChannel_standard_desc_normal"), advantages: [t("cccChannel_standard_adv1")], disadvantages: [cat.time || "TBD"], timeline: cat.time, costRange: requiresReg ? "$5,000-25,000" : "$800-5,000" },
      { channel: t("cccChannel_cbec_name"), suitability: "medium", description: t("cccChannel_cbec_desc"), advantages: [t("cccChannel_cbec_adv1")], disadvantages: [t("cccChannel_cbec_dis1"), t("cccChannel_cbec_dis2")], timeline: "1-2 months", costRange: "$500-2,000" },
    ],
    tariffInfo: { mfnRate: cat.mfn || "Varies", vatRate: cat.vat || "13%", consumptionTax: "N/A", ftaRate: null, totalTaxBurden: (cat.mfn || "Varies") + " + " + (cat.vat || "13%") },
    regulations: [{"name": "CNCA-CCC Implementation Rules", "number": "CNCA 00C-001:2023", "issuingAuthority": "CNCA/SAMR", "relevance": "primary", "effectiveDate": "See document", "description": "CCC certification procedures: application, testing, factory inspection, certification maintenance."}, {"name": "CCC Product Catalogue", "number": "CNCA 2023 Announcement", "issuingAuthority": "CNCA", "relevance": "primary", "effectiveDate": "See document", "description": "Products subject to mandatory CCC certification. 17 categories currently."}, {"name": "GB 4943.1-2022", "number": "GB 4943.1-2022", "issuingAuthority": "NHC/CNCA", "relevance": "secondary", "effectiveDate": "See document", "description": "Safety of IT equipment. Mandatory for electronics CCC testing."}, {"name": "GB 4706.1-2005", "number": "GB 4706.1-2005 + 30 sub-standards", "issuingAuthority": "CNCA", "relevance": "secondary", "effectiveDate": "See document", "description": "Safety of household appliances. Each product type has a specific sub-standard."}, {"name": "GB 6675 Series", "number": "GB 6675.1-.4:2014", "issuingAuthority": "CNCA/SAMR", "relevance": "secondary", "effectiveDate": "See document", "description": "Toy safety: mechanical, flammability, chemical migration standards."}, {"name": "GB 17625.1-2022", "number": "GB 17625.1-2022", "issuingAuthority": "CNCA", "relevance": "secondary", "effectiveDate": "See document", "description": "EMC harmonic current emissions."}, {"name": "China Energy Label", "number": "NDRC/MOFCOM 2020", "issuingAuthority": "NDRC", "relevance": "secondary", "effectiveDate": "See document", "description": "Mandatory energy efficiency labeling for specified products."}, {"name": "China RoHS 2", "number": "MIIT Order 32:2016", "issuingAuthority": "MIIT", "relevance": "secondary", "effectiveDate": "See document", "description": "Hazardous substances in electronic products."}],
    classification: { assignedHsChapter: "Varies", ciqCode: "Check import", isHighRisk, riskReason: cat.riskReason, alternativeClassificationNote: "" },
    riskMatrix: [
      { dimension: "Category Risk", rating: requiresReg ? "🔴" : "🟢", explanation: cat.riskReason },
      { dimension: "Testing", rating: requiresReg ? "🟡" : "🟢", explanation: `${(cat.testing||[]).length} tests` },
      { dimension: "Timeline", rating: requiresReg ? "🔴" : "🟢", explanation: cat.time },
      { dimension: "Cost", rating: requiresReg ? "🟡" : "🟢", explanation: requiresReg ? "$5,000+" : "$800-5,000" },
      { dimension: "History", rating: "🟢", explanation: t("cccRiskMatrix_firstTime") },
    ],
    documentGuide: [{ name: t("cccDoc_appForm_name"), format: t("cccDoc_appForm_format"), notarization: t("cccDoc_appForm_notarization"), commonError: t("cccDoc_appForm_error") }, { name: t("cccDoc_specs_name"), format: t("cccDoc_specs_format"), notarization: t("cccDoc_specs_notarization"), commonError: t("cccDoc_specs_error") }, { name: t("cccDoc_manual_name"), format: t("cccDoc_manual_format"), notarization: t("cccDoc_manual_notarization"), commonError: t("cccDoc_manual_error") }, { name: t("cccDoc_qualityManual_name"), format: t("cccDoc_qualityManual_format"), notarization: t("cccDoc_qualityManual_notarization"), commonError: t("cccDoc_qualityManual_error") }, { name: t("cccDoc_components_name"), format: t("cccDoc_components_format"), notarization: t("cccDoc_components_notarization"), commonError: t("cccDoc_components_error") }, { name: t("cccDoc_circuit_name"), format: t("cccDoc_circuit_format"), notarization: t("cccDoc_circuit_notarization"), commonError: t("cccDoc_circuit_error") }, { name: t("cccDoc_cb_name"), format: t("cccDoc_cb_format"), notarization: t("cccDoc_cb_notarization"), commonError: t("cccDoc_cb_error") }],
    requiredDocuments: ["CCC Application Form", "Product Specification & Photos", "User Manual (Chinese)", "Factory Quality Manual", "Key Component List", "Circuit Diagram & PCB", "CB Report (if available)"],
    testRequirements: cat.testing || [],
    testCostRange: cat.testCost || "Contact us",
    labTests: [], viability: t('cccViability'), detailedTimeline: "Varies by product — contact us for assessment", labGuide: "Testing must be at CNAS-accredited lab. " + ((cat.testing||[]).join(", ") || ""),
    labelGuide: { requiredItems: [], gb7718Highlights: [], gb28050Highlights: [] },
    timelinePhases: [{ phase: t("cccTimeline_preAssess_name"), duration: "2-4 weeks", description: t("cccTimeline_preAssess_desc"), responsible: "Both", dependencies: [] }, { phase: t("cccTimeline_typeTest_name"), duration: "6-12 weeks", description: t("cccTimeline_typeTest_desc"), responsible: "SinoTrade", dependencies: [] }, { phase: t("cccTimeline_factoryInsp_name"), duration: "2-4 weeks", description: t("cccTimeline_factoryInsp_desc"), responsible: "SinoTrade", dependencies: [] }, { phase: t("cccTimeline_certReview_name"), duration: "4-6 weeks", description: t("cccTimeline_certReview_desc"), responsible: "CNCA", dependencies: [] }, { phase: t("cccTimeline_certMark_name"), duration: "1-2 weeks", description: t("cccTimeline_certMark_desc"), responsible: "Both", dependencies: [] }, { phase: t("cccTimeline_annual_name"), duration: "Ongoing", description: t("cccTimeline_annual_desc"), responsible: "Both", dependencies: [] }],
    costBreakdown: [{ item: t("cccCost_testing_item"), estimatedRange: "$3,000-12,000", notes: t("cccCost_testing_notes") }, { item: t("cccCost_factoryInsp_item"), estimatedRange: "$2,000-5,000", notes: t("cccCost_factoryInsp_notes") }, { item: t("cccCost_certFee_item"), estimatedRange: "$1,000-3,000", notes: t("cccCost_certFee_notes") }, { item: t("cccCost_cbConv_item"), estimatedRange: "$1,000-3,000", notes: t("cccCost_cbConv_notes") }, { item: t("cccCost_manualTrans_item"), estimatedRange: "$500-2,000", notes: t("cccCost_manualTrans_notes") }, { item: t("cccCost_service_item"), estimatedRange: "$4,000-12,000", notes: t("cccCost_service_notes") }, { item: t("cccCost_annualFollowup_item"), estimatedRange: "$1,500-3,000/yr", notes: t("cccCost_annualFollowup_notes") }],
    countryProfile: { region: "—", ftaWithChina: false, ftaDetails: "", specialRestrictions: [], bilateralMeatAccess: false, bilateralAquaticAccess: false, dairyApproved: false, gaccDifficulty: "moderate", languageNote: "", commonIssues: [], importVolumeNote: "" },
    marketIntel: { chinaImportTrend: t("cccMarket_trend"), keyDrivers: [t("cccMarket_driver1"), t("cccMarket_driver2")], barriers: [t("cccMarket_barrier1"), t("cccMarket_barrier2")], consumerPerception: t("cccMarket_perception"), topOrigins: [], recommendation: t(requiresReg ? "cccMarket_recoHigh" : "cccMarket_recoLow") },
    competitiveAnalysis: t("cccCompetitiveAnalysis"),
    commonRejections: [{ problem: t("cccReject_problem"), cause: t("cccReject_cause"), solution: t("cccReject_solution") }],
    postApprovalObligations: [{ item: t("cccPost_annualInsp_item"), frequency: t("cccPost_annualInsp_frequency"), description: t("cccPost_annualInsp_desc") }, { item: t("cccPost_changeNotice_item"), frequency: t("cccPost_changeNotice_frequency"), description: t("cccPost_changeNotice_desc") }, { item: t("cccPost_renewal_item"), frequency: t("cccPost_renewal_frequency"), description: t("cccPost_renewal_desc") }, { item: t("cccPost_surveillance_item"), frequency: t("cccPost_surveillance_frequency"), description: t("cccPost_surveillance_desc") }],
    horizonScan: [{ topic: t("cccHorizon_iot_topic"), impact: t("cccHorizon_iot_impact"), timeframe: t("cccHorizon_iot_timeframe"), description: t("cccHorizon_iot_desc"), actionRequired: true }, { topic: t("cccHorizon_gbRev_topic"), impact: t("cccHorizon_gbRev_impact"), timeframe: t("cccHorizon_gbRev_timeframe"), description: t("cccHorizon_gbRev_desc"), actionRequired: true }, { topic: t("cccHorizon_cbDigital_topic"), impact: t("cccHorizon_cbDigital_impact"), timeframe: t("cccHorizon_cbDigital_timeframe"), description: t("cccHorizon_cbDigital_desc"), actionRequired: false }],
    summary: t(requiresReg ? 'cccSummaryHigh' : 'cccSummaryLow'),
  
  cccStandards: {
    electronics: "GB 4943.1-2022 (Safety), GB 9254-2021 (EMC), GB 17625.1-2022 (Harmonics)",
    homeAppliance: "GB 4706.1-2005 + product-specific sub-standards",
    itEquipment: "GB 4943.1-2022, GB 9254-2021, SRRC (wireless)",
    lighting: "GB 7000.1-2015, GB 17743-2021, GB 17625.1-2022",
    toy: "GB 6675.1-.4:2014 series",
    default: "Contact us for applicable GB standards"
  },
  factoryAudit: {
    requirement: "On-site QMS inspection by CNCA-accredited auditor",
    scope: ["Production process review", "Incoming quality control", "Testing equipment calibration", "Non-conforming product handling", "Corrective action records"],
    frequency: "Initial certification + annual surveillance",
    travelNote: "Auditor travel costs extra if factory outside China"
  },
  testingProcess: [
    { phase: "Sample Preparation", duration: "1-2 weeks", detail: "Send 5-10 samples per model to CNCA-accredited lab" },
    { phase: "Safety Testing", duration: "4-8 weeks", detail: "Per applicable GB standard. CB report may reduce scope." },
    { phase: "EMC Testing", duration: "2-4 weeks", detail: "EMC emission + immunity per GB standards" },
    { phase: "Additional Testing", duration: "2-4 weeks", detail: "Energy efficiency, SRRC (wireless), RoHS as applicable" },
    { phase: "Report Review", duration: "2-4 weeks", detail: "Lab issues test report. Review for completeness." }
  ],
  cccCatalog: {
    productCategories: 17,
    lastUpdate: "2023",
    note: "Products not in CCC catalog may still require SRRC (wireless) or NMPA (medical) approval",
    verificationTip: "Verify via CNCA official catalog or consult a certification body"
  },
  cbReportGuide: {
    acceptance: "CB reports from IECEE member bodies are generally accepted for safety testing",
    savings: "Can reduce testing cost by 30-50% and timeline by 4-8 weeks",
    requirement: "Must be submitted with Chinese translation. CB report must cover China deviations.",
    limitation: "CB report does NOT cover EMC, energy efficiency, or SRRC testing",
  },
};
}