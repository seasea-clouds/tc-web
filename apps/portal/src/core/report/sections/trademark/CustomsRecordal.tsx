'use client';
import SectionTitle from '../../components/SectionTitle'
import { useT } from '@trade/ui';
export default function CustomsRecordal({ result }: { result: any }) {
    const t = useT('ReportSection');
  if (!result.customsRecordalSteps?.length) return null
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon="🛃" label={t("sectionCustomsIPRecordal")} />
      <ol className="space-y-3">
        {result.customsRecordalSteps.map((s: string, i: number) => (
          <li key={i} className="flex items-start gap-3">
            <span className="w-6 h-6 bg-gold/20 text-primary-navy rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i+1}</span>
            <p className="text-sm text-gray-700">{s}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}
