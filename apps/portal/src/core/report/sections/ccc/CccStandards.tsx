'use client';
import SectionTitle from '../../components/SectionTitle'
import { useT } from '@trade/ui';
export default function CccStandards({ result }: { result: any }) {
    const t = useT('ReportSection');
  const s = result.cccStandards
  if (!s) return null
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon="📋" label={t("sectionCccTestingStandards")} />
      <p className="text-xs text-gray-500 mb-3">{t("cccTestingStandardsDesc")}</p>
      <div className="space-y-2">
        {Object.entries(s).filter(([k]) => k !== 'default').map(([key, val]: any) => (
          <div key={key} className="flex gap-2 p-2 bg-gray-50 rounded">
            <span className="text-xs font-bold text-primary-navy w-32 flex-shrink-0">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
            <span className="text-xs text-gray-600">{val}</span>
          </div>
        ))}
      </div>
      {s.default && <p className="text-xs text-gray-400 mt-2 italic">{s.default}</p>}
    </div>
  )
}