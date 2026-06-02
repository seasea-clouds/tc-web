'use client';
import { useT } from '@trade/ui';

import { ReportTemplate } from '@/core/report/template';
import type { GaccResult } from '../../../../../../modules/gacc/rules';

const SAMPLE_RESULT: GaccResult = {
  requiresRegistration: true,
  isHighRisk: false,
  riskCategory: 'low',
  riskScore: 3.8,
  riskDimensions: [
    { dimension: "Product Category", score: 3, color: "🟢", note: "Standard risk category — outside 18 high-risk list" },
    { dimension: "Origin Country Complexity", score: 5, color: "🟡", note: "USA: moderate compliance pathway" },
    { dimension: "Documentation Complexity", score: 4, color: "🟢", note: "Standard documentation package" },
    { dimension: "Testing Requirements", score: 4, color: "🟢", note: "5 tests required. Cost range: $600-2,000" },
    { dimension: "Timeline to Market", score: 3, color: "🟢", note: "Estimated: 6-10 weeks" },
  ],
  verdictLabel: 'Standard Risk',
  riskPathway: 'Standard risk — Standard GACC registration pathway applies.',
  executiveSummary: "This comprehensive assessment evaluates Stone Ground Dark Chocolate (Confectionery / Chocolate (HS 17.04, 18.06)) against all applicable Chinese import regulations.",
  oneLineDecision: "🟢 Proceed: GACC registration required. Standard pathway. Estimated 2-4 months.",
  viability: "Viable with compliance investment",
  marketIntel: {
    chinaImportTrend: "Growing demand — China's imports of this category have been increasing 8-15% year on year. Premium imported products particularly sought after by middle-class consumers.",
    topOrigins: [{ country: "Belgium", share: "28%" }, { country: "Switzerland", share: "22%" }, { country: "USA", share: "15%" }, { country: "Italy", share: "12%" }],
    consumerPerception: "Chinese consumers generally view imported Confectionery / Chocolate products favorably, associating them with higher quality and safety standards. Premium positioning is achievable.",
    keyDrivers: ["Rising middle class demand for premium imports", "Growing food safety awareness", "Cross-border e-commerce enabling direct access", "Young consumers' preference for international brands"],
    barriers: ["Competition from established import brands", "Regulatory complexity", "Price sensitivity in certain segments"],
    recommendation: "General trade recommended for full market access. Leverage premium positioning for better margins.",
  },
  channels: [
    { channel: "General Trade (一般贸易)", suitability: 'high', gaccRequired: true, description: "Standard import channel for commercial sale in physical retail and wholesale.", advantages: ["Full market access (online + offline)", "Build brand presence in China", "Higher margins at scale"], disadvantages: ["Full compliance overhead (GACC + label + testing)", "Longer timeline", "Requires Chinese entity or authorized agent"], timeline: "2-4 months", costRange: "$3,000-8,000" },
    { channel: "Cross-Border E-commerce (CBEC / 跨境电商)", suitability: 'medium', gaccRequired: false, description: "Sell directly via Tmall Global, JD Worldwide. Stored in bonded warehouses.", advantages: ["Faster market entry", "Lower upfront compliance cost", "Test market before full commitment", "Simplified regulatory pathway"], disadvantages: ["Limited to online channels", "Per-shipment limits (RMB 5,000/transaction)", "Cannot sell through retail stores", "CBEC positive list restrictions"], timeline: "1-2 months", costRange: "$500-2,000" },
    { channel: "Personal Parcel / Courier", suitability: 'low', gaccRequired: false, description: "Direct-to-consumer via courier (FedEx, DHL). For small quantities only.", advantages: ["Minimal documentation", "Fastest delivery"], disadvantages: ["Strictly limited to personal use quantities", "Not scalable", "Cannot build brand in market"], timeline: "Days", costRange: "$200-500 per shipment (customs brokerage)" },
  ],
  tariffInfo: {
    hsCode: "1704, 1806",
    mfnRate: "8-15% (MFN)",
    ftaRate: "No FTA — MFN rates apply",
    vatRate: "13%",
    consumptionTax: "N/A",
    totalTaxBurden: "8-15% + 13%",
    estimatedLandedCostExample: "Contact us for a detailed landed cost calculation based on your FOB price.",
  },
  regulations: [
    { name: "GACC Decree 248", number: "Decree 248 (2021)", effectiveDate: "January 1, 2022", issuingAuthority: "General Administration of Customs (GACC)", relevance: 'primary', description: "Regulations on the Registration of Overseas Manufacturers of Imported Food. All overseas food producers must register via CIFER before exporting to China." },
    { name: "GACC Decree 249", number: "Decree 249 (2021)", effectiveDate: "January 1, 2022", issuingAuthority: "General Administration of Customs (GACC)", relevance: 'primary', description: "Administrative Measures on Import and Export Food Safety." },
    { name: "Food Safety Law of China", number: "PRC Food Safety Law (2015, amended 2021)", effectiveDate: "October 1, 2015", issuingAuthority: "NPC", relevance: 'primary', description: "Primary legislation governing food safety in China." },
    { name: "GB 7718", number: "GB 7718-2011", effectiveDate: "April 20, 2012", issuingAuthority: "NHC", relevance: 'primary', description: "National Food Safety Standard — General Rules for Nutrition Labeling of Prepackaged Foods." },
    { name: "GB 28050", number: "GB 28050-2011", effectiveDate: "January 1, 2013", issuingAuthority: "NHC", relevance: 'primary', description: "General Rules for Nutrition Labeling of Prepackaged Foods." },
    { name: "GB 2760", number: "GB 2760-2024", effectiveDate: "February 8, 2025", issuingAuthority: "NHC", relevance: 'primary', description: "Uses of Food Additives — positive list system." },
    { name: "GB 2762", number: "GB 2762-2022", effectiveDate: "June 30, 2023", issuingAuthority: "NHC", relevance: 'secondary', description: "Maximum levels of contaminants in food." },
    { name: "CIFER System", number: "China Import Food Enterprise Registration System", effectiveDate: "January 1, 2022", issuingAuthority: "GACC", relevance: 'primary', description: "Online portal for overseas food manufacturers to submit GACC registration applications." },
  ],
  classification: {
    assignedHsChapter: "1704, 1806",
    ciqCode: "105",
    isHighRisk: false,
    riskReason: "18 categories outside — low risk. Standard GACC registration.",
    alternativeClassificationNote: "HS code appears consistent with product category.",
  },
  riskMatrix: [
    { dimension: "品类风险 Product Category", rating: "🟢", explanation: "18 categories outside — low risk. Standard GACC registration." },
    { dimension: "产地风险 Origin Country", rating: "🟡", explanation: "USA — moderate compliance pathway" },
    { dimension: "成分风险 Ingredients", rating: "🟢", explanation: "Standard ingredient risk" },
    { dimension: "加工风险 Processing", rating: "🟢", explanation: "Processed/shelf-stable — low quarantine risk" },
    { dimension: "合规历史 Compliance History", rating: "🟢", explanation: "First-time registration — no negative history" },
  ],
  requiredDocuments: [
    "GACC Registration Application Form",
    "Product Description & Ingredients List",
    "Manufacturing Process Flow Chart",
    "HACCP / ISO 22000 Certificate (if any)",
    "Lab Test Report (composition, microbiology)",
    "Certificate of Free Sale",
    "Product Photos & Packaging Images",
  ],
  documentGuide: [
    { name: "GACC Registration Application Form", format: "CIFER system online submission", notarization: "Not required", validity: "Per application", commonError: "Incomplete fields, missing signatory information" },
    { name: "Product Description & Ingredients List", format: "PDF/Word, Chinese or bilingual", notarization: "Translation certification recommended", validity: "Per application", commonError: "Additive codes not per GB 2760" },
    { name: "Manufacturing Process Flow Chart", format: "PDF, diagram format", notarization: "Translation certification recommended", validity: "Per application", commonError: "Too generic, missing critical control points" },
    { name: "HACCP / ISO 22000 Certificate", format: "PDF, valid certificate copy", notarization: "Certified copy + translation required", validity: "Must be current", commonError: "Expired certificate, wrong facility name" },
    { name: "Lab Test Report", format: "PDF from CNAS/ISO 17025 accredited lab", notarization: "Original + translation", validity: "Within 6 months", commonError: "Non-accredited lab, incomplete test scope" },
    { name: "Certificate of Free Sale", format: "PDF from competent authority", notarization: "Certified copy + translation", validity: "6-12 months", commonError: "Wrong issuing authority" },
    { name: "Product Photos & Packaging Images", format: "JPEG/PNG, high resolution", notarization: "Not required", validity: "Per application", commonError: "Low resolution" },
  ],
  labTests: ["Microbiological", "Heavy metals", "Food additives", "Melamine", "Pesticide residues"],
  testCostRange: "$600-2,000",
  labGuide: "Testing must be conducted at a CNAS-accredited laboratory (ISO 17025). Samples should be representative of commercial production. Testing scope: Microbiological, Heavy metals, Food additives, Melamine, Pesticide residues. Estimated cost: $600-2,000. Turnaround: 2-5 weeks.",
  labelGuide: {
    requiredItems: [
      { field: "Product Name", requirement: "Accurate reflection of product's true nature. Standardized name per GB if exists.", commonMistake: "Fanciful names without descriptive standard name" },
      { field: "Ingredients List", requirement: "Descending order by weight. All additives with GB 2760 code numbers.", commonMistake: "Missing additive code numbers" },
      { field: "Net Content", requirement: "Metric units (g/mL). Draining weight for solid-in-liquid.", commonMistake: "Using imperial units or missing draining weight" },
      { field: "Manufacturer/Distributor", requirement: "Name and address of overseas manufacturer AND Chinese responsible party.", commonMistake: "Missing Chinese agent information" },
      { field: "Country of Origin", requirement: "Clearly marked. 'Made in [Country]' or similar.", commonMistake: "Vague origin descriptions" },
      { field: "Date of Manufacture & Best Before", requirement: "DD/MM/YYYY or YYYY/MM/DD format. Position must be prominent.", commonMistake: "Using MM/DD/YYYY format" },
      { field: "Storage Conditions", requirement: "Clearly stated storage requirements.", commonMistake: "Generic statement when specific conditions needed" },
      { field: "Nutrition Information Panel", requirement: "Per GB 28050 format. Energy (kJ), protein, fat, carbs, sodium mandatory.", commonMistake: "Using kcal instead of kJ" },
      { field: "Food Additives", requirement: "Listed with GB 2760 category codes (e.g., E330, INS 330).", commonMistake: "Using trade names instead of standard codes" },
      { field: "Allergen Information", requirement: "Mandatory: milk, eggs, fish, crustacea, peanuts, soybeans, wheat, tree nuts.", commonMistake: "Not declaring regulated allergens" },
      { field: "QS/SC Logo", requirement: "Not required for imported food. Do NOT print QS/SC logo.", commonMistake: "Printing Chinese production license marks" },
      { field: "Import Record Number", requirement: "Must show CIQ registration number after customs clearance.", commonMistake: "Blank or incorrect number" },
    ],
    gb7718Highlights: [
      "All text must be in Chinese. Foreign language may be supplementary but not primary.",
      "Font size must be no less than 1.8mm for most mandatory items.",
      "Products containing GMO ingredients must be labeled as per GMO labeling regulations.",
      "Irradiated ingredients must be declared.",
      "Trans-fat content must be declared if >0.3g per 100g/100mL.",
    ],
    gb28050Highlights: [
      "Energy must ALWAYS be shown in kJ (kilojoules) — not kcal alone.",
      "Mandatory fields: Energy, Protein, Fat, Carbohydrate, Sodium.",
      "NRV% must be calculated for each mandatory field.",
    ],
  },
  timelinePhases: [
    { phase: "Initial Assessment & Classification", duration: "1-2 weeks", description: "Confirm HS code, GACC category classification, and identify required documents.", responsible: 'SinoTrade', dependencies: [] },
    { phase: "Document Preparation & Translation", duration: "2-4 weeks", description: "Gather all required documents, translate to Chinese, notarize where required.", responsible: 'Both', dependencies: ["Initial assessment complete"] },
    { phase: "Lab Testing (CNAS Accredited)", duration: "2-3 weeks", description: "Product samples sent to CNAS-accredited lab for required testing.", responsible: 'SinoTrade', dependencies: ["Sample shipment arranged"] },
    { phase: "Application Submission (CIFER)", duration: "1-2 weeks", description: "Submit registration via CIFER system with our team handling all documentation and submission requirements.", responsible: 'SinoTrade', dependencies: ["All documents ready", "Lab reports received"] },
    { phase: "GACC Review & Approval", duration: "2-6 weeks", description: "GACC processes application. Issue registration certificate upon approval.", responsible: 'SinoTrade', dependencies: ["Application submitted"] },
    { phase: "Label Design & Compliance", duration: "2-3 weeks", description: "Design Chinese label per GB 7718/28050. Submit for compliance review.", responsible: 'SinoTrade', dependencies: ["Product details finalized"] },
    { phase: "First Shipment & Customs Clearance", duration: "1-3 weeks", description: "First commercial shipment. CIQ inspection: document check, label verification, random sampling.", responsible: 'Both', dependencies: ["GACC Registration certificate", "Label approved"] },
  ],
  costBreakdown: [
    { item: "GACC Registration Fee", estimatedRange: "$200-800", notes: "CIFER system filing with professional agent handling." },
    { item: "Laboratory Testing (CNAS)", estimatedRange: "$600-2,000", notes: "Required tests: Microbiological, Heavy metals, Food additives, Melamine, Pesticide residues." },
    { item: "Document Translation & Notarization", estimatedRange: "$500-2,000", notes: "All non-Chinese documents need certified Chinese translation." },
    { item: "Chinese Label Design & Compliance Review", estimatedRange: "$300-1,500", notes: "Includes GB 7718 check, nutrition panel, 2 revision rounds." },
    { item: "Professional Compliance Consultation", estimatedRange: "$2,000-5,000", notes: "End-to-end management: classification → documentation → filing → follow-up." },
    { item: "Customs Brokerage (per shipment)", estimatedRange: "$200-500", notes: "Per-shipment customs clearance. Not a one-time cost." },
  ],
  totalCostRange: "$3,500-9,500",
  estimatedTimeline: "6-10 weeks",
  detailedTimeline: "Standard GACC registration for Confectionery / Chocolate typically takes 6-10 weeks. This assumes complete documentation and no requests for supplementary materials.",
  countryProfile: {
    importVolumeRank: 3,
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
  competitiveAnalysis: "China imported significant volumes of Confectionery / Chocolate products in 2024-2025. Top origins include Belgium, Switzerland, USA, Italy. The category shows growth potential with rising consumer demand for premium imports.",
  commonRejections: [
    { problem: "Dairy content triggers high-risk reclassification", cause: "Products with >5% dairy content may be reclassified", solution: "Pre-classification review: dairy threshold analysis" },
    { problem: "Additives not in GB 2760", cause: "Using additives approved in origin but banned in China", solution: "Full additive formula audit before application" },
  ],
  postApprovalObligations: [
    { item: "Annual Compliance Report", frequency: "Yearly", description: "Submit annual production and export data to GACC. Failure may result in suspension." },
    { item: "Label Compliance Updates", frequency: "Per regulatory change", description: "Monitor GB 7718/28050 updates." },
    { item: "Registration Renewal", frequency: "Every 5 years", description: "Submit renewal 3-6 months before expiry." },
    { item: "Customs Clearance Per Shipment", frequency: "Per import", description: "Each shipment requires CIQ inspection." },
    { item: "Market Surveillance", frequency: "Ongoing", description: "SAMR conducts regular market inspections." },
    { item: "Formula/Process Change Notification", frequency: "When applicable", description: "Any change must be notified to GACC." },
  ],
  horizonScan: [
    { topic: "GB 7718 Revision", impact: 'high', timeframe: "2025-2026", description: "Expected to introduce significant changes to labeling requirements including new allergen declaration format.", actionRequired: true },
    { topic: "CBEC Positive List Expansion", impact: 'medium', timeframe: "2025", description: "Expected expansion enabling more products via simplified CBEC channel.", actionRequired: false },
    { topic: "Imported Food Traceability System", impact: 'medium', timeframe: "2025-2026", description: "GACC developing nationwide traceability system.", actionRequired: false },
    { topic: "Carbon Footprint Labeling", impact: 'low', timeframe: "2026+", description: "China exploring carbon footprint labeling for imported goods.", actionRequired: false },
  ],
  summary: "Your product (Confectionery / Chocolate (HS 17.04, 18.06)) requires GACC registration but is classified as low risk.",
};

const labels = {
  title: "China Market Entry Compliance Report",
  sectionProduct: "Product Information",
  sectionResult: "Assessment Result",
  sectionDocuments: "Required Documents",
  sectionNextSteps: "Next Steps",
  ctaTitle: "Get a Custom Quote",
  ctaDesc: "Our compliance experts will provide a tailored plan and pricing for your specific product.",
  ctaBtn: "Contact Us",
  footerName: "SinoTrade Compliance",
  footerAddress: "Shanghai, China",
  footerEmail: "david@sinotradecompliance.com",
  labelProduct: "Product",
  labelCategory: "Category",
  labelHsCode: "HS Code",
  labelOrigin: "Origin",
  gaccRequired: "GACC Registration Required",
  gaccNotRequired: "No GACC Registration Required",
};

export default function ReportPreviewPage() {
  const t = useT('Report');
  return (
    <div className="min-h-screen bg-bg-ice py-8">
      <div className="max-w-4xl mx-auto px-4 mb-4">
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 text-center mb-6">
          <p className="text-sm font-bold text-amber-800">{t('previewBanner')}</p>
          <p className="text-xs text-amber-600">{t('previewBannerDesc')}</p>
        </div>
      </div>
      <ReportTemplate
        reportId="PREVIEW-001"
        module="GACC Food Registration"
        locale="en"
        labels={labels}
        productInfo={{ name: "Stone Ground Dark Chocolate", category: "Confectionery / Chocolate (HS 17.04, 18.06)", hsCode: "1806.32", originCountry: "USA" }}
        result={SAMPLE_RESULT}
        nextSteps={[
          "Contact SinoTrade Compliance for a detailed compliance assessment",
          "Prepare required documentation",
          "Submit GACC registration application",
          "Design compliant Chinese label (GB 7718)",
          "Arrange customs clearance support",
        ]}
        generatedAt="2026-05-26T07:00:00.000Z"
      />
    </div>
  );
}
