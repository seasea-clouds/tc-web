'use client';
import SectionTitle from '../../components/SectionTitle'
import { useT } from '@trade/ui';
export default function CBReportGuide({ result }: { result: any }) {
    const t = useT('ReportSection');
  const cb = result.cbReportGuide
  if (!cb) return null
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon="📄" label={t("sectionCBReportGuide")} />
      <div className="space-y-2">
        <div className="flex items-start gap-2 p-2 bg-green-50 rounded"><span className="text-green-600 mt-0.5">✅</span><p className="text-xs text-gray-700"><strong>{t("fieldAcceptance")}:</strong> {cb.acceptance}</p></div>
        <div className="flex items-start gap-2 p-2 bg-blue-50 rounded"><span className="text-blue-600 mt-0.5">💰</span><p className="text-xs text-gray-700"><strong>{t("fieldSavings")}:</strong> {cb.savings}</p></div>
        <div className="flex items-start gap-2 p-2 bg-amber-50 rounded"><span className="text-amber-600 mt-0.5">📋</span><p className="text-xs text-gray-700"><strong>{t("fieldRequirement")}:</strong> {cb.requirement}</p></div>
        <div className="flex items-start gap-2 p-2 bg-red-50 rounded"><span className="text-red-600 mt-0.5">⚠️</span><p className="text-xs text-gray-700"><strong>{t("fieldLimitation")}:</strong> {cb.limitation}</p></div>
      </div>
    </div>
  )
}