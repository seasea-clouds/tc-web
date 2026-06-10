/**
 * 报告模板 — 模块感知报告
 * 委托给 ReportShell（共享区块 + 模块专有区块）
 * 
 * 保留 getPhase1Items / getGlossary 供 ReportShell 和 Preview 页面使用
 */
import ReportShell from './ReportShell';
import { buildT } from '../../../modules/shared/i18n';

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

export function getPhase1Items(module: string, locale?: string): string[] {
  const t = buildT(locale || 'en');
  var pMap: Record<string, string[]> = {
    "GACC Food Registration": [t('phase1_gacc_1'), t('phase1_gacc_2'), t('phase1_gacc_3'), t('phase1_gacc_4')],
    "CCC Certification": [t('phase1_ccc_1'), t('phase1_ccc_2'), t('phase1_ccc_3'), t('phase1_ccc_4')],
    "Chinese Label Compliance": [t('phase1_label_1'), t('phase1_label_2'), t('phase1_label_3'), t('phase1_label_4')],
    "Cosmetics Filing (NMPA)": [t('phase1_nmpa_1'), t('phase1_nmpa_2'), t('phase1_nmpa_3'), t('phase1_nmpa_4')],
    "Cross-Border E-commerce": [t('phase1_cb_1'), t('phase1_cb_2'), t('phase1_cb_3'), t('phase1_cb_4')],
    "Brand Protection": [t('phase1_tm_1'), t('phase1_tm_2'), t('phase1_tm_3'), t('phase1_tm_4')],
  };
  return pMap[module] || pMap["GACC Food Registration"];
}

export function getGlossary(module: string, locale?: string): { term: string; def: string }[] {
  const t = buildT(locale || 'en');
  var gMap: Record<string, { term: string; def: string }[]> = {
    "GACC Food Registration": [
      {term: "GACC", def: t('gaccGlossary_gacc')},
      {term: "CIFER", def: t('gaccGlossary_cifer')},
      {term: "Decree 248", def: t('gaccGlossary_decree248')},
      {term: "CRA", def: t('gaccGlossary_cra')},
      {term: "CIQ", def: t('gaccGlossary_ciq')},
      {term: "GB 7718", def: t('gaccGlossary_gb7718')},
      {term: "GB 28050", def: t('gaccGlossary_gb28050')},
      {term: "HS Code", def: t('gaccGlossary_hsCode')},
    ],
    "CCC Certification": [
      {term: "CCC", def: t('cccGlossary_ccc')},
      {term: "CNCA", def: t('cccGlossary_cnca')},
      {term: "GB 4943", def: t('cccGlossary_gb4943')},
      {term: "GB 9254", def: t('cccGlossary_gb9254')},
      {term: "CB Report", def: t('cccGlossary_cbReport')},
      {term: "SRRC", def: t('cccGlossary_srrc')},
      {term: "Factory Audit", def: t('cccGlossary_factoryAudit')},
      {term: "SDOC", def: t('cccGlossary_sdoc')},
    ],
    "Chinese Label Compliance": [
      {term: "GB 7718", def: t('labelGlossary_gb7718')},
      {term: "GB 28050", def: t('labelGlossary_gb28050')},
      {term: "GB 2760", def: t('labelGlossary_gb2760')},
      {term: "NRV%", def: t('labelGlossary_nrv')},
      {term: "CIQ", def: t('labelGlossary_ciq')},
      {term: "Food Safety Law", def: t('labelGlossary_foodSafetyLaw')},
      {term: "Allergen", def: t('labelGlossary_allergen')},
      {term: "HS Code", def: t('labelGlossary_hsCode')},
    ],
    "Cosmetics Filing (NMPA)": [
      {term: "NMPA", def: t('nmpaGlossary_nmpa')},
      {term: "CSAR", def: t('nmpaGlossary_csar')},
      {term: "Ordinary Cosmetics", def: t('nmpaGlossary_ordinary')},
      {term: "Special Cosmetics", def: t('nmpaGlossary_special')},
      {term: "ICSC", def: t('nmpaGlossary_icsc')},
      {term: "Chinese RP", def: t('nmpaGlossary_chineseRP')},
      {term: "GMP", def: t('nmpaGlossary_gmp')},
      {term: "HS Code", def: t('nmpaGlossary_hsCode')},
    ],
    "Cross-Border E-commerce": [
      {term: "CBEC", def: t('cbGlossary_cbec')},
      {term: "1210", def: t('cbGlossary_1210')},
      {term: "9610", def: t('cbGlossary_9610')},
      {term: "Positive List", def: t('cbGlossary_positiveList')},
      {term: "3-Doc Matching", def: t('cbGlossary_3doc')},
      {term: "PIPL", def: t('cbGlossary_pipl')},
      {term: "Tmall Global", def: t('cbGlossary_tmallGlobal')},
      {term: "HS Code", def: t('cbGlossary_hsCode')},
    ],
    "Brand Protection": [
      {term: "CNIPA", def: t('tmGlossary_cnipa')},
      {term: "First-to-File", def: t('tmGlossary_firstToFile')},
      {term: "Nice Classification", def: t('tmGlossary_niceClass')},
      {term: "Madrid System", def: t('tmGlossary_madrid')},
      {term: "Customs Recordal", def: t('tmGlossary_customsRecordal')},
      {term: "Trademark Squatting", def: t('tmGlossary_squatting')},
      {term: "Opposition", def: t('tmGlossary_opposition')},
      {term: "HS Code", def: t('tmGlossary_hsCode')},
    ],
  };
  return gMap[module] || gMap["GACC Food Registration"];
}
