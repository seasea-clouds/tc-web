'use client';
import SectionTitle from '../../components/SectionTitle'
import { useT } from '@trade/ui';
export default function CSTaxGuide({ result }: { result: any }) {
    const t = useT('ReportSection');
  const cb = result.cbTaxInfo
  if (!cb) return null
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon="💰" label={t("sectionCrossBorderTaxGuide")} />
      <div className="space-y-3">
        <div className="bg-blue-50 rounded-lg p-3"><p className="text-xs font-bold text-blue-800">{t("calculationLabel")}</p><p className="text-[10px] text-blue-700 mt-1">{cb.calculation}</p></div>
        <div className="flex gap-3 text-xs text-gray-600"><span><strong>{t("labelThreshold")}:</strong> {cb.threshold}</span></div>
        {cb.note && <p className="text-xs text-amber-600">{cb.note}</p>}
        {cb.example && <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs font-semibold text-gray-700">{t("exampleLabel")}</p><p className="text-[10px] text-gray-500 mt-1">{cb.example}</p></div>}
      </div>
    </div>
  )
}
