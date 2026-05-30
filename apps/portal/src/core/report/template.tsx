/**
 * 报告模板 — 模块感知报告
 * 委托给 ReportShell（共享区块 + 模块专有区块）
 * 
 * 保留 getPhase1Items / getGlossary 供 ReportShell 和 Preview 页面使用
 */
import ReportShell from './ReportShell';

interface ReportLabels {
  title: string;
  sectionProduct: string;
  sectionResult: string;
  sectionDocuments: string;
  sectionNextSteps: string;
  ctaTitle: string;
  ctaDesc: string;
  ctaBtn: string;
  footerName: string;
  footerAddress: string;
  footerEmail: string;
  labelProduct: string;
  labelCategory: string;
  labelHsCode: string;
  labelOrigin: string;
  gaccRequired: string;
  gaccNotRequired: string;
}

interface ReportTemplateProps {
  reportId: string;
  module: string;
  locale?: string;
  labels: ReportLabels;
  productInfo: {
    name: string;
    category: string;
    hsCode?: string;
    originCountry: string;
  };
  result: any;
  nextSteps: string[];
  generatedAt: string;
}

export function ReportTemplate(props: ReportTemplateProps) {
  return <ReportShell {...props} />;
}

// ─── 工具函数（供 ReportShell 和 Preview 使用） ──────────────────────

export function getPhase1Items(module: string): string[] {
  var map: Record<string, string[]> = {
    "GACC Food Registration": ["Identify product category among 18 GACC-regulated categories", "Engage CRA (Compliance Review Agent)", "Prepare facility registration documents", "Collect product specs and ingredient list"],
    "CCC Certification": ["Confirm product is on CCC mandatory catalog", "Select CNCA-accredited certification body", "Prepare product specs and technical drawings", "Arrange sample shipment for type testing"],
    "Chinese Label Compliance": ["Collect current label artwork and packaging", "Identify applicable GB standards (7718/28050)", "Prepare ingredient and nutrition data", "Gather Certificate of Free Sale"],
    "Cosmetics Filing (NMPA)": ["Classify product as ordinary or special-use", "Designate Chinese responsible person", "Prepare full formulation with INCI names", "Collect GMP certificate and test reports"],
    "Cross-Border E-commerce": ["Select target platform (Tmall/JD/Douyin)", "Determine bonded vs. direct shipping model", "Prepare business registration documents", "Research CBEC positive list eligibility"],
    "Brand Protection": ["Conduct CNIPA trademark availability search", "Determine relevant Nice classification classes", "Prepare brand specimen and goods list", "Gather Power of Attorney documents"],
  };
  return map[module] || map["GACC Food Registration"];
}

export function getGlossary(module: string): { term: string; def: string }[] {
  var map: Record<string, { term: string; def: string }[]> = {
    "GACC Food Registration": [
      {term: "GACC", def: "General Administration of Customs — Oversees Decree 248/249 food import registration."},
      {term: "CIFER", def: "China Import Food Enterprise Registration — Online portal for overseas food manufacturers."},
      {term: "Decree 248", def: "GACC regulation requiring overseas food manufacturers to register before exporting to China."},
      {term: "CRA", def: "Compliance Review Agent — Authorized agent for GACC food registration."},
      {term: "CIQ", def: "China Inspection and Quarantine — Inspects imported food at ports for compliance."},
      {term: "GB 7718", def: "National food safety standard for prepackaged food labeling."},
      {term: "GB 28050", def: "National standard for nutrition labeling — kJ + NRV%."},
      {term: "HS Code", def: "Harmonized System Code — Standardized product classification for tariffs."},
    ],
    "CCC Certification": [
      {term: "CCC", def: "China Compulsory Certification — Mandatory safety certification for specified product categories."},
      {term: "CNCA", def: "Certification and Accreditation Administration — Manages CCC certification."},
      {term: "GB 4943", def: "Safety standard for IT/AV equipment — primary CCC testing standard."},
      {term: "GB 9254", def: "EMC emission limits for multimedia equipment."},
      {term: "CB Report", def: "IECEE CB Test Report — may reduce CCC testing scope."},
      {term: "SRRC", def: "State Radio Regulation Committee — separate approval for wireless devices."},
      {term: "Factory Audit", def: "On-site QMS inspection required for initial CCC certification."},
      {term: "SDOC", def: "Self-Declaration of Conformity — simplified pathway for low-risk products."},
    ],
    "Chinese Label Compliance": [
      {term: "GB 7718", def: "National standard for prepackaged food labeling — 9 mandatory elements."},
      {term: "GB 28050", def: "National standard for nutrition labeling — kJ + NRV% format."},
      {term: "GB 2760", def: "Food additives positive list — only listed additives permitted."},
      {term: "NRV%", def: "Nutrient Reference Value % — Mandatory nutrition labeling format."},
      {term: "CIQ", def: "China Inspection and Quarantine — Inspects imported food labels."},
      {term: "Food Safety Law", def: "PRC Food Safety Law — legal basis for label requirements."},
      {term: "Allergen", def: "8 mandatory allergen declarations per GB/T 23779-2023."},
      {term: "HS Code", def: "Harmonized System Code — Standardized product classification for tariffs."},
    ],
    "Cosmetics Filing (NMPA)": [
      {term: "NMPA", def: "National Medical Products Administration — Regulates cosmetics filing."},
      {term: "CSAR", def: "Cosmetics Supervision and Administration Regulation — Reformed cosmetics regulation in 2021."},
      {term: "Ordinary Cosmetics", def: "General cosmetics requiring notification filing (备案)."},
      {term: "Special Cosmetics", def: "Products needing full registration (注册) — sunscreen, whitening, hair dye."},
      {term: "ICSC", def: "INCI Standard Chinese — Official Chinese ingredient name database."},
      {term: "Chinese RP", def: "Chinese Responsible Person — manages NMPA compliance in China."},
      {term: "GMP", def: "Good Manufacturing Practice — ISO 22716, may qualify for animal testing exemption."},
      {term: "HS Code", def: "Harmonized System Code — Standardized product classification for tariffs."},
    ],
    "Cross-Border E-commerce": [
      {term: "CBEC", def: "Cross-Border E-Commerce — Simplified import channel via bonded warehouses."},
      {term: "1210", def: "Bonded warehouse model — bulk shipment to Chinese warehouses, then delivery."},
      {term: "9610", def: "Direct shipping model — ships directly to consumer after purchase."},
      {term: "Positive List", def: "CBEC-approved product categories eligible for simplified import."},
      {term: "3-Doc Matching", def: "Order + payment + logistics document matching for customs clearance."},
      {term: "PIPL", def: "Personal Information Protection Law — regulates cross-border data transfers."},
      {term: "Tmall Global", def: "Alibaba's cross-border platform — largest CBEC marketplace."},
      {term: "HS Code", def: "Harmonized System Code — Standardized product classification for tariffs."},
    ],
    "Brand Protection": [
      {term: "CNIPA", def: "China National Intellectual Property Administration — manages trademark registration."},
      {term: "First-to-File", def: "China grants trademark rights to first filer, not first user."},
      {term: "Nice Classification", def: "International trademark classification (1-45 classes) used by CNIPA."},
      {term: "Madrid System", def: "WIPO international system — extend home registration to China."},
      {term: "Customs Recordal", def: "Register trademark with China Customs for border enforcement."},
      {term: "Trademark Squatting", def: "Bad-faith registration of foreign brands by third parties."},
      {term: "Opposition", def: "3-month window to challenge conflicting CNIPA applications."},
      {term: "HS Code", def: "Harmonized System Code — Standardized product classification for tariffs."},
    ],
  };
  return map[module] || map["GACC Food Registration"];
}
