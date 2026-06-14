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
  label: 'reportModuleLabel',
  ccc: 'reportModuleCcc',
  nmpa: 'reportModuleNmpa',
  crossborder: 'reportModuleCrossborder',
  trademark: 'reportModuleTrademark',
};

export default function ReportViewer({ report, onBack }: ReportViewerProps) {
  const locale = useLocale();
  const t = useTranslations('Check');
  const href = (path: string) => `/${locale}${path}`;

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
          productInfo={report.productInfo}
          result={report.result}
          nextSteps={report.nextSteps}
          generatedAt={report.generatedAt}
        />
      </div>
    </main>
  );
}
