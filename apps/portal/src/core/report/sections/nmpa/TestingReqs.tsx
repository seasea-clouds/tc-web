'use client';
import SectionTitle from '../../components/SectionTitle'
import { useT } from '@trade/ui';
export default function TestingReqs({ result }: { result: any }) {
    const t = useT('ReportSection');
  const data = result.nmpaTestingReqs
  if (!data) return null
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon="🔬" label={t("sectionTestingRequirements")} />
      <div className="flex flex-wrap gap-2 mb-3">{data.categories?.map((c: string, i: number) => <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-100">{c}</span>)}</div>
      <p className="text-xs text-gray-600"><strong>{t("fieldLab")}:</strong> {data.labRequirement}</p>
      {data.exemption && <p className="text-xs text-amber-600 mt-1">{data.exemption}</p>}
    </div>
  )
}
