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

const CATEGORY_PROFILES: Record<GaccCategory, CategoryProfile> = {
  alcohol: {
    label: "Alcoholic Beverages (HS 22.03-22.08)",
    hsRange: "2203-2208",
    isHighRisk: false,
    riskReason: "18 categories outside — standard risk. Alcohol content and additives monitored.",
    ciqCode: "102",
    chinaTariffRate: "5-10% (MFN)", 
    vatRate: "13%",
    consumptionTax: "10-20% (varies by alcohol type)",
    gaccTimelineLow: "4-6 weeks",
    gaccTimelineHigh: "8-12 weeks",
    labTests: ["Alcohol content", "Methanol/aldehydes", "Heavy metals", "Food additives", "Sulfur dioxide"],
    testCostRange: "$800-2,500",
    commonRejections: [
      { problem: "Label alcohol % mismatch lab result", cause: "Inconsistent labeling vs actual content", solution: "Pre-submission lab verification + label accuracy check" },
      { problem: "Missing additive declaration", cause: "Additives not declared per GB 2760", solution: "Full ingredient audit against GB 2760 additive list" },
      { problem: "Incorrect HS code classification", cause: "HS 2204 vs 2205 misclassification", solution: "Tariff classification ruling before submission" },
    ],
    marketTrend: 'growing',
    competitorOrigin: ["France", "Australia", "Chile", "Italy"],
    importVolumeRank: 3,
  },
  beverage: {
    label: "Non-alcoholic Beverages (HS 22.01-22.02)",
    hsRange: "2201-2202",
    isHighRisk: false,
    riskReason: "18 categories outside — low risk. Standard documentation applies.",
    ciqCode: "103",
    chinaTariffRate: "5-20% (MFN)",
    vatRate: "13%",
    consumptionTax: "N/A",
    gaccTimelineLow: "3-5 weeks",
    gaccTimelineHigh: "6-10 weeks",
    labTests: ["Microbiological (coliforms, pathogens)", "Heavy metals", "Food additives", "Preservatives"],
    testCostRange: "$500-1,800",
    commonRejections: [
      { problem: "Preservatives exceed GB 2760 limits", cause: "Different preservative standards vs exporting country", solution: "Formulation review against China's positive list" },
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
    labTests: ["Microbiological", "Heavy metals", "Food additives", "Melamine (for chocolate/dairy)", "Pesticide residues"],
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
    label: "Coffee / Tea (HS 09.01-09.02)",
    hsRange: "0901-0902",
    isHighRisk: false,
    riskReason: "18 categories outside — standard risk. Roasted coffee and processed tea.",
    ciqCode: "106",
    chinaTariffRate: "8-15% (MFN)",
    vatRate: "9%",
    consumptionTax: "N/A",
    gaccTimelineLow: "3-5 weeks",
    gaccTimelineHigh: "6-10 weeks",
    labTests: ["Caffeine content", "Pesticide residues", "Microbiological", "Heavy metals", "Mycotoxins (ochratoxin A)"],
    testCostRange: "$700-2,200",
    commonRejections: [
      { problem: "Pesticide residues exceed MRL", cause: "Different MRL standards between China and exporting country", solution: "Pre-export testing at CNAS-lab for compliance" },
      { problem: "Aflatoxin/ochratoxin exceeded", cause: "Storage conditions causing mycotoxin development", solution: "Certificate of analysis from accredited + shipping container log" },
    ],
    marketTrend: 'growing',
    competitorOrigin: ["Ethiopia", "Vietnam", "Colombia", "Brazil"],
    importVolumeRank: 6,
  },
  canned: {
    label: "Canned / Processed Foods (HS 20)",
    hsRange: "2001-2009",
    isHighRisk: false,
    riskReason: "18 categories outside — standard risk. Shelf-stable processed products.",
    ciqCode: "109",
    chinaTariffRate: "5-25% (MFN)",
    vatRate: "13%",
    consumptionTax: "N/A",
    gaccTimelineLow: "3-5 weeks",
    gaccTimelineHigh: "6-10 weeks",
    labTests: ["Commercial sterility", "Heavy metals", "Additives", "Container integrity", "Nutritional analysis"],
    testCostRange: "$800-2,500",
    commonRejections: [
      { problem: "Can damage or bulging at inspection", cause: "Shipping/transport damage", solution: "Container condition report + pre-shipment inspection" },
    ],
    marketTrend: 'stable',
    competitorOrigin: ["Thailand", "Italy", "Spain", "USA"],
    importVolumeRank: 9,
  },
  sugar: {
    label: "Sugar / Syrups (HS 17)",
    hsRange: "1701-1704",
    isHighRisk: false,
    riskReason: "18 categories outside — low risk.",
    ciqCode: "108",
    chinaTariffRate: "8-30% (MFN, quota-sensitive)",
    vatRate: "9%",
    consumptionTax: "N/A",
    gaccTimelineLow: "3-5 weeks",
    gaccTimelineHigh: "6-10 weeks",
    labTests: ["Polarization/sucrose content", "Color value", "Sulfur dioxide", "Heavy metals"],
    testCostRange: "$400-1,200",
    commonRejections: [
      { problem: "Import quota exceeded", cause: "China has sugar import tariff-rate quota", solution: "Check quota availability before shipment" },
    ],
    marketTrend: 'stable',
    competitorOrigin: ["Brazil", "Thailand", "Australia"],
    importVolumeRank: 11,
  },
  grain: {
    label: "Grains / Flour (HS 10-11)",
    hsRange: "1001-1109",
    isHighRisk: true,
    riskReason: "Category 18 high-risk. Quarantine concerns for pests/diseases.",
    ciqCode: "111",
    chinaTariffRate: "1-65% (MFN, quota-sensitive)",
    vatRate: "9%",
    consumptionTax: "N/A",
    gaccTimelineLow: "3-5 months",
    gaccTimelineHigh: "6-9 months",
    labTests: ["Pesticide residues (multi-residue)", "Mycotoxins (aflatoxin, DON, zearalenone)", "Heavy metals", "GMO testing", "Pest quarantine"],
    testCostRange: "$1,500-4,000",
    commonRejections: [
      { problem: "Quarantine pest detected", cause: "Live pest larvae found in shipment", solution: "Fumigation certificate + pre-export phytosanitary inspection" },
      { problem: "Mycotoxin exceedance", cause: "Improper storage causing DON/fumonisin development", solution: "Drying protocol compliance + container moisture monitoring" },
    ],
    marketTrend: 'stable',
    competitorOrigin: ["USA", "Australia", "Canada", "France"],
    importVolumeRank: 2,
  },
  meat: {
    label: "Meat Products (HS 02)",
    hsRange: "0201-0210",
    isHighRisk: true,
    riskReason: "Category 18 high-risk. Requires overseas enterprise registration + quarantine access negotiation.",
    ciqCode: "111",
    chinaTariffRate: "12-25% (MFN)",
    vatRate: "9%",
    consumptionTax: "N/A",
    gaccTimelineLow: "4-8 months",
    gaccTimelineHigh: "9-14 months",
    labTests: ["Clenbuterol/β-agonists", "Heavy metals", "Pesticide residues", "Hormone residues", "Microbiological", "Species identification (PCR)"],
    testCostRange: "$2,000-5,000",
    commonRejections: [
      { problem: "Country not approved for meat exports", cause: "Bilateral meat access agreement required", solution: "Verify country is on GACC approved meat suppliers list" },
      { problem: "Facility not registered", cause: "Processing plant not in GACC's overseas facility list", solution: "Pre-registration of facility with GACC (can take 6+ months)" },
      { problem: "Leptospira or FMD concerns", cause: "Disease status of exporting country", solution: "Official veterinary certificate + country disease-free status documentation" },
    ],
    marketTrend: 'growing',
    competitorOrigin: ["Brazil", "Australia", "Argentina", "USA"],
    importVolumeRank: 1,
  },
  dairy: {
    label: "Dairy Products (HS 04)",
    hsRange: "0401-0406",
    isHighRisk: true,
    riskReason: "Category 18 high-risk. Strict quarantine + formula registration for infant dairy.",
    ciqCode: "112",
    chinaTariffRate: "5-20% (MFN)",
    vatRate: "9%",
    consumptionTax: "N/A",
    gaccTimelineLow: "3-6 months",
    gaccTimelineHigh: "7-12 months",
    labTests: ["Melamine", "Microbiological (Listeria, Salmonella)", "Heavy metals", "Aflatoxin M1", "Antibiotic residues", "Nutritional composition"],
    testCostRange: "$1,800-4,500",
    commonRejections: [
      { problem: "Aflatoxin M1 exceedance", cause: "Feed contamination affecting milk", solution: "Quarterly aflatoxin testing + feed source audit documentation" },
      { problem: "Infant formula formula registration not separate", cause: "Infant formula has separate CFDA registration", solution: "Separate registration pathway for formula products" },
    ],
    marketTrend: 'growing',
    competitorOrigin: ["New Zealand", "Netherlands", "France", "Australia"],
    importVolumeRank: 4,
  },
  seafood: {
    label: "Seafood / Aquatic (HS 03)",
    hsRange: "0301-0308",
    isHighRisk: true,
    riskReason: "Category 18 high-risk. Quarantine-sensitive. Bilateral protocol often required.",
    ciqCode: "114",
    chinaTariffRate: "5-15% (MFN)",
    vatRate: "9%",
    consumptionTax: "N/A",
    gaccTimelineLow: "4-7 months",
    gaccTimelineHigh: "8-14 months",
    labTests: ["Heavy metals (Hg, Pb, Cd, As)", "Histamine", "Microbiological (Vibrio, Salmonella)", "Parasite inspection", "Antibiotic/nitrofuran residues"],
    testCostRange: "$1,500-3,500",
    commonRejections: [
      { problem: "Heavy metals exceed Chinese limits", cause: "CN-GB 2762 limits are stricter than EU/US", solution: "Pre-shipment heavy metals screening at CNAS lab" },
      { problem: "Country/region not on approved list", cause: "Bilateral fish import protocol not signed", solution: "Check GACC aquatic products approved country list" },
      { problem: "Nitrofuran metabolite detected", cause: "Prohibited antibiotic use in aquaculture", solution: "Aquaculture traceability + antibiotic-free certification" },
    ],
    marketTrend: 'growing',
    competitorOrigin: ["Ecuador", "Norway", "Russia", "Vietnam"],
    importVolumeRank: 1,
  },
  honey: {
    label: "Honey / Bee Products (HS 04.09)",
    hsRange: "0409",
    isHighRisk: true,
    riskReason: "Category 18 high-risk. Antibiotic residues and heavy metals strict limits.",
    ciqCode: "115",
    chinaTariffRate: "15% (MFN)",
    vatRate: "9%",
    consumptionTax: "N/A",
    gaccTimelineLow: "2-4 months",
    gaccTimelineHigh: "5-8 months",
    labTests: ["Chloramphenicol (prohibited)", "Nitrofuran metabolites", "Tetracycline antibiotics", "Heavy metals", "Pesticide residues", "C13 sugar profile (adulteration)"],
    testCostRange: "$1,200-3,000",
    commonRejections: [
      { problem: "Chloramphenicol detected", cause: "Prohibited antibiotic use in beekeeping", solution: "Transition to antibiotic-free beekeeping + certificate of analysis" },
      { problem: "Sugar adulteration (C4 sugar)", cause: "Rice/corn syrup added to honey", solution: "Carbon isotope ratio testing + traceability documentation" },
    ],
    marketTrend: 'stable',
    competitorOrigin: ["New Zealand", "Australia", "Thailand", "Argentina"],
    importVolumeRank: 10,
  },
  oil: {
    label: "Edible Oils (HS 15)",
    hsRange: "1501-1518",
    isHighRisk: true,
    riskReason: "Category 18 high-risk. Contamination, benzopyrene and heavy metals monitored.",
    ciqCode: "116",
    chinaTariffRate: "5-20% (MFN)",
    vatRate: "9%",
    consumptionTax: "N/A",
    gaccTimelineLow: "2-4 months",
    gaccTimelineHigh: "5-8 months",
    labTests: ["Benzo(a)pyrene", "Heavy metals", "Acid value", "Peroxide value", "Pesticide residues", "GMO testing (for soybean/corn oil)"],
    testCostRange: "$1,000-2,800",
    commonRejections: [
      { problem: "Benzo(a)pyrene exceeded", cause: "High-temperature processing creates PAHs", solution: "Processing parameter review + activated carbon filtration" },
      { problem: "GMO content not declared", cause: "China requires GMO labeling for certain oils", solution: "GMO testing + labeling compliance per China regulations" },
    ],
    marketTrend: 'stable',
    competitorOrigin: ["Malaysia", "Indonesia", "Spain", "Ukraine"],
    importVolumeRank: 3,
  },
  seasoning: {
    label: "Seasonings / Condiments (HS 21.03)",
    hsRange: "2103",
    isHighRisk: true,
    riskReason: "Category 18 high-risk. Complex ingredient blends raise additive cross-check issues.",
    ciqCode: "117",
    chinaTariffRate: "12-25% (MFN)",
    vatRate: "13%",
    consumptionTax: "N/A",
    gaccTimelineLow: "2-4 months",
    gaccTimelineHigh: "5-8 months",
    labTests: ["Food additives complete screening", "Microbiological", "Heavy metals", "Pesticide residues (multi-herb)", "Mycotoxins"],
    testCostRange: "$1,200-3,200",
    commonRejections: [
      { problem: "Proprietary blend additives not all approved", cause: "Mixed seasoning contains additives not per GB 2760", solution: "Full ingredient breakdown + additive compliance per Chinese standards" },
    ],
    marketTrend: 'growing',
    competitorOrigin: ["Japan", "South Korea", "USA", "Thailand"],
    importVolumeRank: 8,
  },
  nuts: {
    label: "Nuts / Dried Fruits (HS 08)",
    hsRange: "0801-0814",
    isHighRisk: true,
    riskReason: "Category 18 high-risk. Aflatoxin and quarantine concerns.",
    ciqCode: "118",
    chinaTariffRate: "5-25% (MFN)",
    vatRate: "9%",
    consumptionTax: "N/A",
    gaccTimelineLow: "2-4 months",
    gaccTimelineHigh: "5-8 months",
    labTests: ["Aflatoxin B1 (total)", "Heavy metals", "Pesticide residues", "Microbiological", "Foreign matter", "Moisture content"],
    testCostRange: "$800-2,200",
    commonRejections: [
      { problem: "Aflatoxin B1 exceeded", cause: "Storage humidity causing mold growth", solution: "COA from CNAS lab + container humidity control log" },
      { problem: "Insect infestation/quarantine pest", cause: "Live pests in shipment", solution: "Fumigation certificate + IPPC-compliant packaging" },
    ],
    marketTrend: 'growing',
    competitorOrigin: ["USA", "Vietnam", "Iran", "Turkey"],
    importVolumeRank: 6,
  },
  health_food: {
    label: "Health / Dietary Supplements (HS 21.06)",
    hsRange: "2106",
    isHighRisk: true,
    riskReason: "Category 18 high-risk + potential health food registration (separate, stricter path).",
    ciqCode: "119",
    chinaTariffRate: "10-20% (MFN)",
    vatRate: "13%",
    consumptionTax: "N/A",
    gaccTimelineLow: "3-6 months",
    gaccTimelineHigh: "8-18 months",
    labTests: ["Active ingredient assay", "Heavy metals", "Microbiological", "Pesticide residues", "Stability testing", "Disintegration/dissolution"],
    testCostRange: "$2,000-6,000",
    commonRejections: [
      { problem: "Unapproved health function claims", cause: "Product claims health benefits not per CFDA approved list", solution: "Function claim review per CFDA's 27 allowed health functions" },
      { problem: "Novel ingredient not in China food catalogue", cause: "Ingredient not approved for use in China", solution: "Novel food ingredient application (can take 1-2 years)" },
    ],
    marketTrend: 'growing',
    competitorOrigin: ["USA", "Australia", "Japan", "South Korea"],
    importVolumeRank: 11,
  },
  other: {
    label: "Other Food Products",
    hsRange: "Varies",
    isHighRisk: false,
    riskReason: "Unclassified — case-by-case review required.",
    ciqCode: "199",
    chinaTariffRate: "5-30% (MFN, varies)",
    vatRate: "9-13% (varies)",
    consumptionTax: "N/A",
    gaccTimelineLow: "4-8 weeks",
    gaccTimelineHigh: "10-16 weeks",
    labTests: ["Depends on product category — comprehensive screening recommended"],
    testCostRange: "$800-3,000",
    commonRejections: [
      { problem: "Product classification ambiguous", cause: "Cannot determine primary category", solution: "Advance classification ruling from CIQ before submission" },
    ],
    marketTrend: 'stable',
    competitorOrigin: ["Various"],
    importVolumeRank: 15,
  },
};

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

const COUNTRY_DB: Record<string, CountryProfile> = {
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
    ftaDetails: "No FTA. MFN rates apply.",
    specialRestrictions: ["Canola/rapeseed historically had trade disputes"],
    bilateralMeatAccess: true,
    bilateralAquaticAccess: true,
    dairyApproved: true,
    gaccDifficulty: 'moderate',
    languageNote: "English/French accepted. Chinese translation for labels.",
    commonIssues: ["Canola trade tensions", "Rapeseed inspection protocols"],
    importVolumeNote: "Major exporter of canola, pork, and seafood to China.",
  },
  Australia: {
    region: "Oceania",
    ftaWithChina: true,
    ftaDetails: "China-Australia FTA (ChAFTA) — reduced tariffs on many agricultural products. Some tariffs phased to zero.",
    specialRestrictions: ["Wine anti-dumping duties (2021+, currently under review)", "Barley tariffs eased 2023"],
    bilateralMeatAccess: true,
    bilateralAquaticAccess: true,
    dairyApproved: true,
    gaccDifficulty: 'moderate',
    languageNote: "English accepted. Chinese translation for labels required.",
    commonIssues: ["Political tensions affecting trade", "Anti-dumping investigations on certain products"],
    importVolumeNote: "Strong in beef, wine, dairy, and grains. ChAFTA provides tariff advantage.",
  },
  NewZealand: {
    region: "Oceania",
    ftaWithChina: true,
    ftaDetails: "China-New Zealand FTA (upgraded 2022) — near-zero tariffs on most dairy by 2024.",
    specialRestrictions: [],
    bilateralMeatAccess: true,
    bilateralAquaticAccess: true,
    dairyApproved: true,
    gaccDifficulty: 'easy',
    languageNote: "English accepted. Chinese translation for labels.",
    commonIssues: ["Dairy quota system monitored"],
    importVolumeNote: "Premium dairy exporter. Strong reputation for food safety in China.",
  },
  France: {
    region: "Europe",
    ftaWithChina: false,
    ftaDetails: "EU-China framework. MFN rates apply. Individual EU member states.",
    specialRestrictions: ["EU-specific certificate requirements"],
    bilateralMeatAccess: true,
    bilateralAquaticAccess: true,
    dairyApproved: true,
    gaccDifficulty: 'moderate',
    languageNote: "French documents need Chinese translation. English accepted for some documents.",
    commonIssues: ["EU certificate format accepted", "Wine/spirits GI protection in China"],
    importVolumeNote: "Major wine and dairy exporter to China. Strong brand recognition.",
  },
  Germany: {
    region: "Europe",
    ftaWithChina: false,
    ftaDetails: "EU-China framework. MFN rates.",
    specialRestrictions: ["EU certificate requirements", "BSE history — enhanced beef inspections"],
    bilateralMeatAccess: true,
    bilateralAquaticAccess: true,
    dairyApproved: true,
    gaccDifficulty: 'moderate',
    languageNote: "German documents need Chinese translation. English accepted.",
    commonIssues: ["BSE-related enhanced checks on beef", "EU food safety certificates"],
    importVolumeNote: "Strong in dairy, pork, and confectionery exports.",
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
    languageNote: "Dutch/English accepted. Chinese translation for labels.",
    commonIssues: [],
    importVolumeNote: "Key EU exporter of dairy, pork, and processed foods to China.",
  },
  Italy: {
    region: "Europe",
    ftaWithChina: false,
    ftaDetails: "EU framework. MFN rates.",
    specialRestrictions: ["GI protection for certain Italian products (Parmigiano, Prosciutto)"],
    bilateralMeatAccess: true,
    bilateralAquaticAccess: true,
    dairyApproved: true,
    gaccDifficulty: 'moderate',
    languageNote: "Italian documents need Chinese translation. English accepted.",
    commonIssues: ["GI product registration beneficial for premium items"],
    importVolumeNote: "Premium wine, pasta, and olive oil exporter. Strong brand recognition.",
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
    languageNote: "Spanish documents need Chinese translation. English accepted.",
    commonIssues: [],
    importVolumeNote: "Major pork exporter to China. Olive oil and wine significant.",
  },
  UK: {
    region: "Europe",
    ftaWithChina: false,
    ftaDetails: "No FTA (post-Brexit). MFN rates. Negotiations ongoing.",
    specialRestrictions: ["Post-Brexit trade framework still developing"],
    bilateralMeatAccess: true,
    bilateralAquaticAccess: true,
    dairyApproved: true,
    gaccDifficulty: 'moderate',
    languageNote: "English accepted. Chinese translation for labels.",
    commonIssues: ["Post-Brexit certification adjustments"],
    importVolumeNote: "Premium whisky, confectionery, and dairy exporter.",
  },
  Japan: {
    region: "Asia",
    ftaWithChina: true,
    ftaDetails: "RCEP member. Gradual tariff reductions on agricultural goods.",
    specialRestrictions: ["Nuclear-related import restrictions on Fukushima region products"],
    bilateralMeatAccess: true,
    bilateralAquaticAccess: true,
    dairyApproved: false,
    gaccDifficulty: 'moderate',
    languageNote: "Japanese documents need Chinese translation. English accepted supplementary.",
    commonIssues: ["Food import restrictions from 10 prefectures post-Fukushima", "Radiation testing certificates required"],
    importVolumeNote: "Premium confectionery, seasonings, and alcoholic beverages popular in China.",
  },
  SouthKorea: {
    region: "Asia",
    ftaWithChina: true,
    ftaDetails: "China-Korea FTA. Tariff reductions on many food items.",
    specialRestrictions: ["Kimchi specific CIQ requirements"],
    bilateralMeatAccess: true,
    bilateralAquaticAccess: true,
    dairyApproved: true,
    gaccDifficulty: 'easy',
    languageNote: "Korean documents need Chinese translation. English accepted.",
    commonIssues: ["Kimchi has specific CIQ inspection procedures"],
    importVolumeNote: "Growing exporter of confectionery, instant noodles, and beverages.",
  },
  Thailand: {
    region: "ASEAN",
    ftaWithChina: true,
    ftaDetails: "ASEAN-China FTA. Near-zero tariffs on many agricultural products. ACETA.",
    specialRestrictions: [],
    bilateralMeatAccess: false,
    bilateralAquaticAccess: true,
    dairyApproved: false,
    gaccDifficulty: 'easy',
    languageNote: "Thai documents need Chinese translation.",
    commonIssues: ["Fruit export protocols specific per type", "Aquatic products well-established"],
    importVolumeNote: "Top ASEAN exporter of food to China. Rice, tropical fruits, seafood, canned goods.",
  },
  Vietnam: {
    region: "ASEAN",
    ftaWithChina: true,
    ftaDetails: "ASEAN-China FTA. Also RCEP member.",
    specialRestrictions: [],
    bilateralMeatAccess: false,
    bilateralAquaticAccess: true,
    dairyApproved: false,
    gaccDifficulty: 'easy',
    languageNote: "Vietnamese documents need Chinese translation.",
    commonIssues: ["Aquatic exports well-established", "Fruit export protocols under negotiation"],
    importVolumeNote: "Large exporter of aquatic products, tropical fruits, and processed foods.",
  },
  Brazil: {
    region: "South America",
    ftaWithChina: false,
    ftaDetails: "BRICS framework. No FTA. MFN rates. Mercosur-China talks ongoing.",
    specialRestrictions: ["Foot-and-mouth disease zoning — enhanced checks"],
    bilateralMeatAccess: true,
    bilateralAquaticAccess: true,
    dairyApproved: false,
    gaccDifficulty: 'moderate',
    languageNote: "Portuguese documents need Chinese translation.",
    commonIssues: ["FMD zoning affects some meat shipments", "Soybean quality disputes historically"],
    importVolumeNote: "Largest meat exporter to China (beef, poultry, pork). Significant in soybeans and sugar.",
    importVolumeRank: 1,
  },
  Argentina: {
    region: "South America",
    ftaWithChina: false,
    ftaDetails: "No FTA. MFN rates.",
    specialRestrictions: ["FMD restrictions — regional zoning"],
    bilateralMeatAccess: true,
    bilateralAquaticAccess: false,
    dairyApproved: false,
    gaccDifficulty: 'moderate',
    languageNote: "Spanish documents need Chinese translation.",
    commonIssues: ["Beef export restrictions fluctuate with domestic policy", "FMD zoning"],
    importVolumeNote: "Major beef and soybean exporter. Meat access protocol in place.",
  },
  Chile: {
    region: "South America",
    ftaWithChina: true,
    ftaDetails: "China-Chile FTA. Nearly all agricultural tariffs zero.",
    specialRestrictions: [],
    bilateralMeatAccess: true,
    bilateralAquaticAccess: true,
    dairyApproved: true,
    gaccDifficulty: 'easy',
    languageNote: "Spanish documents need Chinese translation.",
    commonIssues: ["FTA provides significant tariff advantage"],
    importVolumeNote: "Leading fruit exporter to China (cherries, grapes, plums). Wine also significant.",
  },
  Peru: {
    region: "South America",
    ftaWithChina: true,
    ftaDetails: "China-Peru FTA. Comprehensive tariff reduction.",
    specialRestrictions: [],
    bilateralMeatAccess: false,
    bilateralAquaticAccess: true,
    dairyApproved: false,
    gaccDifficulty: 'easy',
    languageNote: "Spanish documents need Chinese translation.",
    commonIssues: [],
    importVolumeNote: "Key exporter of aquatic products and fruits (grapes, avocados, blueberries).",
  },
  SouthAfrica: {
    region: "Africa",
    ftaWithChina: false,
    ftaDetails: "No FTA. BRICS framework. MFN rates.",
    specialRestrictions: [],
    bilateralMeatAccess: true,
    bilateralAquaticAccess: true,
    dairyApproved: false,
    gaccDifficulty: 'moderate',
    languageNote: "English accepted. Chinese translation for labels.",
    commonIssues: [],
    importVolumeNote: "Significant citrus exporter to China. Wine growing market.",
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
    languageNote: "Amharic/English documents. Chinese translation needed.",
    commonIssues: ["Developing food safety regulatory framework — may need enhanced documentation"],
    importVolumeNote: "China's largest coffee supplier (green beans). Sesame seeds also significant.",
  },
  India: {
    region: "South Asia",
    ftaWithChina: false,
    ftaDetails: "No FTA. MFN rates. Geopolitical tensions may affect trade.",
    specialRestrictions: ["Rice and sugar trade subject to bilateral agreements", "Geopolitical tensions affecting trade flows"],
    bilateralMeatAccess: false,
    bilateralAquaticAccess: true,
    dairyApproved: false,
    gaccDifficulty: 'difficult',
    languageNote: "English accepted. Chinese translation for labels required.",
    commonIssues: ["Rice import protocols", "Spice quality consistency", "Geopolitical trade uncertainties"],
    importVolumeNote: "Major exporter of rice, spices, and seafood to China.",
  },
  SriLanka: {
    region: "South Asia",
    ftaWithChina: false,
    ftaDetails: "No FTA. China-Sri Lanka FTA under negotiation.",
    specialRestrictions: [],
    bilateralMeatAccess: false,
    bilateralAquaticAccess: true,
    dairyApproved: false,
    gaccDifficulty: 'easy',
    languageNote: "Sinhala/Tamil/English documents. Chinese translation for labels.",
    commonIssues: ["Tea quality standards compliance", "Cinnamon certification"],
    importVolumeNote: "Ceylon tea and cinnamon are signature exports with strong China demand.",
  },
  Russia: {
    region: "Eurasia",
    ftaWithChina: false,
    ftaDetails: "No FTA. Growing bilateral trade. MFN rates with some bilateral agreements.",
    specialRestrictions: ["Geopolitical sanctions may affect payment channels"],
    bilateralMeatAccess: true,
    bilateralAquaticAccess: true,
    dairyApproved: true,
    gaccDifficulty: 'moderate',
    languageNote: "Russian documents need Chinese translation.",
    commonIssues: ["Sanctions affecting international payments", "Quality consistency concerns"],
    importVolumeNote: "Growing supplier of meat (poultry, beef), seafood, and dairy. Strong bilateral trade growth.",
  },
  // Default for unknown countries
  DEFAULT: {
    region: "Other",
    ftaWithChina: false,
    ftaDetails: "No FTA identified. MFN rates apply. Verify applicable trade agreements.",
    specialRestrictions: ["Check specific bilateral agreements"],
    bilateralMeatAccess: false,
    bilateralAquaticAccess: false,
    dairyApproved: false,
    gaccDifficulty: 'moderate',
    languageNote: "All non-Chinese documents must be translated to Chinese by certified translator.",
    commonIssues: ["Verify country is on GACC approved lists for meat/aquatic/dairy"],
    importVolumeNote: "Trade volume data limited. Market entry may require additional documentation.",
  },
};

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

const REGULATIONS: Regulation[] = [
  {
    name: "GACC Decree 248",
    number: "Decree 248 (2021)",
    effectiveDate: "January 1, 2022",
    issuingAuthority: "General Administration of Customs (GACC)",
    relevance: 'primary',
    description: "Regulations on the Registration of Overseas Manufacturers of Imported Food. All overseas food producers, processing plants, and storage facilities must register via CIFER before exporting to China.",
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
    number: "PRC Food Safety Law (2015, amended 2018, 2021)",
    effectiveDate: "October 1, 2015",
    issuingAuthority: "National People's Congress (NPC)",
    relevance: 'primary',
    description: "Primary legislation governing food safety in China. Establishes the legal basis for import food controls, recall systems, and penalties for violations.",
  },
  {
    name: "GB 7718",
    number: "GB 7718-2011 (under revision)",
    effectiveDate: "April 20, 2012",
    issuingAuthority: "National Health Commission (NHC)",
    relevance: 'primary',
    description: "National Food Safety Standard — General Rules for Nutrition Labeling of Prepackaged Foods. Mandatory for all imported prepackaged food products. New version expected 2025.",
  },
  {
    name: "GB 28050",
    number: "GB 28050-2011",
    effectiveDate: "January 1, 2013",
    issuingAuthority: "National Health Commission (NHC)",
    relevance: 'primary',
    description: "National Food Safety Standard — General Rules for Nutrition Labeling of Prepackaged Foods. Mandatory format requirements for nutrition facts panels.",
  },
  {
    name: "GB 2760",
    number: "GB 2760-2024",
    effectiveDate: "February 8, 2025",
    issuingAuthority: "National Health Commission (NHC)",
    relevance: 'primary',
    description: "National Food Safety Standard — Uses of Food Additives. Establishes positive list system: only listed additives are permitted in specified food categories at specified levels.",
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
    description: "Maximum residue limits for pesticides in food. 10,000+ pesticide MRLs across hundreds of food categories.",
  },
  {
    name: "GB 29921",
    number: "GB 29921-2021",
    effectiveDate: "November 22, 2021",
    issuingAuthority: "National Health Commission (NHC)",
    relevance: 'secondary',
    description: "Maximum levels of pathogenic bacteria in prepackaged food. Species-specific microbiological limits.",
  },
  {
    name: "CIFER System",
    number: "China Import Food Enterprise Registration System",
    effectiveDate: "January 1, 2022",
    issuingAuthority: "GACC",
    relevance: 'primary',
    description: "Online portal for overseas food manufacturers to submit GACC registration applications. Professional agent handling recommended due to complex documentation and verification requirements.",
  },
  {
    name: "CIQ Inspection",
    number: "Customs Inspection Procedures",
    effectiveDate: "Ongoing",
    issuingAuthority: "Customs (formerly CIQ)",
    relevance: 'secondary',
    description: "Upon arrival at Chinese ports, shipments must undergo CIQ inspection covering documentation review, label verification, and random sampling for lab testing.",
  },
];

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

function getChannels(input: GaccInput, t: (k: string) => string): ChannelStrategy[] {
  const cat = CATEGORY_PROFILES[input.category] || CATEGORY_PROFILES['other'];
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

function getMarketIntel(input: GaccInput, t: (k: string) => string): MarketIntel {
  const cat = CATEGORY_PROFILES[input.category] || CATEGORY_PROFILES['other'];
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

function getCostBreakdown(input: GaccInput, t: (k: string) => string): CostBreakdown[] {
  const cat = CATEGORY_PROFILES[input.category] || CATEGORY_PROFILES['other'];
  return [
    { item: t("gaccCost_registration_item"), estimatedRange: "$1,500-3,000", notes: t("gaccCost_registration_notes") },
    { item: t("gaccCost_testing_item"), estimatedRange: cat.testCostRange, notes: t("gaccCost_testing_notes") },
    { item: t("gaccCost_translation_item"), estimatedRange: "$500-2,000", notes: t("gaccCost_translation_notes") },
    { item: t("gaccCost_labelDesign_item"), estimatedRange: "$500-2,000", notes: t("gaccCost_labelDesign_notes") },
    { item: t("gaccCost_consultation_item"), estimatedRange: cat.isHighRisk ? "$5,000-15,000" : "$2,000-5,000", notes: t("gaccCost_consultation_notes") },
    { item: t("gaccCost_brokerage_item"), estimatedRange: "$500-1,500 per shipment", notes: t("gaccCost_brokerage_notes") },
  ];
}

function getTotalCostRange(input: GaccInput): string {
  const cat = CATEGORY_PROFILES[input.category] || CATEGORY_PROFILES['other'];
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

function getTimeline(input: GaccInput, t: (k: string) => string): TimelinePhase[] {
  const cat = CATEGORY_PROFILES[input.category] || CATEGORY_PROFILES['other'];
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
      dependencies: ["GACC registration approved", "Label artwork finalized"],
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
      note: `${input.originCountry}: ${country.gaccDifficulty} compliance pathway${country.ftaWithChina ? ", FTA benefits available" : ""}`
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
      note: `${cat.labTests.length} tests required. Cost range: ${cat.testCostRange}`
    },
    {
      dimension: t("gaccRiskDim_timelineToMarket"),
      score: isHighRisk ? 8 : 4,
      color: isHighRisk ? "🔴" : "🟢",
      note: `Estimated: ${isHighRisk ? cat.gaccTimelineHigh : cat.gaccTimelineLow}`
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
      ? `⚠️ Your HS code ${input.hsCode} may not align with the standard range for ${CATEGORY_LABELS[input.category]}. Verify classification to avoid customs delays.`
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
    { dimension: t("gaccRiskDim_originCountry"), rating: country.gaccDifficulty === 'difficult' ? "🔴" as const : country.gaccDifficulty === 'moderate' ? "🟡" as const : "🟢" as const, explanation: `${input.originCountry} — ${country.gaccDifficulty} compliance pathway` },
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
    executiveSummary: t('gaccExecutiveSummary').replace('{productName}', input.productName || '').replace('{category}', CATEGORY_LABELS[input.category] || ''),
    oneLineDecision: isHighRisk ? t("gaccOneLineHigh") : t("gaccOneLineStandard"),

    // 2
    viability: t("gaccViability"),
    marketIntel: getMarketIntel(input, t),

    // 3
    channels: getChannels(input, t),

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
    timelinePhases: getTimeline(input, t),

    // 12
    costBreakdown: getCostBreakdown(input, t),
    totalCostRange: getTotalCostRange(input),

    // 13
    estimatedTimeline: isHighRisk ? cat.gaccTimelineHigh : cat.gaccTimelineLow,
    detailedTimeline: isHighRisk
      ? t("gaccDetailedTimelineHigh").replace("{category}", CATEGORY_LABELS[input.category] || "").replace("{timeline}", cat.gaccTimelineHigh || "")
      : t("gaccDetailedTimelineStandard").replace("{category}", CATEGORY_LABELS[input.category] || "").replace("{timeline}", cat.gaccTimelineLow || ""),

    // 14
    countryProfile: country,

    // 15
    competitiveAnalysis: (() => {
      const catLabel = CATEGORY_LABELS[input.category]?.split(" (")[0] || "";
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
export const CATEGORY_LABELS: Record<GaccCategory, string> = Object.fromEntries(
  (Object.entries(CATEGORY_PROFILES) as [GaccCategory, CategoryProfile][]).map(([k, v]) => [k, v.label])
) as Record<GaccCategory, string>;

/** Backwards-compatible high-risk map */
export const HIGH_RISK_18: Record<GaccCategory, boolean> = Object.fromEntries(
  (Object.entries(CATEGORY_PROFILES) as [GaccCategory, CategoryProfile][]).map(([k, v]) => [k, v.isHighRisk])
) as Record<GaccCategory, boolean>;