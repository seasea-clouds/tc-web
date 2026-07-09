'use client';

import { useTranslations, useLocale } from 'next-intl';
import type { ComplianceReport } from "../../modules/gacc/report";
import { ReportTemplate } from "@/core/report/template";

interface ReportViewerProps {
  report: ComplianceReport;
  onBack?: () => void;
}

const MODULE_KEYS: Record<string, string> = {
  gacc: 'reportModuleGacc',
  'GACC Food Registration': 'reportModuleGacc',
  label: 'reportModuleLabel',
  'Chinese Label Compliance': 'reportModuleLabel',
  ccc: 'reportModuleCcc',
  'CCC Certification': 'reportModuleCcc',
  nmpa: 'reportModuleNmpa',
  'Cosmetics Filing (NMPA)': 'reportModuleNmpa',
  crossborder: 'reportModuleCrossborder',
  'Cross-Border E-commerce': 'reportModuleCrossborder',
  trademark: 'reportModuleTrademark',
  'Brand Protection': 'reportModuleTrademark',
};

export default function ReportViewer({ report, onBack }: ReportViewerProps) {
  const locale = useLocale();
  const t = useTranslations('Check');
  const href = (path: string) => `/${locale}${path}`;

    // Translate category label
  const CATEGORY_PREFIX: Record<string, string> = {
    'GACC Food Registration': 'gaccCat',
    'CCC Certification': 'cccCat',
    'Cosmetics Filing (NMPA)': 'nmpaCat',
    'Chinese Label Compliance': 'labelCat',
    'Cross-Border E-commerce': 'cbCat',
    'Brand Protection': 'tmCat',
  };
  const catPrefix = CATEGORY_PREFIX[report.module] || '';
  const translatedCategory = catPrefix
    ? t(`${catPrefix}_${report.productInfo.category}_label`) || report.productInfo.category
    : report.productInfo.category;

  const MODULE_NEXT_STEPS: Record<string, string[]> = {
  'GACC Food Registration': ['gaccStep1', 'gaccStep2', 'gaccStep3', 'gaccStep4', 'gaccStep5'],
  'CCC Certification': ['cccStep1', 'cccStep2', 'cccStep3', 'cccStep4', 'cccStep5'],
  'Chinese Label Compliance': ['labelStep1', 'labelStep2', 'labelStep3', 'labelStep4', 'labelStep5'],
  'Cosmetics Filing (NMPA)': ['nmpaStep1', 'nmpaStep2', 'nmpaStep3', 'nmpaStep4', 'nmpaStep5'],
  'Cross-Border E-commerce': ['crossborderStep1', 'crossborderStep2', 'crossborderStep3', 'crossborderStep4', 'crossborderStep5'],
  'Brand Protection': ['trademarkStep1', 'trademarkStep2', 'trademarkStep3', 'trademarkStep4', 'trademarkStep5'],
};

const nextStepKeys = MODULE_NEXT_STEPS[report.module];
const nextSteps = nextStepKeys ? Array.from(nextStepKeys, k => t(k)) : report.nextSteps;

const labels = {
    title: t('reportTitle'),
    sectionProduct: t('reportSectionProduct'),
    sectionResult: t('reportSectionResult'),
    sectionDocuments: t('reportSectionDocuments'),
    sectionNextSteps: t('reportSectionNextSteps'),
    ctaTitle: t('reportCtaTitle'),
    ctaDesc: t('reportCtaDesc'),
    ctaBtn: t('reportCtaBtn'),
    footerName: t('reportFooterName'),
    footerAddress: t('reportFooterAddress'),
    footerEmail: t('reportFooterEmail'),
    labelProduct: t('reportProduct'),
    labelCategory: t('reportCategory'),
    labelHsCode: t('reportHsCode'),
    labelOrigin: t('reportOrigin'),
    gaccRequired: t('reportGaccRequired'),
    gaccNotRequired: t('reportGaccNotRequired'),
    labelPreparedFor: t('reportPreparedFor'),
    labelClient: t('reportClient'),
    labelReportLabel: t('reportReportLabel'),
    labelConfidential: t('reportConfidential'),
    labelRiskScore: t('reportRiskScore'),
    labelVerdict: t('reportVerdict'),
    labelTimeline: t('reportTimeline'),
    labelTotalCost: t('reportTotalCost'),
    labelRiskDimension: t('reportRiskDimension'),
  };

  return (
    <main className="min-h-screen bg-bg-ice py-12">
      <div className="max-w-3xl mx-auto px-4 space-y-4">
        {onBack && (
          <button
            onClick={onBack}
            className="text-sm text-gray-500 hover:text-primary-navy transition-colors"
          >
            &larr; {t('back')}
          </button>
        )}

        <ReportTemplate
          reportId={report.id}
          module={t(MODULE_KEYS[report.module] ?? report.module)}
          locale={locale}
          labels={labels}
          productInfo={{...report.productInfo, category: translatedCategory}}
          result={report.result}
          nextSteps={nextSteps}
          generatedAt={report.generatedAt}
        />
      </div>
    </main>
  );
}
