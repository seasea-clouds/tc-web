'use client';
import SectionTitle from '../../components/SectionTitle'
import ValueCard from '../../components/ValueCard'
import { useT } from '@trade/ui';
export default function CccCatalog({ result }: { result: any }) {
    const t = useT('ReportSection');
  const c = result.cccCatalog
  if (!c) return null
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon="📖" label={t("sectionCccProductCatalog")} tooltip={t("tooltipCccProductCatalog")} />
      <div className="grid grid-cols-2 gap-3 mb-3">
        <ValueCard label={t("valueProductCategories")} value={String(c.productCategories || '?')} />
        <ValueCard label={t("valueLastUpdate")} value={c.lastUpdate || '—'} />
      </div>
      <p className="text-xs text-gray-600">{c.note}</p>
      <p className="text-xs text-blue-600 mt-1">{c.verificationTip}</p>
    </div>
  )
}