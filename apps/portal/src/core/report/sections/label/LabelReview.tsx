'use client';
import SectionTitle from '../../components/SectionTitle'
import { useT } from '@trade/ui';
export default function LabelReview({ result }: { result: any }) {
    const t = useT('ReportSection');
  const lr = result.labelReviewGuide
  if (!lr) return null
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon="🔍" label={t("sectionLabelReviewProcess")} />
      <div className="flex items-start gap-4 mb-3">
        {lr.process?.map((s: string, i: number) => (
          <div key={i} className="flex-1 text-center">
            <div className="w-8 h-8 rounded-full bg-primary-navy text-white flex items-center justify-center text-xs font-bold mx-auto mb-1">{i+1}</div>
            <p className="text-[10px] text-gray-600">{s}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500"><strong>{t("fieldTurnaround")}:</strong> {lr.turnaround}</p>
      {lr.tip && <p className="text-xs text-gold mt-2 font-medium">{lr.tip}</p>}
    </div>
  )
}
